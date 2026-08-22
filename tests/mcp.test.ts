import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { createSchema, insertSeedData } from "../src/database.js";
import { seedData } from "../src/seed.js";
import { createReadMcpServer } from "../src/mcp/readServer.js";

async function connectedClient() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createSchema(db);
  insertSeedData(db, seedData);
  const { server, recorder } = createReadMcpServer(db);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "mini-erp-test-client", version: "0.2.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server, db, recorder };
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return content[0]?.text ?? "";
}

describe("Phase 2 MCP read tools", () => {
  it("lists all six read tools and returns grounded inventory", async () => {
    const { client, server, db, recorder } = await connectedClient();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_open_orders", "get_order", "get_inventory", "get_customer", "get_supplier", "get_replenishment_requests",
    ]);
    const result = await client.callTool({ name: "get_inventory", arguments: { productId: "P-001" } });
    const parsed = JSON.parse(textOf(result)) as { data: Array<{ available: number }>; traceId: string };
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0].available).toBe(30);
    expect(recorder.list()[0].success).toBe(true);
    await client.close(); await server.close(); db.close();
  });

  it("rejects invalid input and records the failed call", async () => {
    const { client, server, db, recorder } = await connectedClient();
    const result = await client.callTool({ name: "get_inventory", arguments: { productId: "" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Input validation error");
    expect(recorder.list()).toHaveLength(0);
    await client.close(); await server.close(); db.close();
  });

  it("returns a predictable not-found error", async () => {
    const { client, server, db } = await connectedClient();
    const result = await client.callTool({ name: "get_order", arguments: { orderId: "SO-9999" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("ORDER_NOT_FOUND");
    await client.close(); await server.close(); db.close();
  });
});
