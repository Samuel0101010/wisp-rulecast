// Take EnforceableRules → CompiledHooks by applying each rule's template.

import type { EnforceableRule } from "../parser/types.js";
import { applyTemplate } from "./templates/index.js";
import { type CompiledHooks, emptyCompiled } from "./types.js";

export function buildHooks(rules: EnforceableRule[]): CompiledHooks {
  const out = emptyCompiled();
  for (const rule of rules) {
    const compiled = applyTemplate(rule);
    out.PreToolUse.push(...compiled.PreToolUse);
    out.PostToolUse.push(...compiled.PostToolUse);
  }
  return out;
}
