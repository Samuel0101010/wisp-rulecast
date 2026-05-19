# wisp-rulecast — Make Your CLAUDE.md Rules Mechanical

> **This file is the internal build roadmap, kept in the repo on purpose.** User-facing docs live in [`README.md`](./README.md) and [`docs/`](./docs/). German prose and "Phase X" tracking below are intentional — they're the working notes for the author, not setup instructions for visitors.

> *"Your CLAUDE.md is rules. This compiles them to actual hooks that stop Claude before it breaks them."*

**Status:** PRIORITY #2 — BUILD SECOND. Größtes realistisches Star-Pool der V2-Liste (12–20k), Effort 5/10. Karpathy-CLAUDE.md-Adjacency (110k★ Pattern).

---

## Mission

Behavioral guidance (markdown rules) ≠ mechanical enforcement. CLAUDE.md sagt "NEVER commit secrets", Claude liest es, ignoriert es in 30% der Fälle (GitHub Issues #19635, #7777, #50235). Lösung: **wisp-rulecast parsed CLAUDE.md, extrahiert NEVER/ALWAYS-Regeln, kompiliert sie zu echten PreToolUse-Hooks in `.claude/settings.json`.** Schwammige Regeln werden geflaggt mit Vorschlägen zur Umformulierung. Audit-Log zeigt blockierte Verstöße.

**Target Stars:** 12–20k. **Effort:** 5/10. **Launch-Window:** 5–8 Wochen.

---

## Was wird gebaut (mechanisch konkret)

1. **Parser:** Liest `CLAUDE.md` (+ `~/.claude/CLAUDE.md` für global), extrahiert Regeln in 2 Klassen:
   - **Enforceable:** "NEVER commit X", "ALWAYS run Y before Z", "DO NOT edit files in /path"
   - **Vague:** "be cautious", "prefer clean code" → in separate Liste mit Vorschlag zur Umformulierung
2. **Compiler:** Mapped Regel-Pattern auf Hook-Template:
   - `NEVER commit <pattern>` → PreToolUse-Hook auf Bash matching `git commit|git add` der nach pattern in staged files sucht
   - `NEVER edit <path>` → PreToolUse-Hook auf Edit/Write/MultiEdit mit Path-Check
   - `ALWAYS <cmd> before <action>` → Composite-Hook der lookback-marker prüft
   - `NEVER run <cmd>` → Bash-PreToolUse mit regex-Match
3. **Settings-Merger:** Liest existierende `.claude/settings.json`, merged neue Hooks unter `wisp-rulecast`-Namespace ohne user-config zu zerstören. Idempotent.
4. **Audit-Log:** Pro Block-Event: timestamp, rule-text, tool-call-input, agent-context → in `.claude/wisp-rulecast.log`. Optional Statusline-Counter "saved 3 violations heute".
5. **`/wisp-rulecast compile` Slash-Command** — manuell triggert Recompile.
6. **Skill auto-trigger** bei CLAUDE.md-Edits oder `claude` Session-Start.

**Differentiator:** claude-md-management auditiert manuell. feiskyer reflection schlägt Rule-Improvements vor. **Niemand kompiliert die Regeln zu Hooks.** Anthropic-Docs sagen "you should use hooks for this", der Bridge fehlt.

---

## Tech-Stack & Dependencies

- **Sprache:** TypeScript (Node 20+)
- **Build:** tsup → Single-File CLI
- **Parser:** remark + remark-parse für robusten Markdown-AST
- **Schema:** Zod für settings.json-Validation
- **Tests:** vitest mit fixture-CLAUDE.mds
- **Lint:** biome
- **Distribution:** npm + `npx wisp-rulecast install`

---

## Projektstruktur

```
wisp-rulecast/
├── CLAUDE.md                       ← du liest sie gerade
├── README.md                       ← Hero-GIF + Quickstart (vor Launch)
├── LICENSE                         ← MIT
├── package.json
├── tsup.config.ts
├── biome.json
├── vitest.config.ts
├── .gitignore
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── release.yml
├── .claude/
│   ├── skills/
│   │   └── wisp-rulecast/
│   │       └── SKILL.md             ← auto-trigger on CLAUDE.md edit
│   └── commands/
│       └── wisp-rulecast.md              ← /wisp-rulecast [compile|audit|reset]
├── src/
│   ├── index.ts                     ← CLI entry
│   ├── install.ts                   ← npx wisp-rulecast install
│   ├── parser/
│   │   ├── markdown-ast.ts          ← remark wrapper
│   │   ├── rule-extractor.ts        ← NEVER/ALWAYS/DO-NOT patterns
│   │   ├── classifier.ts            ← enforceable vs vague
│   │   └── normalizer.ts            ← lower-case, expand abbreviations
│   ├── compiler/
│   │   ├── templates/
│   │   │   ├── never-commit.ts      ← git-bash-blocker
│   │   │   ├── never-edit-path.ts   ← Edit/Write path-checker
│   │   │   ├── never-run-cmd.ts     ← Bash regex blocker
│   │   │   ├── always-before.ts     ← lookback-marker composite
│   │   │   └── allowlist-paths.ts
│   │   ├── hook-builder.ts          ← assembles JSON from templates
│   │   └── settings-merger.ts       ← idempotent merge
│   ├── audit/
│   │   ├── logger.ts                 ← .claude/wisp-rulecast.log
│   │   ├── statusline.ts             ← optional integration
│   │   └── report.ts                 ← `/wisp-rulecast audit` → markdown summary
│   └── verify/
│       └── self-check.ts             ← Dry-run: simulate block, confirm hook fires
├── fixtures/
│   ├── valid/                        ← sample CLAUDE.md → expected hooks
│   ├── vague/                        ← sample → only flag, no compile
│   └── edge-cases/
├── tests/
│   ├── parser.test.ts
│   ├── compiler.test.ts
│   ├── merger.test.ts
│   └── e2e.test.ts                   ← Full CLAUDE.md → settings.json roundtrip
├── scripts/
│   ├── install.sh
│   └── demo.tape
└── docs/
    ├── demo.gif
    ├── rule-grammar.md               ← welche Patterns werden erkannt
    ├── hook-templates.md             ← welche Hooks generiert werden
    └── launch-checklist.md
```

---

## GitHub Workflow (privat → public bei Launch)

### Initial Setup (einmalig)

```bash
gh repo create wisp-rulecast --private --source=. --remote=origin --description="Compile your CLAUDE.md rules to real Claude Code hooks"
git add .
git commit -m "chore: initial scaffolding"
git push -u origin main
gh release create v0.1.0 --prerelease --title "v0.1.0 — scaffolding"
```

### Pro Task

```bash
git add .
git commit -m "<type>(<scope>): <message>"
git push
# nur bei Phasen-Abschluss:
gh release create v0.X.0 --prerelease --notes "Phase X complete: <summary>"
```

### Launch

```bash
gh repo edit --visibility public
gh release create v1.0.0 --notes-file docs/launch-checklist.md
```

Repo bleibt privat bis polish-ready. Keine soft-launches.

---

## Build-Roadmap

### Phase 0 — Pre-Flight
- [ ] Lies Anthropic-Docs zu Hooks (https://code.claude.com/docs/en/hooks)
- [ ] Lies feiskyer reflection-Pattern (welche Rule-Patterns sind häufig?)
- [ ] Lies GitHub Issues #19635, #7777, #50235 für Rule-Beispiele aus der Wildbahn
- [ ] Lies karanb192/claude-code-hooks für PreToolUse-Hook-Patterns
- [ ] Sammle 10 reale CLAUDE.md-Beispiele aus Open-Source-Repos für fixtures/

### Phase 1 — Setup
- [ ] `gh repo create wisp-rulecast --private`
- [ ] `npm init`, tsconfig strict, tsup + vitest + biome + remark + zod
- [ ] `.github/workflows/{test,release}.yml`
- [ ] README skeleton mit Tagline
- [ ] `v0.1.0 --prerelease`

### Phase 2 — Parser
- [ ] `src/parser/markdown-ast.ts` — remark wrapper, extract list-items + headings
- [ ] `src/parser/rule-extractor.ts` — Regex/pattern-detection for NEVER/ALWAYS/DO-NOT
- [ ] `src/parser/classifier.ts` — enforceable vs vague heuristic
- [ ] `src/parser/normalizer.ts` — case, abbrev
- [ ] Tests mit fixtures/valid/ und fixtures/vague/
- [ ] `v0.2.0 --prerelease`

### Phase 3 — Hook-Templates
- [ ] `templates/never-commit.ts` — generiert PreToolUse-Hook für Bash mit `git commit|git add` matching pattern
- [ ] `templates/never-edit-path.ts` — Edit/Write/MultiEdit path checker
- [ ] `templates/never-run-cmd.ts` — Bash regex blocker
- [ ] `templates/always-before.ts` — composite: store marker in `.claude/wisp-rulecast-state.json` after action X, check before action Y
- [ ] `templates/allowlist-paths.ts` — invert: only allow X paths
- [ ] Tests pro Template
- [ ] `v0.3.0 --prerelease`

### Phase 4 — Compiler + Merger
- [ ] `src/compiler/hook-builder.ts` — Rule → Hook-JSON
- [ ] `src/compiler/settings-merger.ts` — idempotent merge, preserve user hooks under non-wisp-rulecast namespace
- [ ] Edge-Cases: existing wisp-rulecast-Hooks updaten ohne duplicates
- [ ] Zod-Schema-Validation für settings.json
- [ ] Tests inkl. E2E roundtrip
- [ ] `v0.4.0 --prerelease`

### Phase 5 — Audit-Log + Self-Check
- [ ] `src/audit/logger.ts` — appends to `.claude/wisp-rulecast.log` (JSON-lines)
- [ ] `src/audit/report.ts` — `/wisp-rulecast audit` → markdown summary
- [ ] `src/verify/self-check.ts` — Dry-run: für jede Rule, simuliere blockierenden Tool-Call, confirm Hook würde matchen
- [ ] Tests
- [ ] `v0.5.0 --prerelease`

### Phase 6 — Skill + Slash-Command + Install
- [ ] `.claude/skills/wisp-rulecast/SKILL.md` — auto-trigger on CLAUDE.md edit oder `claude` startup
- [ ] `.claude/commands/wisp-rulecast.md` — `/wisp-rulecast [compile|audit|reset]`
- [ ] `src/install.ts` — `npx wisp-rulecast install` → kopiert skill+command
- [ ] Smoke-Test mit echtem Claude-Code-Workflow
- [ ] `v0.6.0 --prerelease`

### Phase 7 — Demo + Polish
- [ ] `scripts/demo.tape` — vhs-Skript:
   1. Open CLAUDE.md with "NEVER commit .env"
   2. Run `/wisp-rulecast compile`
   3. Show generated .claude/settings.json
   4. Try `git add .env` → blocked, audit log update
- [ ] `docs/demo.gif` (autoplay, <5MB)
- [ ] `docs/rule-grammar.md` + `docs/hook-templates.md`
- [ ] README mit Hero-GIF + Karpathy-Adjacency-Quote
- [ ] Twitter-Thread Draft + HN-Post-Draft
- [ ] `v0.9.0 --prerelease`

### Phase 8 — Launch
- [ ] Cross-Platform-Test (Windows/Mac/Linux paths!)
- [ ] `npm publish`
- [ ] `gh repo edit --visibility public`
- [ ] `gh release create v1.0.0`
- [ ] HN Show-Post: "Show HN: Compile your CLAUDE.md rules to real Claude Code hooks"
- [ ] Twitter-Thread mit GIF, tag Karpathy
- [ ] Submit zu awesome-claude-code-toolkit + claudepluginhub
- [ ] Skill-Marketplace-Submission

---

## Quality Gates

- [ ] biome lint clean vor jedem Push
- [ ] vitest grün vor jedem Push (incl. e2e roundtrip)
- [ ] tsup build OK
- [ ] Self-Check (`wisp-rulecast verify`) muss für alle fixtures funktionieren
- [ ] Cross-Platform path handling getestet (Windows backslash!)

---

## Launch-Strategie

**HN-Titel:** "Show HN: Compile your CLAUDE.md rules to real Claude Code hooks"

**Twitter-Hook:** "CLAUDE.md is suggestions. Claude ignores them ~30% of the time. So I built a compiler that turns 'NEVER commit secrets' into an actual hook that blocks `git commit`. See it in action ↓"

**Demo-GIF (30s):**
1. 0–3s: CLAUDE.md mit 5 NEVER/ALWAYS Rules
2. 3–7s: `npx wisp-rulecast compile`
3. 7–12s: Generated .claude/settings.json mit 5 Hooks
4. 12–20s: User versucht `git add .env` → BLOCKED in red, audit log poppt
5. 20–28s: Statusline-Counter "saved 3 violations heute"
6. 28–30s: Logo + Install-Command

**Karpathy-Adjacency-Move:** README explizit referenzieren: *"Inspired by @karpathy's CLAUDE.md — but makes the rules actually enforced."* + Tag im Twitter-Launch.

---

## References

- **Anthropic Hooks Docs** (https://code.claude.com/docs/en/hooks) — PreToolUse Spec
- **karanb192/claude-code-hooks** — Hook-Patterns aus der Wildbahn
- **feiskyer/claude-code-settings** — "reflection" Pattern, anschauen für Description-Triggers
- **claude-md-management** Skill — manueller Counterpart
- **GitHub Issues #19635, #7777, #50235** — Pain-Belege
- **karpathy-claude-md** (https://github.com/karpathy/llm-prompt-templates) — Adjacency

---

## First-Session-Quickstart

In diesem Ordner Claude Code starten:

1. **Sage:** "Start Phase 0" oder "Start mit dem nächsten Task"
2. Claude liest Roadmap, beginnt mit erstem unabgehakten Item.
3. **Pro Task:**
   - Code committen (conventional commits)
   - `git push`
   - Phasen-Abschluss: `gh release create v0.X.0 --prerelease`
   - Checkbox `- [ ]` → `- [x]`
4. Quality Gates vor jedem Commit.

**Ruflo-Pattern-Recall:**
```
mcp__ruflo__agentdb_pattern-search { query: "wisp-rulecast CLAUDE.md hooks compile" }
mcp__ruflo__memory_search { query: "wisp-rulecast github idea mechanical enforcement", namespace: "ideas" }
```

---

## Anti-Patterns

- ❌ Repo public vor v1.0.0
- ❌ Try to handle "vague" rules automatically — nur flag, nicht compile
- ❌ Hooks die mehr als 50ms blockieren — UX-killer
- ❌ Settings-File überschreiben statt mergen — User-Daten verlieren = 1-Star-Review
- ❌ Plattform-spezifische Bash-Hooks (auf Windows muss PowerShell parallel laufen)
- ❌ Mehr Templates vor v1.0.0 als sauber getested werden können — Quality > Quantity

---

## Status-Tracking

**Aktuelle Phase:** 8 abgeschlossen + Plugin-Distribution live.
**Distribution:** Claude Code Plugin (`.claude-plugin/`), nicht npm. Installation via `/plugin marketplace add Samuel0101010/wisp-rulecast` + `/plugin install wisp-rulecast@wisp`. End-to-end im Plugin-Cache sandbox verifiziert (9/9 rules deny, bin auf PATH, dispatcher liefert exit-0 + JSON-deny payload).
**Nächste mögliche Schritte:** vhs-demo-GIF (`scripts/demo.tape` existiert), Submission an `claude-plugins-community` marketplace, evtl. v0.2 Features (hooks/hooks.json auto-trigger, weitere rule-kinds wie `MAX FILE SIZE`).
**Blocker:** keine.
**Letzter Release-Tag:** v0.1.0 (2026-05-19) — GitHub Release vorhanden, npm-publish bewusst nicht passiert (Account-Policy + Plugin-Pfad reicht).
