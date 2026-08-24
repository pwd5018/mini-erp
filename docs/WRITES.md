# Phase 5 safe writes

Phase 5 adds the first mutation path without giving the production agent write tools yet. The write MCP server is in `src/mcp/writeServer.ts`; the deterministic policy and transaction logic is in `src/actions/replenishment.ts`.

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

Every proposal requires an idempotency key. Repeating the proposal returns the original action. Repeating execution after completion returns the original replenishment request instead of inserting a duplicate.

## Validation

Before proposal and again before execution, the service verifies:

- quantity is positive
- product exists
- linked order exists when supplied
- linked order is still open
- action was explicitly approved

The final replenishment insert and action completion update occur in one SQLite transaction.

Phase 5 is tested through the real MCP client/server in `tests/writes.test.ts`. The complete local demonstration composes the read-only agent with this write server in `src/workflow/endToEnd.ts`; the OpenAI production provider still receives only read tools, while the deterministic demo performs the explicit proposal and approval steps outside the model.
