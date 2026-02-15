import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentEvent,
  AgentEventData,
  Artifact,
  EventType,
  Task,
  TaskEvent,
  TaskPriority,
  TaskStatus,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4400";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const TASK_STATUSES: TaskStatus[] = ["backlog", "in_progress", "review", "done", "blocked"];
const TASK_PRIORITIES: TaskPriority[] = ["high", "medium", "low"];
const EVENT_TYPES: EventType[] = [
  "agent:started",
  "agent:message",
  "agent:completed",
  "agent:error",
  "task:created",
  "task:assigned",
  "task:status_changed",
  "review:started",
  "review:approved",
  "review:rejected",
  "project:started",
  "project:completed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && TASK_PRIORITIES.includes(value as TaskPriority);
}

function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && EVENT_TYPES.includes(value as EventType);
}

function inferArtifactLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}

function resolveArtifactUrl(value: string): string {
  const url = value.trim();
  if (!url) return "";

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return url;
  }

  try {
    const base = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function normalizeArtifact(value: unknown): Artifact | null {
  if (typeof value === "string") {
    const url = resolveArtifactUrl(value);
    if (!url) return null;
    return {
      kind: "file",
      label: inferArtifactLabel(url),
      url,
    };
  }

  if (!isRecord(value)) return null;

  const url =
    asOptionalString(value.url)
    ?? asOptionalString(value.href)
    ?? asOptionalString(value.link);
  if (!url) return null;

  const artifact: Artifact = {
    kind: asOptionalString(value.kind) ?? asOptionalString(value.type) ?? "file",
    label:
      asOptionalString(value.label)
      ?? asOptionalString(value.title)
      ?? asOptionalString(value.name)
      ?? inferArtifactLabel(url),
    url: resolveArtifactUrl(url),
  };

  const relativePath = asOptionalString(value.relativePath);
  const contentType = asOptionalString(value.contentType);
  const sizeBytes = typeof value.sizeBytes === "number" && Number.isFinite(value.sizeBytes)
    ? value.sizeBytes
    : undefined;
  const createdAt = typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
    ? value.createdAt
    : undefined;
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;

  if (relativePath) artifact.relativePath = relativePath;
  if (contentType) artifact.contentType = contentType;
  if (sizeBytes !== undefined) artifact.sizeBytes = sizeBytes;
  if (createdAt !== undefined) artifact.createdAt = createdAt;
  if (metadata) artifact.metadata = metadata;

  return artifact;
}

function normalizeArtifacts(value: unknown): Artifact[] | undefined {
  if (value === undefined) return undefined;

  const source = Array.isArray(value) ? value : [value];
  const artifacts = source
    .map((item) => normalizeArtifact(item))
    .filter((artifact): artifact is Artifact => artifact !== null);

  return artifacts.length > 0 ? artifacts : undefined;
}

function normalizeTaskEvent(value: unknown): TaskEvent | null {
  if (!isRecord(value)) return null;

  const agentId = asOptionalString(value.agentId) ?? "system";
  const action = asOptionalString(value.action) ?? "updated";
  const detail = asOptionalString(value.detail);
  const artifacts = normalizeArtifacts(value.artifacts ?? value.artifact);

  const event: TaskEvent = {
    timestamp: typeof value.timestamp === "number" ? value.timestamp : Date.now(),
    agentId,
    action,
  };

  if (detail) event.detail = detail;
  if (artifacts) event.artifacts = artifacts;

  return event;
}

function normalizeTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;

  const id = asOptionalString(value.id);
  if (!id) return null;

  const task: Task = {
    id,
    title: asOptionalString(value.title) ?? id,
    description: asOptionalString(value.description) ?? "",
    acceptanceCriteria: asStringArray(value.acceptanceCriteria),
    status: isTaskStatus(value.status) ? value.status : "backlog",
    priority: isTaskPriority(value.priority) ? value.priority : "medium",
    retryCount: typeof value.retryCount === "number" && Number.isFinite(value.retryCount) ? value.retryCount : 0,
    history: Array.isArray(value.history)
      ? value.history
        .map((item) => normalizeTaskEvent(item))
        .filter((event): event is TaskEvent => event !== null)
      : [],
    createdBy: asOptionalString(value.createdBy) ?? "system",
  };

  const assignee = asOptionalString(value.assignee);
  const epic = asOptionalString(value.epic);
  const branch = asOptionalString(value.branch);
  const dependsOn = asStringArray(value.dependsOn);
  const reviewComments = asStringArray(value.reviewComments);
  const artifacts = normalizeArtifacts(value.artifacts);

  if (assignee) task.assignee = assignee;
  if (epic) task.epic = epic;
  if (branch) task.branch = branch;
  if (dependsOn.length > 0) task.dependsOn = dependsOn;
  if (reviewComments.length > 0) task.reviewComments = reviewComments;
  if (artifacts) task.artifacts = artifacts;

  return task;
}

function normalizeEventData(value: unknown): AgentEventData | undefined {
  if (!isRecord(value)) return undefined;

  const data: AgentEventData = {};
  for (const [key, rawValue] of Object.entries(value)) {
    data[key] = rawValue;
  }

  const taskId = asOptionalString(value.taskId);
  const title = asOptionalString(value.title);
  const action = asOptionalString(value.action);
  const status = isTaskStatus(value.status) ? value.status : undefined;
  const previousStatus = asOptionalString(value.previousStatus);
  const branch = asOptionalString(value.branch);
  const worktree = asOptionalString(value.worktree);
  const reason = asOptionalString(value.reason);
  const error = asOptionalString(value.error);
  const messageType = asOptionalString(value.messageType);
  const timeoutKind = asOptionalString(value.timeoutKind);
  const artifacts = normalizeArtifacts(value.artifacts ?? value.artifact);

  if (taskId) data.taskId = taskId;
  if (title) data.title = title;
  if (action) data.action = action;
  if (status) data.status = status;
  if (previousStatus) data.previousStatus = previousStatus;
  if (branch) data.branch = branch;
  if (worktree) data.worktree = worktree;
  if (reason) data.reason = reason;
  if (error) data.error = error;
  if (messageType) data.messageType = messageType;
  if (timeoutKind) data.timeoutKind = timeoutKind;
  if (typeof value.retry === "number" && Number.isFinite(value.retry)) data.retry = value.retry;
  if (artifacts) data.artifacts = artifacts;

  return Object.keys(data).length > 0 ? data : undefined;
}

function normalizeAgentEvent(value: unknown): AgentEvent | null {
  if (!isRecord(value) || !isEventType(value.type)) return null;

  const event: AgentEvent = {
    type: value.type,
    agentId: asOptionalString(value.agentId) ?? "system",
    agentRole: asOptionalString(value.agentRole) ?? "system",
    timestamp: typeof value.timestamp === "number" ? value.timestamp : Date.now(),
    summary: asOptionalString(value.summary) ?? value.type,
  };

  const detail = asOptionalString(value.detail);
  const data = normalizeEventData(value.data);

  if (detail) event.detail = detail;
  if (data) event.data = data;

  return event;
}

export function useApi() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      if (res.ok) {
        const payload: unknown = await res.json();
        if (Array.isArray(payload)) {
          const normalized = payload
            .map((item) => normalizeTask(item))
            .filter((task): task is Task => task !== null);
          setTasks(normalized);
        }
      }
    } catch {
      // SSE reconnect will retry
    }
  }, []);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API_URL}/api/events`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        fetchTasks();
      };

      es.onmessage = (e) => {
        try {
          const payload: unknown = JSON.parse(e.data);
          const event = normalizeAgentEvent(payload);
          if (!event) return;

          setEvents((prev) => [event, ...prev].slice(0, 200));

          if (
            event.type === "task:created"
            || event.type === "task:assigned"
            || event.type === "task:status_changed"
          ) {
            fetchTasks();
          }
        } catch {
          // Ignore malformed SSE messages
        }
      };

      es.onerror = () => {
        setStatus("disconnected");
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [fetchTasks]);

  return { tasks, events, status };
}
