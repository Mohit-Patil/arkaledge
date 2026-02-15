export type AgentHealthStatus = "unknown" | "healthy" | "down";

export interface AgentHealthRecord {
  status: AgentHealthStatus;
  lastCheckedAt: number;
  consecutiveFailures: number;
  reason?: string;
  cooldownUntil?: number;
}

const BASE_COOLDOWN_MS = 30_000;
const MAX_COOLDOWN_MS = 10 * 60_000;

/**
 * Tracks runtime health per agent and enforces cooldown after probe failures.
 */
export class AgentHealthRegistry {
  private records = new Map<string, AgentHealthRecord>();

  constructor(agentIds: string[]) {
    const now = Date.now();
    for (const id of agentIds) {
      this.records.set(id, {
        status: "unknown",
        lastCheckedAt: now,
        consecutiveFailures: 0,
      });
    }
  }

  get(agentId: string): AgentHealthRecord {
    const existing = this.records.get(agentId);
    if (existing) return existing;
    const fallback: AgentHealthRecord = {
      status: "unknown",
      lastCheckedAt: Date.now(),
      consecutiveFailures: 0,
      reason: "Agent not tracked",
    };
    this.records.set(agentId, fallback);
    return fallback;
  }

  markHealthy(agentId: string): AgentHealthRecord {
    const next: AgentHealthRecord = {
      status: "healthy",
      lastCheckedAt: Date.now(),
      consecutiveFailures: 0,
    };
    this.records.set(agentId, next);
    return next;
  }

  markProbeFailure(agentId: string, reason: string): AgentHealthRecord {
    const current = this.get(agentId);
    const failures = current.consecutiveFailures + 1;
    const cooldownMs = Math.min(BASE_COOLDOWN_MS * 2 ** (failures - 1), MAX_COOLDOWN_MS);
    const next: AgentHealthRecord = {
      status: "down",
      lastCheckedAt: Date.now(),
      consecutiveFailures: failures,
      reason,
      cooldownUntil: Date.now() + cooldownMs,
    };
    this.records.set(agentId, next);
    return next;
  }

  markRuntimeCrash(agentId: string, reason: string): AgentHealthRecord {
    return this.markProbeFailure(agentId, reason);
  }

  isSchedulable(agentId: string): boolean {
    return this.get(agentId).status !== "down";
  }

  shouldProbe(agentId: string): boolean {
    const record = this.get(agentId);
    if (record.status === "unknown") return true;
    if (record.status !== "down") return false;
    if (!record.cooldownUntil) return true;
    return Date.now() >= record.cooldownUntil;
  }

  markPendingProbe(agentId: string): void {
    const current = this.get(agentId);
    this.records.set(agentId, {
      ...current,
      status: "unknown",
      lastCheckedAt: Date.now(),
      reason: current.reason,
      cooldownUntil: undefined,
    });
  }
}
