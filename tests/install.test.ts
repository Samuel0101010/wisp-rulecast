import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { install } from "../src/install/install.js";

let workDir = "";

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "wisp-install-"));
});

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("install", () => {
  it("writes the skill file with frontmatter", () => {
    const result = install(workDir);
    expect(existsSync(result.skill)).toBe(true);
    const content = readFileSync(result.skill, "utf8");
    expect(content).toMatch(/^---\nname: wisp-rulecast/);
    expect(content).toContain("allowed-tools:");
  });

  it("writes the slash command file with frontmatter", () => {
    const result = install(workDir);
    expect(existsSync(result.command)).toBe(true);
    const content = readFileSync(result.command, "utf8");
    expect(content).toMatch(/^---\ndescription:/);
    expect(content).toContain("npx wisp-rulecast compile");
  });

  it("is idempotent", () => {
    const a = install(workDir);
    const b = install(workDir);
    expect(a.skill).toBe(b.skill);
    expect(readFileSync(a.skill, "utf8")).toBe(readFileSync(b.skill, "utf8"));
  });
});
