import type { AgentMessage, RunOptions, SdkType } from "../types.js";

/**
 * Unified interface for running AI agents across different SDK backends.
 * Both Claude Agent SDK and Codex SDK are adapted to this interface.
 */
export interface AgentRuntime {
  readonly id: string;
  readonly sdk: SdkType;
  readonly model: string;

  /**
   * Run the agent with a prompt. Returns an async iterable of messages
   * for real-time streaming to the dashboard.
   */
  run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage>;

  /**
   * Resume a previous agent session (if supported by the SDK).
   */
  resume(sessionId: string, prompt: string): AsyncIterable<AgentMessage>;

  /**
   * Abort the currently running agent.
   */
  abort(): Promise<void>;
}
