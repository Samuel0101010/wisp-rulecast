// `wisp-rulecast compile` — run the orchestrator and print a summary.

import { compile } from "../compiler/compile.js";

export function compileCommand(argv: string[], cwd: string): number {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  try {
    const summary = compile({ cwd, dryRun });
    const verb = dryRun ? "Would write" : "Wrote";
    const lines = [
      `wisp-rulecast: parsed ${summary.parse.enforceable.length} enforceable + ${summary.parse.vague.length} vague rule(s) from CLAUDE.md`,
      `  ${verb} ${summary.hookCounts.PreToolUse} PreToolUse + ${summary.hookCounts.PostToolUse} PostToolUse hook(s)`,
    ];
    if (!dryRun) {
      lines.push(`  settings:   ${summary.paths.settings}`);
      lines.push(`  rules:      ${summary.paths.rules}`);
      lines.push(`  dispatcher: ${summary.paths.dispatcher}`);
    }
    if (summary.parse.vague.length > 0) {
      lines.push("");
      lines.push(
        `  ${summary.parse.vague.length} rule(s) flagged as vague — re-run with --explain to see them.`,
      );
    }
    if (argv.includes("--explain")) {
      lines.push("");
      lines.push("Vague rules:");
      for (const v of summary.parse.vague) {
        lines.push(`  - ${v.source.file}:${v.source.line}  "${v.rawText}"`);
        lines.push(`      ${v.reason}`);
        if (v.suggestion) lines.push(`      suggestion: ${v.suggestion}`);
      }
    }
    process.stdout.write(`${lines.join("\n")}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`wisp-rulecast: compile failed: ${(err as Error).message}\n`);
    return 1;
  }
}
