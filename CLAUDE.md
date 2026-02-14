# Arkaledge - Autonomous AI Scrum Team Platform

Arkaledge is an autonomous AI Scrum team where AI agents (Product Manager, Scrum Master, Engineers) self-organize to build products from specs. Each agent is powered by Claude or Codex SDK via a unified runtime.

## Quick Reference

| Task | Command |
|------|---------|
| Development | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Run project | `npm run build && node packages/cli/dist/index.js run --spec <spec.md> --config <config.yaml> --output <dir>` |
| Build | `npm run build` |

## Architecture

```
User --> Dashboard/CLI --> Orchestrator --> Agent Pool
                              |
                        Kanban State
                              |
                      Git Worktrees (per engineer)
```

**Components:** Orchestrator, Agent Pool (PM/SM/Engineers), Kanban State, Event Bus, Git Worktrees

See [docs/architecture.md](docs/architecture.md) for full details.

## Code Layout

| Path | Purpose |
|------|---------|
| `packages/core/src/orchestrator.ts` | Main orchestration loop |
| `packages/core/src/kanban.ts` | Task state management |
| `packages/core/src/agents/` | SDK adapters (claude-runtime.ts, codex-runtime.ts) |
| `packages/core/src/roles/` | Agent behaviors (pm, sm, engineer, reviewer) |
| `packages/core/src/types.ts` | TypeScript interfaces + Zod schemas |

## Agent Roles

| Role | Responsibility |
|------|----------------|
| **Product Manager** | Breaks specs into tasks in kanban.json |
| **Scrum Master** | Assigns tasks, monitors progress, triggers reviews |
| **Engineer** | Implements in git worktree, self-corrects on failures |
| **Reviewer** | Reviews diffs, approves/rejects, merges |

See [docs/agent-roles.md](docs/agent-roles.md) for detailed behaviors.

## Task Flow

`backlog` → `in_progress` → `review` → `done`

See [docs/execution-flow.md](docs/execution-flow.md) for state machine and failure handling.

## Configuration

YAML with team, workflow, and plugins. See [docs/team-configuration.md](docs/team-configuration.md).

## Environment

Required environment variables:
- `ANTHROPIC_API_KEY` - For Claude SDK
- `OPENAI_API_KEY` - For Codex SDK

Set these in your shell or `.env` file before running.

## Interfaces

- `AgentRuntime` - unified SDK interface
- `Task` - task structure with status, priority, history
- `AgentEvent` - event types for observability
- `ArkaledgePlugin` - plugin system

See [docs/interfaces.md](docs/interfaces.md) for all TypeScript definitions.

## Development Status

| Phase | Status |
|-------|--------|
| 1-2 | Complete |
| 3 (Worktrees) | In Progress |
| 4 (Dashboard) | Planned |
| 5 (Plugins) | Planned |

## Deep Dives

When working on specific areas, consult:

- [docs/architecture.md](docs/architecture.md) - Components, data flow, concurrency, security
- [docs/interfaces.md](docs/interfaces.md) - All TypeScript interfaces + Zod schemas
- [docs/agent-roles.md](docs/agent-roles.md) - Detailed PM, SM, Engineer, Reviewer behaviors
- [docs/execution-flow.md](docs/execution-flow.md) - State machine, events, failure pipeline
- [docs/team-configuration.md](docs/team-configuration.md) - YAML config format, validation
- [docs/project-structure.md](docs/project-structure.md) - Monorepo layout details

## Gotchas

- SDK packages are optional peer dependencies - run `npm run check:sdk` to validate
- Git worktrees are created per engineer in the output directory
- CLI entry point is `packages/cli/dist/index.js`, not the src
