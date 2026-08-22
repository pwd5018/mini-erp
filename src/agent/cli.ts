import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { createEmbeddedMcpClient } from "./mcpClient.js";
import { OpenAIModel } from "./model.js";
import { AgentOrchestrator } from "./orchestrator.js";

const request = process.argv.slice(2).join(" ").trim();
if (!request) throw new Error('Usage: npm run agent -- "Which open orders are at risk because of inventory shortages?"');
const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(readFileSync("data/mini-erp.db")));
const { client } = await createEmbeddedMcpClient(db);
try {
  const run = await new AgentOrchestrator(new OpenAIModel(), client).run(request);
  console.log(JSON.stringify({ sessionId: run.sessionId, response: run.response, findings: run.findings, toolCalls: run.toolCalls, rounds: run.rounds }, null, 2));
} finally {
  await client.close();
  db.close();
}
