import type { Database } from "sql.js";
import { AgentOrchestrator, TestAgentModel } from "../agent/orchestrator.js";
import { createEmbeddedMcpClient, createEmbeddedWriteMcpClient, type AgentMcpClient } from "../agent/mcpClient.js";
import type { AgentModel } from "../agent/model.js";
import type { ReplenishmentPayload } from "../domain.js";
import { TraceRecorder, type TraceEvent } from "../observability/trace.js";

export type ApprovalDemoPhase = "READY" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";

export interface ApprovalDemoState {
  phase: ApprovalDemoPhase;
  provider: "DETERMINISTIC" | "OPENAI";
  request: string;
  analysis?: { response: string; findings: unknown[]; toolCalls: Array<{ name: string; arguments: unknown; traceId?: string }> };
  recommendation?: ReplenishmentPayload & { type: "CREATE_REPLENISHMENT_REQUEST" };
  action?: { actionId: string; approvalStatus: string; executionStatus: string; payload: ReplenishmentPayload };
  replenishmentRequest?: { requestId: string; productId: string; quantity: number; linkedOrderId: string | null; status: string; approvedBy: string | null };
  duplicateExecutionRequestId?: string;
  error?: string;
  traceEvents: TraceEvent[];
  toolTraceCount: number;
}

const REQUEST = "Which open orders are at risk because of inventory shortages?";

export class ApprovalDemoSession {
  private readonly recorder: TraceRecorder;
  private readonly request = REQUEST;
  private read?: Awaited<ReturnType<typeof createEmbeddedMcpClient>>;
  private analyst?: Awaited<ReturnType<typeof createEmbeddedWriteMcpClient>>;
  private manager?: Awaited<ReturnType<typeof createEmbeddedWriteMcpClient>>;
  private state: ApprovalDemoState;

  constructor(private readonly db: Database, private readonly model: AgentModel = new TestAgentModel(), private readonly provider: ApprovalDemoState["provider"] = "DETERMINISTIC") {
    this.recorder = new TraceRecorder();
    this.state = { phase: "READY", provider, request: this.request, traceEvents: [], toolTraceCount: 0 };
  }

  getState(): ApprovalDemoState {
    return { ...this.state, traceEvents: this.recorder.listEvents(), toolTraceCount: this.recorder.list().length };
  }

  async analyzeAndPropose(): Promise<ApprovalDemoState> {
    if (this.state.phase !== "READY") return this.getState();
    this.recorder.recordEvent("USER_REQUEST", this.request);
    this.recorder.recordEvent("INTENT", "Inventory shortage analysis");
    this.read = await createEmbeddedMcpClient(this.db, this.recorder);
    const analysis = await new AgentOrchestrator(this.model, this.read.client).run(this.request);
    if (analysis.findings.length !== 1) throw new Error(`Expected one demo shortage finding, received ${analysis.findings.length}.`);
    const finding = analysis.findings[0];
    this.recorder.recordEvent("FINDING", `${finding.orderId}: ${finding.quantityRequired} required, ${finding.availableInventory} available, shortage ${finding.shortage}.`, finding);
    const recommendation = {
      type: "CREATE_REPLENISHMENT_REQUEST" as const,
      productId: finding.productId,
      quantity: finding.shortage,
      linkedOrderId: finding.orderId,
      reason: `${finding.orderId} requires ${finding.quantityRequired} units and only ${finding.availableInventory} are currently available.`,
      idempotencyKey: `ui-${finding.orderId}-${finding.productId}-${finding.shortage}`,
    };
    this.recorder.recordEvent("RECOMMENDATION", `Create replenishment request for ${recommendation.quantity} units of ${recommendation.productId}.`, recommendation);
    this.analyst = await createEmbeddedWriteMcpClient(this.db, { userId: "demo-analyst", role: "OPERATIONS_ANALYST", sessionId: analysis.sessionId }, this.recorder);
    const { type: _type, ...payload } = recommendation;
    const proposed = await this.analyst.client.call("propose_replenishment_request", payload);
    if (proposed.error) throw new Error(proposed.error);
    const action = proposed.data as ApprovalDemoState["action"];
    this.recorder.recordEvent("ACTION", `Pending action ${action?.actionId} created.`, action);
    this.state = { ...this.state, phase: "PENDING_APPROVAL", analysis: { response: analysis.response, findings: analysis.findings, toolCalls: analysis.toolCalls }, recommendation, action, traceEvents: [], toolTraceCount: 0 };
    return this.getState();
  }

  async approve(): Promise<ApprovalDemoState> {
    if (this.state.phase !== "PENDING_APPROVAL" || !this.state.action) throw new Error("A pending action is required before approval.");
    this.manager ??= await createEmbeddedWriteMcpClient(this.db, { userId: "demo-manager", role: "OPERATIONS_MANAGER", sessionId: this.state.analysis?.toolCalls[0]?.traceId ?? "ui-session" }, this.recorder);
    const result = await this.manager.client.call("approve_action", { actionId: this.state.action.actionId });
    if (result.error) throw new Error(result.error);
    const action = result.data as ApprovalDemoState["action"];
    this.recorder.recordEvent("APPROVAL", `Action ${this.state.action.actionId} approved by Operations Manager.`, { actionId: this.state.action.actionId, approvedBy: "demo-manager" });
    this.state = { ...this.state, phase: "APPROVED", action };
    return this.getState();
  }

  async execute(): Promise<ApprovalDemoState> {
    if (this.state.phase !== "APPROVED" || !this.state.action || !this.manager || !this.read || !this.state.recommendation) throw new Error("An approved action is required before execution.");
    const result = await this.manager.client.call("create_replenishment_request", { actionId: this.state.action.actionId });
    if (result.error) throw new Error(result.error);
    const execution = result.data as { replenishmentRequest: NonNullable<ApprovalDemoState["replenishmentRequest"]> };
    this.recorder.recordEvent("WRITE_RESULT", `${execution.replenishmentRequest.requestId} created successfully.`, execution.replenishmentRequest);
    const duplicate = await this.manager.client.call("create_replenishment_request", { actionId: this.state.action.actionId });
    if (duplicate.error) throw new Error(duplicate.error);
    const duplicateRequestId = (duplicate.data as { replenishmentRequest: { requestId: string } }).replenishmentRequest.requestId;
    const verifiedAction = await this.manager.client.call("get_agent_action", { actionId: this.state.action.actionId });
    const verifiedRequests = await this.read.client.call("get_replenishment_requests", { productId: this.state.recommendation.productId, status: "PENDING" });
    if (verifiedAction.error || verifiedRequests.error) throw new Error(verifiedAction.error ?? verifiedRequests.error);
    const action = verifiedAction.data as ApprovalDemoState["action"];
    const requests = verifiedRequests.data as NonNullable<ApprovalDemoState["replenishmentRequest"]>[];
    if (action?.executionStatus !== "COMPLETED" || requests.filter((request) => request.requestId === execution.replenishmentRequest.requestId).length !== 1) throw new Error("Final transaction verification failed.");
    this.recorder.recordEvent("VERIFICATION", `Action ${this.state.action.actionId} is COMPLETED and exactly one replenishment request is present.`, { actionId: this.state.action.actionId, requestId: execution.replenishmentRequest.requestId });
    this.recorder.recordEvent("FINAL_STATUS", "Completed");
    this.state = { ...this.state, phase: "COMPLETED", action, replenishmentRequest: execution.replenishmentRequest, duplicateExecutionRequestId: duplicateRequestId };
    return this.getState();
  }

  async close(): Promise<void> {
    await this.analyst?.client.close();
    await this.manager?.client.close();
    await this.read?.client.close();
  }
}
