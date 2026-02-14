import React from 'react';

export type AgentStatus = 'active' | 'idle' | 'building' | 'waiting' | 'error';

export interface Agent {
  id: string;
  name: string;
  role: 'PM' | 'SM' | 'Engineer' | 'Reviewer';
  status: AgentStatus;
  activity: string;
  progress?: number;
}

export interface TeamStatusProps {
  agents: Agent[];
}

const statusLabels: Record<AgentStatus, string> = {
  active: 'ACTIVE',
  idle: 'IDLE',
  building: 'BUILDING',
  waiting: 'WAITING',
  error: 'ERROR',
};

export const TeamStatus: React.FC<TeamStatusProps> = ({ agents }) => {
  return (
    <div className="panel team-status-panel">
      <div className="panel-header">TEAM STATUS</div>
      <div className="team-agents">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};

interface AgentCardProps {
  agent: Agent;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const statusLabel = statusLabels[agent.status];

  return (
    <div className="agent-card">
      <div className="header">
        <div className="agent-name">
          <span className={`status-dot ${agent.status}`} />
          <span className="name">
            {agent.role}-{agent.name.replace(agent.role, '').trim() || 'AGENT'}
          </span>
        </div>
        <span className={`status-badge ${agent.status}`}>[{statusLabel}]</span>
      </div>
      <div className="activity">{agent.activity}</div>
      {agent.progress !== undefined && (
        <div className="progress-bar">
          <div
            className="fill"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default TeamStatus;
