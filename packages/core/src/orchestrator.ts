import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createTeamRuntimes } from "./agents/agent-factory.js";
import type { AgentRuntime } from "./agents/agent-runtime.js";
import { globalEventBus } from "./event-bus.js";
import { KanbanManager } from "./kanban.js";
import { ensureSharedProjectContext } from "./project-context.js";
import { ProductManagerRole } from "./roles/product-manager.js";
import { ScrumMasterRole } from "./roles/scrum-master.js";
import type { AgentConfig, SharedProjectContext, Task, TeamConfig } from "./types.js";
import { WorktreeManager } from "./worktree-manager.js";

// Allow nested Claude Code sessions — the SDK spawns `claude` subprocesses
// which refuse to start if CLAUDECODE is set (prevents accidental nesting).
delete process.env.CLAUDECODE;

/**
 * Main orchestrator: wires PM breakdown → Scrum Master coordination → completion.
 */
export class Orchestrator {
  private scrumMaster: ScrumMasterRole | undefined;
  private runtimes: Map<string, AgentRuntime> = new Map();
  private sharedContext: SharedProjectContext | undefined;
  private resume = false;

  constructor(
    private config: TeamConfig,
    private projectDir: string,
  ) {}

  async start(spec: string): Promise<void> {
    this.resume = process.env.ARKALEDGE_RESUME_MODE === "1";
    const eventBus = globalEventBus;

    eventBus.emit({
      type: "project:started",
      agentId: "orchestrator",
      agentRole: "system",
      timestamp: Date.now(),
      summary: "Project started",
      data: { projectDir: this.projectDir },
    });

    // Ensure project directory exists
    await mkdir(this.projectDir, { recursive: true });
    await mkdir(join(this.projectDir, ".arkaledge"), { recursive: true });

    // Build/reuse shared project context for this output project.
    this.sharedContext = await ensureSharedProjectContext(this.projectDir);
    eventBus.emit({
      type: "agent:message",
      agentId: "orchestrator",
      agentRole: "system",
      timestamp: Date.now(),
      summary: `Shared project context ready (${this.sharedContext.context.fingerprint.slice(0, 12)})`,
      data: {
        contextFingerprint: this.sharedContext.context.fingerprint,
        contextFile: this.sharedContext.markdownPath,
      },
    });

    // Create all agent runtimes from config
    this.runtimes = createTeamRuntimes(this.config.team);

    // Initialize Kanban
    const kanban = new KanbanManager(this.projectDir, eventBus);
    await kanban.init();

    let tasks: Task[];
    const existingTasks = await kanban.getAllTasks();
    if (existingTasks.length > 0) {
      if (!this.resume) {
        throw new Error(
          `Output directory already contains ${existingTasks.length} existing tasks. `
          + "Use a fresh --output path or rerun with --resume.",
        );
      }
      tasks = existingTasks;
      eventBus.emit({
        type: "agent:message",
        agentId: "orchestrator",
        agentRole: "system",
        timestamp: Date.now(),
        summary: `Resuming run with ${tasks.length} existing tasks`,
      });
    } else {
      // ── Phase A: PM Breakdown ──
      const pmConfig = this.config.team.find((a) => a.role === "product-manager");
      if (!pmConfig) {
        throw new Error("No product-manager found in team config");
      }

      const pmRuntime = this.runtimes.get(pmConfig.id);
      if (!pmRuntime) {
        throw new Error(`Runtime not found for PM agent: ${pmConfig.id}`);
      }

      const pm = new ProductManagerRole(pmRuntime, kanban, eventBus, this.sharedContext);
      tasks = await pm.breakdownSpec(spec, this.projectDir);

      eventBus.emit({
        type: "agent:message",
        agentId: "orchestrator",
        agentRole: "system",
        timestamp: Date.now(),
        summary: `PM created ${tasks.length} tasks — starting engineering phase`,
      });
    }

    // ── Phase B: Scrum Master Coordination ──
    // Gather engineer runtimes with their configs
    const engineerEntries = new Map<string, { runtime: AgentRuntime; config: AgentConfig }>();
    for (const agentConfig of this.config.team) {
      if (agentConfig.role === "engineer") {
        const runtime = this.runtimes.get(agentConfig.id);
        if (runtime) {
          engineerEntries.set(agentConfig.id, { runtime, config: agentConfig });
        }
      }
    }

    if (engineerEntries.size === 0) {
      throw new Error("No engineers found in team config");
    }

    this.scrumMaster = new ScrumMasterRole(
      engineerEntries,
      kanban,
      eventBus,
      this.config.workflow,
      new WorktreeManager(this.projectDir),
      this.sharedContext,
    );

    await this.scrumMaster.run(this.projectDir);

    eventBus.emit({
      type: "project:completed",
      agentId: "orchestrator",
      agentRole: "system",
      timestamp: Date.now(),
      summary: "Project completed",
      data: { totalTasks: tasks.length },
    });
  }

  async stop(): Promise<void> {
    this.scrumMaster?.stop();

    // Abort all running runtimes
    const abortPromises: Promise<void>[] = [];
    for (const runtime of this.runtimes.values()) {
      abortPromises.push(runtime.abort());
    }
    await Promise.allSettled(abortPromises);
  }
}
