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

Phase 3 demo with a real provider:

1. Set `OPENAI_API_KEY` in the shell; optionally set `OPENAI_MODEL`.
2. Run `npm run db:seed`.
3. Run `npm run agent -- "Which open orders are at risk because of inventory shortages?"`.
4. Review the response, findings, tool calls, and trace IDs printed as JSON.

The command is read-only. It has no write tools and cannot create replenishment requests.
