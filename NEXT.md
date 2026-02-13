# Next: Phase 3 — Git Worktrees + PR Review Flow

## Status

Phase 1 (Core Agent Abstraction) and Phase 2 (Multi-Agent Orchestration + Kanban) are complete. All code compiles, the monorepo builds cleanly.

## What Exists

### Phase 1

- Unified `AgentRuntime` interface with Claude and Codex adapters
- `AgentFactory` to create runtimes from YAML config
- `ConfigLoader` with Zod validation
- `EventBus` for real-time event streaming
- Plugin type definitions and loader
- CLI entry point (`arkaledge run`)

### Phase 2

- `KanbanManager` — file-based task state with `proper-lockfile` locking
- `ProductManagerRole` — breaks product specs into structured tasks via LLM
- `EngineerRole` — task execution with self-correction loop (up to 3 retries)
- `ReviewerRole` — code review with JSON verdict (approved/rejected)
- `ScrumMasterRole` — coordination loop: assigns tasks, triggers reviews, tracks idle/busy engineers
- `FailureHandler` — retry with exponential backoff → reassign to different SDK/model → block
- `Orchestrator` — wires PM breakdown → Scrum Master loop → completion
- CLI `--spec` and `--output` flags for team orchestration mode

## What Phase 3 Needs

### 1. WorktreeManager (`packages/core/src/worktree-manager.ts`)

Manages git worktrees for parallel engineer isolation.

```typescript
class WorktreeManager {
  constructor(projectDir: string)
  async createWorktree(taskId: string, branchName: string): Promise<string> // returns worktree path
  async removeWorktree(taskId: string): Promise<void>
  async mergeToMain(branchName: string): Promise<void>
  async getDiff(branchName: string): Promise<string>
}
```

### 2. Update Engineer Role

- Work in assigned worktree instead of shared project directory
- Commit changes to task branch on completion
- Pass worktree path to `runtime.run()` as working directory

### 3. Update Reviewer Role

- Read diffs between task branch and main (`git diff main..branch`)
- Include diff in the review prompt for the agent
- On approval: merge branch to main via WorktreeManager
- On rejection: engineer gets feedback, fixes in same worktree

### 4. Update Scrum Master

- Create worktree when assigning task to engineer
- Cleanup worktree after task reaches `done`

### 5. PM Completeness Check

- After all tasks are done, PM reviews the project and creates follow-up tasks if gaps exist
- Loop back to Scrum Master if new tasks were created

## How to Verify

```bash
npm run build

# Run with a simple spec (requires SDK API keys)
node packages/cli/dist/index.js run \
  --spec ./spec.md \
  --config examples/team-config.yaml \
  --output /tmp/test-project
```

Expected: Two engineers work on different tasks simultaneously in separate worktrees, reviewer reads diffs, approves, code merges cleanly to main.
