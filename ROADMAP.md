# AI-First Mini ERP Roadmap

## Product vision

Build a compact, interview-ready demonstration of a safe AI operations assistant for ERP-style work. The assistant should understand a user's request, gather evidence through typed tools, explain its reasoning, propose actions when appropriate, and require an authorized human approval before changing business data.

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

The repository intentionally uses one local SQLite database. It is a teaching and demonstration system, not an attempt to reproduce or integrate with a commercial ERP.

## Demonstration goals

The build is specifically intended to prove understanding of:

- MCP tools and typed tool boundaries
- Agent orchestration and bounded tool loops
- ERP-style entities and workflows
- Human approval gates
- Deterministic evaluation harnesses
- Safe execution and authorization boundaries
- Idempotent writes
- Prompt-injection resistance
- Observability and tracing

The goal is a clean vertical slice that makes these concepts easy to inspect, run, and explain in an interview.

## Job-target alignment

The target Agent / Applied AI Engineer role emphasizes agents that act inside real business workflows, typed and intent-routed MCP tools, composable AI-first experiences, and an evaluation harness that measures whether the experience is improving. This project maps directly to those themes through:

| Role theme | Demonstration evidence |
| --- | --- |
| Agents with workflow authority | ERP-style order, inventory, and replenishment flow with a gated write path |
| Typed MCP tools | Separate read and write MCP servers with strict schemas |
| Grounded retrieval | Tool evidence plus deterministic shortage findings |
| Safe action | Analyst proposal, manager approval, revalidation, and idempotent execution |
| Evaluation | Controlled scenarios for grounding, hallucination, authorization, and business outcome |
| AI-first interaction | Natural-language request translated into tool calls and an explainable result |
| Operational confidence | Trace IDs, tool-call evidence, bounded orchestration, and failure handling |

The application does not need to reproduce Rootstock or Salesforce. Its value is demonstrating clear opinions about tool scope, grounding, failure safety, and measurement in a small system that can be run and discussed.

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

### Phase 6 — One polished end-to-end enterprise agent flow — complete

- Shortage analysis through the read-only agent and MCP tools
- Deterministic finding and structured replenishment recommendation
- Pending action creation through the write MCP server
- Explicit analyst and manager authorization behavior
- Approval, idempotent execution, and final transaction verification
- Concise lifecycle trace summary
- `Eval-006-EndToEndApprovedReplenishment`
- `npm run demo` entry point
- `npm run demo:live` provider-backed variant using the same safety controls

### Phase 7 — Portfolio polish — pending

- Improve demo presentation and README walkthrough
- Add a small number of high-value prompt-injection and policy failure cases
- Add a concise trace artifact if useful for the submission

## Out of scope

- Real commercial ERP integration
- SSO, HR directory synchronization, or enterprise identity lifecycle
- Email delivery infrastructure
- Multi-tenant deployment
- Production database migrations and high availability
- Cloud deployment, monitoring, and on-call operations

## Explicitly not complete yet

- There is no browser approval UI; approval is demonstrated through the polished CLI flow and MCP integration tests.
- There is no email notification flow, and none is required for the demonstration target.
- The role model is intentionally local and simplified.
- The OpenAI agent is still read-only; write execution is exposed through the separately tested write server.
- There is no real external ERP API adapter because ERP integration is outside the target scope.
- There is no migration framework because the local database is a disposable demonstration database.

## Restart instructions

From the repository root:

```powershell
npm install
npm run db:seed
npm test
npm run build
npm run evals
npm run demo
```

For the live read-only agent, copy `.env.example` to `.env`, set `OPENAI_API_KEY` and `OPENAI_MODEL`, seed the database, and run:

```powershell
npm run agent -- "Which open orders are at risk because of inventory shortages?"
```

The controlled evaluation suite does not use the OpenAI API and does not require `.env`.
