# Contributing to wisp-rulecast

Thanks for your interest. The project is small and the contribution surface is intentionally minimal — most of what's needed lives in this one file.

## Reporting bugs

File an issue with:

- The version (`wisp-rulecast --version`).
- A minimal `CLAUDE.md` snippet that reproduces the problem.
- What you expected vs. what you saw — paste the relevant section of `.claude/wisp-rulecast.log` if a hook misfired.

For anything security-shaped, see [`SECURITY.md`](SECURITY.md) — please don't file a public issue.

## Submitting a pull request

1. Open an issue first if the change is non-trivial. A 50-line refactor doesn't need one; a new hook template or rule kind does.
2. Fork → branch → push → PR.
3. Keep commits focused. The repo uses [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
4. **Run `npm run verify` locally before pushing** — that's biome + tsc-strict + vitest + tsup. CI runs the same suite on Linux/macOS/Windows × Node 20/22.
5. Touch tests for every behavior change. Self-check (`wisp-rulecast verify`) must still pass.
6. Don't add dependencies casually. The runtime tree is five packages on purpose.

## Local development

```bash
npm install
npm run verify          # lint + typecheck + test + build
npm run test:watch      # iterate on a single module
npm run dev             # tsup watch build
```

If `npm ci` fails on a clean clone due to missing platform binaries (Biome / Rollup), delete `node_modules` + `package-lock.json` and re-run `npm install`. This is an npm optional-deps bug, not a project bug.

## Architecture pointers

- Parser lives in `src/parser/`. The classifier is pure regex — no LLM at compile time.
- Hook templates in `src/compiler/templates/`. Five kinds. Adding a sixth means: new template module, register in the registry, dispatcher check, and a self-check fixture.
- Runtime dispatcher is the string in `src/compiler/dispatcher-asset.ts`. It ships *as source* into the user's `.claude/wisp-rulecast/dispatch.mjs`.
- Idempotent settings merge lives in `src/compiler/settings-merger.ts`. The ownership rule is documented at the top.

## License

By submitting a PR you agree your contribution is MIT-licensed under the same terms as the rest of the project.
