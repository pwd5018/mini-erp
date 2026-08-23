import type { AgentRun } from "../agent/orchestrator.js";

export type EvalCategory = "intent" | "toolSelection" | "toolArguments" | "grounding" | "hallucination" | "authorization" | "safeExecution" | "businessOutcome";
export type EvalScores = Record<EvalCategory, 0 | 1>;

export interface EvaluationResult {
  evalId: string;
  name: string;
  passed: boolean;
  scores: EvalScores;
  violations: string[];
  traceIds: string[];
  run?: AgentRun;
  error?: string;
}

export interface EvaluationReport {
  generatedAt: string;
  total: number;
  passed: number;
  overallPassRate: number;
  categoryPassRates: Record<EvalCategory, number>;
  results: EvaluationResult[];
}
