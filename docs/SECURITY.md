# Security

Phase 1 has no mutation path and therefore cannot change ERP data. Seeded notes and descriptions are data only; future agent prompts and tool adapters must treat all enterprise fields as untrusted content, never as instructions.

Phase 2 remains read-only. MCP inputs use strict Zod schemas, unknown fields are rejected by the MCP SDK before the handler runs, identifiers are bounded, dates are checked, and missing records return predictable tool errors. Handler-level calls are traced; protocol-level validation failures are rejected before the application trace boundary. The MCP server has no write tools and cannot mutate the ERP database.

Phase 3 keeps the agent read-only. The model receives only the read-tool catalog, the orchestrator rejects tool names outside that catalog, and bounded rounds/tool calls prevent an unending tool loop. The model is not trusted to calculate shortage truth or authorize mutations.

Phase 5 keeps write authorization outside the model. Actor roles are supplied by the application context, not by tool arguments. Analysts may propose but cannot approve or execute. Managers must approve an exact action ID, and execution revalidates the product and linked order. Idempotency keys and a transaction prevent duplicate or half-completed replenishment writes.

Planned controls include deterministic role checks outside the model, explicit structured approvals for every write, strict Zod input schemas, record existence checks, idempotency keys, and verification after uncertain transactions.
