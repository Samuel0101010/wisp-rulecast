// Template registry: rule.kind → HookTemplate.

import type { EnforceableRule, RuleKind } from "../../parser/types.js";
import type { CompiledHooks, HookTemplate } from "../types.js";
import { allowlistPathsTemplate } from "./allowlist-paths.js";
import { alwaysBeforeTemplate } from "./always-before.js";
import { neverCommitTemplate } from "./never-commit.js";
import { neverEditPathTemplate } from "./never-edit-path.js";
import { neverRunCmdTemplate } from "./never-run-cmd.js";

export const TEMPLATES: Record<RuleKind, HookTemplate> = {
  "never-commit": neverCommitTemplate,
  "never-edit-path": neverEditPathTemplate,
  "never-run-cmd": neverRunCmdTemplate,
  "always-before": alwaysBeforeTemplate,
  "allowlist-paths": allowlistPathsTemplate,
};

export function applyTemplate(rule: EnforceableRule): CompiledHooks {
  const template = TEMPLATES[rule.kind];
  return template(rule);
}
