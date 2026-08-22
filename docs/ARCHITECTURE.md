# Architecture

Phase 1 is intentionally a deterministic foundation. SQLite is accessed through a repository module, domain records are represented by TypeScript interfaces, and shortage calculations are plain functions that can be tested without an LLM.

Phase 2 adds a real read-only MCP server in `src/mcp/readServer.ts`. It registers six tools over the repository boundary: open orders, one order, inventory, customers, suppliers, and replenishment requests. `src/mcp/stdio.ts` exposes the server over MCP stdio for a compatible host. The server validates inputs before running repository reads and records every attempt through `TraceRecorder`.

Planned flow:

```text
User -> Agent orchestrator -> typed MCP read tools -> repositories -> SQLite
                         -> policy/approval gate -> typed write tools
                         -> trace and audit store
```

The model-provider interface and MCP boundary will be introduced in Phase 3 after read tools are independently testable. The application will never delegate security or core ERP calculations to the model.
