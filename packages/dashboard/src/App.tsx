import './App.css'

function App() {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">ARKALEDGE</div>
        <div className="header-controls">
          <span className="active">SPRINT</span>
          <span>TEAM</span>
          <span>SETTINGS</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {/* Project Launcher Panel */}
        <aside className="panel launcher-panel">
          <div className="panel-header">PROJECT LAUNCHER</div>
          <input
            type="text"
            className="input-field"
            placeholder="spec.md path..."
          />
          <input
            type="text"
            className="input-field"
            placeholder="config.yaml path..."
          />
          <button className="btn">INITIALIZE</button>
        </aside>

        {/* Agent Feed */}
        <aside className="panel feed-panel">
          <div className="panel-header">AGENT FEED</div>
          <div className="feed-item">
            <span className="timestamp">[10:42]</span>
            <span className="pm">PM:</span> Breaking down spec into tasks...
          </div>
          <div className="feed-item">
            <span className="timestamp">[10:41]</span>
            <span className="sm">SM:</span> Assigning Task-001 to Engineer-1
          </div>
          <div className="feed-item">
            <span className="timestamp">[10:40]</span>
            <span className="eng">ENG-1:</span> Starting implementation of auth module
          </div>
        </aside>

        {/* Kanban Board */}
        <section className="kanban-panel">
          <div className="panel-header">SPRINT BOARD</div>
          <div className="kanban-board">
            {/* Backlog Column */}
            <div className="kanban-column">
              <div className="column-header">
                BACKLOG <span className="count">3</span>
              </div>
              <div className="column-tasks">
                <div className="task-card">
                  <div className="id">TASK-003</div>
                  <div className="title">Implement user dashboard</div>
                  <div className="priority">P2 - MEDIUM</div>
                </div>
                <div className="task-card">
                  <div className="id">TASK-004</div>
                  <div className="title">Add API rate limiting</div>
                  <div className="priority">P3 - LOW</div>
                </div>
                <div className="task-card">
                  <div className="id">TASK-005</div>
                  <div className="title">Write unit tests</div>
                  <div className="priority">P2 - MEDIUM</div>
                </div>
              </div>
            </div>

            {/* In Progress Column */}
            <div className="kanban-column">
              <div className="column-header">
                IN PROGRESS <span className="count">1</span>
              </div>
              <div className="column-tasks">
                <div className="task-card">
                  <div className="id">TASK-001</div>
                  <div className="title">Set up authentication flow</div>
                  <div className="priority">P1 - HIGH</div>
                </div>
              </div>
            </div>

            {/* Review Column */}
            <div className="kanban-column">
              <div className="column-header">
                REVIEW <span className="count">1</span>
              </div>
              <div className="column-tasks">
                <div className="task-card">
                  <div className="id">TASK-002</div>
                  <div className="title">Database schema design</div>
                  <div className="priority">P1 - HIGH</div>
                </div>
              </div>
            </div>

            {/* Done Column */}
            <div className="kanban-column">
              <div className="column-header">
                DONE <span className="count">0</span>
              </div>
              <div className="column-tasks">
                {/* Empty state */}
              </div>
            </div>
          </div>
        </section>

        {/* Team Status Panel */}
        <aside className="panel team-panel">
          <div className="panel-header">TEAM STATUS</div>
          <div className="team-agents">
            <div className="agent-card">
              <div className="header">
                <div className="agent-name">
                  <span className="status-dot active"></span>
                  <span className="name text-pm">PM</span>
                </div>
                <span className="status-badge active">ACTIVE</span>
              </div>
              <div className="activity">Analyzing requirements</div>
            </div>

            <div className="agent-card">
              <div className="header">
                <div className="agent-name">
                  <span className="status-dot waiting"></span>
                  <span className="name text-sm">SM</span>
                </div>
                <span className="status-badge waiting">WAITING</span>
              </div>
              <div className="activity">Monitoring sprint progress</div>
            </div>

            <div className="agent-card">
              <div className="header">
                <div className="agent-name">
                  <span className="status-dot building"></span>
                  <span className="name text-eng">ENG-1</span>
                </div>
                <span className="status-badge building">BUILDING</span>
              </div>
              <div className="activity">Implementing auth flow</div>
            </div>

            <div className="agent-card">
              <div className="header">
                <div className="agent-name">
                  <span className="status-dot idle"></span>
                  <span className="name text-rev">REVIEWER</span>
                </div>
                <span className="status-badge idle">IDLE</span>
              </div>
              <div className="activity">Awaiting tasks</div>
            </div>
          </div>

          {/* Sprint Progress */}
          <div className="panel-header" style={{ marginTop: '24px' }}>SPRINT PROGRESS</div>
          <div className="progress-block">
            <div className="detail-row">
              <span className="detail-label">Sprint Goal</span>
              <span className="detail-value">5 tasks</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Completed</span>
              <span className="detail-value">0 / 5</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Time Remaining</span>
              <span className="detail-value in-progress">2d 4h</span>
            </div>
            <div className="bar">
              <div className="fill" style={{ width: '0%' }}></div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>SPRINT-001</span>
        <span>|</span>
        <span>VELOCITY: --</span>
        <span>|</span>
        <span>CONNECTED</span>
        <span className="cursor"></span>
      </footer>
    </div>
  )
}

export default App
