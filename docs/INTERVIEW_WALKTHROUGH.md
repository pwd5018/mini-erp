# Interview walkthrough

## The one-minute explanation

This project demonstrates a safe AI agent operating over a small ERP-style dataset. A user asks which orders are at risk. The agent selects typed read-only MCP tools, the application calculates the shortage deterministically, and the agent gives a grounded explanation. The application turns the finding into a structured replenishment proposal, but the proposal remains pending until an authorized manager approves it. The write MCP tool then executes the exact action, protects against duplicates with idempotency, verifies the final state, and records a trace of the lifecycle.

## Live demonstration

Deterministic, API-free walkthrough:

```powershell
npm install
npm run db:seed
npm test
npm run evals
npm run ui
```

Open `http://127.0.0.1:8787`, then click:

1. `Run agent analysis`
2. `Approve as Operations Manager`
3. `Execute approved action`

Provider-backed walkthrough:

```powershell
Copy-Item .env.example .env
# Set OPENAI_API_KEY and OPENAI_MODEL.
npm run db:seed
npm run ui:live
```

The live provider receives only the read-tool catalog. The browser flow still uses application-owned recommendation validation, authorization, approval, write execution, idempotency, and verification.

## What to point out in the code

- `src/agent/orchestrator.ts`: bounded agent loop and deterministic findings
- `src/mcp/readServer.ts`: typed read-only MCP tools
- `src/mcp/writeServer.ts`: typed mutation tools behind policy checks
- `src/actions/replenishment.ts`: authorization, revalidation, transaction, and idempotency
- `src/ui/session.ts`: staged UI workflow using the same MCP boundaries
- `src/observability/trace.ts`: tool spans and lifecycle events
- `src/evals/endToEnd.ts`: behavior-level end-to-end evaluation

## Design opinions to explain

1. The model interprets intent and plans reads; it does not own business truth.
2. ERP text is treated as untrusted data, so prompt injection cannot authorize a write.
3. A proposal is different from a committed business mutation.
4. Approval references an exact persisted action ID.
5. Revalidation happens immediately before execution.
6. Idempotency makes retries safe.
7. Evals measure behavior and safety, not just answer quality.

## Boundaries to acknowledge

This is an interview demonstration, not a commercial ERP integration. It intentionally does not include production SSO, multi-tenancy, cloud deployment, or a large frontend framework.
