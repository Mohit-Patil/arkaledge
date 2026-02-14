# Live Dashboard Wiring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing React dashboard to the orchestrator backend via REST + SSE so viewers can watch AI agents collaborate in real-time.

**Architecture:** A `node:http` API server in `packages/core` exposes kanban state via REST and streams `AgentEvent`s via SSE. The CLI starts this server alongside the orchestrator. The dashboard fetches initial state, then subscribes to SSE for live updates. Dashboard is read-only.

**Tech Stack:** node:http (API), EventSource (SSE client), React 19, Vite 7, existing CSS design system.

---

### Task 1: Create the API server module

**Files:**
- Create: `packages/core/src/api-server.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Create `packages/core/src/api-server.ts`**

```typescript
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import type { KanbanManager } from "./kanban.js";
import type { EventBus } from "./event-bus.js";
import type { AgentEvent } from "./types.js";

export interface ApiServerOptions {
  kanban: KanbanManager;
  eventBus: EventBus;
  port?: number;
}

export function createApiServer(options: ApiServerOptions): Server {
  const { kanban, eventBus, port = 4400 } = options;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    try {
      if (url.pathname === "/api/tasks" && req.method === "GET") {
        const tasks = await kanban.getAllTasks();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tasks));
        return;
      }

      if (url.pathname === "/api/events" && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        const handler = (event: AgentEvent) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        eventBus.on("*", handler);

        req.on("close", () => {
          eventBus.off("*", handler);
        });

        return;
      }

      // 404 for everything else
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  return server;
}
```

**Step 2: Export from `packages/core/src/index.ts`**

Add at the end of the file:

```typescript
// API Server
export { createApiServer, type ApiServerOptions } from "./api-server.js";
```

**Step 3: Build and verify**

Run: `npm run build -w packages/core`
Expected: Clean build, no errors

**Step 4: Commit**

```bash
git add packages/core/src/api-server.ts packages/core/src/index.ts
git commit -m "feat(core): add HTTP API server with REST + SSE endpoints"
```

---

### Task 2: Wire API server into CLI orchestration mode

**Files:**
- Modify: `packages/cli/src/index.ts`

**Step 1: Import `createApiServer` and start server in orchestration mode**

In `packages/cli/src/index.ts`, add the import:

```typescript
import {
  createAgentRuntime,
  loadConfig,
  globalEventBus,
  Orchestrator,
  createApiServer,
  KanbanManager,
  type AgentConfig,
  type AgentMessage,
  type AgentEvent,
} from "@arkaledge/core";
```

In the orchestration block (after `const orchestrator = new Orchestrator(config, outputDir);`), add the API server startup:

```typescript
    // Start API server for dashboard
    const kanban = new KanbanManager(outputDir, globalEventBus);
    await kanban.init();

    const apiServer = createApiServer({
      kanban,
      eventBus: globalEventBus,
      port: 4400,
    });

    await new Promise<void>((resolve) => {
      apiServer.listen(4400, () => {
        console.log(`📡 Dashboard API: http://localhost:4400`);
        resolve();
      });
    });
```

Update the shutdown handler to close the server:

```typescript
    const shutdown = () => {
      console.log("\n🛑 Shutting down...");
      apiServer.close();
      orchestrator.stop().then(() => process.exit(0));
    };
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build, no errors

**Step 3: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): start API server alongside orchestrator"
```

---

### Task 3: Add shared types file to dashboard

**Files:**
- Create: `packages/dashboard/src/types.ts`

**Step 1: Create dashboard types**

The dashboard can't import from `@arkaledge/core` directly (it's a browser app), so define the types it needs:

```typescript
export type TaskStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "high" | "medium" | "low";

export interface TaskEvent {
  timestamp: number;
  agentId: string;
  action: string;
  detail?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  assignee?: string;
  epic?: string;
  priority: TaskPriority;
  branch?: string;
  retryCount: number;
  history: TaskEvent[];
  createdBy: string;
  reviewComments?: string[];
}

export type EventType =
  | "agent:started"
  | "agent:message"
  | "agent:completed"
  | "agent:error"
  | "task:created"
  | "task:assigned"
  | "task:status_changed"
  | "review:started"
  | "review:approved"
  | "review:rejected"
  | "project:started"
  | "project:completed";

export interface AgentEvent {
  type: EventType;
  agentId: string;
  agentRole: string;
  timestamp: number;
  summary: string;
  detail?: string;
  data?: Record<string, unknown>;
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/src/types.ts
git commit -m "feat(dashboard): add shared type definitions"
```

---

### Task 4: Create API client hook

**Files:**
- Create: `packages/dashboard/src/hooks/useApi.ts`

**Step 1: Create the hook**

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, Task } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4400";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useApi() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch tasks from REST endpoint
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // Silently fail — SSE reconnect will retry
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API_URL}/api/events`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        fetchTasks(); // Refresh tasks on connect
      };

      es.onmessage = (e) => {
        const event: AgentEvent = JSON.parse(e.data);
        setEvents((prev) => [event, ...prev].slice(0, 200)); // Keep last 200

        // Refetch tasks on state-changing events
        if (
          event.type === "task:created" ||
          event.type === "task:assigned" ||
          event.type === "task:status_changed"
        ) {
          fetchTasks();
        }
      };

      es.onerror = () => {
        setStatus("disconnected");
        es.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [fetchTasks]);

  return { tasks, events, status };
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/src/hooks/useApi.ts
git commit -m "feat(dashboard): add useApi hook for REST + SSE"
```

---

### Task 5: Refactor App.tsx to use live data

**Files:**
- Modify: `packages/dashboard/src/App.tsx`

**Step 1: Replace the entire App.tsx with data-driven version**

Replace `packages/dashboard/src/App.tsx` with:

```tsx
import "./App.css";
import { useApi } from "./hooks/useApi";
import type { AgentEvent, Task, TaskStatus } from "./types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "BACKLOG" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "review", label: "REVIEW" },
  { status: "done", label: "DONE" },
];

function priorityLabel(p: string): string {
  switch (p) {
    case "high": return "P1 - HIGH";
    case "medium": return "P2 - MEDIUM";
    case "low": return "P3 - LOW";
    default: return p.toUpperCase();
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function roleClass(role: string): string {
  if (role.includes("product-manager") || role === "PM") return "pm";
  if (role.includes("scrum-master") || role === "SM") return "sm";
  if (role.includes("engineer") || role.startsWith("eng")) return "eng";
  if (role.includes("reviewer") || role.startsWith("rev")) return "rev";
  return "";
}

function roleLabel(role: string): string {
  if (role.includes("product-manager")) return "PM";
  if (role.includes("scrum-master")) return "SM";
  if (role.includes("engineer")) return role.toUpperCase().replace("ENGINEER", "ENG");
  if (role.includes("reviewer")) return "REV";
  return role.toUpperCase();
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="task-card">
      <div className="id">{task.id}</div>
      <div className="title">{task.title}</div>
      <div className="priority">{priorityLabel(task.priority)}</div>
      {task.assignee && <div className="assignee">{task.assignee}</div>}
    </div>
  );
}

function KanbanColumn({ label, tasks }: { label: string; tasks: Task[] }) {
  return (
    <div className="kanban-column">
      <div className="column-header">
        {label} <span className="count">{tasks.length}</span>
      </div>
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function AgentFeed({ events }: { events: AgentEvent[] }) {
  return (
    <aside className="panel feed-panel">
      <div className="panel-header">AGENT FEED</div>
      <div className="feed-scroll">
        {events.length === 0 && (
          <div className="feed-item">
            <span className="timestamp">[--:--]</span> Waiting for events...
          </div>
        )}
        {events.map((event, i) => (
          <div className="feed-item" key={`${event.timestamp}-${i}`}>
            <span className="timestamp">[{formatTime(event.timestamp)}]</span>
            <span className={roleClass(event.agentRole)}>
              {roleLabel(event.agentRole)}:
            </span>{" "}
            {event.summary}
          </div>
        ))}
      </div>
    </aside>
  );
}

function TeamStatus({ events }: { events: AgentEvent[] }) {
  // Derive agent states from recent events
  const agentStates = new Map<string, { role: string; status: string; activity: string }>();

  // Walk events oldest-first to get latest state per agent
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.agentId === "orchestrator" || e.agentId === "system") continue;

    const key = e.agentId;
    let status = "active";
    if (e.type === "agent:completed") status = "idle";
    if (e.type === "agent:error") status = "error";
    if (e.type === "agent:started") status = "building";

    agentStates.set(key, {
      role: e.agentRole,
      status,
      activity: e.summary,
    });
  }

  const agents = Array.from(agentStates.entries());

  return (
    <aside className="panel team-panel">
      <div className="panel-header">TEAM STATUS</div>
      <div className="team-agents">
        {agents.length === 0 && (
          <div className="agent-card">
            <div className="activity">No agents active</div>
          </div>
        )}
        {agents.map(([id, agent]) => (
          <div className="agent-card" key={id}>
            <div className="header">
              <div className="agent-name">
                <span className={`status-dot ${agent.status}`}></span>
                <span className={`name text-${roleClass(agent.role)}`}>
                  {roleLabel(agent.role)}
                </span>
              </div>
              <span className={`status-badge ${agent.status}`}>
                {agent.status.toUpperCase()}
              </span>
            </div>
            <div className="activity">{agent.activity}</div>
          </div>
        ))}
      </div>

      {/* Sprint Progress */}
      <SprintProgress />
    </aside>
  );
}

function SprintProgress() {
  const { tasks } = useApi();
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="panel-header" style={{ marginTop: "24px" }}>
        SPRINT PROGRESS
      </div>
      <div className="progress-block">
        <div className="detail-row">
          <span className="detail-label">Total Tasks</span>
          <span className="detail-value">{total}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Completed</span>
          <span className="detail-value">
            {done} / {total}
          </span>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    </>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const label =
    status === "connected" ? "CONNECTED" : status === "connecting" ? "CONNECTING..." : "DISCONNECTED";
  return <span className={status}>{label}</span>;
}

function App() {
  const { tasks, events, status } = useApi();

  return (
    <div className="app">
      <header className="header">
        <div className="logo">ARKALEDGE</div>
        <div className="header-controls">
          <span className="active">SPRINT</span>
        </div>
      </header>

      <main className="main-container">
        {/* Agent Feed (left) */}
        <AgentFeed events={events} />

        {/* Kanban Board (center) */}
        <section className="kanban-panel">
          <div className="panel-header">SPRINT BOARD</div>
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                label={col.label}
                tasks={tasks.filter((t) => t.status === col.status)}
              />
            ))}
          </div>
        </section>

        {/* Team Status (right) */}
        <TeamStatus events={events} />
      </main>

      <footer className="footer">
        <span>ARKALEDGE</span>
        <span>|</span>
        <span>TASKS: {tasks.length}</span>
        <span>|</span>
        <StatusIndicator status={status} />
        <span className="cursor"></span>
      </footer>
    </div>
  );
}

export default App;
```

**Step 2: Build and verify**

Run: `npm run build -w packages/dashboard`
Expected: Clean build. May need to adjust CSS for `.feed-scroll` (see Task 6).

**Step 3: Commit**

```bash
git add packages/dashboard/src/App.tsx
git commit -m "feat(dashboard): wire App to live API data via useApi hook"
```

---

### Task 6: Update CSS for live data layout

**Files:**
- Modify: `packages/dashboard/src/App.css`

**Step 1: Adjust layout for read-only mode**

The Project Launcher panel is no longer needed (read-only). Replace the grid layout so the feed panel takes the full left column.

Replace the grid layout section in `App.css`:

```css
/* Main Layout */
.main-container {
  display: grid;
  grid-template-columns: 300px 1fr 350px;
  flex: 1;
  gap: 1px;
  background: var(--border-color);
}

/* Override panels */
.main-container .panel {
  background: var(--bg-secondary);
}

/* Feed Panel — full left column */
.feed-panel {
  grid-column: 1;
  grid-row: 1;
  max-height: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.feed-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}
```

Remove the `.launcher-panel` styles (no longer used).

**Step 2: Add connection status styles**

Append to `App.css`:

```css
/* Connection Status */
.footer .connected {
  color: var(--accent-primary);
}

.footer .connecting {
  color: var(--accent-secondary);
  animation: blink 1s infinite;
}

.footer .disconnected {
  color: var(--accent-error);
}

/* Assignee on task cards */
.task-card .assignee {
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
}
```

**Step 3: Commit**

```bash
git add packages/dashboard/src/App.css
git commit -m "feat(dashboard): update layout for read-only live view"
```

---

### Task 7: Add Vite proxy for development

**Files:**
- Modify: `packages/dashboard/vite.config.ts`

**Step 1: Add API proxy for dev mode**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4400',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 2: Commit**

```bash
git add packages/dashboard/vite.config.ts
git commit -m "feat(dashboard): add Vite dev proxy for API"
```

---

### Task 8: Full integration build and verify

**Files:** None new — verification only.

**Step 1: Build entire project**

Run: `npm run build`
Expected: All three packages build cleanly (core, cli, dashboard).

**Step 2: Verify API server starts**

Run (in a test terminal): `node packages/cli/dist/index.js --help`
Expected: Help output shows, no crash.

**Step 3: Verify dashboard dev server**

Run: `cd packages/dashboard && npm run dev`
Expected: Vite starts on port 3000, dashboard loads (with "DISCONNECTED" status since no orchestrator is running).

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve integration build issues"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | API server (REST + SSE) | `core/src/api-server.ts`, `core/src/index.ts` |
| 2 | CLI wiring | `cli/src/index.ts` |
| 3 | Dashboard types | `dashboard/src/types.ts` |
| 4 | useApi hook | `dashboard/src/hooks/useApi.ts` |
| 5 | App.tsx refactor | `dashboard/src/App.tsx` |
| 6 | CSS updates | `dashboard/src/App.css` |
| 7 | Vite proxy | `dashboard/vite.config.ts` |
| 8 | Integration verify | Build + test |
