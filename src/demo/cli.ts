import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { runEndToEndWorkflow } from "../workflow/endToEnd.js";

const SQL = await initSqlJs();
let db;
try {
  db = new SQL.Database(new Uint8Array(readFileSync("data/mini-erp.db")));
  const result = await runEndToEndWorkflow(db);
  console.log("AI-FIRST MINI ERP — END-TO-END DEMO\n");
  console.log(`USER REQUEST\n${result.request}\n`);
  console.log(`AGENT RESPONSE\n${result.analysis.response}\n`);
  console.log(`FINDING\n${result.recommendation.linkedOrderId}: ${result.recommendation.productId}, shortage ${result.recommendation.quantity}\n`);
  console.log(`RECOMMENDATION\nCreate replenishment request for ${result.recommendation.quantity} units of ${result.recommendation.productId}\n`);
  console.log(`ACTION\n${result.action.actionId} — ${result.action.approvalStatus}\n`);
  console.log(`APPROVAL\nExecution before approval rejected: ${result.executionBeforeApprovalRejected}\nAnalyst approval rejected: ${result.analystApprovalRejected}\nApproved by: ${result.approvedBy}\n`);
  console.log(`WRITE TOOL\ncreate_replenishment_request\n`);
  console.log(`RESULT\n${result.replenishmentRequest.requestId} created successfully; duplicate execution returned ${result.duplicateExecutionRequestId}\n`);
  console.log(`FINAL STATUS\n${result.verifiedAction.executionStatus}\n`);
  console.log("TRACE SUMMARY");
  for (const event of result.traceEvents) console.log(`- ${event.type}: ${event.summary}`);
  console.log(`\nTOOL TRACES: ${result.toolTraces.length}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  db?.close();
}
