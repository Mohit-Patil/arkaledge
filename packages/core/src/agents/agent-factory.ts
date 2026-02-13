import type { AgentConfig } from "../types.js";
import type { AgentRuntime } from "./agent-runtime.js";
import { ClaudeAgentRuntime } from "./claude-runtime.js";
import { CodexAgentRuntime } from "./codex-runtime.js";

/**
 * Creates the appropriate AgentRuntime from an AgentConfig.
 * Routes to ClaudeAgentRuntime or CodexAgentRuntime based on the sdk field.
 */
export function createAgentRuntime(config: AgentConfig): AgentRuntime {
  const id = config.id ?? `${config.role}-${Date.now()}`;

  switch (config.sdk) {
    case "claude":
      return new ClaudeAgentRuntime(id, config.model, config.tools);
    case "codex":
      return new CodexAgentRuntime(id, config.model);
    default:
      throw new Error(`Unknown SDK type: ${config.sdk as string}`);
  }
}

/**
 * Creates all agent runtimes from a team config.
 */
export function createTeamRuntimes(
  agents: AgentConfig[],
): Map<string, AgentRuntime> {
  const runtimes = new Map<string, AgentRuntime>();

  for (const config of agents) {
    const runtime = createAgentRuntime(config);
    runtimes.set(runtime.id, runtime);
  }

  return runtimes;
}
