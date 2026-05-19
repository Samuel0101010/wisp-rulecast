# Hook Templates

> What lands in `.claude/settings.json` after `wisp-rulecast compile`.

Every wisp-rulecast hook routes through a single Node dispatcher at `.claude/wisp-rulecast/dispatch.mjs`. The dispatcher reads the rule registry (`.claude/wisp-rulecast/rules.json`) and applies the per-rule check. This keeps the settings.json clean and avoids platform-specific bash scripts.

All hooks have a 5-second timeout. The dispatcher itself targets <50ms per invocation.

## `never-commit`

| Field | Value |
|---|---|
| Event | `PreToolUse` |
| Matcher | `Bash` |
| `if` filter | `Bash(git commit *|git add *|git push *|git stash *|git stash push *)` |
| Check | Dispatcher matches `tool_input.command` against `params.pattern` (substring, case-insensitive) |

Generated entry:

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "node",
    "args": ["${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs",
             "--rule", "never-commit-abcd1234"],
    "timeout": 5,
    "if": "Bash(git commit *|git add *|git push *|git stash *|git stash push *)"
  }]
}
```

**Caveat:** v1 checks the command string, not the actual staged file set. `git add .env` is blocked; `git add .` followed by `git commit` is not. Future versions may shell out to `git diff --cached`.

## `never-edit-path`

| Field | Value |
|---|---|
| Event | `PreToolUse` |
| Matcher | `Edit|Write|MultiEdit` |
| `if` filter | none — dispatcher needs the full path |
| Check | Dispatcher compares `tool_input.file_path` against `params.pathPattern` (glob + inside-of-directory + substring) |

## `never-run-cmd`

| Field | Value |
|---|---|
| Event | `PreToolUse` |
| Matcher | `Bash` |
| `if` filter | Derived from the first word of the pattern, e.g. `Bash(rm *)` or `Bash(git push *)` |
| Check | Dispatcher matches `tool_input.command` against `params.commandPattern` (substring) |

The derived `if`-filter is a fast pre-filter; the dispatcher only runs when the prefix matches.

## `always-before`

Emits **two** hook entries:

| Event | Matcher | `if` filter | Effect |
|---|---|---|---|
| `PostToolUse` | `Bash` | matches precondition | Writes a session marker to `.claude/wisp-rulecast/state.json` |
| `PreToolUse` | `Bash` | matches action | Denies if the marker is missing |

Markers are scoped per-rule and live for the current session. There is currently no TTL.

## `allowlist-paths`

| Field | Value |
|---|---|
| Event | `PreToolUse` |
| Matcher | `Edit|Write|MultiEdit` |
| `if` filter | none |
| Check | Dispatcher denies if `tool_input.file_path` is NOT inside any of `params.allowedPaths`. |

## Deny payload

When the dispatcher denies a tool call, it emits:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "wisp-rulecast: NEVER commit .env (CLAUDE.md:5)"
  }
}
```

Exit code is `0` — Claude Code parses the JSON and surfaces the reason to the model.

## Audit log

Every deny appends one JSON line to `.claude/wisp-rulecast.log`:

```json
{"ts":"2026-05-18T19:30:00Z","rule":"never-commit-abcd","kind":"never-commit",
 "tool":"Bash","input":{"command":"git add .env"},"decision":"deny",
 "reason":"wisp-rulecast: NEVER commit .env (CLAUDE.md:5)"}
```

Read it back with `wisp-rulecast audit` (markdown summary) or `tail -f` it live.

## Idempotency contract

Each `wisp-rulecast compile` invocation:

1. Drops every previously-owned hook group from `.claude/settings.json`.
2. Re-emits a fresh set from the current `CLAUDE.md`.
3. Preserves every other settings key and every user hook.

A hook group is considered "owned" iff **every** hook in it routes to `.claude/wisp-rulecast/dispatch.mjs`. Mixed groups (user hooks plus ours) never happen because each template emits its own group.
