// Read the JSON-lines audit log written by the runtime dispatcher.
// Writing happens inside the dispatcher (.claude/wisp-rulecast/dispatch.mjs)
// so we never import this from there — it's a read-side helper only.

import { existsSync, readFileSync } from "node:fs";

export interface AuditEntry {
  ts: string;
  rule: string;
  kind?: string;
  tool?: string;
  input?: Record<string, unknown>;
  decision: "deny" | "allow";
  reason: string;
}

export function readAuditLog(path: string): AuditEntry[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const out: AuditEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as AuditEntry);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

export function filterSince(entries: AuditEntry[], since: Date): AuditEntry[] {
  const cutoff = since.getTime();
  return entries.filter((e) => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) && t >= cutoff;
  });
}
