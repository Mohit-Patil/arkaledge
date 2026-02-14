# Arkaledge

**Autonomous AI Scrum Team Platform**

Arkaledge is an autonomous AI Scrum team platform where a team of AI agents (Product Manager, Scrum Master, Engineers) self-organizes to build software products from specifications. Each agent is powered by Claude or Codex SDK via a unified runtime.

## Overview

```
User --> CLI/Dashboard --> Orchestrator --> Agent Pool
                              |
                        Kanban State
                              |
                      Git Worktrees (per engineer)
```

Give Arkaledge a product spec, and it will:
1. Break down the spec into tasks (Product Manager)
2. Assign tasks to engineers and coordinate work (Scrum Master)
3. Implement in isolated git worktrees (Engineers)
4. Review code and merge to main (Reviewer)

## Quick Start

```bash
# Build the project
npm run build

# Run a single agent task
node packages/cli/dist/index.js run -p "Create a hello world Express app"

# Orchestrate a full team with a spec
node packages/cli/dist/index.js run --spec <spec.md> --config <config.yaml> --output <dir>
```

## Architecture

### Components

| Component | Description |
|-----------|-------------|
| **Orchestrator** | Main control loop that boots agents, manages lifecycle, and coordinates the Kanban flow |
| **Agent Pool** | Set of AI agents (PM, SM, Engineers) each running via an AgentRuntime |
| **Kanban State** | JSON file (`kanban.json`) tracking all tasks and their status |
| **Git Worktrees** | Isolated working directories per engineer for parallel development |
| **Event Bus** | In-process event emitter for real-time observability |
| **CLI** | Command-line interface for running agents and orchestration |

### SDK Abstraction

Two SDK adapters sit behind a unified `AgentRuntime` interface:

- **ClaudeAgentRuntime** - wraps `@anthropic-ai/claude-agent-sdk`
- **CodexAgentRuntime** - wraps `@openai/codex-sdk`

This allows mixing models and SDKs within the same team.

## Agent Roles

| Role | Responsibility |
|------|----------------|
| **Product Manager** | Breaks specs into tasks in kanban.json |
| **Scrum Master** | Assigns tasks, monitors progress, triggers reviews |
| **Engineer** | Implements in git worktree, self-corrects on failures |
| **Reviewer** | Reviews diffs, approves/rejects, merges |

## Task Flow

`backlog` → `in_progress` → `review` → `done`

## Configuration

Teams are configured via YAML files:

```yaml
team:
  - role: product-manager
    sdk: claude
    model: claude-opus-4-6

  - role: scrum-master
    sdk: claude
    model: claude-sonnet-4-5-20250929

  - role: engineer
    id: eng-1
    sdk: codex
    model: o3

  - role: engineer
    id: eng-2
    sdk: claude
    model: claude-sonnet-4-5-20250929

workflow:
  max_retries: 3
  review_required: true
  auto_merge: true
```

## Project Structure

```
arkaledge/
├── packages/
│   ├── core/           # Orchestrator + agent runtime
│   │   └── src/
│   │       ├── orchestrator.ts
│   │       ├── kanban.ts
│   │       ├── agents/       # Claude/Codex runtimes
│   │       └── roles/        # PM, SM, Engineer, Reviewer
│   ├── dashboard/      # Web UI (Next.js)
│   └── cli/            # CLI entry point
├── docs/               # Architecture documentation
└── examples/           # Example configurations
```

## Development Status

| Phase | Status |
|-------|--------|
| 1-2 (Core) | Complete |
| 3 (Worktrees) | In Progress |
| 4 (Dashboard) | Planned |
| 5 (Plugins) | Planned |

## Requirements

- Node.js >= 20
- npm 10.9.2
- Git

## API Keys

Set environment variables for the SDKs:

```bash
# Claude SDK
export ANTHROPIC_API_KEY="sk-..."

# Codex SDK
export OPENAI_API_KEY="sk-..."
```

## License

Private - All rights reserved

<!-- STATS_START -->
## Project Statistics

| Metric | Value |
|--------|-------|
| TypeScript Files | - |
| Lines of Code | - |
| Last Updated | - |

_Last automatically updated via GitHub Actions_
<!-- STATS_END -->
