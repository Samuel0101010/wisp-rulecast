# Changelog

All notable changes to `wisp-rulecast` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Distribution pivots from npm to Claude Code plugin. The repo is now a
  one-plugin marketplace: install with
  `/plugin marketplace add Samuel0101010/wisp-rulecast` →
  `/plugin install wisp-rulecast@wisp`. npm publish is no longer the
  primary path (and the npm account's post-2025 2FA policy made it
  friction-heavy anyway).
- `dist/` is now committed because the plugin ships its bundled CLI.
- Plugin layout added: `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `skills/wisp-rulecast/SKILL.md`,
  `commands/wisp-rulecast.md`, `bin/wisp-rulecast` (+ `.cmd` for Windows).
- README install section rewritten for the plugin path; the legacy
  clone-and-run flow is kept as an alternative.

## [0.1.0] — 2026-05-19

Initial release.

### Added
- Markdown rule parser built on `remark-parse` + a deterministic regex
  classifier. Splits rules into `EnforceableRule` and `VagueRule`.
- Five hook templates:
  - `never-commit` — block `git add`/`git commit`/`git push`/`git stash` when the staged-command text contains the rule's pattern.
  - `never-edit-path` — block `Edit`/`Write`/`MultiEdit` against forbidden paths or globs.
  - `never-run-cmd` — block `Bash` calls matching a forbidden command pattern.
  - `always-before` — `PostToolUse` marker + `PreToolUse` deny when the precondition hasn't run this session.
  - `allowlist-paths` — allow `Edit`/`Write`/`MultiEdit` only inside listed paths.
- Idempotent `.claude/settings.json` merger. A hook group is "owned" iff
  every hook in it routes through `.claude/wisp-rulecast/dispatch.mjs`;
  re-compiling drops only owned groups and preserves user hooks plus every
  unrelated key in the settings file.
- Single runtime Node dispatcher emitting structured exit-0
  `permissionDecision: "deny"` payloads with the source-line reason. <50 ms
  target per invocation, cross-platform.
- JSON-lines audit log at `.claude/wisp-rulecast.log`; `wisp-rulecast audit`
  renders it as a grouped markdown summary with `--since 24h`/`7d` filters.
- Self-check (`wisp-rulecast verify`) spawns the dispatcher with a synthetic
  violating input per rule and asserts deny — proves the generated hooks
  actually fire.
- CLI subcommands: `compile`, `audit`, `verify`, `install`, `reset`.
- Installable skill (`.claude/skills/wisp-rulecast/SKILL.md`) and slash
  command (`.claude/commands/wisp-rulecast.md`).
- 53 tests across 8 files including an end-to-end dispatcher-spawn
  integration test. Lint clean (Biome), typecheck strict (TypeScript),
  build is a single 36 KB ESM bundle.

### Security
- Pre-publish audit: PII sweep, secrets sweep, gitignore audit, GitHub
  Actions audit. No credential or PII leak in the shipped tree. Local-only
  files (`.swarm/`, `agentdb.rvf*`, `.claude/settings.local.json`, source
  PNG masters) excluded by `.gitignore`. Release workflow uses least-privilege
  permissions (`contents: read, id-token: write`) and npm provenance.

[Unreleased]: https://github.com/Samuel0101010/wisp-rulecast/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Samuel0101010/wisp-rulecast/releases/tag/v0.1.0
