import React, { useEffect, useRef, useState } from 'react';

export type AgentRole = 'PM' | 'SM' | 'ENG-1' | 'ENG-2' | 'ENG-3' | 'REV';

export interface FeedEntry {
  id: string;
  timestamp: Date;
  agent: AgentRole;
  message: string;
}

export interface ActivityFeedProps {
  entries: FeedEntry[];
  maxEntries?: number;
}

const agentColors: Record<AgentRole, string> = {
  'PM': 'var(--accent-info)',
  'SM': 'var(--accent-secondary)',
  'ENG-1': 'var(--accent-primary)',
  'ENG-2': 'var(--accent-primary)',
  'ENG-3': 'var(--accent-primary)',
  'REV': 'var(--accent-purple)',
};

const formatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  entries,
  maxEntries = 100,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries]);

  const displayEntries = entries.slice(-maxEntries);

  return (
    <div className="panel activity-feed">
      <div className="panel-header">ACTIVITY LOG</div>
      <div className="feed-container" ref={feedRef}>
        {displayEntries.length === 0 ? (
          <div className="feed-empty">
            <span className="cursor" />
          </div>
        ) : (
          displayEntries.map((entry) => (
            <div key={entry.id} className="feed-item">
              <span className="timestamp">{formatTimestamp(entry.timestamp)}</span>
              <span
                className="agent-tag"
                style={{ color: agentColors[entry.agent] }}
              >
                [{entry.agent}]
              </span>
              <span className="message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Utility hook for managing feed entries
export const useActivityFeed = (maxEntries: number = 100) => {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const idCounter = useRef(0);

  const addEntry = (agent: AgentRole, message: string) => {
    const newEntry: FeedEntry = {
      id: `entry-${++idCounter.current}`,
      timestamp: new Date(),
      agent,
      message,
    };
    setEntries((prev) => [...prev.slice(-maxEntries + 1), newEntry]);
  };

  const clear = () => {
    setEntries([]);
    idCounter.current = 0;
  };

  return { entries, addEntry, clear };
};

export default ActivityFeed;
