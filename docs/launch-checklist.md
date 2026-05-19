# Launch Checklist

> v1.0.0 readiness. Tick before flipping the repo public.

## Code

- [x] Parser extracts NEVER / DO NOT / MUST NOT / ALWAYS rules
- [x] Five hook templates: never-commit, never-edit-path, never-run-cmd, always-before, allowlist-paths
- [x] Idempotent settings.json merger preserves user hooks
- [x] Runtime dispatcher emits structured deny payloads (exit 0 + JSON)
- [x] Audit log (JSON-lines) + `audit` markdown report
- [x] Self-check `verify` spawns dispatcher with synthetic input per rule
- [x] CLI commands: compile, audit, verify, install, reset
- [x] Skill + slash command installable via `wisp-rulecast install`
- [ ] vhs demo.tape recording (`scripts/demo.tape`)
- [ ] Final hero GIF at `docs/demo.gif` (<5 MB, autoplay)

## Quality gates

- [x] `npm run lint` clean (biome)
- [x] `npm run typecheck` clean (tsc strict)
- [x] `npm test` green (>=50 tests including end-to-end dispatcher spawn)
- [x] `npm run build` produces a single ESM bundle
- [ ] CI green on Ubuntu, macOS, Windows (matrix already configured)
- [ ] Manual smoke on a fresh project: `npx wisp-rulecast install` → edit `CLAUDE.md` → `git add .env` blocked

## Documentation

- [x] README hero section + install + usage
- [x] `docs/notes/hooks-api.md` — Anthropic hooks reference notes
- [x] `docs/rule-grammar.md` — which sentences compile
- [x] `docs/hook-templates.md` — which hooks are generated
- [x] `docs/launch-checklist.md` (this file)
- [ ] CHANGELOG.md

## Distribution

- [ ] `npm publish --dry-run` to verify the `files` field
- [ ] npm account 2FA confirmed
- [ ] `npm publish --access public --provenance` (CI does this on tag)
- [ ] `gh repo edit --visibility public`
- [ ] `gh release create v1.0.0 --notes-file docs/launch-checklist.md`

## Marketing

- [ ] HN draft: "Show HN: Compile your CLAUDE.md rules to real Claude Code hooks"
- [ ] Twitter thread + GIF
- [ ] Submit to `awesome-claude-code-toolkit`
- [ ] Submit to `claudepluginhub`
- [ ] Skill marketplace submission

## Anti-launch (do NOT do)

- ❌ Public repo before v1.0.0
- ❌ npm publish before CI matrix is green
- ❌ Try to handle vague rules automatically
- ❌ Generate platform-specific bash hooks instead of routing through the Node dispatcher
- ❌ Skip the manual fresh-project smoke
