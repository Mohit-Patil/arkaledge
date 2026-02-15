import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import { consumeStreamWithWatchdog, RuntimeWatchdogError } from "../runtime-watchdog.js";
import type {
  AgentCompletedEventData,
  AgentMessage,
  SharedProjectContext,
  Task,
  TaskArtifact,
  TaskExecutionReport,
} from "../types.js";

const execFileAsync = promisify(execFile);
const ENGINEER_IDLE_TIMEOUT_MS = 120_000;
const ENGINEER_TOTAL_TIMEOUT_MS = 15 * 60_000;
const UI_FILE_EXTENSIONS = new Set([".html", ".htm"]);

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

At the very end, output:
1) A line containing exactly: FINAL_TASK_RESULT_JSON
2) A single-line JSON object with shape:
   {"status":"success|failed","testsRun":[{"command":"...","exitCode":0}],"filesChanged":["..."],"commitCreated":true|false,"summary":"..."}
Do NOT include markdown fences around this final JSON object.`;

/** Test failure indicators to scan for in agent output. */
const FAILURE_PATTERNS = [
  /Command exit code:\s*[1-9]\d*/i,
  /exited with code [1-9]\d*/i,
  /Claude Code process exited with code/i,
  /Codex Exec exited with code/i,
  /Runtime stream (idle|total) timeout/i,
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
    private sharedContext?: SharedProjectContext,
  ) {}

  async executeTask(task: Task, _projectDir: string, maxRetries: number): Promise<boolean> {
    const workingDirectory = task.worktree;
    const taskBranch = task.branch;
    if (!workingDirectory || !taskBranch) {
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
      data: { taskId: task.id, worktree: workingDirectory, branch: taskBranch },
    });

    const userPrompt = buildTaskPrompt(task, this.sharedContext);
    let sessionId: string | undefined;

    // Initial run
    const result = await this.runAndCollect(userPrompt, workingDirectory);
    let lastOutput = result.output;
    let lastDiagnostics = result.diagnostics;
    let lastReport = extractTaskExecutionReport(lastOutput);
    sessionId = result.sessionId;
    let success = evaluateTaskSuccess(lastDiagnostics, lastReport);

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
      lastReport = extractTaskExecutionReport(lastOutput);
      sessionId = retryResult.sessionId;
      success = evaluateTaskSuccess(lastDiagnostics, lastReport);
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
          data: { taskId: task.id, reason: commitResult.detail, executionReport: lastReport },
        });
        return false;
      }

      let artifacts: TaskArtifact[] | undefined;
      try {
        artifacts = await this.buildTaskArtifacts(task.id, taskBranch, workingDirectory, lastReport);
        await this.kanban.updateTask(task.id, { artifacts });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.eventBus.emit({
          type: "agent:message",
          agentId: this.runtime.id,
          agentRole: "engineer",
          timestamp: Date.now(),
          summary: `Artifact indexing skipped for ${task.id}: ${detail.slice(0, 160)}`,
          data: { taskId: task.id, error: detail },
        });
      }

      await this.kanban.moveTask(task.id, "review", this.runtime.id, "Implementation complete, moving to review");

      const completedData: AgentCompletedEventData = {
        taskId: task.id,
        branch: taskBranch,
        worktree: workingDirectory,
        executionReport: lastReport,
      };
      if (artifacts) {
        completedData.artifacts = artifacts;
      }

      this.eventBus.emit({
        type: "agent:completed",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer completed: ${task.title}`,
        data: completedData,
      });
    } else {
      await this.kanban.moveTask(task.id, "blocked", this.runtime.id, `Failed after ${maxRetries} retries`);

      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer blocked on: ${task.title} (${maxRetries} retries exhausted)`,
        data: {
          taskId: task.id,
          lastOutput: lastOutput.slice(-500),
          executionReport: lastReport,
        },
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

    try {
      await consumeStreamWithWatchdog(
        this.runtime.run(prompt, {
          systemPrompt: ENGINEER_SYSTEM_PROMPT,
          workingDirectory,
        }),
        {
          idleTimeoutMs: ENGINEER_IDLE_TIMEOUT_MS,
          totalTimeoutMs: ENGINEER_TOTAL_TIMEOUT_MS,
          onMessage: (message) => {
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
          },
        },
      );
    } catch (error) {
      await this.runtime.abort();
      const detail = error instanceof Error ? error.message : String(error);
      output += `${detail}\n`;
      diagnostics += `${detail}\n`;
      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer stream watchdog triggered: ${detail.slice(0, 160)}`,
        data: {
          messageType: "watchdog",
          timeoutKind: error instanceof RuntimeWatchdogError ? error.kind : "unknown",
        },
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

    try {
      await consumeStreamWithWatchdog(
        this.runtime.resume(sessionId, prompt, { workingDirectory }),
        {
          idleTimeoutMs: ENGINEER_IDLE_TIMEOUT_MS,
          totalTimeoutMs: ENGINEER_TOTAL_TIMEOUT_MS,
          onMessage: (message) => {
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
          },
        },
      );
    } catch (error) {
      await this.runtime.abort();
      const detail = error instanceof Error ? error.message : String(error);
      output += `${detail}\n`;
      diagnostics += `${detail}\n`;
      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer resume watchdog triggered: ${detail.slice(0, 160)}`,
        data: {
          messageType: "watchdog",
          timeoutKind: error instanceof RuntimeWatchdogError ? error.kind : "unknown",
        },
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

  private async buildTaskArtifacts(
    taskId: string,
    branch: string,
    workingDirectory: string,
    report: TaskExecutionReport | null,
  ): Promise<TaskArtifact[]> {
    const createdAt = Date.now();
    const artifacts: TaskArtifact[] = [
      {
        kind: "worktree",
        label: "Task worktree",
        relativePath: ".",
        url: buildWorktreeUrl(taskId),
        createdAt,
        metadata: { taskId, branch },
      },
    ];

    const candidatePaths = new Set<string>(["index.html"]);
    if (report) {
      for (const changedPath of report.filesChanged) {
        const normalized = normalizePathForWorktree(changedPath, workingDirectory);
        if (normalized) {
          candidatePaths.add(normalized);
        }
      }
    }

    for (const relativePath of candidatePaths) {
      if (!isHtmlPath(relativePath)) continue;
      const artifact = await createUiArtifact(taskId, workingDirectory, relativePath, createdAt);
      if (artifact) {
        artifacts.push(artifact);
      }
    }

    return artifacts;
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

function buildTaskPrompt(task: Task, sharedContext?: SharedProjectContext): string {
  const criteria = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
  const contextBlock = sharedContext
    ? `\n**Shared Project Context (use this first):**\n${sharedContext.prompt}\n`
    : "\n**Shared Project Context:** unavailable in this run.\n";
  return `Implement this task:

**Title:** ${task.title}

**Description:** ${task.description}

**Acceptance Criteria:**
${criteria}
${contextBlock}

You are operating in task worktree: ${task.worktree ?? "UNKNOWN"} on branch: ${task.branch ?? "UNKNOWN"}.
Write the implementation code and tests. Run the tests to verify everything works.
When complete, ensure your changes are committed to the task branch.

End your response with:
FINAL_TASK_RESULT_JSON
{"status":"success|failed","testsRun":[{"command":"...","exitCode":0}],"filesChanged":["..."],"commitCreated":true|false,"summary":"..."}
`;
}

function hasTestFailures(output: string): boolean {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

function evaluateTaskSuccess(diagnostics: string, report: TaskExecutionReport | null): boolean {
  if (hasTestFailures(diagnostics)) return false;
  if (!report) return true;
  return report.status === "success";
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

function extractTaskExecutionReport(output: string): TaskExecutionReport | null {
  const marker = "FINAL_TASK_RESULT_JSON";
  const idx = output.lastIndexOf(marker);
  if (idx < 0) return null;

  const afterMarker = output.slice(idx + marker.length).trim();
  if (!afterMarker) return null;

  const firstLine = afterMarker.split("\n")[0]?.trim();
  if (!firstLine) return null;

  try {
    const parsed = JSON.parse(firstLine) as Partial<TaskExecutionReport>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.status !== "success" && parsed.status !== "failed") return null;
    if (!Array.isArray(parsed.testsRun) || !Array.isArray(parsed.filesChanged)) return null;
    if (typeof parsed.commitCreated !== "boolean") return null;
    if (typeof parsed.summary !== "string") return null;

    const testsRun = parsed.testsRun
      .filter((entry): entry is { command: string; exitCode: number } => (
        !!entry
        && typeof entry === "object"
        && typeof (entry as { command?: unknown }).command === "string"
        && typeof (entry as { exitCode?: unknown }).exitCode === "number"
      ))
      .map((entry) => ({
        command: entry.command,
        exitCode: entry.exitCode,
      }));

    const filesChanged = parsed.filesChanged.filter((file): file is string => typeof file === "string");

    return {
      status: parsed.status,
      testsRun,
      filesChanged,
      commitCreated: parsed.commitCreated,
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
}

function createTaskWorktreeRoute(taskId: string, relativePath?: string): string {
  const encodedTaskId = encodeURIComponent(taskId);
  if (!relativePath || relativePath === ".") {
    return `/api/tasks/${encodedTaskId}/worktree/`;
  }

  const encodedPath = relativePath
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/tasks/${encodedTaskId}/worktree/${encodedPath}`;
}

function buildWorktreeUrl(taskId: string): string {
  return createTaskWorktreeRoute(taskId);
}

function normalizePathForWorktree(filePath: string, workingDirectory: string): string | null {
  const trimmed = filePath.trim();
  if (!trimmed) return null;

  const absolutePath = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(workingDirectory, trimmed);
  const relativePath = relative(workingDirectory, absolutePath);
  if (!isSafeRelativePath(relativePath)) return null;
  return toPosixPath(relativePath);
}

function normalizeArtifactPath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\/+/, "");
  if (!normalized) return null;

  const parts = normalized.split("/").filter((part) => part.length > 0 && part !== ".");
  if (parts.length === 0 || parts.some((part) => part === "..")) {
    return null;
  }

  return parts.join("/");
}

function toPosixPath(filePath: string): string {
  if (sep === "/") return filePath;
  return filePath.split(sep).join("/");
}

function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath === ".") return false;
  if (isAbsolute(filePath)) return false;
  return !filePath.startsWith("..");
}

function isHtmlPath(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase();
  return UI_FILE_EXTENSIONS.has(extension);
}

async function createUiArtifact(
  taskId: string,
  workingDirectory: string,
  relativePath: string,
  createdAt: number,
): Promise<TaskArtifact | null> {
  const normalizedPath = normalizeArtifactPath(relativePath);
  if (!normalizedPath || !isHtmlPath(normalizedPath)) {
    return null;
  }

  const absolutePath = resolve(workingDirectory, normalizedPath);
  const relFromWorktree = relative(workingDirectory, absolutePath);
  if (!isSafeRelativePath(relFromWorktree)) {
    return null;
  }

  let fileStats;
  try {
    fileStats = await stat(absolutePath);
  } catch {
    return null;
  }

  if (!fileStats.isFile()) {
    return null;
  }

  const isEntrypoint = basename(normalizedPath).toLowerCase() === "index.html";
  return {
    kind: "ui",
    label: isEntrypoint ? "Generated UI" : `UI: ${normalizedPath}`,
    relativePath: normalizedPath,
    url: createTaskWorktreeRoute(taskId, normalizedPath),
    contentType: "text/html",
    sizeBytes: fileStats.size,
    createdAt,
    metadata: { entrypoint: isEntrypoint },
  };
}
