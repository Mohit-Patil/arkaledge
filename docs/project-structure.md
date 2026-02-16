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
|   |   |   |-- api-server.ts            # HTTP API server (REST + SSE)
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
|   |-- dashboard/                # Web UI - Vite + React, wired to live API
|   |   |-- src/
|   |   |   |-- App.tsx                # Main app with live kanban, feed, team status
|   |   |   |-- main.tsx
|   |   |   |-- types.ts              # Browser-side type definitions
|   |   |   |-- hooks/
|   |   |   |   |-- useApi.ts         # REST + SSE hook (EventSource + fetch)
|   |   |   |-- components/           # Legacy components (unused, kept for reference)
|   |   |   |-- styles/
|   |   |       |-- colors.css
|   |   |       |-- typography.css
|   |   |       |-- animations.css
|   |   |       |-- components.css
|   |   |-- package.json
|   |-- cli/                      # CLI entry point
|       |-- src/
|       |   |-- index.ts          # CLI options parser + orchestrator launcher
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
    |-- README.md
    |-- onboarding.md
```

## Package Relationships

```
@arkaledge/cli ------> @arkaledge/core
@arkaledge/dashboard -> HTTP API served by @arkaledge/core
```

- `@arkaledge/core` is the foundational package with zero internal dependencies
- `@arkaledge/cli` provides the command-line interface, depends on core
- `@arkaledge/dashboard` provides a read-only live dashboard and talks to the API over HTTP (no direct workspace dependency on `@arkaledge/core`)
- External SDK packages (`@anthropic-ai/claude-agent-sdk`, `@openai/codex-sdk`) are optional peer dependencies, dynamically imported at runtime
