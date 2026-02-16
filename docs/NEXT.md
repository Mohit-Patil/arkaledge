# Next: PM Completeness Loop + Phase 5 Plugins

## Status

Phases 1-4 are complete:

- **Phase 1**: Core Agent Abstraction (CLI, runtimes, event bus)
- **Phase 2**: Multi-Agent Orchestration + Kanban (PM, SM, Engineers, Reviewer)
- **Phase 3**: Git Worktrees + PR Review Flow (isolation, diffs, merge)
- **Phase 4**: Web Dashboard (read-only live dashboard with REST + SSE)

Phase 4 delivered:
- `packages/core/src/api-server.ts` — `node:http` API server (zero deps)
- `GET /api/tasks` (REST) and `GET /api/events` (SSE stream)
- CLI starts API server on port 4400 alongside orchestrator
- Dashboard wired to live data via `useApi` hook (EventSource + fetch)
- Live kanban board, agent feed, team status, sprint progress
- Husky pre-commit hook running lint + typecheck

## What Is Next

### 1. PM Completeness Check Loop

After Scrum Master reaches completion, PM should re-read delivered output and decide whether follow-up tasks are needed.

- Add PM "gap analysis" pass over completed project
- If gaps found: append backlog tasks and re-enter Scrum Master loop
- If no gaps: emit final `project:completed`

### 2. Dashboard Enhancements (Optional)

The dashboard is functional but could be improved:

- Expandable reasoning (summary vs detail toggle per event)
- Task detail modal (show description, acceptance criteria, history)
- Responsive layout for tablet/mobile
- Dark/light theme toggle (currently dark-only)

### 3. Phase 5: Plugin System + Extensibility

Plugin discovery/loading exists, but runtime wiring is still pending.

- Inject plugin tools into agent runs
- Trigger plugin lifecycle hooks (`onProjectStart`, `onTaskComplete`, `onProjectComplete`)
- Add example plugin execution path in end-to-end orchestration
- Publish example plugin packages in-repo (currently not included)

## Verification Targets

```bash
# Full build + lint + typecheck
npm run build
npm run lint
npm run typecheck

# Team orchestration (requires SDK keys)
node packages/cli/dist/index.js \
  --spec ./spec.md \
  --config examples/team-config.yaml \
  --output /tmp/test-project

# Dashboard dev server (while orchestrator runs)
cd packages/dashboard && npm run dev
# Open http://localhost:3000
```

Expected:
- Engineers run in isolated task worktrees
- Reviewer evaluates branch diff and merges approved work to `main`
- Dashboard shows real-time kanban updates and agent activity
- API server streams events via SSE on port 4400
