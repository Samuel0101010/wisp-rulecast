---
description: Keep Claude Code hooks in sync with the project's CLAUDE.md. Use after the user edits CLAUDE.md, when they add a NEVER/ALWAYS/DO NOT rule, or whenever they ask to "compile rules", "enforce CLAUDE.md", "lock in the rules", or "regenerate hooks". Turns prose rules into PreToolUse hooks so the next tool call that would break a rule is denied at the protocol layer.
allowed-tools: Bash(wisp-rulecast:*), Bash(node ${CLAUDE_PLUGIN_ROOT}/dist/index.js:*), Read
---

# wisp-rulecast — compile CLAUDE.md rules to hooks

Behavioral rules in `CLAUDE.md` ("NEVER commit `.env`") are advisory until they are compiled. `wisp-rulecast` parses them, classifies enforceable vs vague, and writes `PreToolUse` hooks into `.claude/settings.json` plus a tiny dispatcher into `.claude/wisp-rulecast/dispatch.mjs`. The next time Claude tries `git add .env`, the hook denies it with the source-line reason.

## When to invoke

- The user edited `CLAUDE.md` and added or changed a `NEVER` / `ALWAYS` / `DO NOT` rule.
- The user asked to "compile the rules", "enforce CLAUDE.md", "regenerate hooks", "lock in the rules", or anything semantically equivalent.
- A new repository was just initialized with a `CLAUDE.md` and no `.claude/wisp-rulecast/rules.json` yet.
- The user reports a rule that "isn't being followed" — re-compile and check the audit log.

## What to do

1. Run `wisp-rulecast compile`. (Inside the plugin's bin directory; the binary is on `PATH` while the plugin is enabled.)
2. If output flags vague rules, surface them to the user with the suggested rephrasing.
3. Run `wisp-rulecast verify` to confirm the dispatcher denies a synthetic violation per rule.

Do **not** hand-edit `.claude/settings.json` for rules that came from `CLAUDE.md` — they will be overwritten on the next compile. Add user-only hooks under a different matcher or different command path; wisp-rulecast preserves any hook group that doesn't route through its dispatcher.

## Subcommands

| Command | What it does |
|---|---|
| `wisp-rulecast compile [--dry-run] [--explain]` | Parse CLAUDE.md, write hooks + rules + dispatcher |
| `wisp-rulecast verify` | Spawn the dispatcher with a synthetic violating input per rule, assert deny |
| `wisp-rulecast audit [--since 24h]` | Markdown summary of blocked violations from the JSON-lines log |
| `wisp-rulecast reset` | Remove every wisp-rulecast hook from settings.json (user hooks preserved) |

Full grammar reference: `docs/rule-grammar.md`. Generated hook shapes: `docs/hook-templates.md`.
