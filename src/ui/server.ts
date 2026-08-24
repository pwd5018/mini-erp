import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { OpenAIModel } from "../agent/model.js";
import { ApprovalDemoSession } from "./session.js";
import { approvalPage } from "./page.js";

const port = Number(process.env.MINI_ERP_UI_PORT ?? 8787);
const live = process.argv.includes("--live");
const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(readFileSync("data/mini-erp.db")));
const session = new ApprovalDemoSession(db, live ? new OpenAIModel() : undefined, live ? "OPENAI" : "DETERMINISTIC");

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") return sendHtml(response, approvalPage);
    if (request.method === "GET" && request.url === "/api/state") return sendJson(response, session.getState());
    if (request.method === "POST" && request.url === "/api/analyze") return sendJson(response, await session.analyzeAndPropose());
    if (request.method === "POST" && request.url === "/api/approve") return sendJson(response, await session.approve());
    if (request.method === "POST" && request.url === "/api/execute") return sendJson(response, await session.execute());
    sendJson(response, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Mini ERP approval UI (${live ? "OpenAI" : "deterministic"}) running at http://127.0.0.1:${port}`));

async function shutdown(): Promise<void> {
  await session.close();
  db.close();
  server.close();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
}

function sendJson(response: ServerResponse, body: unknown, status = 200): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
