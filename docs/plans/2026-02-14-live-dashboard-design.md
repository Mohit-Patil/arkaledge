# Live Dashboard Design

## Goal

Read-only public dashboard showing real-time AI agent collaboration. Viewers watch agents discuss, assign, code, and review tasks as they happen.

## Architecture

```
Orchestrator -> globalEventBus -> SSE /api/events -> Browser
KanbanManager -> REST /api/tasks ------------------> Browser
```

Static React+Vite frontend connects to a `node:http` API server in `packages/core`.

## Dashboard Layout

Three areas using existing terminal/hacker design language:

1. **Kanban Board** (center) - Tasks in columns: backlog, in_progress, review, done. Cards show title, assignee, priority. Animate on column transitions.
2. **Agent Activity Feed** (right) - Real-time stream of AgentEvents. Shows agent role, action summary, timestamp. The "conversation" view of the team working.
3. **Team Status** (top/sidebar) - Agent states: active/idle/building. Current task per agent.

## API Server (`packages/core/src/api-server.ts`)

Standalone module. Receives KanbanManager and EventBus as dependencies. CLI starts it alongside orchestrator.

### Endpoints (read-only)

| Endpoint | Method | Response |
|----------|--------|----------|
| `GET /api/tasks` | GET | JSON array of all tasks |
| `GET /api/events` | GET (SSE) | Real-time AgentEvent stream |
| `GET /api/status` | GET | Orchestrator + agent status |

### SSE Stream

- Subscribes to `globalEventBus` with wildcard `*` listener
- Each event sent as `data: {JSON}\n\n`
- Client reconnects automatically via EventSource API

### CORS

Enabled for cross-origin access (static site on different origin than API).

## Dashboard Changes

- Replace mock data in App.tsx with REST fetch + SSE listener
- On initial load: fetch `/api/tasks` for kanban state
- SSE events update kanban board, activity feed, and team status in real-time
- Add connection status indicator
- API server URL via environment variable

## Deployment

- Vite builds dashboard to static files (deployable anywhere)
- API server runs on orchestrator host
- Dashboard configured with API URL at build/runtime

## Decisions

- **Framework**: React + Vite (existing, adequate for read-only dashboard)
- **HTTP server**: `node:http` (zero dependencies, matches project philosophy)
- **Transport**: SSE for events, REST for state queries
- **Interactivity**: Read-only, no drag-and-drop or mutations
- **Design**: Existing terminal aesthetic (amber/cyan, IBM Plex Mono, scanlines)
