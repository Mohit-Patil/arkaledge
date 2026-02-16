# Core Interfaces

## AgentRuntime

The unified interface for running AI agents across different SDK backends.

```typescript
interface AgentRuntime {
  readonly id: string;
  readonly sdk: "claude" | "codex";
  readonly model: string;

  run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage>;
  resume(sessionId: string, prompt: string, options?: ResumeOptions): AsyncIterable<AgentMessage>;
  abort(): Promise<void>;
}
```

```typescript
interface ResumeOptions {
  workingDirectory?: string;
}
```

### RunOptions

```typescript
interface RunOptions {
  systemPrompt: string;
  workingDirectory: string;
  tools?: string[];
  outputSchema?: object;    // JSON Schema for structured output
  timeout?: number;          // milliseconds
}
```

### AgentMessage

Unified message format emitted by all runtimes:

```typescript
interface AgentMessage {
  type: "text" | "tool_call" | "tool_result" | "error" | "summary";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

## Kanban State

### TaskArtifact

```typescript
type TaskArtifactKind = "worktree" | "ui" | "file";

interface TaskArtifact {
  kind: TaskArtifactKind;
  label: string;
  relativePath: string;
  url: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}
```

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: "backlog" | "in_progress" | "review" | "done" | "blocked";
  assignee?: string;           // agent ID
  epic?: string;
  priority: "high" | "medium" | "low";
  branch?: string;             // git branch name
  worktree?: string;           // worktree path
  retryCount: number;
  history: TaskEvent[];        // audit trail
  createdBy: string;           // agent ID that created it
  reviewComments?: string[];
  dependsOn?: string[];
  contextFingerprint?: string;
  artifacts?: TaskArtifact[];
}
```

### KanbanState

```typescript
interface KanbanState {
  projectId: string;
  tasks: Task[];
  lastUpdated: number;
}
```

Stored at: `<project-dir>/.arkaledge/kanban.json`
File locking via `proper-lockfile` npm package.

## Worktree Management

```typescript
class WorktreeManager {
  constructor(projectDir: string);
  createWorktree(taskId: string, branchName: string): Promise<string>;
  removeWorktree(taskId: string): Promise<void>;
  mergeToMain(branchName: string): Promise<void>;
  getDiff(branchName: string): Promise<string>;
}
```

## Event System

```typescript
type EventType =
  | "agent:started" | "agent:message" | "agent:completed" | "agent:error"
  | "task:created" | "task:assigned" | "task:status_changed"
  | "review:started" | "review:approved" | "review:rejected"
  | "project:started" | "project:completed";

interface AgentEvent {
  type: EventType;
  agentId: string;
  agentRole: string;
  timestamp: number;
  summary: string;              // always present
  detail?: string;              // full reasoning (expandable)
  data?: Record<string, unknown>;
}
```

For `agent:completed`, `data` may include `taskId`, `branch`, `worktree`, `executionReport`, and `artifacts`.

## Plugin System

```typescript
interface ArkaledgePlugin {
  name: string;
  description: string;
  tools: PluginTool[];
  onProjectStart?(projectDir: string): Promise<void>;
  onTaskComplete?(task: Task): Promise<void>;
  onProjectComplete?(projectDir: string): Promise<void>;
}

interface PluginTool {
  name: string;
  description: string;
  parameters: object;          // JSON Schema
  execute(params: unknown): Promise<string>;
}
```

Plugins are loaded from the `plugins` array in team config. Each plugin directory must export a default `ArkaledgePlugin`.
