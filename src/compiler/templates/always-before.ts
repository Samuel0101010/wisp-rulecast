// ALWAYS <precondition> before <action>:
//   PostToolUse on Bash → if precondition matched, record a marker.
//   PreToolUse  on Bash → if action matches and marker missing, deny.
// The dispatcher owns both checks; this template only wires the routing.

import type { EnforceableRule } from "../../parser/types.js";
import { type CompiledHooks, emptyCompiled } from "../types.js";
import { bashIfClause, dispatcherEntry } from "../utils.js";

export function alwaysBeforeTemplate(rule: EnforceableRule): CompiledHooks {
  if (rule.params.kind !== "always-before") return emptyCompiled();
  const out = emptyCompiled();

  const preIf = bashIfClause(rule.params.precondition);
  const actionIf = bashIfClause(rule.params.action);

  out.PostToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, preIf)],
  });
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, actionIf)],
  });
  return out;
}
