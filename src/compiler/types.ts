// Hook output shapes. Mirror the Claude Code settings.json schema:
//   hooks.<Event>[].matcher  + .hooks[]
// We always emit "command"-type hooks that delegate to a single Node dispatcher
// via `--rule <id>`. Rule-specific check logic lives in the dispatcher,
// keyed by the rule registry.

import type { EnforceableRule } from "../parser/types.js";

export interface ToolHookEntry {
  type: "command";
  command: string;
  args: string[];
  timeout: number;
  /** Optional permission-rule pre-filter (cheap, avoids spawning the hook). */
  if?: string;
}

export interface HookGroup {
  matcher: string;
  hooks: ToolHookEntry[];
}

export interface CompiledHooks {
  PreToolUse: HookGroup[];
  PostToolUse: HookGroup[];
}

export type HookTemplate = (rule: EnforceableRule) => CompiledHooks;

export const DISPATCHER_PATH = "${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs";
export const DEFAULT_TIMEOUT = 5;

export function emptyCompiled(): CompiledHooks {
  return { PreToolUse: [], PostToolUse: [] };
}
