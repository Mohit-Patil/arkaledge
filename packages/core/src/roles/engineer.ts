import type { AgentRuntime } from "../agents/agent-runtime.js";
import type { EventBus } from "../event-bus.js";
import type { KanbanManager } from "../kanban.js";
import type { AgentMessage, Task } from "../types.js";

const ENGINEER_SYSTEM_PROMPT = `You are a software engineer. Your job is to implement the given task completely.

Requirements:
1. Write clean, working code that satisfies all acceptance criteria
2. Write tests for your implementation
3. Run the tests to verify they pass
4. If tests fail, analyze the error and fix the code, then re-run tests

Do NOT output JSON — just implement the task by writing code and running tests.`;

/** Test failure indicators to scan for in agent output. */
const FAILURE_PATTERNS = [
  /FAIL/i,
  /Error:/,
  /AssertionError/i,
  /test(s)? failed/i,
  /exit code [1-9]/i,
  /npm ERR!/,
  /TypeError:/,
  /ReferenceError:/,
  /SyntaxError:/,
];

/**
 * Executes a single task: reads description, writes code + tests, self-corrects.
 */
export class EngineerRole {
  constructor(
    private runtime: AgentRuntime,
    private kanban: KanbanManager,
    private eventBus: EventBus,
  ) {}

  async executeTask(task: Task, projectDir: string, maxRetries: number): Promise<boolean> {
    this.eventBus.emit({
      type: "agent:started",
      agentId: this.runtime.id,
      agentRole: "engineer",
      timestamp: Date.now(),
      summary: `Engineer starting: ${task.title}`,
      data: { taskId: task.id },
    });

    const userPrompt = buildTaskPrompt(task);
    let lastOutput = "";
    let success = false;
    let sessionId: string | undefined;

    // Initial run
    const result = await this.runAndCollect(userPrompt, projectDir);
    lastOutput = result.output;
    sessionId = result.sessionId;
    success = !hasTestFailures(lastOutput);

    // Self-correction loop
    let retries = 0;
    while (!success && retries < maxRetries) {
      retries++;
      await this.kanban.updateTask(task.id, { retryCount: retries });

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Retry ${retries}/${maxRetries} for: ${task.title}`,
        data: { taskId: task.id, retry: retries },
      });

      const retryPrompt = `The tests failed. Here is the error output:\n\n${lastOutput.slice(-2000)}\n\nFix the code and run the tests again.`;

      const retryResult = sessionId
        ? await this.resumeAndCollect(sessionId, retryPrompt)
        : await this.runAndCollect(retryPrompt, projectDir);

      lastOutput = retryResult.output;
      sessionId = retryResult.sessionId;
      success = !hasTestFailures(lastOutput);
    }

    if (success) {
      await this.kanban.moveTask(task.id, "review", this.runtime.id, "Implementation complete, moving to review");

      this.eventBus.emit({
        type: "agent:completed",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer completed: ${task.title}`,
        data: { taskId: task.id },
      });
    } else {
      await this.kanban.moveTask(task.id, "blocked", this.runtime.id, `Failed after ${maxRetries} retries`);

      this.eventBus.emit({
        type: "agent:error",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: `Engineer blocked on: ${task.title} (${maxRetries} retries exhausted)`,
        data: { taskId: task.id, lastOutput: lastOutput.slice(-500) },
      });
    }

    return success;
  }

  private async runAndCollect(
    prompt: string,
    projectDir: string,
  ): Promise<{ output: string; sessionId?: string }> {
    let output = "";
    let sessionId: string | undefined;

    for await (const message of this.runtime.run(prompt, {
      systemPrompt: ENGINEER_SYSTEM_PROMPT,
      workingDirectory: projectDir,
    })) {
      output += messageToString(message);
      sessionId = extractSessionId(message);

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: message.content.slice(0, 200),
        data: { messageType: message.type },
      });
    }

    return { output, sessionId };
  }

  private async resumeAndCollect(
    sessionId: string,
    prompt: string,
  ): Promise<{ output: string; sessionId?: string }> {
    let output = "";
    let newSessionId: string | undefined = sessionId;

    for await (const message of this.runtime.resume(sessionId, prompt)) {
      output += messageToString(message);
      const sid = extractSessionId(message);
      if (sid) newSessionId = sid;

      this.eventBus.emit({
        type: "agent:message",
        agentId: this.runtime.id,
        agentRole: "engineer",
        timestamp: Date.now(),
        summary: message.content.slice(0, 200),
        data: { messageType: message.type },
      });
    }

    return { output, sessionId: newSessionId };
  }
}

function buildTaskPrompt(task: Task): string {
  const criteria = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
  return `Implement this task:

**Title:** ${task.title}

**Description:** ${task.description}

**Acceptance Criteria:**
${criteria}

Write the implementation code and tests. Run the tests to verify everything works.`;
}

function hasTestFailures(output: string): boolean {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

function messageToString(msg: AgentMessage): string {
  if (msg.type === "text" || msg.type === "tool_result" || msg.type === "error") {
    return msg.content + "\n";
  }
  return "";
}

function extractSessionId(msg: AgentMessage): string | undefined {
  return msg.metadata?.["sessionId"] as string | undefined;
}
