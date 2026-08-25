import { randomUUID } from "node:crypto";
import { assessInventoryAvailability, calculateShortage, findAtRiskLines, type AtRiskLine, type Inventory, type InventoryAssessment, type InventoryDataGap, type SalesOrder } from "../domain.js";
import { readToolDefinitions } from "../mcp/catalog.js";
import type { ReadToolName } from "../mcp/readServer.js";
import type { AgentEvidence, AgentModel } from "./model.js";
import type { AgentMcpClient } from "./mcpClient.js";

export interface AgentRun {
  sessionId: string;
  request: string;
  response: string;
  evidence: AgentEvidence[];
  findings: AtRiskLine[];
  dataGaps: InventoryDataGap[];
  toolCalls: Array<{ name: string; arguments: unknown; traceId?: string }>;
  rounds: number;
}

export class AgentOrchestrator {
  constructor(private readonly model: AgentModel, private readonly mcp: AgentMcpClient, private readonly maxRounds = 3, private readonly maxToolCalls = 32) {}

  async run(request: string): Promise<AgentRun> {
    const sessionId = `session-${randomUUID()}`;
    const evidence: AgentEvidence[] = [];
    const toolCalls: AgentRun["toolCalls"] = [];
    const executedCalls = new Set<string>();
    let rounds = 0;

    const execute = async (call: { name: string; arguments: unknown }): Promise<unknown | undefined> => {
      const callKey = `${call.name}:${JSON.stringify(call.arguments)}`;
      if (executedCalls.has(callKey)) return undefined;
      executedCalls.add(callKey);
      if (!readToolDefinitions.some((tool) => tool.name === call.name)) throw new Error(`The agent requested an unavailable tool: ${call.name}`);
      const result = await this.mcp.call(call.name, call.arguments);
      toolCalls.push({ name: call.name, arguments: call.arguments, traceId: result.traceId });
      evidence.push({ toolName: call.name, arguments: call.arguments, result: result.data, error: result.error, traceId: result.traceId });
      return result.data;
    };

    while (rounds < this.maxRounds && toolCalls.length < this.maxToolCalls) {
      rounds += 1;
      const decision = await this.model.decide({ request, evidence, tools: readToolDefinitions });
      if (decision.type === "final") {
        const assessment = this.assessment(evidence);
        return { sessionId, request, response: this.withDataGapNotice(decision.text, assessment.dataGaps), evidence, findings: assessment.atRiskLines, dataGaps: assessment.dataGaps, toolCalls, rounds };
      }
      if (decision.toolCalls.length === 0) throw new Error("The agent requested no tools and produced no answer.");
      for (const call of decision.toolCalls) {
        if (toolCalls.length >= this.maxToolCalls) break;
        const result = await execute(call);
        if (call.name === "get_open_orders" && Array.isArray(result)) {
          const productIds = [...new Set((result as SalesOrder[]).flatMap((order) => order.lineItems.map((line) => line.productId)))];
          for (const productId of productIds) {
            if (toolCalls.length >= this.maxToolCalls) break;
            await execute({ name: "get_inventory", arguments: { productId } });
          }
        }
      }
    }

    const assessment = this.assessment(evidence);
    const response = await this.model.summarize({ request, evidence, findings: assessment });
    return { sessionId, request, response: this.withDataGapNotice(response, assessment.dataGaps), evidence, findings: assessment.atRiskLines, dataGaps: assessment.dataGaps, toolCalls, rounds };
  }

  private assessment(evidence: AgentEvidence[]): InventoryAssessment {
    const orders = evidence.filter((item) => item.toolName === "get_open_orders" || item.toolName === "get_order").flatMap((item) => this.asOrders(item.result));
    const inventoryByProduct = new Map<string, number>();
    for (const item of evidence.filter((entry) => entry.toolName === "get_inventory")) {
      const records = Array.isArray(item.result) ? item.result as Inventory[] : [];
      if (records.length === 0) continue;
      const productId = records[0].productId;
      inventoryByProduct.set(productId, records.reduce((total, record) => total + record.available, 0));
    }
    const assessed = assessInventoryAvailability(orders, inventoryByProduct);
    const uniqueFindings = new Map<string, AtRiskLine>();
    for (const finding of assessed.atRiskLines) uniqueFindings.set(`${finding.orderId}:${finding.lineId}:${finding.productId}`, finding);
    const uniqueDataGaps = new Map<string, InventoryDataGap>();
    for (const dataGap of assessed.dataGaps) uniqueDataGaps.set(`${dataGap.orderId}:${dataGap.lineId}:${dataGap.productId}`, dataGap);
    return { atRiskLines: [...uniqueFindings.values()], dataGaps: [...uniqueDataGaps.values()] };
  }

  private asOrders(result: unknown): SalesOrder[] {
    if (Array.isArray(result)) return result as SalesOrder[];
    return result ? [result as SalesOrder] : [];
  }

  private withDataGapNotice(response: string, dataGaps: InventoryDataGap[]): string {
    if (!dataGaps.length || response.toLowerCase().includes("unable to determine")) return response;
    const affectedLines = dataGaps.map((gap) => `${gap.orderId}/${gap.productId}`).join(", ");
    return `${response} Unable to determine inventory risk for ${affectedLines} because no inventory record was returned. No replenishment action is proposed for incomplete inventory data.`;
  }
}

export class TestAgentModel implements AgentModel {
  async decide(input: { request: string; evidence: AgentEvidence[] }): Promise<import("./model.js").AgentDecision> {
    if (input.evidence.length === 0) return { type: "tool_calls", toolCalls: [{ callId: "test-open-orders", name: "get_open_orders", arguments: {} }] };
    const knownProducts = new Set(input.evidence.filter((item) => item.toolName === "get_inventory").map((item) => (item.arguments as { productId: string }).productId));
    const orders = input.evidence.find((item) => item.toolName === "get_open_orders")?.result as SalesOrder[] | undefined;
    const productIds = [...new Set((orders ?? []).flatMap((order) => order.lineItems.map((line) => line.productId)))];
    const missing = productIds.filter((productId) => !knownProducts.has(productId));
    if (missing.length) return { type: "tool_calls", toolCalls: missing.map((productId) => ({ callId: `test-inventory-${productId}`, name: "get_inventory", arguments: { productId } })) };
    const inventoryByProduct = new Map<string, number>();
    for (const item of input.evidence.filter((entry) => entry.toolName === "get_inventory")) {
      const records = Array.isArray(item.result) ? item.result as Inventory[] : [];
      if (records.length) inventoryByProduct.set(records[0].productId, records.reduce((total, record) => total + record.available, 0));
    }
    const assessment = assessInventoryAvailability(orders ?? [], inventoryByProduct);
    const findings = assessment.atRiskLines;
    if (!findings.length && assessment.dataGaps.length) return { type: "final", text: "Unable to determine inventory risk for one or more open-order lines because no inventory record was returned. No write action was executed." };
    if (!findings.length) return { type: "final", text: "No open order shortages were found. No write action was executed." };
    return { type: "final", text: findings.map((finding) => `${finding.orderId} is at risk because ${finding.quantityRequired} units of ${finding.productId} are required but only ${finding.availableInventory} are available, creating a shortage of ${finding.shortage}.`).join(" ") + " Recommended action: create a replenishment request for the shortage. No write action was executed by the read-only analysis stage." };
  }

  async summarize(input: { request: string; evidence: AgentEvidence[]; findings: unknown }): Promise<string> {
    const assessment = input.findings as InventoryAssessment;
    const findings = assessment.atRiskLines ?? input.findings as AtRiskLine[];
    if (!findings.length && assessment.dataGaps?.length) return "Unable to determine inventory risk for one or more open-order lines because no inventory record was returned. No write action was executed.";
    if (!findings.length) return "No open order shortages were found. No write action was executed.";
    return findings.map((finding) => `${finding.orderId} is at risk because ${finding.quantityRequired} units of ${finding.productId} are required but only ${finding.availableInventory} are available, creating a shortage of ${calculateShortage(finding.quantityRequired, finding.availableInventory)}.`).join(" ") + " Recommended action: create a replenishment request for the shortage. No write action was executed by the read-only analysis stage.";
  }
}
