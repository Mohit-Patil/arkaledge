import React from 'react';

// Color constants matching terminal design
const COLORS = {
  bgPrimary: '#0a0a0a',
  bgSecondary: '#0d1117',
  bgTertiary: '#161b22',
  accentPrimary: '#00ff41',
  accentSecondary: '#ffb000',
  accentInfo: '#00d4ff',
  accentError: '#ff3333',
  textMuted: '#0f5132',
  borderColor: '#1a3a2a',
  glow: 'rgba(0, 255, 65, 0.15)',
};

const FONT_Mono = "'Fira Code', 'JetBrains Mono', 'Courier New', monospace";

// Types
interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface TaskDetailProps {
  taskId?: string;
  title?: string;
  status?: 'backlog' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assigned?: string;
  estimated?: string;
  elapsed?: string;
  progress?: number;
  subtasks?: Subtask[];
}

const TaskDetail: React.FC<TaskDetailProps> = ({
  taskId = 'TASK-042',
  title = 'Implement auth middleware',
  status = 'in_progress',
  priority = 'high',
  assigned = 'ENGINEER-1',
  estimated = '2h 15m',
  elapsed = '47m 32s',
  progress = 65,
  subtasks = [
    { id: '1', title: 'Create JWT validation function', done: true },
    { id: '2', title: 'Add token refresh logic', done: true },
    { id: '3', title: 'Implement rate limiting', done: false },
    { id: '4', title: 'Write unit tests', done: false },
  ],
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'in_progress':
        return COLORS.accentSecondary;
      case 'done':
        return COLORS.accentPrimary;
      case 'review':
        return COLORS.accentInfo;
      default:
        return COLORS.textMuted;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return COLORS.accentSecondary;
      case 'medium':
        return COLORS.accentInfo;
      default:
        return COLORS.textMuted;
    }
  };

  const formatStatus = (s: string) => {
    return s.toUpperCase().replace('_', ' ');
  };

  const doneCount = subtasks.filter((st) => st.done).length;
  const pendingCount = subtasks.length - doneCount;

  const styles: Record<string, React.CSSProperties> = {
    panel: {
      background: COLORS.bgSecondary,
      padding: '16px',
      overflow: 'hidden',
      fontFamily: FONT_Mono,
    },
    header: {
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '1px',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: `1px solid ${COLORS.borderColor}`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: COLORS.accentPrimary,
    },
    headerPrefix: {
      color: COLORS.accentPrimary,
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px',
      fontSize: '11px',
    },
    detailLabel: {
      color: COLORS.textMuted,
    },
    detailValue: {
      color: COLORS.accentPrimary,
    },
    detailValueInProgress: {
      color: COLORS.accentSecondary,
    },
    progressBlock: {
      margin: '16px 0',
    },
    progressLabel: {
      fontSize: '11px',
      display: 'flex',
      justifyContent: 'space-between',
    },
    progressBar: {
      height: '8px',
      background: COLORS.bgTertiary,
      border: `1px solid ${COLORS.borderColor}`,
      marginTop: '4px',
    },
    progressFill: {
      height: '100%',
      background: COLORS.accentPrimary,
      width: `${progress}%`,
    },
    subtasksSection: {
      marginTop: '16px',
    },
    subtasksHeader: {
      fontSize: '11px',
      color: COLORS.textMuted,
      marginBottom: '8px',
    },
    subtask: {
      fontSize: '11px',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    subtaskDone: {
      color: COLORS.textMuted,
      textDecoration: 'line-through',
    },
    subtaskPending: {
      color: COLORS.accentPrimary,
    },
    checkbox: {
      width: '12px',
      height: '12px',
      border: `1px solid ${COLORS.borderColor}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '8px',
      background: 'transparent',
    },
    checkboxDone: {
      background: COLORS.accentPrimary,
      color: COLORS.bgPrimary,
      borderColor: COLORS.accentPrimary,
    },
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerPrefix}>&gt;</span>
        {taskId}
      </div>

      {/* Detail Rows */}
      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>TITLE</span>
        <span style={styles.detailValue}>{title}</span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>STATUS</span>
        <span style={{ ...styles.detailValue, color: getStatusColor() }}>
          [{formatStatus(status)}]
        </span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>PRIORITY</span>
        <span style={{ ...styles.detailValue, color: getPriorityColor() }}>
          {priority.toUpperCase()}
        </span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>ASSIGNED</span>
        <span style={styles.detailValue}>{assigned}</span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>ESTIMATED</span>
        <span style={styles.detailValue}>{estimated}</span>
      </div>

      {/* Progress Block */}
      <div style={styles.progressBlock}>
        <div style={styles.progressLabel}>
          <span style={styles.detailLabel}>ELAPSED</span>
          <span style={styles.detailValue}>{elapsed}</span>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
      </div>

      {/* Subtasks */}
      <div style={styles.subtasksSection}>
        <div style={styles.subtasksHeader}>
          SUBTASKS: {doneCount} DONE, {pendingCount} PENDING
        </div>
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            style={subtask.done ? styles.subtaskDone : styles.subtask}
          >
            <span
              style={subtask.done ? { ...styles.checkbox, ...styles.checkboxDone } : styles.checkbox}
            >
              {subtask.done ? '✓' : ''}
            </span>
            {subtask.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDetail;
