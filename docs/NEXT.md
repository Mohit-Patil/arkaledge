# Next: Phase 3.5/4 — PM Completeness Loop + Live Dashboard

## Status

Phase 1 (Core Agent Abstraction), Phase 2 (Multi-Agent Orchestration + Kanban), and Phase 3 (Git Worktrees + PR review flow) are complete.

Implemented in Phase 3:

- `WorktreeManager` for per-task worktree lifecycle
- Engineer execution in task worktrees
- Required task-branch commit before review
- Reviewer diff-driven review prompt (`main...branch`)
- Approval flow that merges to `main` and removes task worktree
- Scrum Master worktree provisioning and auto-approval merge path

## What Is Next

### 1. PM Completeness Check Loop

After Scrum Master reaches completion, PM should re-read delivered output and decide whether follow-up tasks are needed.

- Add PM "gap analysis" pass over completed project
- If gaps found: append backlog tasks and re-enter Scrum Master loop
- If no gaps: emit final `project:completed`

### 2. Phase 4 Dashboard Integration

Current `packages/dashboard` is a Vite + React UI prototype. Next step is real-time runtime integration.

- Backend API endpoint to launch orchestration runs
- Event stream endpoint for `EventBus` messages
- Live task/kanban polling or streaming from `.arkaledge/kanban.json`
- Project detail view wired to real project state (not mock data)

### 3. Phase 5 Plugin Runtime Wiring

Plugin discovery/loading exists, but runtime wiring is still pending.

- Inject plugin tools into agent runs
- Trigger plugin lifecycle hooks (`onProjectStart`, `onTaskComplete`, `onProjectComplete`)
- Add example plugin execution path in end-to-end orchestration

## Verification Targets

```bash
# Core + CLI compile
cd packages/core && npm run build
cd ../cli && npm run build

# Team orchestration smoke run (requires SDK keys)
node packages/cli/dist/index.js run \
  --spec ./spec.md \
  --config examples/team-config.yaml \
  --output /tmp/test-project
```

Expected currently:

- Engineers run in isolated task worktrees
- Reviewer evaluates branch diff and merges approved work to `main`
- Worktrees are removed after approval

Expected after next phase:

- PM can generate follow-up tasks after initial "done" pass
- Dashboard shows real-time project state from orchestrator events
