# Architecture

The system starts with a deterministic foundation. SQLite is accessed through a repository module, domain records are represented by TypeScript interfaces, and shortage calculations are plain functions that can be tested without an LLM.

The read-only MCP server in `src/mcp/readServer.ts` registers six tools over the repository boundary: open orders, one order, inventory, customers, suppliers, and replenishment requests. `src/mcp/stdio.ts` exposes the server over MCP stdio for a compatible host. The server validates inputs before running repository reads and records every attempt through `TraceRecorder`.

The agent orchestrator in `src/agent/orchestrator.ts` accepts a user request, asks an `AgentModel` which read tools are needed, calls those tools through an MCP client, applies the deterministic shortage service, and returns a grounded read-only answer. It has bounded rounds and tool-call limits. `OpenAIModel` is the live provider adapter; the deterministic test model makes automated tests repeatable.

The controlled evaluation harness runs scenarios through the real MCP client/server path and scores tool use, grounding, hallucination resistance, authorization, safe execution, and business outcome.

The separate write MCP server provides the mutation boundary. `propose_replenishment_request` creates a pending action, `approve_action` requires an Operations Manager, and `create_replenishment_request` requires that exact action to be approved. The action record and replenishment insert are persisted with an idempotency key and transaction-safe completion state.

The completed end-to-end demonstration composes these boundaries in `src/workflow/endToEnd.ts`. It uses the read-only agent orchestrator to collect evidence, applies deterministic shortage logic, creates a structured recommendation, proposes through the write MCP server as an analyst, demonstrates blocked execution and blocked analyst approval, approves as a manager, executes the exact action, repeats execution to prove idempotency, and verifies the resulting action and replenishment records through MCP reads.

The small browser approval console in `src/ui/` exposes the same staged operations over local HTTP. It is a demonstration surface only: it does not bypass MCP, application authorization, or transaction verification.

The UI creates a fresh `sql.js` database from `seedData` at startup, then exports the database to `data/mini-erp.db` after each successful workflow mutation. This lets a reviewer inspect the persisted `agent_actions` and `replenishment_requests` records. The reset-on-start behavior is deliberate and keeps repeated demonstrations deterministic; automated tests remain isolated in-memory.

Implemented flow:

```text
User -> Agent orchestrator -> typed MCP read tools -> repositories -> SQLite
                         -> deterministic findings -> structured recommendation
                         -> pending action -> manager approval
                         -> typed write tool -> transaction -> verification
                         -> trace and audit summary
```

This project intentionally stops short of commercial ERP integration, SSO, and production infrastructure. The application does not delegate security or core ERP calculations to the model.
