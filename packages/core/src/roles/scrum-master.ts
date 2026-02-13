import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import { FailureHandler } from "../failure-handler.js";
import type { KanbanManager } from "../kanban.js";
import { EngineerRole } from "./engineer.js";
import { ReviewerRole } from "./reviewer.js";
import type { AgentConfig, WorkflowConfig } from "../types.js";

const POLL_INTERVAL_MS = 2000;

/**
 * Coordination loop: assigns tasks to idle engineers, triggers reviews,
 * handles blockers. Runs until all tasks are done.
 */
export class ScrumMasterRole {
  private stopped = false;
  private idleEngineers: Set<string>;
  private activeWork = new Map<string, Promise<void>>();
  private failureHandler: FailureHandler;

  constructor(
    private engineers: Map<string, { runtime: AgentRuntime; config: AgentConfig }>,
    private kanban: KanbanManager,
    private eventBus: EventBus,
    private workflowConfig: WorkflowConfig,
  ) {
    this.idleEngineers = new Set(engineers.keys());
    this.failureHandler = new FailureHandler(kanban, eventBus, workflowConfig.max_retries);
  }

  async run(projectDir: string): Promise<void> {
    this.eventBus.emit({
      type: "agent:started",
      agentId: "scrum-master",
      agentRole: "scrum-master",
      timestamp: Date.now(),
      summary: "Scrum Master starting coordination loop",
    });

    while (!this.stopped) {
      const tasks = await this.kanban.getAllTasks();

      // Exit: all tasks are done (or blocked permanently)
      const activeTasks = tasks.filter((t) => t.status !== "done");
      const blockedTasks = tasks.filter((t) => t.status === "blocked");
      if (activeTasks.length === 0 || (activeTasks.length === blockedTasks.length && this.activeWork.size === 0)) {
        break;
      }

      // 1. Assign backlog tasks to idle engineers
      const backlogTasks = tasks
        .filter((t) => t.status === "backlog")
        .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

      for (const task of backlogTasks) {
        if (this.idleEngineers.size === 0) break;

        const engineerId = this.idleEngineers.values().next().value;
        if (!engineerId) break;

        this.idleEngineers.delete(engineerId);

        await this.kanban.assignTask(task.id, engineerId);
        await this.kanban.moveTask(task.id, "in_progress", engineerId);

        const engineer = this.engineers.get(engineerId)!;
        const engineerRole = new EngineerRole(engineer.runtime, this.kanban, this.eventBus);

        const workPromise = engineerRole
          .executeTask(task, projectDir, this.workflowConfig.max_retries)
          .then(() => {
            this.activeWork.delete(engineerId);
            this.idleEngineers.add(engineerId);
          })
          .catch((err) => {
            this.activeWork.delete(engineerId);
            this.idleEngineers.add(engineerId);
            this.eventBus.emit({
              type: "agent:error",
              agentId: engineerId,
              agentRole: "engineer",
              timestamp: Date.now(),
              summary: `Engineer ${engineerId} crashed: ${err instanceof Error ? err.message : String(err)}`,
            });
          });

        this.activeWork.set(engineerId, workPromise);
      }

      // 2. Assign review tasks to idle engineers (different from author)
      if (this.workflowConfig.review_required) {
        const reviewTasks = tasks.filter((t) => t.status === "review");

        for (const task of reviewTasks) {
          // Find an idle engineer who is NOT the author
          const reviewerId = [...this.idleEngineers].find((id) => id !== task.assignee);
          if (!reviewerId) continue;

          this.idleEngineers.delete(reviewerId);

          const reviewer = this.engineers.get(reviewerId)!;
          const reviewerRole = new ReviewerRole(reviewer.runtime, this.kanban, this.eventBus);

          const reviewPromise = reviewerRole
            .reviewTask(task, projectDir)
            .then(() => {
              this.activeWork.delete(reviewerId);
              this.idleEngineers.add(reviewerId);
            })
            .catch((err) => {
              this.activeWork.delete(reviewerId);
              this.idleEngineers.add(reviewerId);
              this.eventBus.emit({
                type: "agent:error",
                agentId: reviewerId,
                agentRole: "reviewer",
                timestamp: Date.now(),
                summary: `Reviewer ${reviewerId} crashed: ${err instanceof Error ? err.message : String(err)}`,
              });
            });

          this.activeWork.set(reviewerId, reviewPromise);
        }
      } else {
        // If review not required, move review tasks straight to done
        const reviewTasks = tasks.filter((t) => t.status === "review");
        for (const task of reviewTasks) {
          await this.kanban.moveTask(task.id, "done", "scrum-master", "Auto-approved (review not required)");
        }
      }

      // 3. Handle blocked tasks
      const currentBlockedTasks = tasks.filter((t) => t.status === "blocked");
      for (const task of currentBlockedTasks) {
        await this.failureHandler.handleFailure(task, this.engineers);
      }

      // Emit summary for dashboard observability
      this.eventBus.emit({
        type: "agent:message",
        agentId: "scrum-master",
        agentRole: "scrum-master",
        timestamp: Date.now(),
        summary: `Loop: ${tasks.filter((t) => t.status === "done").length}/${tasks.length} done, ${this.idleEngineers.size} idle, ${this.activeWork.size} active`,
        data: {
          done: tasks.filter((t) => t.status === "done").length,
          total: tasks.length,
          idle: this.idleEngineers.size,
          active: this.activeWork.size,
        },
      });

      await sleep(POLL_INTERVAL_MS);
    }

    // Wait for any remaining active work to finish
    if (this.activeWork.size > 0) {
      await Promise.allSettled(this.activeWork.values());
    }

    this.eventBus.emit({
      type: "agent:completed",
      agentId: "scrum-master",
      agentRole: "scrum-master",
      timestamp: Date.now(),
      summary: "Scrum Master coordination complete",
    });
  }

  stop(): void {
    this.stopped = true;
  }
}

function priorityWeight(priority: "high" | "medium" | "low"): number {
  switch (priority) {
    case "high": return 0;
    case "medium": return 1;
    case "low": return 2;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
