# Project Structure

```
arkaledge/
|-- package.json                  # Root monorepo config (npm workspaces)
|-- tsconfig.json                 # Shared TypeScript config
|-- turbo.json                    # Turborepo task definitions
|-- packages/
|   |-- core/                     # Orchestrator + agent runtime
|   |   |-- src/
|   |   |   |-- index.ts                # Public API exports
|   |   |   |-- types.ts                # All shared TypeScript types + Zod schemas
|   |   |   |-- orchestrator.ts         # Main orchestration loop (Phase 2)
|   |   |   |-- kanban.ts               # Kanban state manager (Phase 2)
|   |   |   |-- worktree-manager.ts     # Git worktree lifecycle (Phase 3)
|   |   |   |-- event-bus.ts            # In-process event emitter
|   |   |   |-- failure-handler.ts      # Retry/reassign/kill pipeline (Phase 2)
|   |   |   |-- config-loader.ts        # Load & validate YAML configs
|   |   |   |-- sdk-shims.d.ts          # Type declarations for optional SDK deps
|   |   |   |-- agents/
|   |   |   |   |-- agent-runtime.ts    # Unified AgentRuntime interface
|   |   |   |   |-- claude-runtime.ts   # Claude Agent SDK adapter
|   |   |   |   |-- codex-runtime.ts    # Codex SDK adapter
|   |   |   |   |-- agent-factory.ts    # Creates runtime from config
|   |   |   |-- roles/                  # (Phase 2)
|   |   |   |   |-- product-manager.ts  # PM system prompt + task breakdown
|   |   |   |   |-- scrum-master.ts     # Assignment + monitoring
|   |   |   |   |-- engineer.ts         # Code implementation + testing
|   |   |   |   |-- reviewer.ts         # PR review logic
|   |   |   |-- plugins/
|   |   |   |   |-- plugin-loader.ts    # Dynamic plugin loading
|   |   |   |   |-- plugin-types.ts     # Plugin interface definitions
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |-- dashboard/                # Web UI prototype - Vite + React (Phase 4 integration pending)
|   |   |-- src/
|   |   |   |-- App.tsx
|   |   |   |-- main.tsx
|   |   |   |-- components/
|   |   |   |   |-- ProjectLauncher.tsx
|   |   |   |   |-- ActivityFeed.tsx
|   |   |   |   |-- KanbanBoard.tsx
|   |   |   |   |-- TeamStatus.tsx
|   |   |   |-- styles/
|   |   |       |-- colors.css
|   |   |       |-- typography.css
|   |   |       |-- animations.css
|   |   |       |-- components.css
|   |   |-- package.json
|   |-- cli/                      # CLI entry point
|       |-- src/
|       |   |-- index.ts          # arkaledge run command
|       |-- package.json
|       |-- tsconfig.json
|-- examples/
|   |-- team-config.yaml          # Example team configuration
|-- docs/                         # Architecture documentation
    |-- architecture.md
    |-- interfaces.md
    |-- agent-roles.md
    |-- team-configuration.md
    |-- implementation-plan.md
    |-- project-structure.md
    |-- execution-flow.md
```

## Package Relationships

```
@arkaledge/cli ------> @arkaledge/core
@arkaledge/dashboard -> @arkaledge/core
```

- `@arkaledge/core` is the foundational package with zero internal dependencies
- `@arkaledge/cli` provides the command-line interface, depends on core
- `@arkaledge/dashboard` currently provides a prototype UI, depends on core types
- External SDK packages (`claude-agent-sdk`, `codex-sdk`) are optional peer dependencies, dynamically imported at runtime
