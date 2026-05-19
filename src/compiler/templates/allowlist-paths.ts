// ONLY save X to <path>... → inverse rule: PreToolUse on Edit|Write|MultiEdit
// denies any file_path that is NOT under one of the allowed paths.

import type { EnforceableRule } from "../../parser/types.js";
import { type CompiledHooks, emptyCompiled } from "../types.js";
import { dispatcherEntry } from "../utils.js";

export function allowlistPathsTemplate(rule: EnforceableRule): CompiledHooks {
  if (rule.params.kind !== "allowlist-paths") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Edit|Write|MultiEdit",
    hooks: [dispatcherEntry(rule.id)],
  });
  return out;
}
