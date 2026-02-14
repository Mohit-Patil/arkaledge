import { z } from "zod";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import type { Task } from "../types.js";

const verdictSchema = z.object({
  verdict: z.enum(["approved", "rejected"]),
  comments: z.array(z.string()),
});

const REVIEWER_SYSTEM_PROMPT = `You are a code reviewer. Review the implementation for the given task.

OBJECTIVE CHECKLIST (all must pass):
[ ] No \`any\` type usage — use \`unknown\` and narrow instead
[ ] No empty catch blocks — errors must be logged or handled
[ ] No console.log — use structured logging (if available)
[ ] No non-null assertions (!) — use explicit null checks
[ ] No magic numbers — constants must be named
[ ] Test file exists with \*.test.ts naming using Vitest
[ ] All async operations are awaited with try/catch
[ ] Types are explicitly annotated on function parameters/returns

Check:
1. Code quality — follows the MANDATORY REQUIREMENTS above
2. Test coverage — tests exist and cover the acceptance criteria
3. Acceptance criteria — all criteria are met by the implementation
4. No obvious bugs or security issues

Output ONLY JSON with this exact shape:
{
  "verdict": "approved" | "rejected",
  "comments": ["comment1", "comment2"]
}

If all checks pass, verdict is "approved". Otherwise "rejected" with specific, actionable comments.`;

/**
 * Reviews completed work by reading the project directory and checking acceptance criteria.
 */
export class ReviewerRole {
  constructor(
    private runtime: AgentRuntime,
    private kanban: KanbanManager,
    private eventBus: EventBus,
  ) {}

  async reviewTask(task: Task, projectDir: string): Promise<"approved" | "rejected"> {
    this.eventBus.emit({
      type: "review:started",
      agentId: this.runtime.id,
      agentRole: "reviewer",
      timestamp: Date.now(),
      summary: `Review started: ${task.title}`,
      data: { taskId: task.id },
    });

    const criteria = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
    const userPrompt = `Review the implementation for this task:

**Title:** ${task.title}

**Description:** ${task.description}

**Acceptance Criteria:**
${criteria}

Read the relevant files in the project directory and check if the implementation meets all acceptance criteria. Run the tests if they exist.`;

    // Collect agent output
    let fullOutput = "";
    for await (const message of this.runtime.run(userPrompt, {
      systemPrompt: REVIEWER_SYSTEM_PROMPT,
      workingDirectory: projectDir,
    })) {
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
      await this.kanban.moveTask(task.id, "done", this.runtime.id, "Review approved");

      this.eventBus.emit({
        type: "review:approved",
        agentId: this.runtime.id,
        agentRole: "reviewer",
        timestamp: Date.now(),
        summary: `Review approved: ${task.title}`,
        data: { taskId: task.id, comments },
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
        data: { taskId: task.id, comments },
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
