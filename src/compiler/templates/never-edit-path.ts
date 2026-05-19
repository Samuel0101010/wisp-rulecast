// NEVER edit <path> → PreToolUse on Edit|Write|MultiEdit. No `if` filter —
// the dispatcher checks `tool_input.file_path` against the rule's pattern.

import type { EnforceableRule } from "../../parser/types.js";
import { type CompiledHooks, emptyCompiled } from "../types.js";
import { dispatcherEntry } from "../utils.js";

export function neverEditPathTemplate(rule: EnforceableRule): CompiledHooks {
  if (rule.params.kind !== "never-edit-path") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Edit|Write|MultiEdit",
    hooks: [dispatcherEntry(rule.id)],
  });
  return out;
}
