import type { AgentRuntime } from "./agent-runtime.js";
import type { AgentMessage, RunOptions, SdkType } from "../types.js";

/**
 * Codex SDK adapter.
 *
 * Wraps `@openai/codex-sdk` Codex.startThread().runStreamed() to conform to AgentRuntime.
 */
export class CodexAgentRuntime implements AgentRuntime {
  readonly sdk: SdkType = "codex";
  private currentThread: unknown | null = null;

  constructor(
    readonly id: string,
    readonly model: string,
  ) {}

  async *run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage> {
    let Codex: unknown;
    try {
      const sdk = await import("@openai/codex-sdk");
      Codex = (sdk as Record<string, unknown>).Codex ?? sdk.default;
    } catch {
      yield {
        type: "error",
        content:
          "Codex SDK not installed. Run: npm install @openai/codex-sdk",
        timestamp: Date.now(),
      };
      return;
    }

    const fullPrompt = `${options.systemPrompt}\n\n${prompt}`;

    try {
      const codex = new (Codex as new (opts: unknown) => Record<string, unknown>)({
        config: {
          model: this.model,
          approval_policy: "never",
          sandbox_mode: "workspace-write",
        },
      });

      const thread = (codex.startThread as (opts: unknown) => Record<string, unknown>)({
        workingDirectory: options.workingDirectory,
        skipGitRepoCheck: true,
      });

      this.currentThread = thread;

      const result = await (thread.runStreamed as (prompt: string) => Promise<{ events: AsyncIterable<unknown> }>)(
        fullPrompt,
      );
      const events = result.events;

      for await (const event of events) {
        yield this.transformEvent(event);
      }
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  async *resume(
    _sessionId: string,
    prompt: string,
  ): AsyncIterable<AgentMessage> {
    yield* this.run(prompt, {
      systemPrompt: "",
      workingDirectory: process.cwd(),
    });
  }

  async abort(): Promise<void> {
    if (this.currentThread) {
      const thread = this.currentThread as Record<string, unknown>;
      if (typeof thread.abort === "function") {
        await (thread.abort as () => Promise<void>)();
      }
      this.currentThread = null;
    }
  }

  private transformEvent(event: unknown): AgentMessage {
    const ev = event as Record<string, unknown>;

    if (ev.type === "command" || ev.type === "exec") {
      return {
        type: "tool_call",
        content: JSON.stringify({
          tool: ev.command ?? ev.tool ?? "exec",
          input: ev.args ?? ev.input,
        }),
        timestamp: Date.now(),
        metadata: { raw: ev },
      };
    }

    if (ev.type === "output" || ev.type === "result") {
      return {
        type: "tool_result",
        content:
          typeof ev.output === "string"
            ? ev.output
            : typeof ev.content === "string"
              ? ev.content
              : JSON.stringify(ev),
        timestamp: Date.now(),
        metadata: { raw: ev },
      };
    }

    if (ev.type === "error") {
      return {
        type: "error",
        content:
          typeof ev.message === "string"
            ? ev.message
            : JSON.stringify(ev),
        timestamp: Date.now(),
      };
    }

    if (ev.type === "message" || ev.type === "text") {
      return {
        type: "text",
        content:
          typeof ev.content === "string"
            ? ev.content
            : typeof ev.text === "string"
              ? ev.text
              : JSON.stringify(ev),
        timestamp: Date.now(),
        metadata: { raw: ev },
      };
    }

    // Unknown event type — emit as text
    return {
      type: "text",
      content: JSON.stringify(ev),
      timestamp: Date.now(),
      metadata: { raw: ev },
    };
  }
}
