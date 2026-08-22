import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { insertSeedData, createSchema } from "../src/database.js";
import { createEmbeddedMcpClient } from "../src/agent/mcpClient.js";
import { AgentOrchestrator, TestAgentModel } from "../src/agent/orchestrator.js";
import { seedData } from "../src/seed.js";

describe("Phase 3 read-only agent", () => {
  it("selects read tools and deterministically identifies the seeded shortage", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database(); createSchema(db); insertSeedData(db, seedData);
    const { client } = await createEmbeddedMcpClient(db);
    const run = await new AgentOrchestrator(new TestAgentModel(), client).run("Which open orders are at risk because of inventory shortages?");
    expect(run.findings).toContainEqual(expect.objectContaining({ orderId: "SO-1001", productId: "P-001", availableInventory: 30, shortage: 20 }));
    expect(run.toolCalls.map((call) => call.name)).toContain("get_open_orders");
    expect(run.toolCalls.map((call) => call.name)).toContain("get_inventory");
    expect(run.response).toContain("No write action was executed");
    await client.close(); db.close();
  });
});
