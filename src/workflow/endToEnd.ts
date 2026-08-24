import type { Database } from "sql.js";
import { AgentOrchestrator, TestAgentModel, type AgentRun } from "../agent/orchestrator.js";
import { createEmbeddedMcpClient, createEmbeddedWriteMcpClient } from "../agent/mcpClient.js";
import type { AgentModel } from "../agent/model.js";
import type { ReplenishmentPayload } from "../domain.js";
import { TraceRecorder, type TraceEvent } from "../observability/trace.js";

export interface ReplenishmentRecommendation extends ReplenishmentPayload {
  type: "CREATE_REPLENISHMENT_REQUEST";
}

export interface EndToEndWorkflowResult {
  request: string;
  analysis: AgentRun;
  recommendation: ReplenishmentRecommendation;
  action: { actionId: string; approvalStatus: string; executionStatus: string; payload: ReplenishmentPayload };
  analystApprovalRejected: boolean;
  executionBeforeApprovalRejected: boolean;
  approvedBy: string;
  replenishmentRequest: { requestId: string; productId: string; quantity: number; linkedOrderId: string | null; status: string; approvedBy: string | null };
  duplicateExecutionRequestId: string;
  verifiedAction: { actionId: string; approvalStatus: string; executionStatus: string };
  verifiedRequests: Array<{ requestId: string; productId: string; quantity: number; linkedOrderId: string | null; status: string; approvedBy: string | null }>;
  traceEvents: TraceEvent[];
  toolTraces: ReturnType<TraceRecorder["list"]>;
}

const REQUEST = "Which open orders are at risk because of inventory shortages?";

export async function runEndToEndWorkflow(db: Database, request = REQUEST, model: AgentModel = new TestAgentModel()): Promise<EndToEndWorkflowResult> {
  const recorder = new TraceRecorder();
  recorder.recordEvent("USER_REQUEST", request);
  recorder.recordEvent("INTENT", "Inventory shortage analysis");

  const read = await createEmbeddedMcpClient(db, recorder);
  let analyst: Awaited<ReturnType<typeof createEmbeddedWriteMcpClient>> | undefined;
  let manager: Awaited<ReturnType<typeof createEmbeddedWriteMcpClient>> | undefined;
  try {
    const analysis = await new AgentOrchestrator(model, read.client).run(request);
    if (analysis.findings.length !== 1) throw new Error(`Expected one demo shortage finding, received ${analysis.findings.length}.`);
    const finding = analysis.findings[0];
    recorder.recordEvent("FINDING", `${finding.orderId}: ${finding.quantityRequired} required, ${finding.availableInventory} available, shortage ${finding.shortage}.`, finding);

    const recommendation: ReplenishmentRecommendation = {
      type: "CREATE_REPLENISHMENT_REQUEST",
      productId: finding.productId,
      quantity: finding.shortage,
      linkedOrderId: finding.orderId,
      reason: `${finding.orderId} requires ${finding.quantityRequired} units and only ${finding.availableInventory} are currently available.`,
      idempotencyKey: `demo-${finding.orderId}-${finding.productId}-${finding.shortage}`,
    };
    recorder.recordEvent("RECOMMENDATION", `Create replenishment request for ${recommendation.quantity} units of ${recommendation.productId}.`, recommendation);

    analyst = await createEmbeddedWriteMcpClient(db, { userId: "demo-analyst", role: "OPERATIONS_ANALYST", sessionId: analysis.sessionId }, recorder);
    const { type: _recommendationType, ...proposalPayload } = recommendation;
    const proposed = await analyst.client.call("propose_replenishment_request", proposalPayload);
    const action = dataOf<{ actionId: string; approvalStatus: string; executionStatus: string; payload: ReplenishmentPayload }>(proposed);
    recorder.recordEvent("ACTION", `Pending action ${action.actionId} created.`, action);

    manager = await createEmbeddedWriteMcpClient(db, { userId: "demo-manager", role: "OPERATIONS_MANAGER", sessionId: analysis.sessionId }, recorder);
    const beforeApproval = await manager.client.call("create_replenishment_request", { actionId: action.actionId });
    const executionBeforeApprovalRejected = Boolean(beforeApproval.error);
    if (!executionBeforeApprovalRejected) throw new Error("The action executed before approval.");
    recorder.recordEvent("WRITE_BLOCKED", "Execution rejected because the action was not yet approved.", { actionId: action.actionId, error: beforeApproval.error });

    const analystApproval = await analyst.client.call("approve_action", { actionId: action.actionId });
    const analystApprovalRejected = Boolean(analystApproval.error);
    if (!analystApprovalRejected) throw new Error("The analyst unexpectedly approved the action.");
    recorder.recordEvent("APPROVAL_REJECTED", "Analyst approval rejected by authorization policy.", { actionId: action.actionId, error: analystApproval.error });

    const approved = await manager.client.call("approve_action", { actionId: action.actionId });
    const approvedAction = dataOf<{ actionId: string; approvalStatus: string }>(approved);
    if (approvedAction.approvalStatus !== "APPROVED") throw new Error("The manager approval did not transition the action to APPROVED.");
    recorder.recordEvent("APPROVAL", `Action ${action.actionId} approved by Operations Manager.`, { actionId: action.actionId, approvedBy: "demo-manager" });

    const executed = await manager.client.call("create_replenishment_request", { actionId: action.actionId });
    const execution = dataOf<{ action: { actionId: string; approvalStatus: string; executionStatus: string }; replenishmentRequest: EndToEndWorkflowResult["replenishmentRequest"] }>(executed);
    recorder.recordEvent("WRITE_RESULT", `${execution.replenishmentRequest.requestId} created successfully.`, execution.replenishmentRequest);

    const duplicate = await manager.client.call("create_replenishment_request", { actionId: action.actionId });
    const duplicateRequest = dataOf<{ replenishmentRequest: { requestId: string } }>(duplicate).replenishmentRequest;
    if (duplicateRequest.requestId !== execution.replenishmentRequest.requestId) throw new Error("Duplicate execution returned a different replenishment request.");

    const verifiedAction = dataOf<{ actionId: string; approvalStatus: string; executionStatus: string }>(await manager.client.call("get_agent_action", { actionId: action.actionId }));
    const verifiedRequests = dataOf<EndToEndWorkflowResult["verifiedRequests"]>(await read.client.call("get_replenishment_requests", { productId: recommendation.productId, status: "PENDING" }));
    if (verifiedAction.executionStatus !== "COMPLETED" || verifiedRequests.filter((item) => item.requestId === execution.replenishmentRequest.requestId).length !== 1) throw new Error("Final transaction verification failed.");
    recorder.recordEvent("VERIFICATION", `Action ${action.actionId} is COMPLETED and exactly one replenishment request is present.`, { actionId: action.actionId, requestId: execution.replenishmentRequest.requestId });
    recorder.recordEvent("FINAL_STATUS", "Completed");

    return { request, analysis, recommendation, action, analystApprovalRejected, executionBeforeApprovalRejected, approvedBy: "demo-manager", replenishmentRequest: execution.replenishmentRequest, duplicateExecutionRequestId: duplicateRequest.requestId, verifiedAction, verifiedRequests, traceEvents: recorder.listEvents(), toolTraces: recorder.list() };
  } finally {
    await analyst?.client.close();
    await manager?.client.close();
    await read.client.close();
  }
}

function dataOf<T>(result: { data?: unknown; error?: string }): T {
  if (result.error) throw new Error(result.error);
  return result.data as T;
}
