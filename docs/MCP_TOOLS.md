# MCP tools

The read server is implemented in `src/mcp/readServer.ts` and uses the official Model Context Protocol TypeScript SDK. It exposes six read-only tools:

| Tool | Purpose |
| --- | --- |
| `get_open_orders` | Lists open orders with optional date, customer, and priority filters. |
| `get_order` | Reads one order and its line items. |
| `get_inventory` | Reads inventory across all warehouses for a product. |
| `get_customer` | Reads a customer summary. |
| `get_supplier` | Reads supplier lead time and reliability. |
| `get_replenishment_requests` | Reads existing requests for verification and operational context. |

Inputs are strict Zod schemas. The MCP SDK rejects malformed arguments before the business handler runs. Handler-level reads return structured content and a trace ID. Missing records return `isError: true` with a predictable error message.

## Local MCP process

After seeding the database, start the stdio server with:

```bash
npm run mcp:stdio
```

An MCP-compatible host can then discover the tools and call them. The test suite uses the SDK's in-memory transport to verify the same client/server protocol without requiring a separate process.
