import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { OpenAIModel } from "../agent/model.js";
import { createSchema, insertSeedData } from "../database.js";
import { seedData } from "../seed.js";
import { ApprovalDemoSession } from "./session.js";
import { approvalPage } from "./page.js";

const port = Number(process.env.MINI_ERP_UI_PORT ?? 8787);
const live = process.argv.includes("--live");
const SQL = await initSqlJs();
// The browser demo always starts from a known state so stale actions from an
// earlier walkthrough cannot change what the reviewer sees.
mkdirSync("data", { recursive: true });
const db = new SQL.Database();
createSchema(db);
db.exec("DELETE FROM agent_actions; DELETE FROM replenishment_requests; DELETE FROM sales_order_lines; DELETE FROM sales_orders; DELETE FROM inventory; DELETE FROM suppliers; DELETE FROM products; DELETE FROM customers;");
insertSeedData(db, seedData);
persistDemoDatabase();
const session = new ApprovalDemoSession(db, live ? new OpenAIModel() : undefined, live ? "OPENAI" : "DETERMINISTIC");

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") return sendHtml(response, approvalPage);
    if (request.method === "GET" && request.url === "/api/state") return sendJson(response, session.getState());
    if (request.method === "POST" && request.url === "/api/analyze") {
      const state = await session.analyzeAndPropose();
      persistDemoDatabase();
      return sendJson(response, state);
    }
    if (request.method === "POST" && request.url === "/api/approve") {
      const state = await session.approve();
      persistDemoDatabase();
      return sendJson(response, state);
    }
    if (request.method === "POST" && request.url === "/api/execute") {
      const state = await session.execute();
      persistDemoDatabase();
      return sendJson(response, state);
    }
    sendJson(response, { error: "Not found" }, 404);
  } catch (error) {
    console.error("UI request failed:", error);
    sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Mini ERP approval UI (${live ? "OpenAI" : "deterministic"}) running at http://127.0.0.1:${port}`));

async function shutdown(): Promise<void> {
  await session.close();
  persistDemoDatabase();
  db.close();
  server.close();
}

function persistDemoDatabase(): void {
  writeFileSync("data/mini-erp.db", Buffer.from(db.export()));
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
