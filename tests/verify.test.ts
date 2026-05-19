// End-to-end self-check: compile a CLAUDE.md fixture, then spawn the runtime
// dispatcher with a synthetic violating input per rule and assert it denies.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compile } from "../src/compiler/compile.js";
import { runSelfCheck } from "../src/verify/self-check.js";

const claudeMd = `# Rules

- NEVER commit \`.env\`
- NEVER edit files in \`/vendor\`
- NEVER run \`rm -rf\`
- ALWAYS run \`npm test\` before \`git commit\`
- ALWAYS save tests to \`/tests\`
`;

let workDir = "";

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "wisp-verify-"));
  writeFileSync(join(workDir, "CLAUDE.md"), claudeMd, "utf8");
});

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe("self-check", () => {
  it("dispatcher denies every synthetic violation", () => {
    const summary = compile({ cwd: workDir });
    const check = runSelfCheck(summary.parse.enforceable, {
      dispatcherPath: summary.paths.dispatcher,
      projectDir: workDir,
    });

    const failures = check.results.filter((r) => !r.passed);
    if (failures.length > 0) {
      const debug = failures
        .map(
          (f) =>
            `${f.rule.kind} (${f.rule.id}): ${f.reason}\n  stdout=${f.stdout}\n  stderr=${f.stderr}`,
        )
        .join("\n");
      throw new Error(`self-check failures:\n${debug}`);
    }
    expect(check.failed).toBe(0);
    expect(check.passed).toBe(summary.parse.enforceable.length);
  });
});
