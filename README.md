# AI-First Mini ERP

[![CI](https://github.com/pwd5018/mini-erp/actions/workflows/ci.yml/badge.svg)](https://github.com/pwd5018/mini-erp/actions/workflows/ci.yml)

An interview-ready demonstration of a safe AI operations agent. The assistant gathers evidence through typed MCP tools, produces grounded findings, and uses approval gates before business mutations.

## Design principles

The model interprets intent and plans tool calls. Application code owns business truth, validation, authorization, approval, idempotency, and execution. In a real deployment, the ERP API remains the final authority for ERP-owned business rules.

See [ROADMAP.md](ROADMAP.md) for the project vision, implemented capabilities, scope boundaries, and restart instructions.

For a ready-to-use presentation script, see [docs/INTERVIEW_WALKTHROUGH.md](docs/INTERVIEW_WALKTHROUGH.md). A representative result is in [docs/examples/end-to-end-run.md](docs/examples/end-to-end-run.md).

## Current architecture

The current slice uses a small TypeScript project with three boundaries. SQLite runs through `sql.js` WebAssembly so local setup does not require native C++ build tooling:

- `src/domain.ts` contains typed entities and deterministic shortage calculations.
- `src/database.ts` owns SQLite schema, seed insertion, and read repositories.
- `src/seed.ts` provides realistic demo data, including shortages, inbound stock, closed orders, and an untrusted prompt-injection note.

The current repository also contains read-only MCP tools, a read-only OpenAI agent, an evaluation harness, and a separately tested approval-gated write MCP server. The demo uses SQLite by design. It is intended to showcase engineering concepts, not integrate with a commercial ERP or become a production service.

The primary demonstration is the complete approved replenishment workflow. `npm run demo` uses the deterministic test agent and does not require an OpenAI API key. `npm run demo:live` runs the same flow with the OpenAI agent for live intent and read-tool planning.

## Evaluation scope

`npm run evals` reports a 100% pass rate only for the six controlled scenarios that use deterministic test models and isolated in-memory databases. The live OpenAI path is demonstrated manually through `npm run demo:live` and `npm run ui:live`; it is not statistically benchmarked or used as a provider-backed regression suite.

## Run locally

```bash
npm install
npm run db:seed
npm test
npm run build
npm run evals
npm run demo
```

The seed command creates `data/mini-erp.db`, which is intentionally ignored by Git.

The browser demo also manages this local file: it resets from the canonical seed data at startup and persists its pending action, approval, and replenishment writes after each successful UI step. This is for inspection during the demonstration only; restarting the UI resets the demo database again.

## License

Released under the [MIT License](LICENSE).

## Status

- Application foundation and TypeScript build: complete
- Seeded SQLite database: complete
- Deterministic shortage service: complete
- Explicit insufficient-inventory-data handling: complete
- Domain and database tests: complete
- Read-only MCP tools and tool-call traces: complete
- Read-only agent orchestrator and model-provider abstraction: complete
- Controlled evaluation harness: complete
- Approval-gated, idempotent replenishment write service: complete
- One polished end-to-end shortage-to-approved-replenishment flow: complete
- Local browser approval console: complete
- Targeted prompt-injection and policy scenarios: complete

The project specifically demonstrates MCP tools, agent orchestration, ERP-style workflows, human approval gates, evals, safe execution, idempotency, prompt-injection resistance, and observability/tracing. Enterprise identity, real ERP integration, email infrastructure, and production deployment are out of scope.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/EVALUATIONS.md](docs/EVALUATIONS.md), and [docs/DEMO.md](docs/DEMO.md).
