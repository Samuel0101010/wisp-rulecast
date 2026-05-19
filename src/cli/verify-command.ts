// `wisp-rulecast verify` — run self-check against the dispatcher.

import { existsSync, readFileSync } from "node:fs";
import { projectPaths } from "../compiler/paths.js";
import type { EnforceableRule } from "../parser/types.js";
import { runSelfCheck } from "../verify/self-check.js";

export function verifyCommand(_argv: string[], cwd: string): number {
  const paths = projectPaths(cwd);

  if (!existsSync(paths.rules) || !existsSync(paths.dispatcher)) {
    process.stderr.write(
      "wisp-rulecast: no compiled output found — run `wisp-rulecast compile` first.\n",
    );
    return 1;
  }

  const registry = JSON.parse(readFileSync(paths.rules, "utf8")) as { rules: EnforceableRule[] };
  if (!registry.rules || registry.rules.length === 0) {
    process.stdout.write("wisp-rulecast: no enforceable rules to verify.\n");
    return 0;
  }

  const summary = runSelfCheck(registry.rules, {
    dispatcherPath: paths.dispatcher,
    projectDir: cwd,
  });

  const lines: string[] = [
    `wisp-rulecast verify: ${summary.passed}/${summary.results.length} rule(s) fire correctly.`,
  ];
  for (const r of summary.results) {
    const tick = r.passed ? "✓" : "✗";
    lines.push(`  ${tick} ${r.rule.id}  ${r.rule.kind}  — ${r.reason}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  return summary.failed === 0 ? 0 : 1;
}
