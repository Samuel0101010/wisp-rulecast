import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compile } from "../src/compiler/compile.js";

const sampleClaudeMd = `# Rules

## Security
- NEVER commit \`.env\`
- NEVER commit \`*.pem\`

## Filesystem
- NEVER edit files in \`/vendor\`

## Workflow
- ALWAYS run \`npm test\` before \`git commit\`
- ALWAYS save tests to \`/tests\`

## Soft
- Prefer small functions
`;

let workDir = "";

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "wisp-rulecast-"));
  writeFileSync(join(workDir, "CLAUDE.md"), sampleClaudeMd, "utf8");
});

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("compile — end-to-end", () => {
  it("writes settings.json, rules.json, and dispatch.mjs", () => {
    const summary = compile({ cwd: workDir });
    expect(summary.wroteSettings).toBe(true);
    expect(summary.wroteRegistry).toBe(true);
    expect(summary.wroteDispatcher).toBe(true);

    expect(existsSync(summary.paths.settings)).toBe(true);
    expect(existsSync(summary.paths.rules)).toBe(true);
    expect(existsSync(summary.paths.dispatcher)).toBe(true);
  });

  it("extracts only enforceable rules into the registry", () => {
    const summary = compile({ cwd: workDir });
    const registry = JSON.parse(readFileSync(summary.paths.rules, "utf8"));
    expect(registry.rules.length).toBeGreaterThanOrEqual(5);
    for (const rule of registry.rules) {
      expect(rule.status).toBe("enforceable");
    }
  });

  it("produces a settings.json with PreToolUse hooks routing to our dispatcher", () => {
    const summary = compile({ cwd: workDir });
    const settings = JSON.parse(readFileSync(summary.paths.settings, "utf8"));
    const pre = settings.hooks?.PreToolUse ?? [];
    expect(pre.length).toBeGreaterThan(0);
    const allDispatcher = pre.every((g: { hooks: { args?: string[] }[] }) =>
      g.hooks.every((h) => h.args?.[0]?.includes("wisp-rulecast/dispatch")),
    );
    expect(allDispatcher).toBe(true);
  });

  it("emits a PostToolUse hook for the always-before rule", () => {
    const summary = compile({ cwd: workDir });
    const settings = JSON.parse(readFileSync(summary.paths.settings, "utf8"));
    expect((settings.hooks?.PostToolUse ?? []).length).toBeGreaterThan(0);
  });

  it("flags vague rules without writing hooks for them", () => {
    const summary = compile({ cwd: workDir });
    expect(summary.parse.vague.length).toBeGreaterThan(0);
  });

  it("dry-run writes nothing but reports counts", () => {
    const summary = compile({ cwd: workDir, dryRun: true });
    expect(summary.wroteSettings).toBe(false);
    expect(summary.wroteRegistry).toBe(false);
    expect(summary.wroteDispatcher).toBe(false);
    expect(summary.hookCounts.PreToolUse).toBeGreaterThan(0);
  });

  it("preserves existing unrelated settings on recompile", () => {
    const settingsPath = join(workDir, ".claude", "settings.json");
    mkdirSync(join(workDir, ".claude"), { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({ enabledMcpjsonServers: ["ruflo"], custom: { x: 1 } }, null, 2),
      "utf8",
    );
    compile({ cwd: workDir });
    const after = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(after.enabledMcpjsonServers).toEqual(["ruflo"]);
    expect(after.custom).toEqual({ x: 1 });
  });

  it("is idempotent on repeated compiles", () => {
    compile({ cwd: workDir });
    const first = readFileSync(join(workDir, ".claude", "settings.json"), "utf8");
    compile({ cwd: workDir });
    const second = readFileSync(join(workDir, ".claude", "settings.json"), "utf8");
    // Settings JSON should match modulo whitespace.
    expect(JSON.parse(second).hooks.PreToolUse.length).toBe(
      JSON.parse(first).hooks.PreToolUse.length,
    );
  });
});
