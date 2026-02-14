export type TaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "high" | "medium" | "low";

export interface TaskEvent {
  timestamp: number;
  agentId: string;
  action: string;
  detail?: string;
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

export interface AgentEvent {
  type: EventType;
  agentId: string;
  agentRole: string;
  timestamp: number;
  summary: string;
  detail?: string;
  data?: Record<string, unknown>;
}
