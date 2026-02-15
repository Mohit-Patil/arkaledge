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
      {task.dependsOn && task.dependsOn.length > 0 && (
        <div className="depends-on">DEPENDS ON: {task.dependsOn.join(", ")}</div>
      )}
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
            <span className={`agent-tag ${roleClass(event.agentRole)}`}>
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
  const agentStates = new Map<string, { role: string; status: string; activity: string }>();

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
    <>
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

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">ARKALEDGE</div>
        <div className="header-controls">
          <span className="active">SPRINT</span>
        </div>
      </header>

      <main className="main-container">
        <AgentFeed events={events} />

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

        <aside className="panel team-panel">
          <TeamStatus events={events} />

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
              <span className="detail-value">{done} / {total}</span>
            </div>
            <div className="bar">
              <div className="fill" style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        </aside>
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
