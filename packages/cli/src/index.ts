#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  createAgentRuntime,
  createApiServer,
  KanbanManager,
  loadConfig,
  globalEventBus,
  Orchestrator,
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
      spec: { type: "string" },
      output: { type: "string", short: "o" },
      resume: { type: "boolean", default: false },
      workdir: { type: "string", short: "w", default: process.cwd() },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help || (!values.prompt && !values.spec)) {
    printUsage();
    process.exit(values.help ? 0 : 1);
  }

  // ── Orchestration mode: --spec or (--config + --prompt) ──
  if (values.spec || (values.config && values.prompt)) {
    const spec = values.spec
      ? await readFile(values.spec, "utf-8")
      : values.prompt!;

    const config = await loadConfig(values.config ?? "default");
    const outputDir = values.output ?? "./output";
    const resume = values.resume ?? false;
    await assertOutputMode(outputDir, resume);

    console.log(`\n🚀 Arkaledge — Orchestrating team (${config.team.length} agents)\n`);
    console.log(`   Output: ${outputDir}\n`);
    console.log(`   Mode: ${resume ? "resume" : "fresh"}\n`);
    process.env.ARKALEDGE_RESUME_MODE = resume ? "1" : "0";

    // Wire event logging
    globalEventBus.on("*", (event: AgentEvent) => {
      const icon = eventIcon(event.type);
      console.log(`${icon} [${event.agentRole}] ${event.summary}`);
    });

    const orchestrator = new Orchestrator(config, outputDir);

    // Start Dashboard API server
    const kanban = new KanbanManager(outputDir, globalEventBus);
    await kanban.init();
    const apiServer = createApiServer({ kanban, eventBus: globalEventBus, port: 4400 });
    console.log('📡 Dashboard API: http://localhost:4400');

    // Graceful shutdown
    const shutdown = () => {
      console.log("\n🛑 Shutting down...");
      apiServer.close();
      orchestrator.stop().then(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
      await orchestrator.start(spec);
      console.log("\n✅ All tasks complete\n");
    } catch (error) {
      console.error(
        "\n❌ Orchestration error:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
    return;
  }

  // ── Single-agent mode (original behavior) ──
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
    for await (const message of runtime.run(values.prompt!, {
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

function eventIcon(type: string): string {
  if (type.startsWith("project:")) return "📦";
  if (type.startsWith("task:")) return "📋";
  if (type.startsWith("review:")) return "🔍";
  if (type === "agent:error") return "❌";
  if (type === "agent:completed") return "✅";
  if (type === "agent:started") return "▶️";
  return "💬";
}

async function assertOutputMode(outputDir: string, resume: boolean): Promise<void> {
  const outputExists = await pathExists(outputDir);
  const kanbanPath = join(outputDir, ".arkaledge", "kanban.json");
  const hasKanban = await pathExists(kanbanPath);

  if (resume) {
    if (!outputExists || !hasKanban) {
      throw new Error(
        `Cannot resume: expected existing run state at ${kanbanPath}. `
        + "Use a prior output directory or run without --resume for a fresh project.",
      );
    }
    return;
  }

  if (!outputExists) return;

  const entries = await readdir(outputDir);
  if (entries.length > 0) {
    throw new Error(
      `Output directory is not empty: ${outputDir}. `
      + "Use a fresh --output directory, or rerun with --resume to continue an existing run.",
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function printUsage(): void {
  console.log(`
Arkaledge — Autonomous AI Scrum Team Platform

Usage:
  arkaledge run --prompt "..." [options]
  arkaledge run --spec <path> --config <path> [options]

Options:
  -p, --prompt   Task prompt for the agent (required for single-agent mode)
  -s, --sdk      SDK to use: claude | codex (default: claude)
  -m, --model    Model to use (default: auto-detected from SDK)
  -c, --config   Path to team-config.yaml
      --spec     Path to product spec file (triggers orchestration mode)
  -o, --output   Output directory for orchestrated project (default: ./output)
      --resume   Resume an existing orchestration run in --output
  -w, --workdir  Working directory (default: current directory)
  -h, --help     Show this help message

Examples:
  # Single agent
  arkaledge run -p "Create a hello world Express app" -s claude

  # Full team orchestration
  arkaledge run --spec ./spec.md --config ./team-config.yaml --output /tmp/myproject
  arkaledge run --spec ./spec.md --config ./team-config.yaml --output /tmp/myproject --resume
  arkaledge run -p "Build a calculator CLI" -c ./team-config.yaml -o /tmp/calc
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
