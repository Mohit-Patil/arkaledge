import React from 'react';
import type { Task, TaskPriority } from '@arkaledge/core';

export interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityLabels: Record<TaskPriority, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const isDone = task.status === 'done';
  const isBlocked = task.status === 'blocked';

  const handleClick = () => {
    onClick?.(task);
  };

  return (
    <div
      className={`task-card ${isDone ? 'done' : ''} ${isBlocked ? 'blocked' : ''}`}
      onClick={handleClick}
    >
      <div className="id">{task.id.toUpperCase()}</div>
      <div className="title">{task.title}</div>
      <div className={`priority ${task.priority}`}>
        [{priorityLabels[task.priority]}]
      </div>
    </div>
  );
};

export default TaskCard;
