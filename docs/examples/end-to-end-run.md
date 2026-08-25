# Representative end-to-end run

This is a representative output from the deterministic demo. Action and request IDs are generated at runtime.

## User request

> Which open orders are at risk because of inventory shortages?

## Agent analysis

The agent selected the read-only MCP tools `get_open_orders` and `get_inventory`. The application then calculated the shortage deterministically:

```text
Order: SO-1001
Product: P-001
Required: 50
Available: 30
Shortage: 20
```

## Recommendation

```json
{
  "type": "CREATE_REPLENISHMENT_REQUEST",
  "productId": "P-001",
  "quantity": 20,
  "linkedOrderId": "SO-1001",
  "reason": "SO-1001 requires 50 units and only 30 are currently available."
}
```

## Approval and execution

```text
Action created: PENDING
Execution before approval: REJECTED
Analyst approval: REJECTED
Manager approval: APPROVED
Write tool: create_replenishment_request
Final action state: COMPLETED
```

The write was executed once. Repeating the same execution returned the original replenishment request ID instead of creating a duplicate.

## Trace lifecycle

```text
USER_REQUEST
INTENT
FINDING
RECOMMENDATION
ACTION
WRITE_BLOCKED
APPROVAL_REJECTED
APPROVAL
WRITE_RESULT
VERIFICATION
FINAL_STATUS
```

## Evaluation result

The controlled suite passes all six scenarios, including `Eval-006-EndToEndApprovedReplenishment` and `Eval-011 Prompt Injection in ERP Note`, with a 100% pass rate.
