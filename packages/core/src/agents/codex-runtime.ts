import type { AgentRuntime } from "./agent-runtime.js";
import type { AgentMessage, RunOptions, SdkType } from "../types.js";
import type { ThreadEvent, ThreadItem } from "@openai/codex-sdk";

/**
 * Codex SDK adapter.
 *
 * Wraps `@openai/codex-sdk` Codex.startThread().runStreamed() to conform to AgentRuntime.
 */
export class CodexAgentRuntime implements AgentRuntime {
  readonly sdk: SdkType = "codex";
  private abortController: AbortController | null = null;
  private currentThreadId: string | null = null;

  constructor(
    readonly id: string,
    readonly model: string,
  ) {}

  async *run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage> {
    const fullPrompt = options.systemPrompt.trim().length
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;
    yield* this.runThread(fullPrompt, options, null);
  }

  async *resume(
    sessionId: string,
    prompt: string,
  ): AsyncIterable<AgentMessage> {
    yield* this.runThread(prompt, {
      systemPrompt: "",
      workingDirectory: process.cwd(),
    }, sessionId);
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
    this.abortController = null;
  }

  private async *runThread(
    prompt: string,
    options: RunOptions,
    sessionId: string | null,
  ): AsyncIterable<AgentMessage> {
    const sdk = await this.loadSdk();
    if (!sdk) {
      yield {
        type: "error",
        content:
          "Codex SDK not installed. Run: npm install @openai/codex-sdk",
        timestamp: Date.now(),
      };
      return;
    }

    this.abortController = new AbortController();

    try {
      const codex = new sdk.Codex();
      const threadOptions = {
        model: this.model,
        approvalPolicy: "never" as const,
        sandboxMode: "workspace-write" as const,
        workingDirectory: options.workingDirectory,
        skipGitRepoCheck: true,
      };

      const thread = sessionId
        ? codex.resumeThread(sessionId, threadOptions)
        : codex.startThread(threadOptions);

      const { events } = await thread.runStreamed(prompt, {
        outputSchema: options.outputSchema,
        signal: this.abortController.signal,
      });

      for await (const event of events) {
        const message = this.transformEvent(event);
        if (message) {
          yield message;
        }
      }

      this.currentThreadId = thread.id ?? this.currentThreadId;
    } catch (error) {
      if (this.abortController?.signal.aborted) return;
      yield {
        type: "error",
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    } finally {
      this.abortController = null;
    }
  }

  private async loadSdk(): Promise<typeof import("@openai/codex-sdk") | null> {
    try {
      return await import("@openai/codex-sdk");
    } catch {
      return null;
    }
  }

  private transformEvent(event: ThreadEvent): AgentMessage | null {
    switch (event.type) {
      case "thread.started":
        this.currentThreadId = event.thread_id;
        return null;

      case "turn.started":
        return null;

      case "turn.completed":
        return {
          type: "summary",
          content:
            `Usage(in=${event.usage.input_tokens}, cached=${event.usage.cached_input_tokens}, out=${event.usage.output_tokens})`,
          timestamp: Date.now(),
          metadata: { raw: event },
        };

      case "turn.failed":
        return {
          type: "error",
          content: event.error.message,
          timestamp: Date.now(),
          metadata: { raw: event },
        };

      case "error":
        return {
          type: "error",
          content: event.message,
          timestamp: Date.now(),
          metadata: { raw: event },
        };

      case "item.started":
      case "item.updated":
      case "item.completed":
        return this.transformItemEvent(event.type, event.item, event);
    }
  }

  private transformItemEvent(
    eventType: "item.started" | "item.updated" | "item.completed",
    item: ThreadItem,
    rawEvent: ThreadEvent,
  ): AgentMessage | null {
    switch (item.type) {
      case "agent_message":
        if (eventType !== "item.completed") return null;
        return {
          type: "text",
          content: item.text,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "command_execution":
        if (item.status === "in_progress") {
          return {
            type: "tool_call",
            content: JSON.stringify({
              tool: "shell",
              input: item.command,
            }),
            timestamp: Date.now(),
            metadata: { raw: rawEvent },
          };
        }
        return {
          type: item.status === "failed" ? "error" : "tool_result",
          content: item.aggregated_output || `Command exit code: ${item.exit_code ?? "unknown"}`,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "mcp_tool_call":
        if (item.status === "in_progress") {
          return {
            type: "tool_call",
            content: JSON.stringify({
              tool: `${item.server}/${item.tool}`,
              input: item.arguments,
            }),
            timestamp: Date.now(),
            metadata: { raw: rawEvent },
          };
        }
        if (item.status === "failed") {
          return {
            type: "error",
            content: item.error?.message ?? `MCP tool failed: ${item.server}/${item.tool}`,
            timestamp: Date.now(),
            metadata: { raw: rawEvent },
          };
        }
        return {
          type: "tool_result",
          content: JSON.stringify(item.result ?? {}),
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "file_change":
        if (item.status !== "completed") return null;
        return {
          type: "summary",
          content: `File changes: ${item.changes.map((change) => `${change.kind}:${change.path}`).join(", ")}`,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "reasoning":
        return {
          type: "summary",
          content: item.text,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "web_search":
        return {
          type: "tool_call",
          content: JSON.stringify({
            tool: "web_search",
            input: item.query,
          }),
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "todo_list":
        return {
          type: "summary",
          content: `Todo list updated (${item.items.length} items)`,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };

      case "error":
        return {
          type: "error",
          content: item.message,
          timestamp: Date.now(),
          metadata: { raw: rawEvent },
        };
    }
  }
}
