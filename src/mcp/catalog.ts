import type { ReadToolName } from "./readServer.js";

export interface AgentToolDefinition {
  name: ReadToolName;
  description: string;
  parameters: Record<string, unknown>;
}

export const readToolDefinitions: AgentToolDefinition[] = [
  {
    name: "get_open_orders",
    description: "Read open sales orders, optionally filtered by ship date, customer, or priority.",
    parameters: { type: "object", properties: { startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date" }, customerId: { type: "string" }, priority: { type: "string", enum: ["HIGH", "NORMAL", "LOW"] } }, additionalProperties: false },
  },
  { name: "get_order", description: "Read one sales order by order ID, including its line items.", parameters: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"], additionalProperties: false } },
  { name: "get_inventory", description: "Read inventory availability for a product across all warehouses.", parameters: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"], additionalProperties: false } },
  { name: "get_customer", description: "Read a customer summary by customer ID.", parameters: { type: "object", properties: { customerId: { type: "string" } }, required: ["customerId"], additionalProperties: false } },
  { name: "get_supplier", description: "Read supplier lead time and reliability details by supplier ID.", parameters: { type: "object", properties: { supplierId: { type: "string" } }, required: ["supplierId"], additionalProperties: false } },
  { name: "get_replenishment_requests", description: "Read existing replenishment requests, optionally filtered by product or status.", parameters: { type: "object", properties: { productId: { type: "string" }, status: { type: "string", enum: ["PENDING", "APPROVED", "COMPLETED", "CANCELLED"] } }, additionalProperties: false } },
];
