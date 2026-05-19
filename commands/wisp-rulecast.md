---
description: Compile / audit / verify / reset CLAUDE.md → Claude Code hooks.
argument-hint: [compile|audit|verify|reset] [--dry-run] [--explain] [--since 24h]
---

Run the wisp-rulecast CLI in the current project. The binary is on `PATH` because the plugin is enabled.

```bash
wisp-rulecast $ARGUMENTS
```

If `$ARGUMENTS` is empty, default to `compile`:

```bash
wisp-rulecast compile
```

## Subcommands

- `compile [--dry-run] [--explain]` — parse `CLAUDE.md` and write hooks
- `verify` — self-check: dispatcher denies a synthetic violation per rule
- `audit [--since 24h]` — markdown summary of blocked violations
- `reset` — remove every wisp-rulecast hook from `settings.json`
