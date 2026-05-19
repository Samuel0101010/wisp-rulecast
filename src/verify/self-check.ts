// Self-check: for each enforceable rule, synthesize a violating tool_input,
// run the dispatcher in a child process, and assert it emits `deny`.
// This proves the generated hooks actually fire — not just that they exist.

import { spawnSync } from "node:child_process";
import type { EnforceableRule } from "../parser/types.js";

export interface CheckResult {
  rule: EnforceableRule;
  passed: boolean;
  reason: string;
  decision: "allow" | "deny" | "error";
  stdout: string;
  stderr: string;
}

export interface SelfCheckSummary {
  results: CheckResult[];
  passed: number;
  failed: number;
}

interface RunOptions {
  dispatcherPath: string;
  projectDir: string;
}

function syntheticEvent(rule: EnforceableRule): {
  tool_name: string;
  tool_input: Record<string, unknown>;
  hook_event_name: string;
} {
  switch (rule.params.kind) {
    case "never-commit":
      return {
        tool_name: "Bash",
        tool_input: { command: `git add ${rule.params.pattern}` },
        hook_event_name: "PreToolUse",
      };
    case "never-edit-path": {
      const p = rule.params.pathPattern;
      const filePath = p.startsWith("/") ? `${p}/example.txt` : `/tmp/${p}`;
      return {
        tool_name: "Edit",
        tool_input: { file_path: filePath, old_string: "x", new_string: "y" },
        hook_event_name: "PreToolUse",
      };
    }
    case "never-run-cmd":
      return {
        tool_name: "Bash",
        tool_input: { command: `${rule.params.commandPattern} something` },
        hook_event_name: "PreToolUse",
      };
    case "always-before":
      return {
        tool_name: "Bash",
        tool_input: { command: rule.params.action },
        hook_event_name: "PreToolUse",
      };
    case "allowlist-paths":
      return {
        tool_name: "Write",
        tool_input: {
          file_path: "/this/path/is/not/in/the/allowlist/file.txt",
          content: "hello",
        },
        hook_event_name: "PreToolUse",
      };
  }
}

function runDispatcher(rule: EnforceableRule, opts: RunOptions): CheckResult {
  const event = syntheticEvent(rule);
  const proc = spawnSync(process.execPath, [opts.dispatcherPath, "--rule", rule.id], {
    input: JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: opts.projectDir },
    timeout: 10_000,
  });

  const stdout = proc.stdout ?? "";
  const stderr = proc.stderr ?? "";

  if (proc.status !== 0 && proc.status !== null) {
    return {
      rule,
      passed: false,
      decision: "error",
      reason: `dispatcher exited with code ${proc.status}: ${stderr.trim() || stdout.trim()}`,
      stdout,
      stderr,
    };
  }

  const denied = stdout.includes('"permissionDecision":"deny"');
  return {
    rule,
    passed: denied,
    decision: denied ? "deny" : "allow",
    reason: denied
      ? "violation correctly blocked"
      : "dispatcher did not deny a synthetic violation",
    stdout,
    stderr,
  };
}

export function runSelfCheck(rules: EnforceableRule[], opts: RunOptions): SelfCheckSummary {
  const results = rules.map((r) => runDispatcher(r, opts));
  return {
    results,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
  };
}
