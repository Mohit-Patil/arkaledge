import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import type { AgentMessage, Task } from "../types.js";

const execFileAsync = promisify(execFile);

const ENGINEER_SYSTEM_PROMPT = `You are a software engineer. Your job is to implement the given task completely.

MANDATORY REQUIREMENTS:
1. Write clean, working code that satisfies all acceptance criteria
2. Write tests for your implementation using Vitest
3. Run the tests to verify they pass
4. If tests fail, analyze the error and fix the code, then re-run tests

TYPE SAFETY (MUST FOLLOW):
- NEVER use \`any\` — use \`unknown\` and narrow
- Always annotate function parameters and return types explicitly
- Use explicit null checks instead of non-null assertions (!)
- Extract magic numbers to named constants

ERROR HANDLING:
- Wrap all async operations in try/catch
- Never silently swallow errors — log and handle or rethrow
- Include context in error messages (taskId, agentId)

CODE ORGANIZATION:
- One export per file — use index.ts for re-exports only
- Prefer interfaces over type aliases for object shapes
- Use \`readonly\` for parameters that should not be mutated
- Test files must be named \*.test.ts

Do NOT output JSON — just implement the task by writing code and running tests.`;

/** Test failure indicators to scan for in agent output. */
const FAILURE_PATTERNS = [
  /FAIL/i,
  /Error:/,
  /AssertionError/i,
  /test(s)? failed/i,
  /exit code [1-9]/i,
  /npm ERR!/,
  /TypeError:/,
  /ReferenceError:/,
  /SyntaxError:/,
];

interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

/**
 * Executes a single task: reads description, writes code + tests, self-corrects.
 */
export class EngineerRole {
  constructor(
    private runtime: AgentRuntime,
    private kanban: KanbanManager,
    private eventBus: EventBus,
  ) {}

  async executeTask(task: Task, _projectDir: string, maxRetries: number): Promise<boolean> {
    const workingDirectory = task.worktree;
    if (!workingDirectory || !task.branch) {
      await this.kanban.moveTask(
        task.id,
        "blocked",
        this.runtime.id,
        "Missing task worktree/branch metadata for execution",
      );

      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer blocked on: ${task.title} (missing worktree metadata)`,
        data: { taskId: task.id, worktree: task.worktree, branch: task.branch },
      });
      return false;
    }

    this.eventBus.emit({
      type: "agent:started",
      agentId: this.runtime.id,
      agentRole: "engineer",
      timestamp: Date.now(),
      summary: `Engineer starting: ${task.title}`,
      data: { taskId: task.id, worktree: workingDirectory, branch: task.branch },
    });

    const userPrompt = buildTaskPrompt(task);
    let sessionId: string | undefined;

    // Initial run
    const result = await this.runAndCollect(userPrompt, workingDirectory);
    let lastOutput = result.output;
    sessionId = result.sessionId;
    let success = !hasTestFailures(lastOutput);

    // Self-correction loop
    let retries = 0;
    while (!success && retries < maxRetries) {
      retries++;
      await this.kanban.updateTask(task.id, { retryCount: retries });

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Retry ${retries}/${maxRetries} for: ${task.title}`,
        data: { taskId: task.id, retry: retries },
      });

      const retryPrompt = `The tests failed. Here is the error output:\n\n${lastOutput.slice(-2000)}\n\nFix the code and run the tests again.`;

      const retryResult = sessionId
        ? await this.resumeAndCollect(sessionId, retryPrompt, workingDirectory)
        : await this.runAndCollect(retryPrompt, workingDirectory);

      lastOutput = retryResult.output;
      sessionId = retryResult.sessionId;
      success = !hasTestFailures(lastOutput);
    }

    if (success) {
      const commitResult = await this.ensureTaskCommit(task, workingDirectory);
      if (!commitResult.success) {
        await this.kanban.moveTask(
          task.id,
          "blocked",
          this.runtime.id,
          `Commit required before review: ${commitResult.detail}`,
        );

        this.eventBus.emit({
          type: "agent:error",
          agentId: this.runtime.id,
          agentRole: "engineer",
          timestamp: Date.now(),
          summary: `Engineer blocked on: ${task.title} (commit enforcement failed)`,
          data: { taskId: task.id, reason: commitResult.detail },
        });
        return false;
      }

      await this.kanban.moveTask(task.id, "review", this.runtime.id, "Implementation complete, moving to review");

      this.eventBus.emit({
        type: "agent:completed",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer completed: ${task.title}`,
        data: { taskId: task.id, branch: task.branch, worktree: workingDirectory },
      });
    } else {
      await this.kanban.moveTask(task.id, "blocked", this.runtime.id, `Failed after ${maxRetries} retries`);

      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer blocked on: ${task.title} (${maxRetries} retries exhausted)`,
        data: { taskId: task.id, lastOutput: lastOutput.slice(-500) },
      });
    }

    return success;
  }

  private async runAndCollect(
    prompt: string,
    workingDirectory: string,
  ): Promise<{ output: string; sessionId?: string }> {
    let output = "";
    let sessionId: string | undefined;

    for await (const message of this.runtime.run(prompt, {
      systemPrompt: ENGINEER_SYSTEM_PROMPT,
      workingDirectory,
    })) {
      output += messageToString(message);
      sessionId = extractSessionId(message);

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: message.content.slice(0, 200),
        data: { messageType: message.type },
      });
    }

    return { output, sessionId };
  }

  private async resumeAndCollect(
    sessionId: string,
    prompt: string,
    workingDirectory: string,
  ): Promise<{ output: string; sessionId?: string }> {
    let output = "";
    let newSessionId: string | undefined = sessionId;

    for await (const message of this.runtime.resume(sessionId, prompt, { workingDirectory })) {
      output += messageToString(message);
      const sid = extractSessionId(message);
      if (sid) newSessionId = sid;

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: message.content.slice(0, 200),
        data: { messageType: message.type },
      });
    }

    return { output, sessionId: newSessionId };
  }

  private async ensureTaskCommit(
    task: Task,
    workingDirectory: string,
  ): Promise<{ success: boolean; detail: string }> {
    if (!task.branch) {
      return { success: false, detail: "Task branch is missing" };
    }

    const ahead = await this.countBranchCommits(workingDirectory, task.branch);
    if (ahead > 0) {
      return { success: true, detail: "Branch already has commits" };
    }

    const status = await this.runGit(workingDirectory, ["status", "--porcelain"]);
    if (!status.trim()) {
      return {
        success: false,
        detail: "No changes to commit and branch has no commits ahead of main",
      };
    }

    await this.runGit(workingDirectory, ["add", "-A"]);

    try {
      await this.runGit(workingDirectory, ["commit", "-m", `feat(${task.id}): ${task.title}`]);
    } catch {
      await this.ensureGitIdentity(workingDirectory);
      await this.runGit(workingDirectory, ["commit", "-m", `feat(${task.id}): ${task.title}`]);
      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: "Configured local git identity before committing task branch",
        data: { taskId: task.id },
      });
    }

    const postCommitAhead = await this.countBranchCommits(workingDirectory, task.branch);
    if (postCommitAhead <= 0) {
      return {
        success: false,
        detail: "Commit command ran but branch still has no commits ahead of main",
      };
    }

    return { success: true, detail: "Created task commit" };
  }

  private async countBranchCommits(workingDirectory: string, branchName: string): Promise<number> {
    const output = await this.runGit(workingDirectory, ["rev-list", "--count", `main..${branchName}`]);
    const parsed = Number.parseInt(output.trim(), 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`Unable to parse commit count for branch "${branchName}": "${output}"`);
    }
    return parsed;
  }

  private async ensureGitIdentity(workingDirectory: string): Promise<void> {
    const hasName = await this.tryGit(workingDirectory, ["config", "--get", "user.name"]);
    if (!hasName) {
      await this.runGit(workingDirectory, ["config", "user.name", "Arkaledge Engineer"]);
    }

    const hasEmail = await this.tryGit(workingDirectory, ["config", "--get", "user.email"]);
    if (!hasEmail) {
      await this.runGit(workingDirectory, ["config", "user.email", "arkaledge@local"]);
    }
  }

  private async runGit(workingDirectory: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: workingDirectory,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error) {
      const execError = error as ExecError;
      const stderr = execError.stderr?.trim();
      throw new Error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
    }
  }

  private async tryGit(workingDirectory: string, args: string[]): Promise<boolean> {
    try {
      await execFileAsync("git", args, {
        cwd: workingDirectory,
        maxBuffer: 10 * 1024 * 1024,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function buildTaskPrompt(task: Task): string {
  const criteria = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
  return `Implement this task:

**Title:** ${task.title}

**Description:** ${task.description}

**Acceptance Criteria:**
${criteria}

You are operating in task worktree: ${task.worktree ?? "UNKNOWN"} on branch: ${task.branch ?? "UNKNOWN"}.
Write the implementation code and tests. Run the tests to verify everything works.
When complete, ensure your changes are committed to the task branch.`;
}

function hasTestFailures(output: string): boolean {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

function messageToString(msg: AgentMessage): string {
  if (msg.type === "text" || msg.type === "tool_result" || msg.type === "error") {
    return msg.content + "\n";
  }
  return "";
}

function extractSessionId(msg: AgentMessage): string | undefined {
  return msg.metadata?.["sessionId"] as string | undefined;
}
