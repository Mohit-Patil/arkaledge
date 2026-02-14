import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import lockfile from "proper-lockfile";
import type { EventBus } from "./event-bus.js";
import type { KanbanState, Task, TaskStatus } from "./types.js";

const KANBAN_DIR = ".arkaledge";
const KANBAN_FILE = "kanban.json";

/**
 * Manages task state in `<projectDir>/.arkaledge/kanban.json` with file locking.
 * Every read-modify-write cycle is wrapped in a lock to prevent races.
 */
export class KanbanManager {
  private filePath: string;
  private dirPath: string;

  constructor(
    private projectDir: string,
    private eventBus: EventBus,
  ) {
    this.dirPath = join(projectDir, KANBAN_DIR);
    this.filePath = join(this.dirPath, KANBAN_FILE);
  }

  /** Ensure the .arkaledge directory and kanban.json file exist. */
  async init(): Promise<void> {
    await mkdir(this.dirPath, { recursive: true });
    if (!existsSync(this.filePath)) {
      const initial: KanbanState = {
        projectId: nanoid(8),
        tasks: [],
        lastUpdated: Date.now(),
      };
      await writeFile(this.filePath, JSON.stringify(initial, null, 2));
    }
  }

  async load(): Promise<KanbanState> {
    const raw = await readFile(this.filePath, "utf-8");
    return JSON.parse(raw) as KanbanState;
  }

  async save(state: KanbanState): Promise<void> {
    state.lastUpdated = Date.now();
    await writeFile(this.filePath, JSON.stringify(state, null, 2));
  }

  /** Run a read-modify-write cycle under a file lock. */
  private async withLock<T>(fn: (state: KanbanState) => Promise<{ state: KanbanState; result: T }>): Promise<T> {
    const release = await lockfile.lock(this.filePath, { retries: { retries: 5, minTimeout: 100 } });
    try {
      const state = await this.load();
      const { state: newState, result } = await fn(state);
      await this.save(newState);
      return result;
    } finally {
      await release();
    }
  }

  async addTask(input: Omit<Task, "id" | "history" | "retryCount">): Promise<Task> {
    const task: Task = {
      ...input,
      id: nanoid(8),
      retryCount: 0,
      history: [
        {
          timestamp: Date.now(),
          agentId: input.createdBy,
          action: "created",
          detail: `Task created: ${input.title}`,
        },
      ],
    };

    await this.withLock(async (state) => {
      state.tasks.push(task);
      return { state, result: undefined };
    });

    this.eventBus.emit({
      type: "task:created",
      agentId: input.createdBy,
      agentRole: "system",
      timestamp: Date.now(),
      summary: `Task created: ${task.title}`,
      data: { taskId: task.id, title: task.title },
    });

    return task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    return this.withLock(async (state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) throw new Error(`Task not found: ${taskId}`);

      Object.assign(task, updates);
      task.history.push({
        timestamp: Date.now(),
        agentId: updates.assignee ?? task.assignee ?? "system",
        action: "updated",
        detail: `Updated: ${Object.keys(updates).join(", ")}`,
      });

      return { state, result: { ...task } };
    });
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const state = await this.load();
    return state.tasks.filter((t) => t.status === status);
  }

  async assignTask(taskId: string, agentId: string): Promise<Task> {
    const task = await this.withLock(async (state) => {
      const t = state.tasks.find((t) => t.id === taskId);
      if (!t) throw new Error(`Task not found: ${taskId}`);

      t.assignee = agentId;
      t.history.push({
        timestamp: Date.now(),
        agentId,
        action: "assigned",
        detail: `Assigned to ${agentId}`,
      });

      return { state, result: { ...t } };
    });

    this.eventBus.emit({
      type: "task:assigned",
      agentId,
      agentRole: "scrum-master",
      timestamp: Date.now(),
      summary: `Task "${task.title}" assigned to ${agentId}`,
      data: { taskId, agentId },
    });

    return task;
  }

  async moveTask(taskId: string, status: TaskStatus, agentId: string, detail?: string): Promise<Task> {
    const task = await this.withLock(async (state) => {
      const t = state.tasks.find((t) => t.id === taskId);
      if (!t) throw new Error(`Task not found: ${taskId}`);

      const previousStatus = t.status;
      t.status = status;
      t.history.push({
        timestamp: Date.now(),
        agentId,
        action: "status_changed",
        detail: detail ?? `${previousStatus} → ${status}`,
      });

      return { state, result: { ...t } };
    });

    this.eventBus.emit({
      type: "task:status_changed",
      agentId,
      agentRole: "system",
      timestamp: Date.now(),
      summary: `Task "${task.title}" moved to ${status}`,
      data: { taskId, status, previousStatus: detail },
    });

    return task;
  }

  async addReviewComment(taskId: string, comment: string): Promise<Task> {
    return this.withLock(async (state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) throw new Error(`Task not found: ${taskId}`);

      if (!task.reviewComments) task.reviewComments = [];
      task.reviewComments.push(comment);
      task.history.push({
        timestamp: Date.now(),
        agentId: "reviewer",
        action: "review_comment",
        detail: comment,
      });

      return { state, result: { ...task } };
    });
  }

  async getAllTasks(): Promise<Task[]> {
    const state = await this.load();
    return state.tasks;
  }
}
