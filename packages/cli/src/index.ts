#!/usr/bin/env node

import { parseArgs } from "node:util";
import {
  createAgentRuntime,
  loadConfig,
  globalEventBus,
  type AgentConfig,
  type AgentMessage,
  type AgentEvent,
} from "@arkaledge/core";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      prompt: { type: "string", short: "p" },
      sdk: { type: "string", short: "s", default: "claude" },
      model: { type: "string", short: "m" },
      config: { type: "string", short: "c" },
      workdir: { type: "string", short: "w", default: process.cwd() },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help || !values.prompt) {
    printUsage();
    process.exit(values.help ? 0 : 1);
  }

  // Load team config if provided, otherwise build single-agent config
  let agentConfig: AgentConfig;

  if (values.config) {
    const teamConfig = await loadConfig(values.config);
    const engineer = teamConfig.team.find((a: AgentConfig) => a.role === "engineer");
    if (!engineer) {
      console.error("No engineer found in team config");
      process.exit(1);
    }
    agentConfig = engineer;
  } else {
    const sdk = values.sdk as "claude" | "codex";
    const defaultModel =
      sdk === "claude"
        ? "claude-sonnet-4-5-20250929"
        : "o3";
    agentConfig = {
      role: "engineer",
      id: "cli-agent",
      sdk,
      model: values.model ?? defaultModel,
      tools:
        sdk === "claude"
          ? ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
          : ["shell", "file-ops"],
    };
  }

  console.log(
    `\n🚀 Arkaledge — Running ${agentConfig.sdk}/${agentConfig.model}\n`,
  );

  const runtime = createAgentRuntime(agentConfig);

  // Wire events
  globalEventBus.on("*", (event: AgentEvent) => {
    if (event.type === "agent:error") {
      console.error(`\n❌ ${event.summary}`);
    }
  });

  const systemPrompt =
    "You are a software engineer. Complete the given task by writing clean, working code.";

  try {
    for await (const message of runtime.run(values.prompt, {
      systemPrompt,
      workingDirectory: values.workdir ?? process.cwd(),
    })) {
      printMessage(message);
    }
    console.log("\n✅ Done\n");
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

function printMessage(msg: AgentMessage): void {
  switch (msg.type) {
    case "text":
      process.stdout.write(msg.content);
      break;
    case "tool_call":
      console.log(`\n🔧 ${msg.content}`);
      break;
    case "tool_result":
      console.log(`   → ${msg.content.slice(0, 200)}`);
      break;
    case "error":
      console.error(`\n❌ ${msg.content}`);
      break;
    case "summary":
      console.log(`\n📋 ${msg.content}`);
      break;
  }
}

function printUsage(): void {
  console.log(`
Arkaledge — Autonomous AI Scrum Team Platform

Usage:
  arkaledge run --prompt "..." [options]

Options:
  -p, --prompt   Task prompt for the agent (required)
  -s, --sdk      SDK to use: claude | codex (default: claude)
  -m, --model    Model to use (default: auto-detected from SDK)
  -c, --config   Path to team-config.yaml
  -w, --workdir  Working directory (default: current directory)
  -h, --help     Show this help message

Examples:
  arkaledge run -p "Create a hello world Express app" -s claude
  arkaledge run -p "Build a REST API" -s codex -m o3
  arkaledge run -p "Build a todo app" -c ./team-config.yaml
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
