import { z } from "zod";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import { consumeStreamWithWatchdog, RuntimeWatchdogError } from "../runtime-watchdog.js";
import type { SharedProjectContext, Task } from "../types.js";
import type { WorktreeManager } from "../worktree-manager.js";

const verdictSchema = z.object({
  verdict: z.enum(["approved", "rejected"]),
  comments: z.array(z.string()),
});

const DIFF_CHAR_LIMIT = 20000;
const REVIEWER_IDLE_TIMEOUT_MS = 120_000;
const REVIEWER_TOTAL_TIMEOUT_MS = 10 * 60_000;

const REVIEWER_SYSTEM_PROMPT = `You are a code reviewer. Review the implementation for the given task.

BEFORE REVIEWING, inspect the project to determine its tech stack:
- Check for package.json, tsconfig.json, file extensions (.ts vs .js), and any linter configs
- This determines which quality standards apply — do NOT enforce TypeScript rules on a JavaScript project, or vice versa

REVIEW CRITERIA (apply all that are relevant to the project's stack):

1. **Correctness** — Does the code work? Does it meet ALL acceptance criteria?
2. **Tests** — Do tests exist and pass? Do they cover the acceptance criteria? Run them.
3. **Error handling** — No empty catch blocks. Errors are logged or handled appropriately.
4. **Security** — No obvious vulnerabilities (injection, unsafe input handling, etc.)
5. **Stack-appropriate quality:**
   - TypeScript projects: proper typing (no \`any\`), explicit annotations, no non-null assertions
   - JavaScript projects: correct logic, proper argument validation, clear error messages
   - Any project: no magic numbers where named constants improve clarity, async operations properly handled

IMPORTANT:
- Only reject for real, functional problems — not style preferences.
- If tests exist and pass, and acceptance criteria are met, lean toward approving.
- Do NOT invent requirements beyond the task description and acceptance criteria.
- Do NOT demand a different language or framework than what the project uses.

Output ONLY JSON with this exact shape:
{
  "verdict": "approved" | "rejected",
  "comments": ["comment1", "comment2"]
}

If all checks pass, verdict is "approved". Otherwise "rejected" with specific, actionable comments.`;

/**
 * Reviews completed work using the task branch diff and acceptance criteria.
 */
export class ReviewerRole {
  constructor(
    private runtime: AgentRuntime,
    private kanban: KanbanManager,
    private eventBus: EventBus,
    private worktreeManager: WorktreeManager,
    private autoMerge: boolean,
    private sharedContext?: SharedProjectContext,
  ) {}

  async reviewTask(task: Task, projectDir: string): Promise<"approved" | "rejected"> {
    if (!task.branch) {
      await this.kanban.moveTask(
        task.id,
        "blocked",
        this.runtime.id,
        "Missing task branch metadata for review",
      );
      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review failed: ${task.title} (missing branch metadata)`,
        data: { taskId: task.id },
      });
      return "rejected";
    }

    this.eventBus.emit({
      type: "review:started",
      agentId: this.runtime.id,
      agentRole: "reviewer",
      timestamp: Date.now(),
      summary: `Review started: ${task.title}`,
      data: { taskId: task.id, branch: task.branch, worktree: task.worktree },
    });

    let diff: string;
    try {
      diff = await this.worktreeManager.getDiff(task.branch);
    } catch (error) {
      await this.kanban.moveTask(
        task.id,
        "blocked",
        this.runtime.id,
        `Unable to compute branch diff: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review failed: ${task.title} (diff generation failed)`,
        data: { taskId: task.id, branch: task.branch },
      });
      return "rejected";
    }

    const trimmedDiff = diff.trim().slice(0, DIFF_CHAR_LIMIT);
    const criteria = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
    const reviewHistory = (task.reviewComments ?? []).map((c) => `- ${c}`).join("\n");
    const contextBlock = this.sharedContext
      ? `**Shared Project Context:**\n${this.sharedContext.prompt}\n`
      : "**Shared Project Context:** unavailable in this run.\n";
    const userPrompt = `Review the implementation for this task:

**Title:** ${task.title}

**Description:** ${task.description}

**Acceptance Criteria:**
${criteria}
${contextBlock}

**Branch:** ${task.branch}

**Diff (main...${task.branch}):**
\`\`\`diff
${trimmedDiff || "(No diff output)"}
\`\`\`

${reviewHistory ? `**Previous Review Feedback:**\n${reviewHistory}\n` : ""}
Read the relevant files in the task worktree, validate acceptance criteria, and run tests if they exist.`;

    // Collect agent output with watchdog protection.
    let fullOutput = "";
    try {
      await consumeStreamWithWatchdog(
        this.runtime.run(userPrompt, {
          systemPrompt: REVIEWER_SYSTEM_PROMPT,
          workingDirectory: task.worktree ?? projectDir,
        }),
        {
          idleTimeoutMs: REVIEWER_IDLE_TIMEOUT_MS,
          totalTimeoutMs: REVIEWER_TOTAL_TIMEOUT_MS,
          onMessage: (message) => {
            if (message.type === "text") {
              fullOutput += message.content;
            }
            this.eventBus.emit({
              type: "agent:message",
              agentId: this.runtime.id,
              agentRole: "reviewer",
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
      await this.kanban.moveTask(
        task.id,
        "blocked",
        this.runtime.id,
        `Review watchdog timeout/failure: ${detail}`,
      );
      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review failed: ${task.title} (watchdog timeout/failure)`,
        data: {
          taskId: task.id,
          branch: task.branch,
          error: detail,
          timeoutKind: error instanceof RuntimeWatchdogError ? error.kind : "unknown",
        },
      });
      return "rejected";
    }

    // Parse the verdict
    const jsonStr = extractJson(fullOutput);
    let verdict: "approved" | "rejected";
    let comments: string[];

    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      const result = verdictSchema.parse(parsed);
      verdict = result.verdict;
      comments = result.comments;
    } catch {
      // If we can't parse, treat as rejected with the raw output as comment
      verdict = "rejected";
      comments = ["Failed to parse review verdict. Raw output: " + fullOutput.slice(0, 500)];
    }

    if (verdict === "approved") {
      const preserveWorktreeForUi = shouldPreserveWorktreeForUi(task);
      if (this.autoMerge) {
        try {
          await this.worktreeManager.mergeToMain(task.branch);
          if (!preserveWorktreeForUi) {
            await this.worktreeManager.removeWorktree(task.id);
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          await this.kanban.moveTask(task.id, "blocked", this.runtime.id, `Merge/cleanup failed: ${detail}`);

          this.eventBus.emit({
            type: "agent:error",
            agentId: this.runtime.id,
            agentRole: "reviewer",
            timestamp: Date.now(),
            summary: `Review approved but merge failed: ${task.title}`,
            data: { taskId: task.id, branch: task.branch, error: detail },
          });

          return "rejected";
        }

        if (!preserveWorktreeForUi) {
          await this.kanban.updateTask(task.id, { worktree: undefined });
        } else {
          this.eventBus.emit({
            type: "agent:message",
            agentId: this.runtime.id,
            agentRole: "reviewer",
            timestamp: Date.now(),
            summary: `Preserving worktree for UI artifacts: ${task.title}`,
            data: { taskId: task.id, worktree: task.worktree },
          });
        }

        await this.kanban.moveTask(
          task.id,
          "done",
          this.runtime.id,
          preserveWorktreeForUi
            ? "Review approved and merged to main (worktree preserved for UI artifacts)"
            : "Review approved and merged to main",
        );
      } else {
        await this.kanban.moveTask(task.id, "done", this.runtime.id, "Review approved (manual merge required)");
      }

      this.eventBus.emit({
        type: "review:approved",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review approved: ${task.title}`,
        data: { taskId: task.id, comments, branch: task.branch, autoMerge: this.autoMerge },
      });
    } else {
      // Add each comment to the task
      for (const comment of comments) {
        await this.kanban.addReviewComment(task.id, comment);
      }

      // Move back to in_progress for the engineer to fix
      await this.kanban.moveTask(task.id, "in_progress", this.runtime.id, "Review rejected — needs fixes");

      this.eventBus.emit({
        type: "review:rejected",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review rejected: ${task.title} (${comments.length} comments)`,
        data: { taskId: task.id, comments, branch: task.branch, worktree: task.worktree },
      });
    }

    return verdict;
  }
}

/** Extract JSON object from a string, stripping markdown code fences if present. */
function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];

  return text.trim();
}

function shouldPreserveWorktreeForUi(task: Task): boolean {
  if (!task.worktree) return false;
  return (task.artifacts ?? []).some((artifact) => artifact.kind === "ui");
}
