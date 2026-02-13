import type { AgentRuntime } from "./agents/agent-runtime.js";
import type { EventBus } from "./event-bus.js";
import type { KanbanManager } from "./kanban.js";
import type { AgentConfig, Task } from "./types.js";

/**
 * Handles failed tasks with a retry → reassign → block pipeline.
 */
export class FailureHandler {
  constructor(
    private kanban: KanbanManager,
    private eventBus: EventBus,
    private maxRetries: number,
  ) {}

  async handleFailure(
    task: Task,
    engineers: Map<string, { runtime: AgentRuntime; config: AgentConfig }>,
  ): Promise<"retry" | "reassigned" | "blocked"> {
    // 1. Retry: if under max retries, backoff then send back to backlog
    if (task.retryCount < this.maxRetries) {
      const backoffMs = 2 ** (task.retryCount + 1) * 1000; // 2s, 4s, 8s
      await sleep(backoffMs);

      await this.kanban.updateTask(task.id, { retryCount: task.retryCount + 1 });
      await this.kanban.moveTask(task.id, "backlog", "failure-handler", `Retry ${task.retryCount + 1}/${this.maxRetries} (after ${backoffMs / 1000}s backoff)`);

      this.eventBus.emit({
        type: "task:status_changed",
        agentId: "failure-handler",
        agentRole: "system",
        timestamp: Date.now(),
        summary: `Retrying task "${task.title}" (attempt ${task.retryCount + 1})`,
        data: { taskId: task.id, action: "retry" },
      });

      return "retry";
    }

    // 2. Reassign: find an engineer with a different SDK/model than the original
    const originalEngineer = engineers.get(task.assignee ?? "");
    const alternate = findAlternateEngineer(engineers, task.assignee, originalEngineer?.config);

    if (alternate) {
      await this.kanban.updateTask(task.id, {
        retryCount: 0,
        assignee: undefined,
      });
      await this.kanban.moveTask(task.id, "backlog", "failure-handler", `Reassigned from ${task.assignee} (different SDK/model)`);

      this.eventBus.emit({
        type: "task:status_changed",
        agentId: "failure-handler",
        agentRole: "system",
        timestamp: Date.now(),
        summary: `Reassigning task "${task.title}" to alternate engineer`,
        data: { taskId: task.id, action: "reassigned", from: task.assignee, to: alternate },
      });

      return "reassigned";
    }

    // 3. Block: no alternate available, keep as blocked
    this.eventBus.emit({
      type: "agent:error",
      agentId: "failure-handler",
      agentRole: "system",
      timestamp: Date.now(),
      summary: `Task "${task.title}" permanently blocked — no alternate engineer available`,
      data: { taskId: task.id, action: "blocked" },
    });

    return "blocked";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Find an engineer with a different SDK or model than the original assignee. */
function findAlternateEngineer(
  engineers: Map<string, { runtime: AgentRuntime; config: AgentConfig }>,
  originalAssignee: string | undefined,
  originalConfig: AgentConfig | undefined,
): string | undefined {
  for (const [id, { config }] of engineers) {
    if (id === originalAssignee) continue;
    if (!originalConfig) return id; // any alternate will do
    if (config.sdk !== originalConfig.sdk || config.model !== originalConfig.model) {
      return id;
    }
  }
  return undefined;
}
