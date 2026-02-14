import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { EventBus } from "./event-bus.js";
import type { KanbanManager } from "./kanban.js";
import type { AgentEvent } from "./types.js";

export interface ApiServerOptions {
  kanban: KanbanManager;
  eventBus: EventBus;
  port?: number;
}

const DEFAULT_PORT = 4400;

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

export function createApiServer(options: ApiServerOptions): Server {
  const { kanban, eventBus, port = DEFAULT_PORT } = options;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "/";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // GET /api/tasks
      if (req.method === "GET" && url === "/api/tasks") {
        const tasks = await kanban.getAllTasks();
        sendJson(res, 200, tasks);
        return;
      }

      // GET /api/events — SSE stream
      if (req.method === "GET" && url === "/api/events") {
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
