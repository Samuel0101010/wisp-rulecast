import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { filterSince, readAuditLog } from "../src/audit/logger.js";
import { renderReport } from "../src/audit/report.js";

let workDir = "";
let logPath = "";

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "wisp-audit-"));
  logPath = join(workDir, "wisp-rulecast.log");
});

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("audit logger", () => {
  it("returns an empty array when the log file does not exist", () => {
    expect(readAuditLog(logPath)).toEqual([]);
  });

  it("parses JSON-lines and skips malformed lines", () => {
    writeFileSync(
      logPath,
      [
        JSON.stringify({ ts: "2026-05-18T10:00:00Z", rule: "r1", decision: "deny", reason: "x" }),
        "not-json",
        "",
        JSON.stringify({ ts: "2026-05-18T11:00:00Z", rule: "r2", decision: "deny", reason: "y" }),
      ].join("\n"),
      "utf8",
    );
    const entries = readAuditLog(logPath);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.rule).toBe("r1");
  });

  it("filters entries by since-cutoff", () => {
    const old = new Date(Date.now() - 86_400_000).toISOString();
    const recent = new Date().toISOString();
    writeFileSync(
      logPath,
      [
        JSON.stringify({ ts: old, rule: "r1", decision: "deny", reason: "x" }),
        JSON.stringify({ ts: recent, rule: "r2", decision: "deny", reason: "y" }),
      ].join("\n"),
      "utf8",
    );
    const filtered = filterSince(readAuditLog(logPath), new Date(Date.now() - 60_000));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.rule).toBe("r2");
  });
});

describe("audit report", () => {
  it("emits an empty-state message when nothing was blocked", () => {
    expect(renderReport([])).toContain("No blocked violations yet");
  });

  it("groups by rule and counts blocks", () => {
    const md = renderReport([
      { ts: "2026-05-18T10:00:00Z", rule: "r1", decision: "deny", reason: "NEVER commit .env" },
      { ts: "2026-05-18T10:05:00Z", rule: "r1", decision: "deny", reason: "NEVER commit .env" },
      { ts: "2026-05-18T10:10:00Z", rule: "r2", decision: "deny", reason: "NEVER run rm -rf" },
    ]);
    expect(md).toContain("Total blocked violations: **3**");
    expect(md).toContain("r1 — 2 block(s)");
    expect(md).toContain("r2 — 1 block(s)");
  });
});
