# Architecture

Phase 1 is intentionally a deterministic foundation. SQLite is accessed through a repository module, domain records are represented by TypeScript interfaces, and shortage calculations are plain functions that can be tested without an LLM.

Phase 2 adds a real read-only MCP server in `src/mcp/readServer.ts`. It registers six tools over the repository boundary: open orders, one order, inventory, customers, suppliers, and replenishment requests. `src/mcp/stdio.ts` exposes the server over MCP stdio for a compatible host. The server validates inputs before running repository reads and records every attempt through `TraceRecorder`.

Phase 3 adds `src/agent/orchestrator.ts`. The orchestrator accepts a user request, asks an `AgentModel` which read tools are needed, calls those tools through an MCP client, applies the deterministic shortage service, and returns a grounded read-only answer. It has bounded rounds and tool-call limits. `OpenAIModel` is the production provider adapter; the test model exists only to make automated tests deterministic.

Phase 4 adds the controlled evaluation harness. It runs deterministic scenarios through the real MCP client/server path and scores tool use, grounding, hallucination resistance, authorization, safe execution, and business outcome.

Phase 5 adds a separate write MCP server. `propose_replenishment_request` creates a pending action, `approve_action` requires an Operations Manager, and `create_replenishment_request` requires that exact action to be approved. The action record and replenishment insert are persisted with an idempotency key and transaction-safe completion state.

Planned flow:

```text
User -> Agent orchestrator -> typed MCP read tools -> repositories -> SQLite
                         -> policy/approval gate -> typed write tools
                         -> trace and audit store
```

The next planned boundary is a compact local approval walkthrough and stronger demonstration evaluations. This project intentionally stops short of commercial ERP integration, SSO, and production infrastructure. The application will never delegate security or core ERP calculations to the model.
