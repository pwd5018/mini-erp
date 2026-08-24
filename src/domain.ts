export type OrderStatus = "OPEN" | "CLOSED" | "SHIPPED";
export type UserRole = "OPERATIONS_ANALYST" | "OPERATIONS_MANAGER";

export interface Customer {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  creditStatus: "GOOD" | "HOLD";
  priorityLevel: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  reorderPoint: number;
  defaultSupplierId: string;
}

export interface Inventory {
  productId: string;
  warehouseId: string;
  onHand: number;
  allocated: number;
  available: number;
  inboundQuantity: number;
  inboundDate: string | null;
}

export interface OrderLine {
  lineId: string;
  productId: string;
  quantityOrdered: number;
  quantityAllocated: number;
  quantityShipped: number;
}

export interface SalesOrder {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  orderDate: string;
  requestedShipDate: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  notes: string | null;
  lineItems: OrderLine[];
}

export interface Supplier {
  supplierId: string;
  name: string;
  averageLeadTimeDays: number;
  reliabilityScore: number;
}

export interface ReplenishmentRequest {
  requestId: string;
  productId: string;
  quantity: number;
  reason: string;
  linkedOrderId: string | null;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  approvedBy: string | null;
}

export interface ReplenishmentPayload {
  productId: string;
  quantity: number;
  reason: string;
  linkedOrderId: string | null;
  idempotencyKey: string;
}

export interface AgentAction {
  actionId: string;
  sessionId: string;
  actionType: "CREATE_REPLENISHMENT_REQUEST";
  requestedBy: string;
  requestedByRole: UserRole;
  approvalRequired: true;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  executionStatus: "NOT_STARTED" | "COMPLETED" | "FAILED";
  idempotencyKey: string;
  payload: ReplenishmentPayload;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  result: ReplenishmentRequest | null;
}

export interface AtRiskLine {
  orderId: string;
  lineId: string;
  productId: string;
  quantityRequired: number;
  availableInventory: number;
  shortage: number;
  requestedShipDate: string;
}

export function calculateShortage(quantityRequired: number, availableInventory: number): number {
  return Math.max(0, quantityRequired - availableInventory);
}

export function findAtRiskLines(orders: SalesOrder[], inventoryByProduct: Map<string, number>): AtRiskLine[] {
  return orders.flatMap((order) => order.lineItems.flatMap((line) => {
    const quantityRequired = line.quantityOrdered - line.quantityAllocated - line.quantityShipped;
    const availableInventory = inventoryByProduct.get(line.productId);
    if (availableInventory === undefined) return [];
    const shortage = calculateShortage(quantityRequired, availableInventory);
    return shortage > 0 ? [{
      orderId: order.orderId,
      lineId: line.lineId,
      productId: line.productId,
      quantityRequired,
      availableInventory,
      shortage,
      requestedShipDate: order.requestedShipDate,
    }] : [];
  }));
}
