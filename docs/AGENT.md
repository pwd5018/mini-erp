# Phase 3 first agent

The first agent is bounded and read-only. It is not an autonomous loop with unrestricted database access.

```text
User request
    ↓
AgentModel chooses read tools
    ↓
MCP client calls typed tools
    ↓
Evidence is collected
    ↓
Deterministic shortage calculation
    ↓
Grounded response
```

`AgentModel` is the provider boundary. `OpenAIModel` uses the OpenAI Responses API and function calling. It receives the read-tool catalog, can request tool calls, and then receives the returned evidence. The system prompt explicitly treats ERP text as untrusted data and tells the model not to invent identifiers or claim writes.

`AgentOrchestrator` enforces limits of three reasoning rounds and 32 tool calls. It only allows names from the read-tool catalog. It uses `findAtRiskLines` for shortage truth instead of asking the model to perform arithmetic.

## Run

```powershell
Copy-Item .env.example .env
# Edit .env and replace OPENAI_API_KEY with your real key.
npm run db:seed
npm run agent -- "Which open orders are at risk because of inventory shortages?"
```

The output includes a session ID, final response, deterministic findings, tool calls, and number of rounds. No write tools are registered in this phase.
