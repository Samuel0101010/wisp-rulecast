// wisp-rulecast CLI entry. Routes to per-command handlers.

import { auditCommand } from "./cli/audit-command.js";
import { compileCommand } from "./cli/compile-command.js";
import { installCommand } from "./cli/install-command.js";
import { resetCommand } from "./cli/reset-command.js";
import { verifyCommand } from "./cli/verify-command.js";

const VERSION = "0.1.0";

type Handler = (argv: string[], cwd: string) => number | Promise<number>;

const HANDLERS: Record<string, Handler> = {
  compile: compileCommand,
  audit: auditCommand,
  verify: verifyCommand,
  reset: resetCommand,
  install: installCommand,
};

function usage(): string {
  return [
    "wisp-rulecast — Compile your CLAUDE.md rules to real Claude Code hooks.",
    "",
    "Usage:",
    "  wisp-rulecast <command> [options]",
    "",
    "Commands:",
    "  compile [--dry-run] [--explain]   Parse CLAUDE.md and write hooks",
    "  audit   [--since 24h]             Show recent blocked violations",
    "  verify                            Self-check: dispatcher denies a synthetic violation per rule",
    "  install [--no-compile]            Install skill + slash command into the current project",
    "  reset                             Remove every wisp-rulecast hook from settings.json",
    "  --version | -v                    Print version",
    "  --help    | -h                    Print this help",
    "",
    "Examples:",
    "  wisp-rulecast compile",
    "  wisp-rulecast compile --dry-run --explain",
    "  wisp-rulecast audit --since 24h",
    "  wisp-rulecast verify",
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  const [, , cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const handler = HANDLERS[cmd];
  if (!handler) {
    process.stderr.write(`wisp-rulecast: unknown command '${cmd}'\n\n${usage()}\n`);
    return 1;
  }

  try {
    return await handler(rest, process.cwd());
  } catch (err) {
    process.stderr.write(`wisp-rulecast: ${(err as Error).message}\n`);
    return 1;
  }
}

main(process.argv).then((code) => process.exit(code));
