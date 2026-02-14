import type { AgentMessage, RunOptions, SdkType } from "../types.js";
import type { AgentRuntime, ResumeOptions } from "./agent-runtime.js";

/**
 * Claude Agent SDK adapter.
 *
 * Wraps `@anthropic-ai/claude-agent-sdk` query() to conform to AgentRuntime.
 * The SDK streams messages which we transform into our unified AgentMessage format.
 */
export class ClaudeAgentRuntime implements AgentRuntime {
  readonly sdk: SdkType = "claude";
  private abortController: AbortController | null = null;

  constructor(
    readonly id: string,
    readonly model: string,
    private readonly allowedTools: string[] = [
      "Read",
      "Write",
      "Edit",
      "Bash",
      "Glob",
      "Grep",
    ],
  ) {}

  async *run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage> {
    this.abortController = new AbortController();

    let query: typeof import("@anthropic-ai/claude-agent-sdk").query;
    try {
      const sdk = await import("@anthropic-ai/claude-agent-sdk");
      query = sdk.query;
    } catch {
      yield {
        type: "error",
        content:
          "Claude Agent SDK not installed. Run: npm install @anthropic-ai/claude-agent-sdk",
        timestamp: Date.now(),
      };
      return;
    }

    const fullPrompt = `${options.systemPrompt}\n\n${prompt}`;

    try {
      for await (const message of query({
        prompt: fullPrompt,
        options: {
          allowedTools: options.tools ?? this.allowedTools,
          permissionMode: "bypassPermissions",
          model: this.model,
          cwd: options.workingDirectory,
          ...(this.abortController && {
            abortController: this.abortController,
          }),
        },
      })) {
        yield this.transformMessage(message);
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) return;
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
    options?: ResumeOptions,
  ): AsyncIterable<AgentMessage> {
    // Claude Agent SDK resume support — pass through to run for now
    yield* this.run(prompt, {
      systemPrompt: "",
      workingDirectory: options?.workingDirectory ?? process.cwd(),
    });
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
    this.abortController = null;
  }

  private transformMessage(message: unknown): AgentMessage {
    // The Claude Agent SDK emits various message types.
    // We normalize them into our unified format.
    const msg = message as Record<string, unknown>;

    if (msg.type === "tool_use" || msg.type === "tool_call") {
      return {
        type: "tool_call",
        content: JSON.stringify({
          tool: msg.name ?? msg.tool,
          input: msg.input ?? msg.arguments,
        }),
        timestamp: Date.now(),
        metadata: { raw: msg },
      };
    }

    if (msg.type === "tool_result") {
      return {
        type: "tool_result",
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
        timestamp: Date.now(),
        metadata: { raw: msg },
      };
    }

    if (msg.type === "error") {
      return {
        type: "error",
        content:
          typeof msg.error === "string"
            ? msg.error
            : JSON.stringify(msg.error ?? msg),
        timestamp: Date.now(),
      };
    }

    // Default: treat as text
    return {
      type: "text",
      content:
        typeof msg.content === "string"
          ? msg.content
          : typeof msg.text === "string"
            ? msg.text
            : JSON.stringify(msg),
      timestamp: Date.now(),
      metadata: { raw: msg },
    };
  }
}
