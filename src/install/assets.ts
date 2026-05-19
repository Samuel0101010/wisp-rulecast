// Skill and slash-command assets, embedded as strings so a single tsup bundle
// can install them without depending on an external `assets/` directory.

export const SKILL_MD = `---
name: wisp-rulecast
description: Keep Claude Code hooks in sync with CLAUDE.md. Use after the user edits CLAUDE.md, when they add a NEVER/ALWAYS/DO NOT rule, or whenever they ask to "compile rules", "enforce CLAUDE.md", or "regenerate hooks". Re-runs \`wisp-rulecast compile\` so behavioral rules become mechanical PreToolUse hooks.
allowed-tools: Bash(npx wisp-rulecast:*), Read
---

# wisp-rulecast — auto-compile CLAUDE.md rules

Behavioral rules in CLAUDE.md ("NEVER commit \`.env\`") are advisory. wisp-rulecast turns them into actual Claude Code PreToolUse hooks so the next \`git add .env\` is blocked before it runs.

## When to invoke

- The user edited CLAUDE.md and added/changed a NEVER, ALWAYS, or DO NOT rule.
- The user asked to "compile the rules", "enforce CLAUDE.md", "regenerate hooks", or "lock in the rules".
- A new repository was just initialized with CLAUDE.md and no \`.claude/settings.json\` hooks yet.

## What to do

1. Run \`npx wisp-rulecast compile\`.
2. If output flags vague rules, surface them to the user with the suggestion.
3. Run \`npx wisp-rulecast verify\` to confirm the dispatcher denies a synthetic violation per rule.

Do **not** edit \`.claude/settings.json\` by hand for rules that came from CLAUDE.md — they will be overwritten on the next compile.

## Auditing

- \`npx wisp-rulecast audit\` shows recent blocked violations as markdown.
- \`npx wisp-rulecast reset\` removes every wisp-rulecast hook without touching user hooks.
`;

export const COMMAND_MD = `---
description: Compile CLAUDE.md rules to Claude Code hooks (compile | audit | verify | reset).
argument-hint: [compile|audit|verify|reset] [--dry-run] [--explain] [--since 24h]
---

Run the wisp-rulecast CLI in the current project.

## Subcommand: compile (default)

\`\`\`bash
npx wisp-rulecast compile $ARGUMENTS
\`\`\`

Reads \`CLAUDE.md\`, extracts NEVER/ALWAYS/DO-NOT rules, writes:
- \`.claude/settings.json\` (PreToolUse hooks merged in)
- \`.claude/wisp-rulecast/rules.json\` (rule registry)
- \`.claude/wisp-rulecast/dispatch.mjs\` (runtime dispatcher)

Flags:
- \`--dry-run\` — compute everything, write nothing
- \`--explain\` — print details on vague rules

## Subcommand: audit

\`\`\`bash
npx wisp-rulecast audit $ARGUMENTS
\`\`\`

Renders the runtime log (\`.claude/wisp-rulecast.log\`) as a markdown summary. Pass \`--since 24h\` or \`--since 7d\` to filter.

## Subcommand: verify

\`\`\`bash
npx wisp-rulecast verify
\`\`\`

For each compiled rule, spawns the dispatcher with a synthetic violating input and asserts it denies.

## Subcommand: reset

\`\`\`bash
npx wisp-rulecast reset
\`\`\`

Removes every wisp-rulecast hook from \`.claude/settings.json\`. User hooks are preserved.
`;
