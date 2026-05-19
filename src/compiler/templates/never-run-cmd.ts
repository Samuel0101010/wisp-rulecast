// NEVER run <command> → PreToolUse on Bash, pre-filtered by the command prefix.

import type { EnforceableRule } from "../../parser/types.js";
import { type CompiledHooks, emptyCompiled } from "../types.js";
import { bashIfClause, dispatcherEntry } from "../utils.js";

export function neverRunCmdTemplate(rule: EnforceableRule): CompiledHooks {
  if (rule.params.kind !== "never-run-cmd") return emptyCompiled();
  const out = emptyCompiled();
  const ifClause = bashIfClause(rule.params.commandPattern);
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, ifClause)],
  });
  return out;
}
