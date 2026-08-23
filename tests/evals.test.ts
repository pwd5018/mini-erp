import { describe, expect, it } from "vitest";
import { scenarios } from "../src/evals/scenarios.js";
import { runEvaluations } from "../src/evals/runner.js";

describe("Phase 4 evaluation harness", () => {
  it("passes the first four controlled evaluation scenarios", async () => {
    const report = await runEvaluations(scenarios);
    expect(report.total).toBe(4);
    expect(report.passed).toBe(4);
    expect(report.overallPassRate).toBe(100);
    expect(report.results.map((result) => result.evalId)).toEqual(["Eval-001", "Eval-002", "Eval-003", "Eval-010"]);
  });
});
