import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import type { AgentMessage, Task } from "../types.js";

const execFileAsync = promisify(execFile);

const ENGINEER_SYSTEM_PROMPT = `You are a software engineer. Your job is to implement the given task completely.

BEFORE STARTING, inspect the project to determine its tech stack:
- Check for package.json, tsconfig.json, file extensions (.ts vs .js), and any existing code
- This determines which conventions to follow — write JavaScript for JS projects, TypeScript for TS projects

MANDATORY REQUIREMENTS:
1. Write clean, working code that satisfies all acceptance criteria
2. Write tests for your implementation (use the project's existing test framework; if none exists, use Node's built-in test runner via \`node:test\` and avoid adding external dependencies)
3. Run the tests to verify they pass
4. If tests fail, analyze the error and fix the code, then re-run tests

QUALITY STANDARDS (adapt to the project's stack):
- Handle errors properly — no empty catch blocks, log or handle errors meaningfully
- No magic numbers where named constants improve clarity
- TypeScript projects: use proper typing (no \`any\`), explicit annotations, no non-null assertions
- JavaScript projects: validate inputs, use clear variable names, handle edge cases

Do NOT output JSON — just implement the task by writing code and running tests.`;

/** Test failure indicators to scan for in agent output. */
const FAILURE_PATTERNS = [
  /Command exit code:\s*[1-9]\d*/i,
  /exited with code [1-9]\d*/i,
  /Claude Code process exited with code/i,
  /Codex Exec exited with code/i,
  /You've hit your limit/i,
  /rate limit/i,
  /Tests?\s+failed/i,
  /FAIL\s+.*\.test\./i,
  /AssertionError/i,
  /npm ERR!/,
  /vitest.*failed/i,
  /jest.*failed/i,
  /[1-9]\d*\s+failed/i,
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
    let lastDiagnostics = result.diagnostics;
    sessionId = result.sessionId;
    let success = !hasTestFailures(lastDiagnostics);

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

      const retryPrompt = `The tests failed. Here is the error output:\n\n${(lastDiagnostics || lastOutput).slice(-2000)}\n\nFix the code and run the tests again.`;

      const retryResult = sessionId
        ? await this.resumeAndCollect(sessionId, retryPrompt, workingDirectory)
        : await this.runAndCollect(retryPrompt, workingDirectory);

      lastOutput = retryResult.output;
      lastDiagnostics = retryResult.diagnostics;
      sessionId = retryResult.sessionId;
      success = !hasTestFailures(lastDiagnostics);
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
  ): Promise<{ output: string; diagnostics: string; sessionId?: string }> {
    let output = "";
    let diagnostics = "";
    let sessionId: string | undefined;

    for await (const message of this.runtime.run(prompt, {
      systemPrompt: ENGINEER_SYSTEM_PROMPT,
      workingDirectory,
    })) {
      output += messageToString(message);
      diagnostics += messageToDiagnosticString(message);
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

    return { output, diagnostics, sessionId };
  }

  private async resumeAndCollect(
    sessionId: string,
    prompt: string,
    workingDirectory: string,
  ): Promise<{ output: string; diagnostics: string; sessionId?: string }> {
    let output = "";
    let diagnostics = "";
    let newSessionId: string | undefined = sessionId;

    for await (const message of this.runtime.resume(sessionId, prompt, { workingDirectory })) {
      output += messageToString(message);
      diagnostics += messageToDiagnosticString(message);
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

    return { output, diagnostics, sessionId: newSessionId };
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
      // Verification-only tasks can legitimately have no file changes.
      // Create an explicit empty commit so the branch has auditable task completion.
      try {
        await this.runGit(
          workingDirectory,
          ["commit", "--allow-empty", "-m", `chore(${task.id}): ${task.title}`],
        );
      } catch {
        await this.ensureGitIdentity(workingDirectory);
        await this.runGit(
          workingDirectory,
          ["commit", "--allow-empty", "-m", `chore(${task.id}): ${task.title}`],
        );
        this.eventBus.emit({
          type: "agent:message",
          agentId: this.runtime.id,
          agentRole: "engineer",
          timestamp: Date.now(),
          summary: "Configured local git identity before creating empty task commit",
          data: { taskId: task.id },
        });
      }

      const postEmptyCommitAhead = await this.countBranchCommits(workingDirectory, task.branch);
      if (postEmptyCommitAhead <= 0) {
        return {
          success: false,
          detail: "Created empty commit but branch still has no commits ahead of main",
        };
      }

      return { success: true, detail: "Created empty task commit" };
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

function messageToDiagnosticString(msg: AgentMessage): string {
  if (msg.type === "tool_result" || msg.type === "error") {
    return msg.content + "\n";
  }
  return "";
}

function extractSessionId(msg: AgentMessage): string | undefined {
  return msg.metadata?.["sessionId"] as string | undefined;
}
