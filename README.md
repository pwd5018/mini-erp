# AI-First Mini ERP

An enterprise-style foundation for a safe AI operations agent. The first milestone is deliberately deterministic: a seeded SQLite ERP dataset and domain services that can identify inventory shortages. Later phases will add typed MCP read tools, model-provider adapters, approval-gated writes, traces, evaluations, and a UI.

## Phase 1 architecture

The current slice uses a small TypeScript project with three boundaries. SQLite runs through `sql.js` WebAssembly so local setup does not require native C++ build tooling:

- `src/domain.ts` contains typed entities and deterministic shortage calculations.
- `src/database.ts` owns SQLite schema, seed insertion, and read repositories.
- `src/seed.ts` provides realistic demo data, including shortages, inbound stock, closed orders, and an untrusted prompt-injection note.

The future agent will sit above these boundaries. The model may interpret intent and plan reads, but business truth, validation, authorization, approval, and execution remain application-owned.

## Run locally

```bash
npm install
npm run db:seed
npm test
npm run build
```

The seed command creates `data/mini-erp.db`, which is intentionally ignored by Git.

## Phase 1 status

- Application foundation and TypeScript build: complete
- Seeded SQLite database: complete
- Deterministic shortage service: complete
- Domain and database tests: complete
- Read-only MCP tools and tool-call traces: complete in Phase 2
- Read-only agent orchestrator and model-provider abstraction: complete in Phase 3
- Controlled evaluation harness for the first four scenarios: complete in Phase 4
- Approval-gated, idempotent replenishment write service: complete in Phase 5
- Production agent write exposure and UI: reserved for later phases

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/EVALUATIONS.md](docs/EVALUATIONS.md), and [docs/DEMO.md](docs/DEMO.md).
