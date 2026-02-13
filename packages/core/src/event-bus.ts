import { EventEmitter } from "eventemitter3";
import type { AgentEvent, EventType } from "./types.js";

/**
 * In-process event bus for agent ↔ orchestrator ↔ dashboard communication.
 * Wraps eventemitter3 with typed events.
 */
export class EventBus {
  private emitter = new EventEmitter();

  emit(event: AgentEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit("*", event); // wildcard for subscribers that want everything
  }

  on(type: EventType | "*", handler: (event: AgentEvent) => void): void {
    this.emitter.on(type, handler);
  }

  off(type: EventType | "*", handler: (event: AgentEvent) => void): void {
    this.emitter.off(type, handler);
  }

  once(type: EventType | "*", handler: (event: AgentEvent) => void): void {
    this.emitter.once(type, handler);
  }

  /** Returns a promise that resolves when the given event type fires. */
  waitFor(type: EventType): Promise<AgentEvent> {
    return new Promise((resolve) => {
      this.emitter.once(type, resolve);
    });
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

/** Singleton event bus for the process. */
export const globalEventBus = new EventBus();
