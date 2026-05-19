// Helpers shared by all hook templates.

import { DEFAULT_TIMEOUT, DISPATCHER_PATH, type ToolHookEntry } from "./types.js";

/** Build the standard dispatcher hook entry for a given rule id. */
export function dispatcherEntry(ruleId: string, ifClause?: string): ToolHookEntry {
  const entry: ToolHookEntry = {
    type: "command",
    command: "node",
    args: [DISPATCHER_PATH, "--rule", ruleId],
    timeout: DEFAULT_TIMEOUT,
  };
  if (ifClause) entry.if = ifClause;
  return entry;
}

/**
 * Derive a `Bash(...)` permission-rule pre-filter from a free-text action
 * like `git commit`, `npm test`, or `rm -rf`. Used to keep our hook from
 * being spawned on every Bash call.
 */
export function bashIfClause(action: string): string {
  const tokens = action
    .trim()
    .replace(/^[`"']|[`"']$/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return "Bash(*)";

  const head = tokens[0];

  // Multi-token executables (git commit, npm run) — keep first two as the prefix.
  if (tokens.length >= 2 && /^(git|npm|pnpm|yarn|docker|kubectl|gh|cargo)$/.test(head ?? "")) {
    return `Bash(${head} ${tokens[1]} *)`;
  }

  return `Bash(${head} *)`;
}

/**
 * Escape a literal string so it can be embedded in a permission-rule glob
 * without surprises. Permission rules are glob-like, so we keep `*` if the
 * caller passed one but escape spaces by wrapping in the rule shape itself.
 */
export function literalGlob(input: string): string {
  return input.trim();
}
