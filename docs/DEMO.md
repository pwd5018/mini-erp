# Demo

## Database and deterministic foundation

1. Run `npm install`.
2. Run `npm run db:seed`.
3. Run `npm test` and `npm run build`.
4. Explain that the seeded data contains 10 customers, 20 products, 20 orders, two warehouses, and a deterministic shortage analysis foundation.

## MCP read tools

1. Run `npm run db:seed`.
2. Run `npm test`.
3. The MCP server can be started with `npm run mcp:stdio` for an MCP-compatible client.
4. Explain that `get_inventory` returns both warehouse records for `P-001`, while invalid input and unknown order IDs return tool errors and trace events.

## Agent CLI with the live provider

1. Set `OPENAI_API_KEY` in the shell; optionally set `OPENAI_MODEL`.
2. Run `npm run db:seed`.
3. Run `npm run agent -- "Which open orders are at risk because of inventory shortages?"`.
4. Review the response, findings, tool calls, and trace IDs printed as JSON.

## Complete end-to-end workflow

The polished demonstration is deterministic and does not require an OpenAI API key:

```powershell
npm install
npm run db:seed
npm test
npm run evals
npm run demo
```

`npm run demo` walks through one bounded enterprise workflow:

1. Submit: `Which open orders are at risk because of inventory shortages?`
2. Use the agent model to select `get_open_orders` and `get_inventory`.
3. Apply deterministic shortage logic and identify SO-1001/P-001 with a 20-unit shortage.
4. Produce a structured replenishment recommendation.
5. Create a pending action as `demo-analyst`.
6. Show that execution before approval is rejected.
7. Show that analyst approval is rejected.
8. Approve the exact action as `demo-manager`.
9. Execute `create_replenishment_request`.
10. Execute the same action again and receive the original request ID.
11. Verify the completed action and exactly one replenishment request.
12. Print concise lifecycle events and MCP tool-trace count.

The demo uses the real in-memory MCP client/server boundary for both reads and writes. It does not expose write tools to the live OpenAI agent; the explicit approval workflow is application-controlled.

## Browser approval console

For a visual walkthrough, start the local approval console. It initializes its own clean seeded database, so running `npm run db:seed` first is optional:

```powershell
npm run ui
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787). Click `Run agent analysis`, then `Approve as Operations Manager`, then `Execute approved action`. The page shows the recommendation, action state, final request ID, duplicate-execution result, and lifecycle trace. Use `npm run ui:live` instead of `npm run ui` to use the OpenAI agent for the analysis stage.

The browser demo intentionally resets the in-memory database from the canonical `seedData` when it starts. After each successful analysis, approval, or execution step, it exports that database to `data/mini-erp.db`. This makes the pending `agent_actions` row and final `replenishment_requests` row available for inspection after the walkthrough, while keeping the next UI run deterministic. Starting the UI again resets the demo data and removes the previous walkthrough's action records. Automated tests use separate temporary databases and do not persist their writes.

## Live OpenAI agent variant

The same end-to-end flow can use the OpenAI agent for the intent and read-tool planning stage:

```powershell
Copy-Item .env.example .env
# Set OPENAI_API_KEY and OPENAI_MODEL in .env.
npm run demo:live
```

In live mode, OpenAI selects only the read MCP tools. The application still performs the deterministic shortage calculation, creates the structured recommendation, enforces analyst/manager authorization, executes the write MCP tool, verifies the transaction, and prints the trace. This preserves the safety boundary while demonstrating the live provider path.

See [INTERVIEW_WALKTHROUGH.md](INTERVIEW_WALKTHROUGH.md) for the recommended presentation order and [examples/end-to-end-run.md](examples/end-to-end-run.md) for representative output.
