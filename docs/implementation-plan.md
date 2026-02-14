# Implementation Plan

## Phase 1: Core Agent Abstraction (Complete)

**Goal**: Run a single agent (either SDK) with a prompt, get streaming output.

- [x] Initialize monorepo: `package.json`, `tsconfig.json`, `turbo.json`
- [x] Implement `AgentRuntime` interface
- [x] Implement `ClaudeAgentRuntime` (wraps `query()`)
- [x] Implement `CodexAgentRuntime` (wraps `startThread().runStreamed()`)
- [x] Implement `AgentFactory` -- creates runtime from config
- [x] Implement `ConfigLoader` -- parses team YAML config
- [x] CLI entry point: `arkaledge run --prompt "..." --sdk claude --model ...`
- [x] Basic types (`types.ts`)
- [x] Event bus
- [x] Plugin type definitions and loader

**Verification**: Run `arkaledge run --prompt "Create a hello world Express app" --sdk claude` and `--sdk codex` -- both produce working code.

---

## Phase 2: Multi-Agent Orchestration + Kanban (Complete)

**Goal**: PM creates tasks, Scrum Master assigns them, Engineers execute.

- [x] Implement `KanbanManager` (read/write/lock `kanban.json`)
- [x] Implement PM role: spec to tasks with acceptance criteria
- [x] Implement Scrum Master role: assignment loop, monitoring
- [x] Implement Engineer role: task execution, test writing, self-correction loop
- [x] Implement Reviewer role: JSON verdict, approval/rejection flow
- [x] Implement `Orchestrator` -- boots all agents, manages lifecycle
- [x] Implement `FailureHandler` -- retry with exponential backoff, reassign, block pipeline
- [x] Wire up the full execution flow
- [x] CLI `--spec` and `--output` flags for team orchestration mode

**Verification**: Provide a simple spec ("build a CLI calculator"), watch PM create tasks, engineers build it, review completes.

---

## Phase 3: Git Worktrees + PR Review Flow

**Goal**: Engineers work in isolated worktrees, reviewers check diffs.

- [x] Implement `WorktreeManager` -- create/remove git worktrees
- [x] Update Engineer role to work in assigned worktree
- [x] Implement Reviewer role: diff reading, approval/rejection
- [x] Merge flow: approved to merge to main, cleanup worktree
- [x] Rejection flow: feedback, task back to in_progress

**Verification**: Two engineers work on different tasks simultaneously in separate worktrees, reviewer approves, code merges cleanly.

---

## Phase 4: Web Dashboard

**Goal**: Real-time web UI showing agent activity.

- [x] Dashboard UI prototype setup in `packages/dashboard` (Vite + React)
- [ ] SSE endpoint (`/api/events`) streaming from EventBus
- [ ] Launch page: spec input + team config
- [ ] Project view: agent cards + log streams
- [ ] Expandable reasoning (summary vs detail toggle)
- [ ] Mini Kanban board visualization
- [ ] Wire dashboard to orchestrator API

**Verification**: Start a project from the dashboard, watch agents work in real-time, see tasks flow through Kanban.

---

## Phase 5: Plugin System + Extensibility

**Goal**: Users can add custom roles, tools, and workflows.

- [ ] Plugin loader: discover + load plugins from config
- [ ] Plugin tool injection: make plugin tools available to agents
- [ ] Custom role support: define new roles via YAML config
- [ ] Workflow customization: configurable Kanban columns + review gates
- [ ] Example plugins: deploy-vercel, run-playwright

**Verification**: Add a custom "QA Engineer" role via config with a Playwright plugin, see it participate in the workflow.

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | latest | Claude agent runtime |
| `@openai/codex-sdk` | latest | Codex agent runtime |
| `react` + `vite` | current workspace versions | Dashboard UI |
| `proper-lockfile` | ^4 | File-level locking for kanban.json |
| `zod` | ^3 | Config validation |
| `yaml` | ^2 | YAML parsing |
| `eventemitter3` | ^5 | Event bus |
| `nanoid` | ^5 | ID generation |
| `turbo` | ^2 | Monorepo build system |

---

## SDK Maintenance Automation

- `/.github/workflows/ci.yml` runs typecheck/build plus SDK contract smoke checks for the peer-version ranges declared in `packages/core/package.json`.
- `/.github/workflows/sdk-latest-canary.yml` runs weekly against `@latest` Codex + Claude SDK releases to detect upstream breaking changes early.
- `/.github/dependabot.yml` opens weekly dependency update PRs for npm and GitHub Actions.
