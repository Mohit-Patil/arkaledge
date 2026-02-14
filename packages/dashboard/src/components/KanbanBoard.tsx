import React from 'react';
import type { Task, TaskStatus } from '@arkaledge/core';
import { KanbanColumn } from './KanbanColumn';

export interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const COLUMNS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskClick }) => {
  const tasksByStatus = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  return (
    <div className="panel kanban-board-panel">
      <div className="panel-header">KANBAN BOARD</div>
      <div className="kanban-board">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
