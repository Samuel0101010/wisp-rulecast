// Orchestrator for `wisp-rulecast compile`:
//   read CLAUDE.md → parse → build hooks → merge into settings.json →
//   write rules.json + dispatcher → return a summary.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type ParseResult, extractRulesFromFile } from "../parser/index.js";
import { DISPATCHER_SOURCE } from "./dispatcher-asset.js";
import { buildHooks } from "./hook-builder.js";
import { type ProjectPaths, projectPaths } from "./paths.js";
import { buildRegistry, writeRegistry } from "./registry.js";
import { mergeHooks, readSettings, writeSettings } from "./settings-merger.js";

export interface CompileSummary {
  paths: ProjectPaths;
  parse: ParseResult;
  hookCounts: { PreToolUse: number; PostToolUse: number };
  wroteSettings: boolean;
  wroteRegistry: boolean;
  wroteDispatcher: boolean;
}

export interface CompileOptions {
  /** Project root containing CLAUDE.md and .claude/. */
  cwd: string;
  /** If true, computes everything but writes nothing. */
  dryRun?: boolean;
}

export function compile(options: CompileOptions): CompileSummary {
  const paths = projectPaths(options.cwd);

  if (!existsSync(paths.claudeMd)) {
    throw new Error(`CLAUDE.md not found at ${paths.claudeMd}`);
  }

  const parse = extractRulesFromFile(paths.claudeMd);
  const compiled = buildHooks(parse.enforceable);
  const existing = readSettings(paths.settings);
  const merged = mergeHooks(existing, compiled);
  const registry = buildRegistry(parse.enforceable);

  const summary: CompileSummary = {
    paths,
    parse,
    hookCounts: {
      PreToolUse: compiled.PreToolUse.length,
      PostToolUse: compiled.PostToolUse.length,
    },
    wroteSettings: false,
    wroteRegistry: false,
    wroteDispatcher: false,
  };

  if (options.dryRun) return summary;

  mkdirSync(paths.wispDir, { recursive: true });
  writeRegistry(paths.rules, registry);
  summary.wroteRegistry = true;

  mkdirSync(dirname(paths.dispatcher), { recursive: true });
  writeFileSync(paths.dispatcher, DISPATCHER_SOURCE, "utf8");
  summary.wroteDispatcher = true;

  writeSettings(paths.settings, merged);
  summary.wroteSettings = true;

  return summary;
}
