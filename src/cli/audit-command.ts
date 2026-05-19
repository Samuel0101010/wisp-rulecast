// `wisp-rulecast audit` — render the dispatcher's JSON-lines log as markdown.

import { filterSince, readAuditLog } from "../audit/logger.js";
import { renderReport } from "../audit/report.js";
import { projectPaths } from "../compiler/paths.js";

function parseSince(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d+)\s*([hd])$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "h").toLowerCase();
  const ms = unit === "d" ? n * 86_400_000 : n * 3_600_000;
  return new Date(Date.now() - ms);
}

export function auditCommand(argv: string[], cwd: string): number {
  const sinceIdx = argv.indexOf("--since");
  const sinceArg = sinceIdx >= 0 ? argv[sinceIdx + 1] : undefined;
  const since = parseSince(sinceArg);

  const paths = projectPaths(cwd);
  let entries = readAuditLog(paths.log);
  if (since) entries = filterSince(entries, since);

  const md = renderReport(entries);
  process.stdout.write(md);
  return 0;
}
