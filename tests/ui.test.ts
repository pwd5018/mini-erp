import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { createSchema, insertSeedData } from "../src/database.js";
import { seedData } from "../src/seed.js";
import { ApprovalDemoSession } from "../src/ui/session.js";

describe("approval console session", () => {
  it("stages analysis, approval, execution, verification, and idempotency", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    createSchema(db);
    insertSeedData(db, JSON.parse(JSON.stringify(seedData)));
    const session = new ApprovalDemoSession(db);
    try {
      expect((await session.getState()).phase).toBe("READY");
      const pending = await session.analyzeAndPropose();
      expect(pending.phase).toBe("PENDING_APPROVAL");
      expect(pending.recommendation?.quantity).toBe(20);
      const approved = await session.approve();
      expect(approved.phase).toBe("APPROVED");
      const completed = await session.execute();
      expect(completed.phase).toBe("COMPLETED");
      expect(completed.duplicateExecutionRequestId).toBe(completed.replenishmentRequest?.requestId);
      expect(completed.traceEvents.map((event) => event.type)).toContain("FINAL_STATUS");
    } finally {
      await session.close();
      db.close();
    }
  });
});
