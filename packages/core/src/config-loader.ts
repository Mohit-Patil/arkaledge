import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { teamConfigSchema, type TeamConfig, type AgentConfig } from "./types.js";

/**
 * Load and validate a team configuration from a YAML file.
 */
export async function loadConfig(configPath: string): Promise<TeamConfig> {
  const raw = await readFile(configPath, "utf-8");
  const parsed = parseYaml(raw);
  const validated = teamConfigSchema.parse(parsed);

  // Auto-assign IDs to agents that don't have one
  const config: TeamConfig = {
    ...validated,
    team: validated.team.map((agent, i) => ({
      ...agent,
      id: agent.id ?? `${agent.role}-${i}`,
    })) as AgentConfig[],
  };

  return config;
}

/**
 * Create a default team config for quick-start usage.
 */
export function defaultConfig(overrides?: Partial<TeamConfig>): TeamConfig {
  return {
    team: [
      {
        role: "product-manager",
        id: "pm-0",
        sdk: "claude",
        model: "claude-opus-4-6",
        tools: ["Read", "Write", "Glob", "Grep"],
      },
      {
        role: "scrum-master",
        id: "sm-0",
        sdk: "claude",
        model: "claude-sonnet-4-5-20250929",
        tools: ["Read", "Write", "Glob", "Grep", "Bash"],
      },
      {
        role: "engineer",
        id: "eng-0",
        sdk: "claude",
        model: "claude-sonnet-4-5-20250929",
        tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      },
    ],
    workflow: {
      columns: ["backlog", "in_progress", "review", "done"],
      max_retries: 3,
      review_required: true,
      auto_merge: true,
    },
    plugins: [],
    ...overrides,
  };
}
