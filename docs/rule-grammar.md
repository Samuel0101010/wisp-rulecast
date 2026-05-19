# Rule Grammar

> Which sentences in `CLAUDE.md` get compiled to hooks, and which are flagged as vague.

wisp-rulecast scans every paragraph, list item, and blockquote line in your `CLAUDE.md`. Each candidate is normalized (lowercased, abbreviations expanded) and classified.

## Enforceable patterns

| Form | Example | Compiles to |
|---|---|---|
| `NEVER commit <pattern>` | `` NEVER commit `.env` `` | `never-commit` hook (Bash, git staging/commit/push) |
| `NEVER edit <path>` | `` NEVER edit files in `/vendor` `` | `never-edit-path` hook (Edit/Write/MultiEdit) |
| `NEVER run <command>` | `` NEVER run `rm -rf` `` | `never-run-cmd` hook (Bash) |
| `ALWAYS <X> before <Y>` | `` ALWAYS run `npm test` before `git commit` `` | `always-before` hook (PostToolUse marker + PreToolUse check) |
| `ALWAYS save <X> to <path>` | `` ALWAYS save tests to `/tests` `` | `allowlist-paths` hook (Edit/Write/MultiEdit) |

`NEVER` can be written as `DO NOT`, `DON'T`, `MUST NOT`, or `NO`. Same effect.
`ALWAYS` can be written as `MUST`. Same effect.

## What makes a rule "enforceable"

The classifier needs a **concrete pattern** to attach to the hook. We recognize:

- Backtick-wrapped literals: `` `.env` ``, `` `*.pem` ``, `` `id_rsa` ``, `` `rm -rf` `` (strongest signal)
- Dotfiles: `.env`, `.npmrc`
- Globs: `*.lock`, `*.pem`
- Absolute paths: `/vendor`, `/secrets`
- Namespaced paths: `src/internal`, `config/secrets.yml`
- Filenames with an extension: `credentials.json`, `id_rsa.pub`

**Always wrap your patterns in backticks.** This is the single highest-leverage thing you can do to make wisp-rulecast confident about your intent.

## Vague rules

A rule is flagged as **vague** when the intent is clearly a rule, but the classifier cannot pin down what it would enforce. Examples:

- `NEVER commit secrets` — what's "secrets"? Suggest `` NEVER commit `.env` `` or `` NEVER commit `*.pem` ``.
- `Be cautious when refactoring` — qualitative, not mechanical.
- `Prefer small functions` — preference, not prohibition.
- `Keep files under 500 lines` — quantitative; future template (out of scope for v1).

Vague rules surface in the `compile` output and via `wisp-rulecast compile --explain`. They do **not** produce hooks.

## What gets ignored

- Code blocks (fenced triple-backtick).
- Headings (rules in headings are skipped — put them in the body).
- Plain prose paragraphs that don't start with `NEVER`, `ALWAYS`, `DO NOT`, etc.
- Soft openers: `Try`, `Consider`, `Prefer`, `Should`, `May`, `Might`, `Be …`, `Keep …` — these are flagged as vague rather than enforced.

## Tips for writing good rules

1. **Use backticks.** `` `\.env` `` beats `.env files` every time.
2. **Be specific.** "NEVER commit `*.pem`" beats "NEVER commit certs".
3. **Pair an always-before precondition with a single concrete action.** "ALWAYS run `npm test` before `git commit`" works. "ALWAYS test first" doesn't.
4. **Stick to one rule per bullet.** Multi-rule bullets fragment unpredictably.
5. **If wisp-rulecast flags a rule as vague, take the suggestion.** It already shows you the shape that would compile.

## Future expansions (v2+)

- `MAX FILE SIZE <N> lines` → PostToolUse hook on Edit/Write.
- `ALWAYS in language <X>` → response-style enforcement via `UserPromptSubmit`.
- `NEVER use library <X>` → grep PostToolUse output for forbidden imports.
- Custom matchers for MCP tools (`mcp__github__*`).
