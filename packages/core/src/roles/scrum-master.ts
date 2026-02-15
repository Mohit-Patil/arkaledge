import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import { FailureHandler } from "../failure-handler.js";
import type { KanbanManager } from "../kanban.js";
import type { AgentConfig, SharedProjectContext, WorkflowConfig } from "../types.js";
import type { Task } from "../types.js";
import type { WorktreeManager } from "../worktree-manager.js";
import { EngineerRole } from "./engineer.js";
import { ReviewerRole } from "./reviewer.js";

const POLL_INTERVAL_MS = 2000;

/**
 * Coordination loop: assigns tasks to idle engineers, triggers reviews,
 * handles blockers. Runs until all tasks are done.
 */
export class ScrumMasterRole {
  private stopped = false;
  private idleEngineers: Set<string>;
  private activeWork = new Map<string, Promise<void>>();
  private activeReviewTasks = new Set<string>();
  private failureHandler: FailureHandler;

  constructor(
    private engineers: Map<string, { runtime: AgentRuntime; config: AgentConfig }>,
    private kanban: KanbanManager,
    private eventBus: EventBus,
    private workflowConfig: WorkflowConfig,
    private worktreeManager: WorktreeManager,
    private sharedContext?: SharedProjectContext,
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

      // 1. Handle blocked tasks before checking exit conditions
      const blockedTasks = tasks.filter((t) => t.status === "blocked");
      for (const task of blockedTasks) {
        await this.failureHandler.handleFailure(task, this.engineers);
      }

      const currentTasks = await this.kanban.getAllTasks();

      // Exit: all tasks are done (or stuck permanently after recovery attempts)
      const activeTasks = currentTasks.filter((t) => t.status !== "done");
      if (activeTasks.length === 0) break;

      const currentBlockedTasks = currentTasks.filter((t) => t.status === "blocked");
      const blockedIds = new Set(currentBlockedTasks.map((t) => t.id));
      // Backlog tasks whose deps include a blocked task are also stuck
      const stuckBacklogTasks = currentTasks.filter(
        (t) => t.status === "backlog" && t.dependsOn?.some((depId) => blockedIds.has(depId)),
      );
      const stuckCount = currentBlockedTasks.length + stuckBacklogTasks.length;
      if (activeTasks.length === stuckCount && this.activeWork.size === 0) {
        break;
      }

      // 2. Assign backlog tasks and orphaned in_progress tasks to idle engineers
      const candidateTasks = currentTasks
        .filter((t) => t.status === "backlog" || (t.status === "in_progress" && (!t.assignee || (this.idleEngineers.has(t.assignee) && !this.activeWork.has(t.assignee)))))
        .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

      // Filter out tasks whose dependencies haven't been met
      const schedulableTasks: Task[] = [];
      for (const task of candidateTasks) {
        if (await this.kanban.areDependenciesMet(task)) {
          schedulableTasks.push(task);
        }
      }

      for (const task of schedulableTasks) {
        if (this.idleEngineers.size === 0) break;

        const engineerId = task.assignee && this.idleEngineers.has(task.assignee)
          ? task.assignee
          : this.idleEngineers.values().next().value;

        if (!engineerId) break;

        this.idleEngineers.delete(engineerId);

        let runnableTask: Task = task;
        try {
          if (!runnableTask.branch || !runnableTask.worktree) {
            const branchName = runnableTask.branch ?? buildTaskBranchName(runnableTask);
            const worktreePath = await this.worktreeManager.createWorktree(runnableTask.id, branchName);
            runnableTask = await this.kanban.updateTask(runnableTask.id, {
              branch: branchName,
              worktree: worktreePath,
            });
          }
        } catch (error) {
          this.idleEngineers.add(engineerId);
          const detail = error instanceof Error ? error.message : String(error);
          await this.kanban.moveTask(task.id, "blocked", "scrum-master", `Failed to prepare worktree: ${detail}`);
          this.eventBus.emit({
            type: "agent:error",
            agentId: "scrum-master",
            agentRole: "scrum-master",
            timestamp: Date.now(),
            summary: `Failed to prepare worktree for task "${task.title}"`,
            data: { taskId: task.id, error: detail },
          });
          continue;
        }

        runnableTask = await this.kanban.assignTask(runnableTask.id, engineerId);
        if (runnableTask.status === "backlog") {
          runnableTask = await this.kanban.moveTask(runnableTask.id, "in_progress", engineerId);
        }

        const engineer = this.engineers.get(engineerId)!;
        const engineerRole = new EngineerRole(engineer.runtime, this.kanban, this.eventBus, this.sharedContext);

        const workPromise = engineerRole
          .executeTask(runnableTask, projectDir, this.workflowConfig.max_retries)
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

      // 3. Assign review tasks to idle engineers (different from author)
      if (this.workflowConfig.review_required) {
        const reviewTasks = currentTasks.filter((t) => t.status === "review" && !this.activeReviewTasks.has(t.id));

        for (const task of reviewTasks) {
          // Find an idle engineer who is NOT the author
          const reviewerId = [...this.idleEngineers].find((id) => id !== task.assignee);
          if (!reviewerId) continue;

          this.idleEngineers.delete(reviewerId);
          this.activeReviewTasks.add(task.id);

          const reviewer = this.engineers.get(reviewerId)!;
          const reviewerRole = new ReviewerRole(
            reviewer.runtime,
            this.kanban,
            this.eventBus,
            this.worktreeManager,
            this.workflowConfig.auto_merge,
            this.sharedContext,
          );

          const reviewPromise = reviewerRole
            .reviewTask(task, projectDir)
            .then(() => {
              this.activeWork.delete(reviewerId);
              this.idleEngineers.add(reviewerId);
              this.activeReviewTasks.delete(task.id);
            })
            .catch((err) => {
              this.activeWork.delete(reviewerId);
              this.idleEngineers.add(reviewerId);
              this.activeReviewTasks.delete(task.id);
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
        // If review not required, auto-approve review tasks.
        const reviewTasks = currentTasks.filter((t) => t.status === "review");
        for (const task of reviewTasks) {
          if (!this.workflowConfig.auto_merge) {
            await this.kanban.moveTask(
              task.id,
              "done",
              "scrum-master",
              "Auto-approved (manual merge required)",
            );
            continue;
          }

          if (!task.branch) {
            await this.kanban.moveTask(
              task.id,
              "blocked",
              "scrum-master",
              "Auto-approval failed: missing branch metadata",
            );
            continue;
          }

          try {
            await this.worktreeManager.mergeToMain(task.branch);
            if (task.worktree) {
              await this.worktreeManager.removeWorktree(task.id);
              await this.kanban.updateTask(task.id, { worktree: undefined });
            }
            await this.kanban.moveTask(task.id, "done", "scrum-master", "Auto-approved and merged to main");
          } catch (error) {
            await this.kanban.moveTask(
              task.id,
              "blocked",
              "scrum-master",
              `Auto-approval merge failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      const latestTasks = await this.kanban.getAllTasks();

      // Emit summary for dashboard observability
      this.eventBus.emit({
        type: "agent:message",
        agentId: "scrum-master",
        agentRole: "scrum-master",
        timestamp: Date.now(),
        summary: `Loop: ${latestTasks.filter((t) => t.status === "done").length}/${latestTasks.length} done, ${this.idleEngineers.size} idle, ${this.activeWork.size} active`,
        data: {
          done: latestTasks.filter((t) => t.status === "done").length,
          total: latestTasks.length,
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

function buildTaskBranchName(task: Task): string {
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `task/${task.id}${slug ? `-${slug}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
