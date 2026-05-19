// `wisp-rulecast install` CLI handler. Copies skill + command into the project
// and (if CLAUDE.md exists) runs the first compile so hooks are active.

import { existsSync } from "node:fs";
import { compile } from "../compiler/compile.js";
import { projectPaths } from "../compiler/paths.js";
import { install } from "../install/install.js";

export function installCommand(argv: string[], cwd: string): number {
  const result = install(cwd);
  const lines = [
    "wisp-rulecast: installed skill + slash command",
    `  ${result.skill}`,
    `  ${result.command}`,
  ];

  const paths = projectPaths(cwd);
  if (existsSync(paths.claudeMd) && !argv.includes("--no-compile")) {
    try {
      const summary = compile({ cwd });
      lines.push("");
      lines.push(
        `Compiled ${summary.parse.enforceable.length} rule(s) → ${summary.hookCounts.PreToolUse} PreToolUse + ${summary.hookCounts.PostToolUse} PostToolUse hook(s).`,
      );
    } catch (err) {
      lines.push("");
      lines.push(`(compile skipped: ${(err as Error).message})`);
    }
  } else if (!existsSync(paths.claudeMd)) {
    lines.push("");
    lines.push("No CLAUDE.md found yet — run `wisp-rulecast compile` once you add one.");
  }

  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}
