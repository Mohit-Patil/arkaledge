import React from 'react';
import type { Task, TaskStatus } from '@arkaledge/core';
import { TaskCard } from './TaskCard';

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const columnLabels: Record<TaskStatus, string> = {
  backlog: 'BACKLOG',
  in_progress: 'IN_PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
  blocked: 'BLOCKED',
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onTaskClick,
}) => {
  const label = columnLabels[status];

  return (
    <div className="kanban-column">
      <div className="column-header">
        {label} <span className="count">[{tasks.length}]</span>
      </div>
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
