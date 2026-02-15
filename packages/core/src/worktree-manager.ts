import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const WORKTREE_ROOT_DIR = ".arkaledge/worktrees";
const INITIAL_COMMIT_MESSAGE = "chore: initialize arkaledge repository";

interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
}

/**
 * Manages git worktrees for task-level engineer isolation.
 */
export class WorktreeManager {
  private readonly worktreeRoot: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(private projectDir: string) {
    this.worktreeRoot = join(projectDir, WORKTREE_ROOT_DIR);
  }

  async createWorktree(taskId: string, branchName: string): Promise<string> {
    return this.withQueue(async () => {
      await this.ensureRepositoryReady();
      await mkdir(this.worktreeRoot, { recursive: true });

      const worktreePath = this.resolveTaskPath(taskId);

      if (existsSync(worktreePath)) {
        try {
          await this.git(["worktree", "remove", "--force", worktreePath]);
        } catch {
          await rm(worktreePath, { recursive: true, force: true });
        }
      }

      const branchExists = await this.tryGit([
        "show-ref",
        "--verify",
        "--quiet",
        `refs/heads/${branchName}`,
      ]);

      if (branchExists) {
        await this.git(["worktree", "add", worktreePath, branchName]);
      } else {
        await this.git(["worktree", "add", "-b", branchName, worktreePath, "main"]);
      }
      return worktreePath;
    });
  }

  async removeWorktree(taskId: string): Promise<void> {
    return this.withQueue(async () => {
      await this.ensureRepositoryReady();
      const worktreePath = this.resolveTaskPath(taskId);
      if (!existsSync(worktreePath)) {
        await this.git(["worktree", "prune"]);
        return;
      }

      try {
        await this.git(["worktree", "remove", "--force", worktreePath]);
      } catch {
        await rm(worktreePath, { recursive: true, force: true });
      }

      await this.git(["worktree", "prune"]);
    });
  }

  async mergeToMain(branchName: string): Promise<void> {
    return this.withQueue(async () => {
      await this.ensureRepositoryReady();
      await this.git(["checkout", "main"]);
      try {
        await this.git(["merge", "--no-ff", branchName, "-m", `Merge ${branchName} into main`]);
      } catch (error) {
        // Abort the merge to leave the index clean for subsequent operations
        await this.tryGit(["merge", "--abort"]);
        throw error;
      }
    });
  }

  async getDiff(branchName: string): Promise<string> {
    return this.withQueue(async () => {
      await this.ensureRepositoryReady();
      return this.git(["diff", `main...${branchName}`]);
    });
  }

  private async withQueue<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release: () => void = () => undefined;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async ensureRepositoryReady(): Promise<void> {
    const insideGit = await this.tryGit(["rev-parse", "--is-inside-work-tree"]);
    if (!insideGit) {
      await mkdir(this.projectDir, { recursive: true });
      await this.git(["init"]);
    }

    const hasHead = await this.tryGit(["rev-parse", "--verify", "HEAD"]);
    if (!hasHead) {
      await this.ensureGitIdentity();
      await this.git(["commit", "--allow-empty", "-m", INITIAL_COMMIT_MESSAGE]);
    }

    // Clean up any dirty merge/rebase state before switching branches
    await this.tryGit(["merge", "--abort"]);
    await this.tryGit(["rebase", "--abort"]);

    await this.git(["checkout", "-B", "main"]);
  }

  private async ensureGitIdentity(): Promise<void> {
    const hasName = await this.tryGit(["config", "--get", "user.name"]);
    if (!hasName) {
      await this.git(["config", "user.name", "Arkaledge Bot"]);
    }

    const hasEmail = await this.tryGit(["config", "--get", "user.email"]);
    if (!hasEmail) {
      await this.git(["config", "user.email", "arkaledge@local"]);
    }
  }

  private resolveTaskPath(taskId: string): string {
    return join(this.worktreeRoot, sanitizeTaskId(taskId));
  }

  private async git(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: this.projectDir,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error) {
      const execError = error as ExecError;
      const stderr = execError.stderr?.trim();
      throw new Error(
        `git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`,
      );
    }
  }

  private async tryGit(args: string[]): Promise<boolean> {
    try {
      await execFileAsync("git", args, {
        cwd: this.projectDir,
        maxBuffer: 10 * 1024 * 1024,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function sanitizeTaskId(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9-_]/g, "-");
}
