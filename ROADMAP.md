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
        -> Write MCP server -> approval policy -> local SQLite write boundary
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

## Implemented capabilities

### Deterministic ERP-style foundation

- TypeScript project and build pipeline
- SQLite schema and deterministic seed data
- Customers, products, warehouses, orders, inventory, suppliers, and replenishment requests
- Deterministic shortage calculation
- Database and domain tests

### Read-only MCP server

- Official MCP SDK integration
- Six typed read tools
- Strict input validation
- Predictable not-found and invalid-input errors
- Trace records for tool calls
- In-memory MCP client/server integration tests

### Bounded read-only agent

- Provider-neutral `AgentModel` interface
- OpenAI Responses API adapter
- Bounded orchestration loop
- Real MCP client/server path
- Deterministic shortage findings
- No write tools exposed to the live model

### Evaluation harness

- Deterministic test model, so evaluations do not require an OpenAI API key
- Scenarios for normal shortage, no shortage, missing product, and hallucinated order
- Checks for intent, tool selection, arguments, grounding, hallucinations, authorization, safe execution, and business outcome
- Current controlled scenarios pass

### Approval-gated writes

- Pending agent action records
- Analyst proposal capability
- Manager-only approval and execution
- Exact action IDs for approval
- Revalidation before execution
- Idempotency protection
- Transaction-safe replenishment insertion
- Write MCP server kept separate from the live read-only agent

### Complete end-to-end workflow

- Shortage analysis through the read-only agent and MCP tools
- Deterministic finding and structured replenishment recommendation
- Pending action creation through the write MCP server
- Explicit analyst and manager authorization behavior
- Approval, idempotent execution, and final transaction verification
- Concise lifecycle trace summary
- `Eval-006-EndToEndApprovedReplenishment`
- `npm run demo` entry point
- `npm run demo:live` provider-backed variant using the same safety controls
- `npm run ui` local browser approval console

### Submission polish

- Live UI progress and timeout feedback
- Saved trace/evaluation artifact
- Interview-focused technical walkthrough
- Targeted prompt-injection evaluation

## Out of scope

- Real commercial ERP integration
- SSO, HR directory synchronization, or enterprise identity lifecycle
- Email delivery infrastructure
- Multi-tenant deployment
- Production database migrations and high availability
- Cloud deployment, monitoring, and on-call operations

## Known boundaries

- The browser approval UI is intentionally local and single-session; it is not a production frontend.
- There is no email notification flow, and none is required for the demonstration target.
- The role model is intentionally local and simplified.
- The OpenAI agent is read-only; write execution is exposed through the separately tested write server.
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
npm run ui
```

For the live read-only agent, copy `.env.example` to `.env`, set `OPENAI_API_KEY` and `OPENAI_MODEL`, seed the database, and run:

```powershell
npm run agent -- "Which open orders are at risk because of inventory shortages?"
```

For the provider-backed browser flow, use `npm run ui:live`. The UI creates a clean seeded database at startup, persists the workflow to `data/mini-erp.db`, shows progress while the provider is working, and surfaces API errors instead of appearing idle.

The controlled evaluation suite does not use the OpenAI API and does not require `.env`.
