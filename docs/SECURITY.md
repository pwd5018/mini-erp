# Security

Phase 1 has no mutation path and therefore cannot change ERP data. Seeded notes and descriptions are data only; future agent prompts and tool adapters must treat all enterprise fields as untrusted content, never as instructions.

Phase 2 remains read-only. MCP inputs use strict Zod schemas, unknown fields are rejected by the MCP SDK before the handler runs, identifiers are bounded, dates are checked, and missing records return predictable tool errors. Handler-level calls are traced; protocol-level validation failures are rejected before the application trace boundary. The MCP server has no write tools and cannot mutate the ERP database.

Planned controls include deterministic role checks outside the model, explicit structured approvals for every write, strict Zod input schemas, record existence checks, idempotency keys, and verification after uncertain transactions.
