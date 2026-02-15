export type TaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "high" | "medium" | "low";
export type ArtifactKind = "worktree" | "ui" | "file" | string;

export interface Artifact {
  kind: ArtifactKind;
  label: string;
  url: string;
  relativePath?: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskEvent {
  timestamp: number;
  agentId: string;
  action: string;
  detail?: string;
  artifacts?: Artifact[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  assignee?: string;
  epic?: string;
  priority: TaskPriority;
  branch?: string;
  retryCount: number;
  history: TaskEvent[];
  createdBy: string;
  reviewComments?: string[];
  dependsOn?: string[];
  artifacts?: Artifact[];
}

export type EventType =
  | "agent:started"
  | "agent:message"
  | "agent:completed"
  | "agent:error"
  | "task:created"
  | "task:assigned"
  | "task:status_changed"
  | "review:started"
  | "review:approved"
  | "review:rejected"
  | "project:started"
  | "project:completed";

export interface AgentEventData {
  taskId?: string;
  title?: string;
  status?: TaskStatus;
  previousStatus?: string;
  action?: string;
  retry?: number;
  branch?: string;
  worktree?: string;
  reason?: string;
  error?: string;
  messageType?: string;
  timeoutKind?: string;
  artifacts?: Artifact[];
  [key: string]: unknown;
}

export interface AgentEvent {
  type: EventType;
  agentId: string;
  agentRole: string;
  timestamp: number;
  summary: string;
  detail?: string;
  data?: AgentEventData;
}
