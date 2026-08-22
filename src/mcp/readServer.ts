import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Database } from "sql.js";
import { z } from "zod";
import { getCustomer, getInventory, getOpenOrders, getOrder, getReplenishmentRequests, getSupplier } from "../database.js";
import type { SalesOrder } from "../domain.js";
import { TraceRecorder } from "../observability/trace.js";
import { asToolError, ToolError } from "./errors.js";

const emptyInput = z.object({}).strict();
const orderIdInput = z.object({ orderId: z.string().trim().min(1).max(32) }).strict();
const productIdInput = z.object({ productId: z.string().trim().min(1).max(32) }).strict();
const customerIdInput = z.object({ customerId: z.string().trim().min(1).max(32) }).strict();
const supplierIdInput = z.object({ supplierId: z.string().trim().min(1).max(32) }).strict();
const openOrdersInput = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  customerId: z.string().trim().min(1).max(32).optional(),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]).optional(),
}).strict().refine((input) => !input.startDate || !input.endDate || input.startDate <= input.endDate, { message: "startDate must be on or before endDate" });
const replenishmentInput = z.object({
  productId: z.string().trim().min(1).max(32).optional(),
  status: z.enum(["PENDING", "APPROVED", "COMPLETED", "CANCELLED"]).optional(),
}).strict();

const outputSchema = z.object({ data: z.any(), traceId: z.string() });

export type ReadToolName = "get_open_orders" | "get_order" | "get_inventory" | "get_customer" | "get_supplier" | "get_replenishment_requests";
export type ReadToolResult = { data: unknown; traceId: string };

type ToolSpec = { schema: z.ZodTypeAny; run: (input: any) => unknown };

export class ReadToolService {
  private readonly specs: Record<ReadToolName, ToolSpec>;

  constructor(private readonly db: Database, private readonly recorder: TraceRecorder) {
    this.specs = {
      get_open_orders: { schema: openOrdersInput, run: (input) => this.openOrders(input) },
      get_order: { schema: orderIdInput, run: (input) => this.require(getOrder(this.db, input.orderId), `ORDER_NOT_FOUND: Order ${input.orderId} was not found.`) },
      get_inventory: { schema: productIdInput, run: (input) => getInventory(this.db, input.productId) },
      get_customer: { schema: customerIdInput, run: (input) => this.require(getCustomer(this.db, input.customerId), `CUSTOMER_NOT_FOUND: Customer ${input.customerId} was not found.`) },
      get_supplier: { schema: supplierIdInput, run: (input) => this.require(getSupplier(this.db, input.supplierId), `SUPPLIER_NOT_FOUND: Supplier ${input.supplierId} was not found.`) },
      get_replenishment_requests: { schema: replenishmentInput, run: (input) => getReplenishmentRequests(this.db, input.productId, input.status) },
    };
  }

  invoke(name: ReadToolName, rawInput: unknown): ReadToolResult {
    const spec = this.specs[name];
    const trace = this.recorder.start(name, rawInput);
    try {
      if (!spec) throw new ToolError("INVALID_INPUT", `Unknown read tool: ${name}`);
      const parsed = spec.schema.safeParse(rawInput);
      if (!parsed.success) throw new ToolError("INVALID_INPUT", parsed.error.issues.map((issue) => issue.message).join("; "));
      const data = spec.run(parsed.data);
      this.recorder.complete(trace, true);
      return { data, traceId: trace.traceId };
    } catch (error) {
      const toolError = asToolError(error);
      this.recorder.complete(trace, false, { code: toolError.code, message: toolError.message });
      throw toolError;
    }
  }

  private openOrders(input: z.infer<typeof openOrdersInput>): SalesOrder[] {
    return getOpenOrders(this.db).filter((order) =>
      (!input.startDate || order.requestedShipDate >= input.startDate) &&
      (!input.endDate || order.requestedShipDate <= input.endDate) &&
      (!input.customerId || order.customerId === input.customerId) &&
      (!input.priority || order.priority === input.priority)
    );
  }

  private require<T>(value: T | null, message: string): T {
    if (value === null) throw new ToolError("NOT_FOUND", message);
    return value;
  }
}

function registerReadTool(server: McpServer, service: ReadToolService, name: ReadToolName, description: string, schema: z.ZodTypeAny): void {
  server.registerTool(name, { description, inputSchema: schema, outputSchema }, async (input) => {
    try {
      const result = service.invoke(name, input);
      return { structuredContent: result, content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error) {
      const toolError = asToolError(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: { code: toolError.code, message: toolError.message } }) }] };
    }
  });
}

export function createReadMcpServer(db: Database, recorder = new TraceRecorder()): { server: McpServer; service: ReadToolService; recorder: TraceRecorder } {
  const service = new ReadToolService(db, recorder);
  const server = new McpServer({ name: "mini-erp-read-tools", version: "0.2.0" });
  registerReadTool(server, service, "get_open_orders", "Read open sales orders, optionally filtered by ship date, customer, or priority.", openOrdersInput);
  registerReadTool(server, service, "get_order", "Read one sales order by order ID, including its line items.", orderIdInput);
  registerReadTool(server, service, "get_inventory", "Read inventory availability for a product across all warehouses.", productIdInput);
  registerReadTool(server, service, "get_customer", "Read a customer summary by customer ID.", customerIdInput);
  registerReadTool(server, service, "get_supplier", "Read supplier lead time and reliability details by supplier ID.", supplierIdInput);
  registerReadTool(server, service, "get_replenishment_requests", "Read existing replenishment requests, optionally filtered by product or status.", replenishmentInput);
  return { server, service, recorder };
}
