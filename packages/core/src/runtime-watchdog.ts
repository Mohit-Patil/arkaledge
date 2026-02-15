import type { AgentMessage } from "./types.js";

export type RuntimeWatchdogKind = "idle" | "total";

export class RuntimeWatchdogError extends Error {
  constructor(
    readonly kind: RuntimeWatchdogKind,
    readonly timeoutMs: number,
  ) {
    super(
      kind === "idle"
        ? `Runtime stream idle timeout after ${timeoutMs}ms`
        : `Runtime stream total timeout after ${timeoutMs}ms`,
    );
    this.name = "RuntimeWatchdogError";
  }
}

interface WatchdogOptions {
  idleTimeoutMs: number;
  totalTimeoutMs: number;
  onMessage: (message: AgentMessage) => void;
}

/**
 * Consume a streaming runtime response with idle + total timeout protections.
 */
export async function consumeStreamWithWatchdog(
  stream: AsyncIterable<AgentMessage>,
  options: WatchdogOptions,
): Promise<void> {
  const iterator = stream[Symbol.asyncIterator]();
  const startedAt = Date.now();
  let lastActivityAt = startedAt;

  while (true) {
    const now = Date.now();
    const idleRemaining = options.idleTimeoutMs - (now - lastActivityAt);
    const totalRemaining = options.totalTimeoutMs - (now - startedAt);

    if (idleRemaining <= 0) {
      throw new RuntimeWatchdogError("idle", options.idleTimeoutMs);
    }
    if (totalRemaining <= 0) {
      throw new RuntimeWatchdogError("total", options.totalTimeoutMs);
    }

    const timeoutMs = Math.min(idleRemaining, totalRemaining);
    const nextValue = await nextWithTimeout(iterator, timeoutMs);
    if (!nextValue) {
      const kind: RuntimeWatchdogKind = idleRemaining <= totalRemaining ? "idle" : "total";
      throw new RuntimeWatchdogError(
        kind,
        kind === "idle" ? options.idleTimeoutMs : options.totalTimeoutMs,
      );
    }

    if (nextValue.done) return;

    lastActivityAt = Date.now();
    options.onMessage(nextValue.value);
  }
}

async function nextWithTimeout<T>(
  iterator: AsyncIterator<T>,
  timeoutMs: number,
): Promise<IteratorResult<T> | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<IteratorResult<T> | null>([
      iterator.next(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
