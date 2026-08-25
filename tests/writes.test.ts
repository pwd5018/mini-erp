import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { describe, expect, it } from "vitest";
import { createSchema, getReplenishmentRequests, insertSeedData } from "../src/database.js";
import type { UserRole } from "../src/domain.js";
import { createWriteMcpServer } from "../src/mcp/writeServer.js";
import { seedData } from "../src/seed.js";

async function connectedWriteClient(db: Database, userId: string, role: UserRole) {
  const { server, recorder } = createWriteMcpServer(db, { userId, role, sessionId: `session-${userId}` });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: `${userId}-client`, version: "0.5.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server, recorder };
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content ?? [];
  return content[0]?.text ?? "";
}

function dataOf<T>(result: unknown): T {
  const structured = (result as { structuredContent?: { data: T } }).structuredContent;
  if (structured) return structured.data;
  return JSON.parse(textOf(result)).data as T;
}

describe("Phase 5 approval-gated writes", () => {
  it("requires a manager approval and executes an idempotent replenishment exactly once", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database(); createSchema(db); insertSeedData(db, seedData);
    const analyst = await connectedWriteClient(db, "analyst-1", "OPERATIONS_ANALYST");
    const manager = await connectedWriteClient(db, "manager-1", "OPERATIONS_MANAGER");
    const input = { productId: "P-001", quantity: 20, reason: "Shortage on SO-1001", linkedOrderId: "SO-1001", idempotencyKey: "replenish-so1001-p001-20" };

    const proposed = await analyst.client.callTool({ name: "propose_replenishment_request", arguments: input });
    const action = dataOf<{ actionId: string; approvalStatus: string }>(proposed);
    expect(action.approvalStatus).toBe("PENDING");

    const analystApproval = await analyst.client.callTool({ name: "approve_action", arguments: { actionId: action.actionId } });
    expect(analystApproval.isError).toBe(true);
    expect(textOf(analystApproval)).toContain("FORBIDDEN");

    const beforeApproval = await manager.client.callTool({ name: "create_replenishment_request", arguments: { actionId: action.actionId } });
    expect(beforeApproval.isError).toBe(true);
    expect(textOf(beforeApproval)).toContain("approved");

    const approved = await manager.client.callTool({ name: "approve_action", arguments: { actionId: action.actionId } });
    expect(dataOf<{ approvalStatus: string }>(approved).approvalStatus).toBe("APPROVED");

    const executed = await manager.client.callTool({ name: "create_replenishment_request", arguments: { actionId: action.actionId } });
    const firstRequest = dataOf<{ replenishmentRequest: { requestId: string; quantity: number } }>(executed).replenishmentRequest;
    expect(firstRequest.quantity).toBe(20);

    const duplicateProposal = await analyst.client.callTool({ name: "propose_replenishment_request", arguments: input });
    expect(dataOf<{ actionId: string }>(duplicateProposal).actionId).toBe(action.actionId);
    const conflictingProposal = await analyst.client.callTool({ name: "propose_replenishment_request", arguments: { ...input, quantity: 21 } });
    expect(conflictingProposal.isError).toBe(true);
    expect(textOf(conflictingProposal)).toContain("CONFLICT");
    const duplicateExecution = await manager.client.callTool({ name: "create_replenishment_request", arguments: { actionId: action.actionId } });
    expect(dataOf<{ replenishmentRequest: { requestId: string } }>(duplicateExecution).replenishmentRequest.requestId).toBe(firstRequest.requestId);
    expect(getReplenishmentRequests(db, "P-001", "PENDING")).toHaveLength(1);
    expect(manager.recorder.list().filter((trace) => trace.toolName === "create_replenishment_request").every((trace) => trace.success)).toBe(false);

    await analyst.client.close(); await analyst.server.close(); await manager.client.close(); await manager.server.close(); db.close();
  });

  it("blocks invalid products before creating a pending action", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database(); createSchema(db); insertSeedData(db, seedData);
    const manager = await connectedWriteClient(db, "manager-1", "OPERATIONS_MANAGER");
    const result = await manager.client.callTool({ name: "propose_replenishment_request", arguments: { productId: "P-404", quantity: 10, reason: "Unknown product", linkedOrderId: null, idempotencyKey: "invalid-product-404" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("P-404");
    await manager.client.close(); await manager.server.close(); db.close();
  });
});
