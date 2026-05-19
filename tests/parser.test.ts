import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractRulesFromMarkdown } from "../src/parser/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (p: string) => readFileSync(resolve(here, "..", "fixtures", p), "utf8");

describe("parser — valid/basic.md", () => {
  const result = extractRulesFromMarkdown(fixture("valid/basic.md"));

  it("extracts exactly the expected enforceable rules", () => {
    const kinds = result.enforceable.map((r) => r.kind).sort();
    expect(kinds).toEqual([
      "allowlist-paths",
      "always-before",
      "never-commit",
      "never-commit",
      "never-commit",
      "never-edit-path",
      "never-edit-path",
      "never-run-cmd",
      "never-run-cmd",
    ]);
  });

  it("classifies .env as never-commit with the right pattern", () => {
    const envRule = result.enforceable.find(
      (r) => r.kind === "never-commit" && r.rawText.includes(".env"),
    );
    expect(envRule).toBeDefined();
    if (envRule && envRule.params.kind === "never-commit") {
      expect(envRule.params.pattern).toBe(".env");
    }
  });

  it("classifies always X before Y", () => {
    const r = result.enforceable.find((x) => x.kind === "always-before");
    expect(r).toBeDefined();
    if (r && r.params.kind === "always-before") {
      expect(r.params.precondition).toContain("npm test");
      expect(r.params.action).toContain("git commit");
    }
  });

  it("assigns stable hash-based ids", () => {
    for (const rule of result.enforceable) {
      expect(rule.id).toMatch(/^[a-z-]+-[0-9a-f]{8}$/);
    }
  });

  it("records source line numbers", () => {
    for (const rule of result.enforceable) {
      expect(rule.source.line).toBeGreaterThan(0);
    }
  });

  it("produces no vague output for fully concrete rules", () => {
    expect(result.vague).toEqual([]);
  });
});

describe("parser — vague/soft.md", () => {
  const result = extractRulesFromMarkdown(fixture("vague/soft.md"));

  it("flags qualitative rules as vague", () => {
    const vagueTexts = result.vague.map((r) => r.rawText);
    expect(vagueTexts.some((t) => t.toLowerCase().includes("be cautious"))).toBe(true);
    expect(vagueTexts.some((t) => t.toLowerCase().includes("prefer"))).toBe(true);
  });

  it("flags 'NEVER commit secrets' as vague with suggestion", () => {
    const r = result.vague.find((v) => v.rawText.toLowerCase().includes("never commit secrets"));
    expect(r).toBeDefined();
    expect(r?.suggestion).toBeDefined();
  });

  it("produces no enforceable rules for soft.md", () => {
    expect(result.enforceable).toEqual([]);
  });
});

describe("parser — edge-cases/nested-lists.md", () => {
  const result = extractRulesFromMarkdown(fixture("edge-cases/nested-lists.md"));

  it("recurses into nested list items", () => {
    const kinds = result.enforceable.map((r) => r.kind).sort();
    expect(kinds).toContain("never-commit");
    expect(kinds).toContain("never-edit-path");
    expect(kinds).toContain("always-before");
  });

  it("picks up rules from blockquotes", () => {
    const rsa = result.enforceable.find((r) => r.rawText.includes("id_rsa"));
    expect(rsa).toBeDefined();
    expect(rsa?.kind).toBe("never-commit");
  });

  it("does not invent rules from plain prose", () => {
    const prose = result.vague.find((v) => v.rawText.includes("A paragraph that is not a rule"));
    expect(prose).toBeUndefined();
  });
});

describe("parser — id stability", () => {
  it("identical input produces identical ids", () => {
    const a = extractRulesFromMarkdown(fixture("valid/basic.md"));
    const b = extractRulesFromMarkdown(fixture("valid/basic.md"));
    const idsA = a.enforceable.map((r) => r.id).sort();
    const idsB = b.enforceable.map((r) => r.id).sort();
    expect(idsA).toEqual(idsB);
  });
});
