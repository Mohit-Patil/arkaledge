# Arkaledge

Autonomous AI Scrum team platform for spec-to-code orchestration with Claude and Codex runtimes.

## What Arkaledge Does

Arkaledge coordinates a multi-agent software team:

1. Product Manager decomposes a spec into backlog tasks.
2. Scrum Master assigns tasks and drives the workflow.
3. Engineers implement work in isolated git worktrees.
4. Reviewer approves/rejects and optionally merges to `main`.

```
User -> CLI -> Orchestrator -> Agent Pool
                        |
                   Kanban State
                        |
              Git Worktrees (per task)
```

## Current Status

- Phase 1-4 are implemented: runtimes, orchestration, worktree flow, dashboard API + UI.
- Phase 5 (plugin runtime wiring and examples) is next.
- Short-term next work is tracked in `docs/NEXT.md`.

## Requirements

- Node.js `>=20`
- npm `10.9.2` (declared in `packageManager`)
- Git

## SDK Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
```

## Setup

```bash
npm install
npm run build
```

## Quick Start

### 1. Single-agent run

```bash
node packages/cli/dist/index.js --prompt "Create a hello world Express app" --sdk claude
```

### 2. Full team orchestration

```bash
node packages/cli/dist/index.js \
  --spec ./spec.md \
  --config ./examples/team-config.yaml \
  --output ./output
```

### 3. Resume an existing orchestration run

```bash
node packages/cli/dist/index.js \
  --spec ./spec.md \
  --config ./examples/team-config.yaml \
  --output ./output \
  --resume
```

Notes:
- For a fresh run, `--output` must point to an empty directory.
- `--resume` expects existing state at `<output>/.arkaledge/kanban.json`.
- CLI flags are passed directly; there is no `run` positional subcommand.

## Dashboard

The CLI starts the API server at `http://localhost:4400` during orchestration.

In a second terminal:

```bash
cd packages/dashboard
npm run dev
```

Open `http://localhost:3000`.

## Root Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Build all workspaces via Turbo (`turbo build`) |
| `npm run dev` | Run workspace dev/watch processes (`turbo dev`) |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run install:sdk-peers` | Install SDK peer versions declared in `packages/core/package.json` |
| `npm run check:sdk-contracts` | Validate expected Codex/Claude SDK runtime + type contracts |
| `npm run check:sdk` | Run peer install + contract checks together |
| `npm run prepare` | Install Husky hooks when available |

## Workspace Layout

| Path | Purpose |
|---|---|
| `packages/core` | Orchestrator, runtime adapters, kanban, worktree manager, API server |
| `packages/cli` | CLI entrypoint for single-agent and orchestrated runs |
| `packages/dashboard` | Live dashboard (Vite + React) |
| `examples/team-config.yaml` | Example team configuration |
| `scripts` | SDK peer install and contract check helpers |
| `docs` | Architecture, interfaces, flow, config, roadmap docs |

## Documentation

- Start here: `docs/README.md`
- New contributors: `docs/onboarding.md`
- Architecture: `docs/architecture.md`
- Execution model: `docs/execution-flow.md`
- Team config: `docs/team-configuration.md`
- Project layout: `docs/project-structure.md`
- Roadmap and current next steps: `docs/implementation-plan.md`, `docs/NEXT.md`

## License

Private - All rights reserved.
