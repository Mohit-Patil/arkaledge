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
  export class Codex {
    constructor(options: {
      config: {
        model?: string;
        approval_policy?: string;
        sandbox_mode?: string;
      };
    });
    startThread(options: {
      workingDirectory: string;
      skipGitRepoCheck?: boolean;
    }): {
      runStreamed(prompt: string): Promise<{
        events: AsyncIterable<unknown>;
      }>;
      abort(): Promise<void>;
    };
  }
}
