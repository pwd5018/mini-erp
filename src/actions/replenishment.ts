import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { getAgentAction, getAgentActionByIdempotencyKey, getOrder, getProduct, insertAgentAction, updateAgentAction } from "../database.js";
import type { AgentAction, ReplenishmentPayload, ReplenishmentRequest, UserRole } from "../domain.js";
import { ToolError } from "../mcp/errors.js";

export interface ActorContext {
  userId: string;
  role: UserRole;
  sessionId: string;
}

export class ReplenishmentActionService {
  constructor(private readonly db: Database) {}

  propose(actor: ActorContext, payload: ReplenishmentPayload): AgentAction {
    const existing = getAgentActionByIdempotencyKey(this.db, payload.idempotencyKey);
    if (existing) {
      if (!this.samePayload(existing.payload, payload)) throw new ToolError("CONFLICT", `Idempotency key ${payload.idempotencyKey} was already used with different replenishment details.`);
      return existing;
    }
    this.validatePayload(payload);
    const action: AgentAction = {
      actionId: `ACT-${randomUUID()}`,
      sessionId: actor.sessionId,
      actionType: "CREATE_REPLENISHMENT_REQUEST",
      requestedBy: actor.userId,
      requestedByRole: actor.role,
      approvalRequired: true,
      approvalStatus: "PENDING",
      executionStatus: "NOT_STARTED",
      idempotencyKey: payload.idempotencyKey,
      payload,
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      completedAt: null,
      result: null,
    };
    insertAgentAction(this.db, action);
    return action;
  }

  approve(actor: ActorContext, actionId: string): AgentAction {
    this.requireManager(actor);
    const action = this.requireAction(actionId);
    if (action.approvalStatus === "APPROVED" || action.executionStatus === "COMPLETED") return action;
    if (action.approvalStatus !== "PENDING") throw new ToolError("INVALID_STATE", `Action ${actionId} is not pending approval.`);
    action.approvalStatus = "APPROVED";
    action.approvedBy = actor.userId;
    action.approvedAt = new Date().toISOString();
    updateAgentAction(this.db, action);
    return action;
  }

  execute(actor: ActorContext, actionId: string): { action: AgentAction; replenishmentRequest: ReplenishmentRequest } {
    this.requireManager(actor);
    const action = this.requireAction(actionId);
    if (action.executionStatus === "COMPLETED" && action.result) return { action, replenishmentRequest: action.result };
    if (action.approvalStatus !== "APPROVED") throw new ToolError("INVALID_STATE", `Action ${actionId} must be explicitly approved before execution.`);
    this.validatePayload(action.payload);
    const request: ReplenishmentRequest = {
      requestId: `RR-${randomUUID()}`,
      productId: action.payload.productId,
      quantity: action.payload.quantity,
      reason: action.payload.reason,
      linkedOrderId: action.payload.linkedOrderId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      approvedBy: action.approvedBy,
    };
    this.db.run("BEGIN");
    try {
      this.db.run("INSERT INTO replenishment_requests (request_id, product_id, quantity, reason, linked_order_id, status, created_at, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [request.requestId, request.productId, request.quantity, request.reason, request.linkedOrderId, request.status, request.createdAt, request.approvedBy]);
      action.executionStatus = "COMPLETED";
      action.completedAt = new Date().toISOString();
      action.result = request;
      updateAgentAction(this.db, action);
      this.db.run("COMMIT");
      return { action, replenishmentRequest: request };
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    }
  }

  getAction(actionId: string): AgentAction {
    return this.requireAction(actionId);
  }

  private validatePayload(payload: ReplenishmentPayload): void {
    if (payload.quantity <= 0) throw new ToolError("INVALID_INPUT", "Replenishment quantity must be greater than zero.");
    if (!getProduct(this.db, payload.productId)) throw new ToolError("NOT_FOUND", `Product ${payload.productId} was not found.`);
    if (payload.linkedOrderId) {
      const order = getOrder(this.db, payload.linkedOrderId);
      if (!order) throw new ToolError("NOT_FOUND", `Order ${payload.linkedOrderId} was not found.`);
      if (order.status !== "OPEN") throw new ToolError("INVALID_STATE", `Order ${payload.linkedOrderId} is not open.`);
    }
  }

  private requireManager(actor: ActorContext): void {
    if (actor.role !== "OPERATIONS_MANAGER") throw new ToolError("FORBIDDEN", "Operations Manager approval is required for this action.");
  }

  private samePayload(existing: ReplenishmentPayload, candidate: ReplenishmentPayload): boolean {
    return existing.productId === candidate.productId
      && existing.quantity === candidate.quantity
      && existing.reason === candidate.reason
      && existing.linkedOrderId === candidate.linkedOrderId;
  }

  private requireAction(actionId: string): AgentAction {
    const action = getAgentAction(this.db, actionId);
    if (!action) throw new ToolError("NOT_FOUND", `Action ${actionId} was not found.`);
    return action;
  }
}
