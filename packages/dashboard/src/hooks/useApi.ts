import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, Task } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4400";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useApi() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // SSE reconnect will retry
    }
  }, []);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API_URL}/api/events`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        fetchTasks();
      };

      es.onmessage = (e) => {
        const event: AgentEvent = JSON.parse(e.data);
        setEvents((prev) => [event, ...prev].slice(0, 200));

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
