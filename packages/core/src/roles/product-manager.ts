import { z } from "zod";
import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import type { SharedProjectContext, Task } from "../types.js";

const taskItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["high", "medium", "low"]),
  epic: z.string().optional(),
  dependsOn: z.array(z.number().int().min(0)).optional(),
});

const taskArraySchema = z.array(taskItemSchema);

const PM_SYSTEM_PROMPT = `You are a Product Manager. Your job is to break a product specification into granular, independently implementable engineering tasks.

Output ONLY a JSON array — no prose, no markdown fences, no explanation.

Each task object must have:
- title (string): Short, imperative task name
- description (string): Detailed implementation description
- acceptanceCriteria (string[]): Measurable criteria for completion
- priority ("high" | "medium" | "low"): Task priority
- epic (string): Feature group this task belongs to
- dependsOn (number[]): 0-based indices of tasks in this array that must be completed before this task can start. Only reference earlier indices (less than the current task's index). Omit or use [] if the task has no dependencies.

Order tasks by dependency — foundational tasks first, dependent tasks later.
Keep tasks small and focused. Each task should be completable by a single engineer in one session.`;

/**
 * Takes a raw product spec, uses an AgentRuntime to produce structured tasks,
 * and writes them to the Kanban board.
 */
export class ProductManagerRole {
  constructor(
    private runtime: AgentRuntime,
    private kanban: KanbanManager,
    private eventBus: EventBus,
    private sharedContext?: SharedProjectContext,
  ) {}

  async breakdownSpec(spec: string, projectDir: string): Promise<Task[]> {
    this.eventBus.emit({
      type: "agent:started",
      agentId: this.runtime.id,
      agentRole: "product-manager",
      timestamp: Date.now(),
      summary: "PM starting spec breakdown",
    });

    const contextBlock = this.sharedContext
      ? `Shared context fingerprint: ${this.sharedContext.context.fingerprint}\n${this.sharedContext.prompt}\n`
      : "Shared project context is unavailable for this run.";
    const prompt = `Use the shared context below when planning tasks. Avoid redundant repository discovery unless needed.\n\n${contextBlock}\n\nBreak this product specification into engineering tasks:\n\n${spec}`;

    // Collect all text output from the agent
    let fullOutput = "";
    for await (const message of this.runtime.run(prompt, {
      systemPrompt: PM_SYSTEM_PROMPT,
      workingDirectory: projectDir,
    })) {
      if (message.type === "text") {
        fullOutput += message.content;
      }
      // Forward all messages for observability
      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "product-manager",
        timestamp: Date.now(),
        summary: message.content.slice(0, 200),
        data: { messageType: message.type },
      });
    }

    // Extract JSON from the output (handle markdown code fences)
    const jsonStr = extractJson(fullOutput);
    const parsed = JSON.parse(jsonStr) as unknown;
    const taskItems = taskArraySchema.parse(parsed);

    // Pass 1: Create all tasks, collect IDs
    const createdTasks: Task[] = [];
    for (const item of taskItems) {
      const task = await this.kanban.addTask({
        title: item.title,
        description: item.description,
        acceptanceCriteria: item.acceptanceCriteria,
        status: "backlog",
        priority: item.priority,
        epic: item.epic,
        createdBy: this.runtime.id,
        contextFingerprint: this.sharedContext?.context.fingerprint,
      });
      createdTasks.push(task);
    }

    // Pass 2: Resolve index references to real task IDs
    for (let i = 0; i < taskItems.length; i++) {
      const deps = taskItems[i].dependsOn;
      if (!deps || deps.length === 0) continue;

      const resolvedIds = deps
        .filter((idx) => idx >= 0 && idx < i && idx < createdTasks.length)
        .map((idx) => createdTasks[idx].id);

      if (resolvedIds.length > 0) {
        createdTasks[i] = await this.kanban.updateTask(createdTasks[i].id, {
          dependsOn: resolvedIds,
        });
      }
    }

    this.eventBus.emit({
      type: "agent:completed",
      agentId: this.runtime.id,
      agentRole: "product-manager",
      timestamp: Date.now(),
      summary: `PM created ${createdTasks.length} tasks`,
      data: { taskCount: createdTasks.length },
    });

    return createdTasks;
  }
}

/** Extract JSON array from a string, stripping markdown code fences if present. */
function extractJson(text: string): string {
  // Try to find JSON inside code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a raw JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  // Fall back to the entire text
  return text.trim();
}
