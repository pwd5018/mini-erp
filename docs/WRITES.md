# Approval-gated safe writes

The write MCP server is intentionally separate from the live read-only agent. The server is in `src/mcp/writeServer.ts`; the deterministic policy and transaction logic is in `src/actions/replenishment.ts`.

## Approval flow

```text
propose_replenishment_request
          ↓
       PENDING
          ↓  manager approves exact actionId
     approve_action
          ↓
      APPROVED
          ↓  manager executes exact actionId
create_replenishment_request
          ↓
      COMPLETED
```

The actor role comes from the application-created `ActorContext`, not from tool arguments. An Operations Analyst can propose an action but cannot approve or execute it. Only an Operations Manager can approve and execute.

## Idempotency

Every proposal requires an idempotency key. Repeating the same proposal returns the original action; reusing a key with different replenishment details is rejected as a conflict. Repeating execution after completion returns the original replenishment request instead of inserting a duplicate.

This is a single-process demonstration using local `sql.js`. It proves retry safety for the demonstrated sequential workflow, but it is not presented as a distributed-concurrency solution. A production ERP integration would use an atomic execution claim and an ERP- or database-enforced idempotency constraint.

## Validation

Before proposal and again before execution, the service verifies:

- quantity is positive
- product exists
- linked order exists when supplied
- linked order is still open
- action was explicitly approved

The final replenishment insert and action completion update occur in one SQLite transaction.

This behavior is tested through the real MCP client/server in `tests/writes.test.ts`. The complete local demonstration composes the read-only agent with this write server in `src/workflow/endToEnd.ts`; the live OpenAI provider receives only read tools, while the application performs the explicit proposal and approval steps outside the model.
