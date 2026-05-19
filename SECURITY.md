# Security Policy

## Reporting a Vulnerability

If you find a security issue in `wisp-rulecast`, please **do not** open a public GitHub issue.

Email **samuel.heftberger@gmail.com** with:

- A description of the issue and the impact you observed.
- Steps to reproduce.
- The version of `wisp-rulecast` you were running (`wisp-rulecast --version`).

You'll get an acknowledgement within 72 hours. Fixes for confirmed issues are released as patch versions and noted in the changelog.

## Scope

`wisp-rulecast` runs on the developer's machine as a CLI and as a Claude Code `PreToolUse` hook dispatcher. In-scope concerns:

- Sandbox escapes from the runtime dispatcher (`.claude/wisp-rulecast/dispatch.mjs`) — e.g., a maliciously crafted `tool_input` causing arbitrary code execution.
- Rule-bypass: a tool call that should be denied by a compiled rule but isn't.
- Settings.json corruption: the merger destroying user hooks or unrelated keys.
- Audit-log injection: a malicious tool input causing log corruption.

## Out of scope

- Vulnerabilities in upstream dependencies (`remark-parse`, `unified`, `zod`) — please report those to the respective maintainers; we'll bump versions promptly once a fix is available.
- The Claude Code hooks API itself (please report to Anthropic).
- Behavioral guidance limitations — `wisp-rulecast` only enforces *enforceable* rules; vague rules are surfaced for the author to rephrase. That's by design.
