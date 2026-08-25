import { describe, expect, it } from "vitest";
import { scenarios } from "../src/evals/scenarios.js";
import { runEvaluations } from "../src/evals/runner.js";

describe("evaluation harness", () => {
  it("passes the controlled read and end-to-end evaluation scenarios", async () => {
    const report = await runEvaluations(scenarios);
    expect(report.total).toBe(6);
    expect(report.passed).toBe(6);
    expect(report.overallPassRate).toBe(100);
    expect(report.results.map((result) => result.evalId)).toEqual(["Eval-001", "Eval-002", "Eval-003", "Eval-010", "Eval-011", "Eval-006"]);
    expect(report.results.find((result) => result.evalId === "Eval-006")?.passed).toBe(true);
  });
});
