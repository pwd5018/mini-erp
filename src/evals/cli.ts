import { scenarios } from "./scenarios.js";
import { runEvaluations } from "./runner.js";

const report = await runEvaluations(scenarios);
console.log(`Agent Evaluation\n\nOverall Pass Rate: ${report.overallPassRate}%\n`);
for (const [category, rate] of Object.entries(report.categoryPassRates)) console.log(`${category.padEnd(20)} ${rate}%`);
console.log("\nScenario Results:");
for (const result of report.results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.evalId} - ${result.name}${result.violations.length ? `: ${result.violations.join("; ")}` : ""}`);
console.log("\nDetailed JSON:");
console.log(JSON.stringify(report, null, 2));
