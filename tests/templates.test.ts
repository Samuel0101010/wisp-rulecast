import { describe, expect, it } from "vitest";
import { applyTemplate } from "../src/compiler/templates/index.js";
import { bashIfClause } from "../src/compiler/utils.js";
import type { EnforceableRule } from "../src/parser/types.js";

const baseSource = { file: "CLAUDE.md", line: 1 } as const;

function makeRule<K extends EnforceableRule["kind"]>(
  kind: K,
  params: Extract<EnforceableRule["params"], { kind: K }>,
  extra: Partial<EnforceableRule> = {},
): EnforceableRule {
  return {
    status: "enforceable",
    id: `${kind}-deadbeef`,
    kind,
    source: baseSource,
    rawText: "test",
    normalizedText: "test",
    params,
    ...extra,
  } as EnforceableRule;
}

describe("template: never-commit", () => {
  const rule = makeRule("never-commit", { kind: "never-commit", pattern: ".env" });
  const out = applyTemplate(rule);

  it("emits a single PreToolUse group on Bash", () => {
    expect(out.PreToolUse).toHaveLength(1);
    expect(out.PreToolUse[0]?.matcher).toBe("Bash");
  });

  it("pre-filters to git staging/commit/push commands", () => {
    expect(out.PreToolUse[0]?.hooks[0]?.if).toContain("git commit");
    expect(out.PreToolUse[0]?.hooks[0]?.if).toContain("git add");
    expect(out.PreToolUse[0]?.hooks[0]?.if).toContain("git push");
  });

  it("routes to the dispatcher with the rule id", () => {
    const args = out.PreToolUse[0]?.hooks[0]?.args ?? [];
    expect(args).toContain("--rule");
    expect(args).toContain(rule.id);
  });

  it("emits no PostToolUse", () => {
    expect(out.PostToolUse).toEqual([]);
  });
});

describe("template: never-edit-path", () => {
  const rule = makeRule("never-edit-path", { kind: "never-edit-path", pathPattern: "/vendor" });
  const out = applyTemplate(rule);

  it("matches Edit|Write|MultiEdit", () => {
    expect(out.PreToolUse[0]?.matcher).toBe("Edit|Write|MultiEdit");
  });

  it("omits an if-filter (full path check in dispatcher)", () => {
    expect(out.PreToolUse[0]?.hooks[0]?.if).toBeUndefined();
  });
});

describe("template: never-run-cmd", () => {
  const rule = makeRule("never-run-cmd", { kind: "never-run-cmd", commandPattern: "rm -rf" });
  const out = applyTemplate(rule);

  it("matches Bash with a derived if-filter", () => {
    expect(out.PreToolUse[0]?.matcher).toBe("Bash");
    expect(out.PreToolUse[0]?.hooks[0]?.if).toBe("Bash(rm *)");
  });

  it("groups git subcommands into Bash(git <sub> *)", () => {
    const r2 = makeRule("never-run-cmd", {
      kind: "never-run-cmd",
      commandPattern: "git push --force",
    });
    const o2 = applyTemplate(r2);
    expect(o2.PreToolUse[0]?.hooks[0]?.if).toBe("Bash(git push *)");
  });
});

describe("template: always-before", () => {
  const rule = makeRule("always-before", {
    kind: "always-before",
    precondition: "npm test",
    action: "git commit",
  });
  const out = applyTemplate(rule);

  it("emits one Pre and one Post hook group", () => {
    expect(out.PreToolUse).toHaveLength(1);
    expect(out.PostToolUse).toHaveLength(1);
  });

  it("PreToolUse if-clause matches the action", () => {
    expect(out.PreToolUse[0]?.hooks[0]?.if).toBe("Bash(git commit *)");
  });

  it("PostToolUse if-clause matches the precondition", () => {
    expect(out.PostToolUse[0]?.hooks[0]?.if).toBe("Bash(npm test *)");
  });
});

describe("template: allowlist-paths", () => {
  const rule = makeRule("allowlist-paths", {
    kind: "allowlist-paths",
    allowedPaths: ["/tests", "/src"],
  });
  const out = applyTemplate(rule);

  it("matches Edit|Write|MultiEdit", () => {
    expect(out.PreToolUse[0]?.matcher).toBe("Edit|Write|MultiEdit");
  });

  it("dispatcher receives the rule id (paths read from registry)", () => {
    const args = out.PreToolUse[0]?.hooks[0]?.args ?? [];
    expect(args.includes("--rule")).toBe(true);
  });
});

describe("bashIfClause helper", () => {
  it("collapses single commands to <cmd> *", () => {
    expect(bashIfClause("rm")).toBe("Bash(rm *)");
    expect(bashIfClause("ls -la")).toBe("Bash(ls *)");
  });

  it("preserves the subcommand for known multi-word tools", () => {
    expect(bashIfClause("git commit")).toBe("Bash(git commit *)");
    expect(bashIfClause("npm test")).toBe("Bash(npm test *)");
    expect(bashIfClause("docker run")).toBe("Bash(docker run *)");
  });

  it("strips wrapping backticks", () => {
    expect(bashIfClause("`git push`")).toBe("Bash(git push *)");
  });
});
