import { useMemo, useState } from "react";
import "./App.css";
import { useApi } from "./hooks/useApi";
import type { AgentEvent, Artifact, Task, TaskStatus } from "./types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "BACKLOG" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "review", label: "REVIEW" },
  { status: "done", label: "DONE" },
];

function priorityLabel(priority: string): string {
  switch (priority) {
    case "high":
      return "P1 - HIGH";
    case "medium":
      return "P2 - MEDIUM";
    case "low":
      return "P3 - LOW";
    default:
      return priority.toUpperCase();
  }
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
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

function artifactLabel(artifact: Artifact, idx: number): string {
  const label = artifact.label.trim();
  if (label) return label;
  return `${artifact.kind.toUpperCase()} ${idx + 1}`;
}

function mergeArtifacts(primary: Artifact[], secondary: Artifact[]): Artifact[] {
  const merged: Artifact[] = [];
  const seen = new Set<string>();

  for (const artifact of [...primary, ...secondary]) {
    const key = `${artifact.url}::${artifact.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(artifact);
  }

  return merged;
}

function taskIdFromEvent(event: AgentEvent): string | undefined {
  return typeof event.data?.taskId === "string" ? event.data.taskId : undefined;
}

function TaskCard({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: (taskId: string) => void;
}) {
  const artifacts = task.artifacts ?? [];

  return (
    <div
      className={`task-card ${selected ? "selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(task.id);
        }
      }}
    >
      <div className="id">{task.id}</div>
      <div className="title">{task.title}</div>
      <div className="priority">{priorityLabel(task.priority)}</div>
      {task.assignee && <div className="assignee">{task.assignee}</div>}
      {task.dependsOn && task.dependsOn.length > 0 && (
        <div className="depends-on">DEPENDS ON: {task.dependsOn.join(", ")}</div>
      )}
      {artifacts.length > 0 && (
        <div className="task-artifacts">
          {artifacts.slice(0, 2).map((artifact, idx) => (
            <a
              key={`${task.id}-artifact-${artifact.url}-${idx}`}
              className="artifact-link"
              href={artifact.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {artifactLabel(artifact, idx)}
            </a>
          ))}
          {artifacts.length > 2 && (
            <div className="artifact-more">+{artifacts.length - 2} more</div>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  label,
  tasks,
  selectedTaskId,
  onSelectTask,
}: {
  label: string;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <div className="kanban-column">
      <div className="column-header">
        {label} <span className="count">{tasks.length}</span>
      </div>
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelect={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}

function AgentFeed({
  events,
  onSelectTask,
}: {
  events: AgentEvent[];
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <aside className="panel feed-panel">
      <div className="panel-header">AGENT FEED</div>
      <div className="feed-scroll">
        {events.length === 0 && (
          <div className="feed-item">
            <span className="timestamp">[--:--]</span> Waiting for events...
          </div>
        )}
        {events.map((event, i) => {
          const artifacts = event.data?.artifacts ?? [];
          const taskId = taskIdFromEvent(event);

          return (
            <div className="feed-item" key={`${event.timestamp}-${i}`}>
              <div>
                <span className="timestamp">[{formatTime(event.timestamp)}]</span>
                <span className={`agent-tag ${roleClass(event.agentRole)}`}>
                  {roleLabel(event.agentRole)}:
                </span>{" "}
                {event.summary}
              </div>

              {(taskId || artifacts.length > 0) && (
                <div className="feed-item-links">
                  {taskId && (
                    <button
                      type="button"
                      className="event-task-jump"
                      onClick={() => onSelectTask(taskId)}
                    >
                      TASK {taskId}
                    </button>
                  )}

                  {artifacts.map((artifact, idx) => (
                    <a
                      key={`${event.timestamp}-${artifact.url}-${idx}`}
                      className="artifact-link"
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {artifactLabel(artifact, idx)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

function SelectedTaskPanel({
  task,
  eventArtifacts,
}: {
  task: Task | undefined;
  eventArtifacts: Artifact[];
}) {
  const taskArtifacts = task?.artifacts ?? [];
  const combinedArtifacts = mergeArtifacts(taskArtifacts, eventArtifacts);

  return (
    <>
      <div className="panel-header panel-header-spaced">SELECTED TASK</div>
      <div className="selected-task-panel">
        {!task && (
          <div className="selected-task-empty">Select a task to inspect generated UI links.</div>
        )}

        {task && (
          <>
            <div className="detail-row">
              <span className="detail-label">TASK</span>
              <span className="detail-value">{task.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">STATUS</span>
              <span className="detail-value">{task.status.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">ASSIGNEE</span>
              <span className="detail-value">{task.assignee ?? "UNASSIGNED"}</span>
            </div>
            <div className="selected-task-title">{task.title}</div>

            <div className="selected-task-links">
              {combinedArtifacts.length === 0 && (
                <div className="selected-task-empty">No generated UI links yet.</div>
              )}
              {combinedArtifacts.map((artifact, idx) => (
                <a
                  key={`${task.id}-${artifact.url}-${idx}`}
                  className="artifact-link"
                  href={artifact.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {artifactLabel(artifact, idx)}
                </a>
              ))}
            </div>
          </>
        )}
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const effectiveSelectedTaskId = useMemo(() => {
    if (tasks.length === 0) return null;
    if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId)) {
      return selectedTaskId;
    }
    return tasks[0].id;
  }, [tasks, selectedTaskId]);

  const selectedTask = useMemo(
    () => (effectiveSelectedTaskId ? tasks.find((task) => task.id === effectiveSelectedTaskId) : undefined),
    [effectiveSelectedTaskId, tasks],
  );

  const selectedTaskEventArtifacts = useMemo(() => {
    if (!effectiveSelectedTaskId) return [];

    const artifacts: Artifact[] = [];
    for (const event of events) {
      if (event.data?.taskId !== effectiveSelectedTaskId) continue;
      for (const artifact of event.data?.artifacts ?? []) {
        artifacts.push(artifact);
      }
    }

    return mergeArtifacts([], artifacts);
  }, [events, effectiveSelectedTaskId]);

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
        <AgentFeed events={events} onSelectTask={setSelectedTaskId} />

        <section className="kanban-panel">
          <div className="panel-header">SPRINT BOARD</div>
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                label={col.label}
                tasks={tasks.filter((task) => task.status === col.status)}
                selectedTaskId={effectiveSelectedTaskId}
                onSelectTask={setSelectedTaskId}
              />
            ))}
          </div>
        </section>

        <aside className="panel team-panel">
          <TeamStatus events={events} />
          <SelectedTaskPanel task={selectedTask} eventArtifacts={selectedTaskEventArtifacts} />

          <div className="panel-header panel-header-spaced">SPRINT PROGRESS</div>
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
