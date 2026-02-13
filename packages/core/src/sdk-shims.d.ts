// Type declarations for optional peer SDK dependencies.
// These are dynamically imported at runtime; these shims prevent TS errors.

declare module "@anthropic-ai/claude-agent-sdk" {
  export function query(options: {
    prompt: string;
    options: {
      allowedTools?: string[];
      permissionMode?: string;
      model?: string;
      cwd?: string;
      abortController?: AbortController;
    };
  }): AsyncIterable<unknown>;
}

declare module "@openai/codex-sdk" {
  export type ApprovalMode =
    | "never"
    | "on-request"
    | "on-failure"
    | "untrusted";
  export type SandboxMode =
    | "read-only"
    | "workspace-write"
    | "danger-full-access";

  export type CodexConfigValue =
    | string
    | number
    | boolean
    | CodexConfigValue[]
    | { [key: string]: CodexConfigValue };

  export interface CodexOptions {
    codexPathOverride?: string;
    baseUrl?: string;
    apiKey?: string;
    config?: { [key: string]: CodexConfigValue };
    env?: Record<string, string>;
  }

  export interface ThreadOptions {
    model?: string;
    sandboxMode?: SandboxMode;
    workingDirectory?: string;
    skipGitRepoCheck?: boolean;
    approvalPolicy?: ApprovalMode;
    networkAccessEnabled?: boolean;
    webSearchMode?: "disabled" | "cached" | "live";
    webSearchEnabled?: boolean;
    additionalDirectories?: string[];
  }

  export interface TurnOptions {
    outputSchema?: unknown;
    signal?: AbortSignal;
  }

  export type ThreadItem =
    | {
        id: string;
        type: "agent_message";
        text: string;
      }
    | {
        id: string;
        type: "command_execution";
        command: string;
        aggregated_output: string;
        exit_code?: number;
        status: "in_progress" | "completed" | "failed";
      }
    | {
        id: string;
        type: "mcp_tool_call";
        server: string;
        tool: string;
        arguments: unknown;
        status: "in_progress" | "completed" | "failed";
        result?: unknown;
        error?: { message: string };
      }
    | {
        id: string;
        type: "error";
        message: string;
      }
    | {
        id: string;
        type: "reasoning";
        text: string;
      }
    | {
        id: string;
        type: "file_change";
        changes: Array<{
          path: string;
          kind: "add" | "delete" | "update";
        }>;
        status: "completed" | "failed";
      }
    | {
        id: string;
        type: "web_search";
        query: string;
      }
    | {
        id: string;
        type: "todo_list";
        items: Array<{ text: string; completed: boolean }>;
      };

  export type ThreadEvent =
    | {
        type: "thread.started";
        thread_id: string;
      }
    | {
        type: "turn.started";
      }
    | {
        type: "turn.completed";
        usage: {
          input_tokens: number;
          cached_input_tokens: number;
          output_tokens: number;
        };
      }
    | {
        type: "turn.failed";
        error: { message: string };
      }
    | {
        type: "item.started" | "item.updated" | "item.completed";
        item: ThreadItem;
      }
    | {
        type: "error";
        message: string;
      };

  export class Thread {
    readonly id: string | null;
    runStreamed(
      input: string | Array<{ type: "text"; text: string }>,
      turnOptions?: TurnOptions,
    ): Promise<{
      events: AsyncIterable<ThreadEvent>;
    }>;
    run(
      input: string | Array<{ type: "text"; text: string }>,
      turnOptions?: TurnOptions,
    ): Promise<{
      items: ThreadItem[];
      finalResponse: string;
      usage: {
        input_tokens: number;
        cached_input_tokens: number;
        output_tokens: number;
      } | null;
    }>;
  }

  export class Codex {
    constructor(options?: CodexOptions);
    startThread(options?: ThreadOptions): Thread;
    resumeThread(id: string, options?: ThreadOptions): Thread;
  }
}
