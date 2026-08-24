import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Database } from "sql.js";
import { z } from "zod";
import { ReplenishmentActionService, type ActorContext } from "../actions/replenishment.js";
import { TraceRecorder } from "../observability/trace.js";
import { asToolError } from "./errors.js";

const proposeInput = z.object({
  productId: z.string().trim().min(1).max(32),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(500),
  linkedOrderId: z.string().trim().min(1).max(32).nullable(),
  idempotencyKey: z.string().trim().min(8).max(128),
}).strict();
const actionInput = z.object({ actionId: z.string().trim().min(1).max(64) }).strict();
const outputSchema = z.object({ data: z.any(), traceId: z.string() });

function registerWriteTool(server: McpServer, service: ReplenishmentActionService, recorder: TraceRecorder, actor: ActorContext, name: string, description: string, schema: z.ZodTypeAny, run: (input: any) => unknown): void {
  server.registerTool(name, { description, inputSchema: schema, outputSchema }, async (input) => {
    const trace = recorder.start(name, input);
    try {
      const data = run(input);
      recorder.complete(trace, true);
      const result = { data, traceId: trace.traceId };
      return { structuredContent: result, content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error) {
      const toolError = asToolError(error);
      recorder.complete(trace, false, { code: toolError.code, message: toolError.message });
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: { code: toolError.code, message: toolError.message }, traceId: trace.traceId }) }] };
    }
  });
}

export function createWriteMcpServer(db: Database, actor: ActorContext, recorder = new TraceRecorder()): { server: McpServer; service: ReplenishmentActionService; recorder: TraceRecorder } {
  const service = new ReplenishmentActionService(db);
  const server = new McpServer({ name: "mini-erp-write-tools", version: "0.5.0" });
  registerWriteTool(server, service, recorder, actor, "propose_replenishment_request", "Create a pending replenishment action. This does not change ERP replenishment data and still requires manager approval.", proposeInput, (input) => service.propose(actor, input));
  registerWriteTool(server, service, recorder, actor, "approve_action", "Approve one pending action by action ID. Only an Operations Manager may approve.", actionInput, (input) => service.approve(actor, input.actionId));
  registerWriteTool(server, service, recorder, actor, "create_replenishment_request", "Execute one explicitly approved replenishment action. Only an Operations Manager may execute.", actionInput, (input) => service.execute(actor, input.actionId));
  registerWriteTool(server, service, recorder, actor, "get_agent_action", "Read the approval and execution state of an agent action.", actionInput, (input) => service.getAction(input.actionId));
  return { server, service, recorder };
}
