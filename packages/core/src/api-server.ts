import type { Dirent, Stats } from "node:fs";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import type { EventBus } from "./event-bus.js";
import type { KanbanManager } from "./kanban.js";
import type { AgentEvent } from "./types.js";

export interface ApiServerOptions {
  kanban: KanbanManager;
  eventBus: EventBus;
  port?: number;
}

const DEFAULT_PORT = 4400;
const WORKTREE_ROUTE_PATTERN = /^\/api\/tasks\/([^/]+)\/worktree(?:\/(.*))?$/;

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

export function createApiServer(options: ApiServerOptions): Server {
  const { kanban, eventBus, port = DEFAULT_PORT } = options;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname;

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // GET /api/tasks
      if (req.method === "GET" && pathname === "/api/tasks") {
        const tasks = await kanban.getAllTasks();
        sendJson(res, 200, tasks);
        return;
      }

      // GET /api/events — SSE stream
      if (req.method === "GET" && pathname === "/api/events") {
        setCorsHeaders(res);
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        const handler = (event: AgentEvent): void => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        eventBus.on("*", handler);

        // Clean up listener when client disconnects
        req.on("close", () => {
          eventBus.off("*", handler);
        });

        return;
      }

      // GET /api/tasks/:taskId/worktree/*path — browse/serve task worktree files
      const worktreeRoute = matchWorktreeRoute(pathname);
      if (req.method === "GET" && worktreeRoute) {
        await handleWorktreeRequest(kanban, res, requestUrl, worktreeRoute.taskId, worktreeRoute.relativePath);
        return;
      }

      // 404 for unknown routes
      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      sendJson(res, 500, { error: message });
    }
  });

  server.listen(port);
  return server;
}

interface WorktreeRouteMatch {
  taskId: string;
  relativePath: string;
}

function matchWorktreeRoute(pathname: string): WorktreeRouteMatch | null {
  const match = pathname.match(WORKTREE_ROUTE_PATTERN);
  if (!match) return null;

  const rawTaskId = decodeUriComponent(match[1]);
  const rawPath = decodeUriComponent(match[2] ?? "");
  if (rawTaskId === null || rawPath === null) return null;

  return { taskId: rawTaskId, relativePath: rawPath };
}

async function handleWorktreeRequest(
  kanban: KanbanManager,
  res: ServerResponse,
  requestUrl: URL,
  taskId: string,
  rawRelativePath: string,
): Promise<void> {
  const normalizedRelativePath = normalizeRelativePath(rawRelativePath);
  if (normalizedRelativePath === null) {
    sendJson(res, 400, { error: "Invalid worktree path" });
    return;
  }

  const tasks = await kanban.getAllTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !task.worktree) {
    sendJson(res, 404, { error: "Task worktree not found" });
    return;
  }

  const worktreeRoot = resolve(task.worktree);
  const rootRealPath = await safeRealpath(worktreeRoot);
  if (!rootRealPath) {
    sendJson(res, 404, { error: "Task worktree directory not found" });
    return;
  }

  const targetPath = resolve(worktreeRoot, normalizedRelativePath || ".");
  if (!isPathInsideRoot(worktreeRoot, targetPath)) {
    sendJson(res, 403, { error: "Path traversal is not allowed" });
    return;
  }

  const targetStats = await safeStat(targetPath);
  if (!targetStats) {
    sendJson(res, 404, { error: "Worktree file not found" });
    return;
  }

  const targetRealPath = await safeRealpath(targetPath);
  if (!targetRealPath || !isPathInsideRoot(rootRealPath, targetRealPath)) {
    sendJson(res, 403, { error: "Path traversal is not allowed" });
    return;
  }

  if (targetStats.isDirectory()) {
    if (!requestUrl.pathname.endsWith("/")) {
      setCorsHeaders(res);
      const location = `${requestUrl.pathname}/${requestUrl.search}`;
      res.writeHead(301, { Location: location });
      res.end();
      return;
    }

    const indexPath = join(targetPath, "index.html");
    const indexStats = await safeStat(indexPath);
    if (indexStats?.isFile()) {
      const indexRealPath = await safeRealpath(indexPath);
      if (!indexRealPath || !isPathInsideRoot(rootRealPath, indexRealPath)) {
        sendJson(res, 403, { error: "Path traversal is not allowed" });
        return;
      }
      await sendFile(res, indexPath);
      return;
    }

    const entries = await readdir(targetPath, { withFileTypes: true });
    const html = renderDirectoryListing(taskId, normalizedRelativePath, entries);
    sendHtml(res, 200, html);
    return;
  }

  if (targetStats.isFile()) {
    await sendFile(res, targetPath);
    return;
  }

  sendJson(res, 404, { error: "Worktree file not found" });
}

function decodeUriComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function normalizeRelativePath(rawPath: string): string | null {
  if (rawPath.includes("\0")) return null;
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";

  const parts = normalized.split("/").filter((part) => part.length > 0 && part !== ".");
  if (parts.some((part) => part === "..")) {
    return null;
  }

  return parts.join("/");
}

function isPathInsideRoot(rootPath: string, targetPath: string): boolean {
  const rel = relative(rootPath, targetPath);
  if (rel === "") return true;
  return !rel.startsWith("..") && !isAbsolute(rel);
}

async function safeStat(filePath: string): Promise<Stats | null> {
  try {
    return await stat(filePath);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

async function safeRealpath(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

async function sendFile(res: ServerResponse, filePath: string): Promise<void> {
  const body = await readFile(filePath);
  setCorsHeaders(res);
  res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
  res.end(body);
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function renderDirectoryListing(taskId: string, relativePath: string, entries: Dirent[]): string {
  const sortedEntries = [...entries].sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  const rows: string[] = [];
  if (relativePath) {
    const parentPath = relativePath.split("/").slice(0, -1).join("/");
    rows.push(`<li><a href="${escapeHtml(buildWorktreeRoute(taskId, parentPath, true))}">..</a></li>`);
  }

  for (const entry of sortedEntries) {
    const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const href = buildWorktreeRoute(taskId, childRelativePath, entry.isDirectory());
    const label = entry.isDirectory() ? `${entry.name}/` : entry.name;
    rows.push(`<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`);
  }

  const headingPath = relativePath || ".";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Task ${escapeHtml(taskId)} worktree</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    p { margin: 0 0 16px; color: #555; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { margin: 6px 0; }
    a { text-decoration: none; color: #1d4ed8; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Task ${escapeHtml(taskId)} worktree</h1>
  <p>${escapeHtml(headingPath)}</p>
  <ul>${rows.join("")}</ul>
</body>
</html>`;
}

function buildWorktreeRoute(taskId: string, relativePath: string, isDirectory: boolean): string {
  const encodedTaskId = encodeURIComponent(taskId);
  if (!relativePath) {
    return `/api/tasks/${encodedTaskId}/worktree/`;
  }

  const encodedPath = relativePath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const suffix = isDirectory ? "/" : "";
  return `/api/tasks/${encodedTaskId}/worktree/${encodedPath}${suffix}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
