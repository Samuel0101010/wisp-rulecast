// Idempotent merge of wisp-rulecast hook groups into a Claude Code settings.json.
//
// Ownership model:
//   - A hook group is "ours" iff EVERY hook in it routes to .claude/wisp-rulecast/dispatch
//     (we identify by the first arg path). Groups containing user hooks are left alone.
//   - On every compile we drop our previous groups and append fresh ones.
//   - All non-`hooks` keys in settings.json are passed through untouched.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type Settings, SettingsSchema } from "./settings-schema.js";
import type { CompiledHooks, HookGroup } from "./types.js";

const DISPATCHER_MARKER = "wisp-rulecast/dispatch";

function isOurEntry(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as { type?: unknown; args?: unknown };
  if (e.type !== "command") return false;
  if (!Array.isArray(e.args)) return false;
  const first = e.args[0];
  return typeof first === "string" && first.includes(DISPATCHER_MARKER);
}

function isOurGroup(group: { hooks?: unknown[] } | undefined): boolean {
  if (!group || !Array.isArray(group.hooks) || group.hooks.length === 0) return false;
  return group.hooks.every(isOurEntry);
}

export function readSettings(path: string): Settings {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  return SettingsSchema.parse(parsed);
}

export function writeSettings(path: string, settings: Settings): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function mergeHooks(existing: Settings, compiled: CompiledHooks): Settings {
  const next: Settings = { ...existing };
  const hooks = { ...(next.hooks ?? {}) };

  for (const event of ["PreToolUse", "PostToolUse"] as const) {
    const prev = (hooks[event] ?? []) as Array<{ hooks?: unknown[] }>;
    const userGroups = prev.filter((g) => !isOurGroup(g));
    const ourGroups = compiled[event] as unknown as Array<HookGroup>;
    hooks[event] = [...userGroups, ...ourGroups] as typeof hooks.PreToolUse;
  }

  next.hooks = hooks;
  return next;
}

/** Strip every wisp-rulecast hook group from a settings object (for `reset`). */
export function stripOurHooks(existing: Settings): Settings {
  return mergeHooks(existing, { PreToolUse: [], PostToolUse: [] });
}
