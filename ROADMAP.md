# AI-First Mini ERP Roadmap

## Product vision

Build a safe AI operations assistant for ERP work. The assistant should understand a user's request, gather evidence through typed tools, explain its reasoning, propose actions when appropriate, and require an authorized human approval before changing business data.

The model is useful for language understanding and planning. It is not the source of business truth, authorization, approval, or arithmetic. Those responsibilities stay in deterministic application code and, in a real deployment, are ultimately revalidated by the ERP API.

## Current architecture

```text
User
  -> Agent orchestrator
     -> OpenAI model provider (intent and tool planning)
     -> MCP client
        -> Read MCP server -> ERP repositories / database
        -> Write MCP server -> approval policy -> ERP write adapter
  -> Evidence, traces, evaluations, and audit records
```

The current repository uses one local SQLite database for the demo. A production version would normally place the custom agent service in front of an existing ERP API rather than sharing its database.

## Milestones

### Phase 1 — ERP foundation — complete

- TypeScript project and build pipeline
- SQLite schema and deterministic seed data
- Customers, products, warehouses, orders, inventory, suppliers, and replenishment requests
- Deterministic shortage calculation
- Database and domain tests

### Phase 2 — Read-only MCP server — complete

- Official MCP SDK integration
- Six typed read tools
- Strict input validation
- Predictable not-found and invalid-input errors
- Trace records for tool calls
- In-memory MCP client/server integration tests

### Phase 3 — Read-only agent — complete

- Provider-neutral `AgentModel` interface
- OpenAI Responses API adapter
- Bounded orchestration loop
- Real MCP client/server path
- Deterministic shortage findings
- No production write tools exposed to the model

### Phase 4 — Evaluation harness — complete

- Deterministic test model, so evaluations do not require an OpenAI API key
- Scenarios for normal shortage, no shortage, missing product, and hallucinated order
- Checks for intent, tool selection, arguments, grounding, hallucinations, authorization, safe execution, and business outcome
- Current controlled scenarios pass

### Phase 5 — Approval-gated writes — complete

- Pending agent action records
- Analyst proposal capability
- Manager-only approval and execution
- Exact action IDs for approval
- Revalidation before execution
- Idempotency protection
- Transaction-safe replenishment insertion
- Write MCP server kept separate from the production read-only agent

## Next milestones

### Phase 6 — Approval inbox and notifications — pending

- Web approval inbox for pending actions
- Detail view showing the proposed change and supporting evidence
- Approve and reject actions
- Authenticated user context rather than demo roles
- Email or in-app notifications
- Approval history and rejection reasons
- Tests for authorization, stale actions, duplicate clicks, and notification links

### Phase 7 — Identity and policy — pending

- SSO integration with an identity provider
- Role and permission mapping
- Warehouse, department, tenant, and monetary-scope restrictions
- Separation-of-duties rules
- Delegation and escalation rules
- Policy versioning and auditability

### Phase 8 — Real ERP adapter — pending

- Replace local replenishment insertion with a typed ERP API adapter
- Map ERP statuses and error responses
- Handle timeouts and uncertain outcomes safely
- Reconcile agent actions with ERP transaction IDs
- Revalidate all ERP-owned business rules at the ERP boundary

### Phase 9 — Production operations — pending

- Durable production database and migrations
- Background jobs and retry policy
- Centralized audit and trace storage
- Metrics, alerting, and operational dashboards
- Secret management and deployment configuration
- Rate limits, tenant isolation, and security review

## Explicitly not complete yet

- There is no browser UI.
- There is no email notification flow.
- The current role is a demo `ActorContext`, not SSO-backed authorization.
- The local SQLite database is not a production ERP.
- The OpenAI agent is still read-only; write execution is exposed only through the separately tested write server.
- There is no real external ERP API adapter.
- There is no migration framework; schema creation currently recreates the local demo schema.

## Restart instructions

From the repository root:

```powershell
npm install
npm run db:seed
npm test
npm run build
npm run evals
```

For the live read-only agent, copy `.env.example` to `.env`, set `OPENAI_API_KEY` and `OPENAI_MODEL`, seed the database, and run:

```powershell
npm run agent -- "Which open orders are at risk because of inventory shortages?"
```

The controlled evaluation suite does not use the OpenAI API and does not require `.env`.

