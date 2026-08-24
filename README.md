# AI-First Mini ERP

An enterprise-style foundation for a safe AI operations agent. The assistant gathers evidence through typed tools, produces grounded findings, and uses approval gates before business mutations.

## Design principles

The model interprets intent and plans tool calls. Application code owns business truth, validation, authorization, approval, idempotency, and execution. In a real deployment, the ERP API remains the final authority for ERP-owned business rules.

See [ROADMAP.md](ROADMAP.md) for the complete vision, milestones, pending work, limitations, and restart instructions.

## Current architecture

The current slice uses a small TypeScript project with three boundaries. SQLite runs through `sql.js` WebAssembly so local setup does not require native C++ build tooling:

- `src/domain.ts` contains typed entities and deterministic shortage calculations.
- `src/database.ts` owns SQLite schema, seed insertion, and read repositories.
- `src/seed.ts` provides realistic demo data, including shortages, inbound stock, closed orders, and an untrusted prompt-injection note.

The current repository also contains read-only MCP tools, a read-only OpenAI agent, an evaluation harness, and a separately tested approval-gated write MCP server. The demo uses SQLite; a production integration would normally call an ERP API.

## Run locally

```bash
npm install
npm run db:seed
npm test
npm run build
```

The seed command creates `data/mini-erp.db`, which is intentionally ignored by Git.

## Status

- Application foundation and TypeScript build: complete
- Seeded SQLite database: complete
- Deterministic shortage service: complete
- Domain and database tests: complete
- Read-only MCP tools and tool-call traces: complete
- Read-only agent orchestrator and model-provider abstraction: complete
- Controlled evaluation harness: complete
- Approval-gated, idempotent replenishment write service: complete
- Approval inbox, notifications, SSO-backed roles, policy engine, and real ERP adapter: pending

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/EVALUATIONS.md](docs/EVALUATIONS.md), and [docs/DEMO.md](docs/DEMO.md).
