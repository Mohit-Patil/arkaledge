import type { Task } from "../types.js";

export interface PluginTool {
  name: string;
  description: string;
  parameters: object;
  execute(params: unknown): Promise<string>;
}

export interface ArkaledgePlugin {
  name: string;
  description: string;
  tools: PluginTool[];
  onProjectStart?(projectDir: string): Promise<void>;
  onTaskComplete?(task: Task): Promise<void>;
  onProjectComplete?(projectDir: string): Promise<void>;
}
