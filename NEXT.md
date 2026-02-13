# Next: Phase 2 — Multi-Agent Orchestration + Kanban

## Status

Phase 1 (Core Agent Abstraction) is complete. All code compiles, the monorepo builds cleanly.

## What Exists

- Unified `AgentRuntime` interface with Claude and Codex adapters
- `AgentFactory` to create runtimes from YAML config
- `ConfigLoader` with Zod validation
- `EventBus` for real-time event streaming
- Plugin type definitions and loader
- CLI entry point (`arkaledge run`)
- Full docs in `docs/`

## What Phase 2 Needs

### 1. KanbanManager (`packages/core/src/kanban.ts`)

Read/write/lock `kanban.json` using `proper-lockfile` (already installed).

```typescript
class KanbanManager {
  constructor(projectDir: string);
  async load(): Promise<KanbanState>;
  async save(state: KanbanState): Promise<void>;
  async addTask(task: Omit<Task, "id" | "history" | "retryCount">): Promise<Task>;
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  async getTasksByStatus(status: TaskStatus): Promise<Task[]>;
  async assignTask(taskId: string, agentId: string): Promise<Task>;
}
```

- State file lives at `<projectDir>/.arkaledge/kanban.json`
- Use `proper-lockfile` for concurrent access safety
- Emit events via `EventBus` on every state change

### 2. Product Manager Role (`packages/core/src/roles/product-manager.ts`)

- Takes a raw product spec (string) as input
- Uses an AgentRuntime to break the spec into epics and tasks
- Writes tasks to KanbanManager with status `backlog`
- Each task needs: title, description, acceptanceCriteria[], priority
- System prompt should instruct the agent to output structured JSON

### 3. Scrum Master Role (`packages/core/src/roles/scrum-master.ts`)

Runs in a loop:

```
while (not all tasks done):
  backlog = kanban.getTasksByStatus("backlog")
  idleEngineers = getIdleEngineers()

  for each (task, engineer) pair:
    kanban.assignTask(task.id, engineer.id)
    createWorktree(task)
    launchEngineer(engineer, task)

  reviewTasks = kanban.getTasksByStatus("review")
  for each reviewTask:
    assignReviewer(reviewTask)  // different engineer than author

  sleep(pollInterval)
```

### 4. Engineer Role (`packages/core/src/roles/engineer.ts`)

- Receives a task from KanbanManager
- Works in assigned git worktree (Phase 3 will add worktree isolation; for now use a subdirectory)
- System prompt instructs: read task, write code, write tests, run tests
- Self-correction loop: if tests fail, read output, fix, retry (up to 3x)
- On success: commit, move task to `review`
- On failure after 3 retries: mark task `blocked`

### 5. Reviewer Role (`packages/core/src/roles/reviewer.ts`)

- Reuses Engineer's AgentRuntime with a review-focused system prompt
- Reads the diff between task branch and main
- Checks code quality, test coverage, acceptance criteria
- Approved: merge, move task to `done`
- Rejected: add review comments, move task back to `in_progress`

### 6. Orchestrator (`packages/core/src/orchestrator.ts`)

Main entry point that ties everything together:

```typescript
class Orchestrator {
  constructor(config: TeamConfig, projectDir: string);
  async start(spec: string): Promise<void>;
  async stop(): Promise<void>;
}
```

Flow:
1. Initialize project dir + git repo
2. Create agent runtimes from config
3. Run PM to create tasks
4. Start Scrum Master loop
5. Wait for all tasks to reach `done`
6. Emit `project:completed`

### 7. FailureHandler (`packages/core/src/failure-handler.ts`)

```typescript
async function handleFailure(task: Task, error: Error, agents: AgentRuntime[]): Promise<void> {
  if (task.retryCount < maxRetries) {
    task.retryCount++;
    await delay(2 ** task.retryCount * 1000);  // exponential backoff
    return;  // re-run same agent
  }

  const alternate = agents.find(a => a.id !== task.assignee);
  if (alternate) {
    task.assignee = alternate.id;
    task.retryCount = 0;
    return;  // reassign
  }

  task.status = "blocked";  // human intervention needed
}
```

## Key Design Decisions

- **Polling vs events for Scrum Master**: Use a polling loop (e.g., every 2 seconds) that reads KanbanManager state. Simpler than reactive, and the file lock prevents races.
- **Structured output from PM**: The PM agent should return JSON-parseable task lists. Use the system prompt to enforce output format. Parse with Zod.
- **No worktrees yet**: Phase 2 can use subdirectories for isolation. Phase 3 adds proper `git worktree` support.
- **Agent concurrency**: Engineers run concurrently via `Promise.all` on their async iterables. The Scrum Master awaits idle agents before assigning new tasks.

## How to Verify

```bash
# Build everything
npm run build

# Run with a simple spec (requires SDK API keys)
node packages/cli/dist/index.js run \
  --prompt "Build a CLI calculator that supports add, subtract, multiply, divide" \
  --config examples/team-config.yaml
```

Expected behavior:
1. PM creates 4-6 tasks in kanban.json
2. Scrum Master assigns tasks to engineers
3. Engineers write code and tests
4. Reviews complete, code merges
5. Final output: working calculator in the project directory

## Files to Create

| File | Description |
|------|-------------|
| `packages/core/src/kanban.ts` | KanbanManager class |
| `packages/core/src/orchestrator.ts` | Main orchestration loop |
| `packages/core/src/failure-handler.ts` | Retry/reassign/block pipeline |
| `packages/core/src/roles/product-manager.ts` | PM role logic |
| `packages/core/src/roles/scrum-master.ts` | SM role logic |
| `packages/core/src/roles/engineer.ts` | Engineer role logic |
| `packages/core/src/roles/reviewer.ts` | Reviewer role logic |

Update `packages/core/src/index.ts` to export the new modules.
