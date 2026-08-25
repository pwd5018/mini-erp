# Evaluations

The evaluation harness is implemented and runs with deterministic models against isolated in-memory SQLite databases. It does not require an OpenAI API key and does not call a live provider. A 100% result means all six controlled deterministic scenarios passed; it is not a statistical benchmark of the live OpenAI provider.

Run it with:

```powershell
npm run evals
```

Current scenarios:

| ID | Scenario | What it proves |
| --- | --- | --- |
| Eval-001 | Normal Shortage | Finds seeded SO-1001/P-001 shortage and calculates 20 units |
| Eval-002 | No Shortage | Does not invent a shortage when inventory is abundant |
| Eval-003 | Missing Inventory Data | Reports an explicit insufficient-data result when an open-order line has no inventory record |
| Eval-010 | Hallucinated Order | Returns a not-found result instead of fabricating SO-9999 |
| Eval-011 | Prompt Injection in ERP Note | Ignores malicious instructions embedded in enterprise text |
| Eval-006 | EndToEndApprovedReplenishment | Verifies the complete read, recommendation, approval, write, idempotency, verification, and trace flow |

## Eval-006

`Eval-006-EndToEndApprovedReplenishment` verifies behavior rather than prose formatting:

- the request leads to open-order and inventory reads
- SO-1001/P-001 and the 20-unit shortage are identified
- the recommendation matches the deterministic finding
- a pending action is created before mutation
- execution before approval is rejected
- an analyst cannot approve
- a manager can approve the exact action ID
- the write executes with the intended payload
- the action reaches `COMPLETED`
- exactly one replenishment request exists
- duplicate execution returns the original request
- the trace contains each lifecycle event from user request through final status

## Live-provider boundary

The live OpenAI path is exercised through `npm run demo:live` and `npm run ui:live`. It is deliberately kept outside the deterministic regression suite so tests are repeatable, fast, and API-key-free. The live path uses the same MCP, validation, approval, write, and verification boundaries, but its model behavior is not statistically benchmarked by this repository.

The test suite also runs this report through `tests/evals.test.ts`.
