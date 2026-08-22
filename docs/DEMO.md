# Demo

Phase 1 demo:

1. Run `npm install`.
2. Run `npm run db:seed`.
3. Run `npm test` and `npm run build`.
4. Explain that the seeded data contains 10 customers, 20 products, 20 orders, two warehouses, and a deterministic shortage analysis foundation.

Phase 1's deterministic database foundation is complete; Phase 2 now exposes the read tools that the future agent will use.

Phase 2 demo:

1. Run `npm run db:seed`.
2. Run `npm test`.
3. The MCP server can be started with `npm run mcp:stdio` for an MCP-compatible client.
4. Explain that `get_inventory` returns both warehouse records for `P-001`, while invalid input and unknown order IDs return tool errors and trace events.
