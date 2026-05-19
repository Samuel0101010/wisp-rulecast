# Anthropic Hooks API — Reference Notes

> Source: https://code.claude.com/docs/en/hooks (fetched 2026-05-18)
> Distilled for wisp-rulecast hook generation.

## Settings.json structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs", "<rule-id>"],
            "timeout": 5,
            "if": "Bash(git commit *|git add *)"
          }
        ]
      }
    ]
  }
}
```

### Matcher syntax

- Exact: `"Bash"`, `"Edit"`, `"Write"`
- Pipe-list: `"Edit|Write|MultiEdit"`
- Regex: `"mcp__.*"`, `"^Notebook"`
- Wildcard: `"*"` or omit

### Hook handler fields

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"command"`, `"http"`, `"mcp_tool"`, `"prompt"`, `"agent"` |
| `command` | string | Executable name or shell command |
| `args` | array | Exec form (no shell). Preferred for cross-platform. |
| `timeout` | number | Seconds. Default 600. We use 5 for fast hooks. |
| `if` | string | Pre-filter permission rule, e.g. `Bash(git commit *)`. Cheap. |
| `shell` | string | `"bash"` (default) or `"powershell"`. Avoid — use exec form. |

## PreToolUse stdin JSON

Common keys:

```json
{
  "session_id": "abc",
  "transcript_path": "...",
  "cwd": "/absolute/cwd",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { ... },
  "tool_use_id": "tool_use_abc"
}
```

### `tool_input` shapes

| Tool | Fields |
|---|---|
| `Bash` | `command`, `description`, `timeout`, `run_in_background` |
| `Write` | `file_path`, `content` |
| `Edit` | `file_path`, `old_string`, `new_string`, `replace_all` |
| `MultiEdit` | `file_path`, `edits[]` (each with `old_string`, `new_string`) |
| `Read` | `file_path`, `offset`, `limit` |

`file_path` is always **absolute**.

## Exit codes (PreToolUse)

| Exit | Effect |
|---|---|
| `0` | Allow. JSON on stdout is parsed for structured decision. Plain text → debug log. |
| `1` | Non-blocking error. Tool still runs. Stderr surfaces as notice. |
| `2` | **Block.** Stderr is fed back to Claude as error. |
| other | Non-blocking error. |

## Structured block (exit 0 + JSON)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "wisp-rulecast: NEVER commit .env (CLAUDE.md L42)"
  }
}
```

`permissionDecision` ∈ `"allow" | "deny" | "ask" | "defer"`.

We use **exit 0 + JSON** for structured deny — Claude sees the reason properly. Exit 2 + stderr is the simple fallback.

## Placeholders

- `${CLAUDE_PROJECT_DIR}` — project root
- `${CLAUDE_PLUGIN_ROOT}` — for plugins
- Env vars: `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, parent shell inherited

## Other event types we may use

| Event | Blocking | Notes |
|---|---|---|
| `PreToolUse` | yes | Primary target |
| `PostToolUse` | no | For audit-only, not enforcement |
| `UserPromptSubmit` | yes | Could enforce prompt-level rules — out of scope v1 |

---

## Design decisions for wisp-rulecast

### One dispatcher, many rules

Instead of generating N shell scripts (platform-specific nightmare), generate **one Node dispatcher** + a rule registry. The settings.json entries route to it by rule-id:

```json
{
  "type": "command",
  "command": "node",
  "args": [
    "${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs",
    "--rule", "<rule-id>"
  ],
  "timeout": 5
}
```

Benefits:
- Cross-platform: Node runs on Windows/Mac/Linux identically
- Fast: <50ms target (project anti-pattern says >50ms = UX killer)
- Maintainable: one file owns all enforcement logic
- Testable: dispatcher is plain JS with stdin/stdout — unit-testable

Rule registry stored at `.claude/wisp-rulecast/rules.json`:

```json
{
  "version": 1,
  "rules": [
    {
      "id": "never-commit-env",
      "kind": "never-commit",
      "source": "CLAUDE.md L42",
      "rawText": "NEVER commit .env files",
      "params": { "pattern": "\\.env" }
    }
  ]
}
```

### Hook template → dispatch matcher table

| Template | Matcher | `if` filter | Dispatch logic |
|---|---|---|---|
| `never-commit` | `Bash` | `Bash(git commit *|git add *|git push *)` | Check pattern against staged files (`git diff --cached --name-only`) |
| `never-edit-path` | `Edit|Write|MultiEdit` | none (need full path check) | Check `tool_input.file_path` against pattern |
| `never-run-cmd` | `Bash` | `Bash(<cmd> *)` (pre-filter) | Regex-match `tool_input.command` |
| `always-before` | varies | none | Check `.claude/wisp-rulecast/state.json` marker; deny if action-Y without prior action-X |
| `allowlist-paths` | `Edit|Write|MultiEdit` | none | Deny if `tool_input.file_path` is OUTSIDE allowlist |

### Namespace + idempotency

All wisp-rulecast hooks tagged with marker comment / structural id. Settings-merger:
1. Loads existing settings.json
2. Removes only entries with `wisp-rulecast`-marked rule-id
3. Inserts new entries
4. Preserves all user hooks

We use the `args` array to embed `--rule <id>` so identification is structural, not string-matched.

### Audit log format

JSON-lines at `.claude/wisp-rulecast.log`:

```json
{"ts":"2026-05-18T12:34:56Z","rule":"never-commit-env","tool":"Bash","input":{"command":"git commit"},"decision":"deny","reason":"..."}
```

Append-only. Rotation out of scope v1.

### Self-check (dry-run)

For each rule, synthesize a violating `tool_input`, pipe it through dispatcher, assert deny. Confirms generated hooks actually fire.
