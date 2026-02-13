# Arkaledge Architecture

## Overview

Arkaledge is an autonomous AI Scrum team platform where a team of AI agents (Product Manager, Scrum Master, 2-3 Engineers) self-organizes to build software products. Users provide a product spec; the agent team manages work using Kanban-style continuous flow, with each agent powered by a configurable model/SDK.

## High-Level Architecture

```
User --> Web Dashboard --> Orchestrator --> Agent Pool
                               |
                         Kanban State (JSON)
                               |
                       Git Worktrees (per engineer)
                               |
                         Final Product Repo
```

### Components

| Component | Description |
|-----------|-------------|
| **Orchestrator** | Main control loop that boots agents, manages lifecycle, and coordinates the Kanban flow |
| **Agent Pool** | Set of AI agents (PM, SM, Engineers) each running via an AgentRuntime |
| **Kanban State** | JSON file (`kanban.json`) tracking all tasks and their status |
| **Git Worktrees** | Isolated working directories per engineer for parallel development |
| **Event Bus** | In-process event emitter for real-time observability |
| **Web Dashboard** | Next.js app for launching projects and monitoring agent activity |

## SDK Abstraction

Two SDK adapters sit behind a unified `AgentRuntime` interface:

- **ClaudeAgentRuntime** - wraps `@anthropic-ai/claude-agent-sdk` `query()`
- **CodexAgentRuntime** - wraps `@openai/codex-sdk` `Codex.startThread().runStreamed()`

This allows mixing models and SDKs within the same team. An engineer can be powered by Claude while another uses Codex.

## Data Flow

1. User submits a product spec via the dashboard
2. Orchestrator initializes a project directory with git
3. PM agent reads the spec and creates tasks in `kanban.json`
4. Scrum Master monitors Kanban state in a loop:
   - Assigns backlog tasks to idle engineers
   - Creates git worktrees per assignment
   - Launches engineer agents with task prompts
5. Engineers work in their worktrees:
   - Write code and tests
   - Self-correct on test failures (up to 3 attempts)
   - Move completed tasks to review
6. Scrum Master assigns reviewers (different engineer reviews the diff)
7. Reviewer approves (merge to main) or rejects (back to engineer)
8. Loop continues until all tasks are done
9. PM verifies completeness and creates follow-up tasks if needed
10. Orchestrator emits `project_complete` event

## Concurrency Model

- Each engineer works in an isolated git worktree
- Kanban state uses file-level locking via `proper-lockfile`
- The orchestrator is single-threaded (Node.js event loop) but agents run concurrently via async iterables
- Events are emitted asynchronously and streamed to the dashboard via SSE

## Failure Handling

Three-stage pipeline:

1. **Retry** - Same agent retries with exponential backoff (up to 3 attempts)
2. **Reassign** - Task moves to a different agent/model
3. **Block** - Task marked as blocked, human intervention needed

## Security Considerations

- Agent SDKs run with `bypassPermissions` (Claude) or `approval_policy: "never"` (Codex)
- Agents are sandboxed to their worktree directories
- No network access beyond what the SDK provides
- API keys are loaded from environment variables, never committed
