// Render audit-log entries as a compact markdown summary.

import type { AuditEntry } from "./logger.js";

export interface ReportOptions {
  /** Cap the per-rule example list. Default: 3. */
  examplesPerRule?: number;
}

export function renderReport(entries: AuditEntry[], options: ReportOptions = {}): string {
  const examples = options.examplesPerRule ?? 3;
  if (entries.length === 0) {
    return "# wisp-rulecast audit\n\nNo blocked violations yet.\n";
  }

  const byRule = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    if (e.decision !== "deny") continue;
    const list = byRule.get(e.rule) ?? [];
    list.push(e);
    byRule.set(e.rule, list);
  }

  const sorted = [...byRule.entries()].sort((a, b) => b[1].length - a[1].length);
  const totalBlocks = entries.filter((e) => e.decision === "deny").length;

  const lines: string[] = [
    "# wisp-rulecast audit",
    "",
    `Total blocked violations: **${totalBlocks}** across **${sorted.length}** rule(s).`,
    "",
  ];

  for (const [ruleId, list] of sorted) {
    const first = list[0];
    lines.push(`## ${ruleId} — ${list.length} block(s)`);
    if (first?.reason) {
      lines.push("");
      lines.push(`> ${first.reason}`);
    }
    lines.push("");
    lines.push("Recent:");
    for (const e of list.slice(0, examples)) {
      const tool = e.tool ?? "?";
      const inputSummary = e.input ? JSON.stringify(e.input) : "{}";
      lines.push(`- \`${e.ts}\` ${tool} \`${inputSummary.slice(0, 120)}\``);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
