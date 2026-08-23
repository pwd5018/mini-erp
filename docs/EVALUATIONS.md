# Evaluations

The evaluation harness is planned for Phase 4. The first scenario will measure whether the agent identifies the seeded shortage on `SO-1001`, calculates the 20-unit shortage from tool data, and performs no write.

Phase 2 tests verify tool discovery, grounded inventory reads, malformed-input rejection, and predictable not-found errors. These are protocol/tool tests rather than agent evaluations because no model is connected yet.

Phase 3 tests verify the first agent slice: the model abstraction can select read tools, the MCP client returns evidence, inventory is aggregated across warehouses, `SO-1001` is identified with a 20-unit shortage, and no write action is available or claimed.

Phase 4 adds a controlled evaluation runner. Run it with:

```bash
npm run evals
```

The current suite runs Eval-001, Eval-002, Eval-003, and Eval-010 against isolated in-memory databases. It checks tool selection, tool arguments, evidence grounding, hallucination behavior, authorization, safe execution, and business outcome. It uses deterministic test models so the regression suite is stable; live-model evaluation will be added separately.

The CLI prints an aggregate scorecard and compact JSON containing each scenario's scores, violations, and trace IDs. It does not run as part of the production agent request.

Future scenarios will cover missing products, hallucinated orders, authorization, approval compliance, idempotency, prompt injection, tool timeouts, and ambiguous requests. Scores will assess behavior and trace evidence rather than prose quality alone.
