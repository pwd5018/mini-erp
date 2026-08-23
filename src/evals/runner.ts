import initSqlJs from "sql.js";
import { AgentOrchestrator } from "../agent/orchestrator.js";
import { createEmbeddedMcpClient } from "../agent/mcpClient.js";
import type { EvalScenario } from "./scenarios.js";
import type { EvaluationReport, EvaluationResult, EvalCategory } from "./types.js";

export async function runScenario(scenario: EvalScenario): Promise<EvaluationResult> {
  let db;
  try {
    db = await scenario.createDatabase();
    const { client } = await createEmbeddedMcpClient(db);
    try {
      const run = await new AgentOrchestrator(scenario.createModel(), client).run(scenario.request);
      const scored = scenario.score(run);
      const scores = scored.scores;
      return { evalId: scenario.evalId, name: scenario.name, passed: Object.values(scores).every((score) => score === 1) && scored.violations.length === 0, scores, violations: scored.violations, traceIds: run.toolCalls.flatMap((call) => call.traceId ? [call.traceId] : []) };
    } finally { await client.close(); }
  } catch (error) {
    const scores = { intent: 0, toolSelection: 0, toolArguments: 0, grounding: 0, hallucination: 0, authorization: 0, safeExecution: 0, businessOutcome: 0 } as const;
    return { evalId: scenario.evalId, name: scenario.name, passed: false, scores, violations: ["Evaluation execution failed."], traceIds: [], error: error instanceof Error ? error.message : String(error) };
  } finally { db?.close(); }
}

export async function runEvaluations(scenarios: EvalScenario[]): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];
  for (const scenario of scenarios) results.push(await runScenario(scenario));
  const categories: EvalCategory[] = ["intent", "toolSelection", "toolArguments", "grounding", "hallucination", "authorization", "safeExecution", "businessOutcome"];
  const passed = results.filter((result) => result.passed).length;
  const categoryPassRates = Object.fromEntries(categories.map((category) => [category, results.length ? Math.round(results.reduce((total, result) => total + result.scores[category], 0) / results.length * 100) : 0])) as EvaluationReport["categoryPassRates"];
  return { generatedAt: new Date().toISOString(), total: results.length, passed, overallPassRate: results.length ? Math.round(passed / results.length * 100) : 0, categoryPassRates, results };
}
