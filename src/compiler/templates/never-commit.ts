// NEVER commit <pattern> → PreToolUse on Bash matching git-staging/commit/push.

import type { EnforceableRule } from "../../parser/types.js";
import { type CompiledHooks, emptyCompiled } from "../types.js";
import { dispatcherEntry } from "../utils.js";

const GIT_FILTER = "Bash(git commit *|git add *|git push *|git stash *|git stash push *)";

export function neverCommitTemplate(rule: EnforceableRule): CompiledHooks {
  if (rule.params.kind !== "never-commit") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, GIT_FILTER)],
  });
  return out;
}
