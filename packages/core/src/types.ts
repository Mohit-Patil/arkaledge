import { z } from "zod";

// ─── Agent Messages ───

export interface AgentMessage {
  type: "text" | "tool_call" | "tool_result" | "error" | "summary";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentRunResult {
  success: boolean;
  output: string;
  artifacts?: string[];
  sessionId?: string;
}

export interface RunOptions {
  systemPrompt: string;
  workingDirectory: string;
  tools?: string[];
  outputSchema?: object;
  timeout?: number;
}

// ─── Agent Config ───

export type SdkType = "claude" | "codex";
export type AgentRole = "product-manager" | "scrum-master" | "engineer" | "reviewer";

export interface AgentConfig {
  role: AgentRole;
  id: string;
  sdk: SdkType;
  model: string;
  tools: string[];
}

// ─── Kanban ───

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
  worktree?: string;
  retryCount: number;
  history: TaskEvent[];
  createdBy: string;
  reviewComments?: string[];
  dependsOn?: string[];
  contextFingerprint?: string;
}

export interface KanbanState {
  projectId: string;
  tasks: Task[];
  lastUpdated: number;
}

// ─── Workflow Config ───

export interface WorkflowConfig {
  columns: TaskStatus[];
  max_retries: number;
  review_required: boolean;
  auto_merge: boolean;
}

// ─── Plugin Config ───

export interface PluginRef {
  name: string;
  path: string;
}

// ─── Team Config ───

export interface TeamConfig {
  team: AgentConfig[];
  workflow: WorkflowConfig;
  plugins: PluginRef[];
}

// ─── Shared Project Context ───

export interface ProjectContext {
  schemaVersion: number;
  generatedAt: string;
  fingerprint: string;
  projectDir: string;
  primaryLanguage: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "none";
  testCommand: string;
  hasTypeScript: boolean;
  sourceFileCount: number;
  testFileCount: number;
  importantFiles: string[];
  sampleFiles: string[];
  agentsGuidance?: string;
  cloudGuidance?: string;
}

export interface SharedProjectContext {
  context: ProjectContext;
  prompt: string;
  jsonPath: string;
  markdownPath: string;
}

// ─── Event System ───

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

// ─── Zod Schemas for Config Validation ───

export const agentConfigSchema = z.object({
  role: z.enum(["product-manager", "scrum-master", "engineer", "reviewer"]),
  id: z.string().optional(),
  sdk: z.enum(["claude", "codex"]),
  model: z.string(),
  tools: z.array(z.string()),
});

export const workflowConfigSchema = z.object({
  columns: z.array(z.enum(["backlog", "in_progress", "review", "done", "blocked"])),
  max_retries: z.number().int().min(0).default(3),
  review_required: z.boolean().default(true),
  auto_merge: z.boolean().default(true),
});

export const pluginRefSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const teamConfigSchema = z.object({
  team: z.array(agentConfigSchema),
  workflow: workflowConfigSchema,
  plugins: z.array(pluginRefSchema).default([]),
});
