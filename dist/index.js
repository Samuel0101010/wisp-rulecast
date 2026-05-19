#!/usr/bin/env node

// src/audit/logger.ts
import { existsSync, readFileSync } from "fs";
function readAuditLog(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
    }
  }
  return out;
}
function filterSince(entries, since) {
  const cutoff = since.getTime();
  return entries.filter((e) => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) && t >= cutoff;
  });
}

// src/audit/report.ts
function renderReport(entries, options = {}) {
  const examples = options.examplesPerRule ?? 3;
  if (entries.length === 0) {
    return "# wisp-rulecast audit\n\nNo blocked violations yet.\n";
  }
  const byRule = /* @__PURE__ */ new Map();
  for (const e of entries) {
    if (e.decision !== "deny") continue;
    const list = byRule.get(e.rule) ?? [];
    list.push(e);
    byRule.set(e.rule, list);
  }
  const sorted = [...byRule.entries()].sort((a, b) => b[1].length - a[1].length);
  const totalBlocks = entries.filter((e) => e.decision === "deny").length;
  const lines = [
    "# wisp-rulecast audit",
    "",
    `Total blocked violations: **${totalBlocks}** across **${sorted.length}** rule(s).`,
    ""
  ];
  for (const [ruleId2, list] of sorted) {
    const first = list[0];
    lines.push(`## ${ruleId2} \u2014 ${list.length} block(s)`);
    if (first?.reason) {
      lines.push("");
      lines.push(`> ${first.reason}`);
    }
    lines.push("");
    lines.push("Recent:");
    for (const e of list.slice(0, examples)) {
      const tool = e.tool ?? "?";
      const inputSummary = e.input ? JSON.stringify(e.input) : "{}";
      lines.push(`- \`${e.ts}\` ${tool} \`${inputSummary.slice(0, 120)}\``);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}
`;
}

// src/compiler/paths.ts
import { resolve } from "path";
function projectPaths(root) {
  const wispDir = resolve(root, ".claude", "wisp-rulecast");
  return {
    root,
    settings: resolve(root, ".claude", "settings.json"),
    claudeMd: resolve(root, "CLAUDE.md"),
    wispDir,
    rules: resolve(wispDir, "rules.json"),
    dispatcher: resolve(wispDir, "dispatch.mjs"),
    state: resolve(wispDir, "state.json"),
    log: resolve(root, ".claude", "wisp-rulecast.log")
  };
}

// src/cli/audit-command.ts
function parseSince(value) {
  if (!value) return null;
  const match = value.match(/^(\d+)\s*([hd])$/i);
  if (!match) return null;
  const n = Number.parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "h").toLowerCase();
  const ms = unit === "d" ? n * 864e5 : n * 36e5;
  return new Date(Date.now() - ms);
}
function auditCommand(argv, cwd) {
  const sinceIdx = argv.indexOf("--since");
  const sinceArg = sinceIdx >= 0 ? argv[sinceIdx + 1] : void 0;
  const since = parseSince(sinceArg);
  const paths = projectPaths(cwd);
  let entries = readAuditLog(paths.log);
  if (since) entries = filterSince(entries, since);
  const md = renderReport(entries);
  process.stdout.write(md);
  return 0;
}

// src/compiler/compile.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, writeFileSync as writeFileSync3 } from "fs";
import { dirname as dirname3 } from "path";

// src/parser/rule-extractor.ts
import { readFileSync as readFileSync2 } from "fs";

// src/parser/classifier.ts
import { createHash } from "crypto";
var PROHIBITION = /^(?:never|do not|must not|no)\b/;
var VAGUE_LEADERS = /* @__PURE__ */ new Set([
  "prefer",
  "consider",
  "try",
  "should",
  "may",
  "might",
  "avoid",
  "be",
  "keep",
  "write"
]);
var BACKTICK = /`([^`]+)`/;
var PATH_LIKE = /(?:^|\s|`)(\*?\.[a-z][a-z0-9]{0,7}\b|\*\.[\w-]+|\/[\w./-]+|[\w-]+\/[\w./-]+|[\w-]+\.[a-z][a-z0-9]{1,7}\b)/i;
function ruleId(kind, source, text) {
  const hash = createHash("sha1").update(`${kind}|${source.file}|${source.line}|${text}`).digest("hex");
  return `${kind}-${hash.slice(0, 8)}`;
}
function makeEnforceable(kind, source, rawText, normalizedText, params) {
  return {
    status: "enforceable",
    id: ruleId(kind, source, rawText),
    kind,
    source,
    rawText,
    normalizedText,
    params
  };
}
function makeVague(source, rawText, reason, suggestion) {
  return {
    status: "vague",
    id: ruleId("vague", source, rawText),
    source,
    rawText,
    reason,
    ...suggestion ? { suggestion } : {}
  };
}
function extractBacktick(text) {
  const m = text.match(BACKTICK);
  return m?.[1] ? m[1] : null;
}
function extractPathLike(text) {
  const m = text.match(PATH_LIKE);
  return m?.[1] ? m[1] : null;
}
function extractConcrete(text) {
  return extractBacktick(text) ?? extractPathLike(text);
}
function tail(s) {
  return s.replace(/[.!?]+$/, "").trim();
}
function classify(rawText, normalizedText, source) {
  const text = normalizedText;
  const allowlist = text.match(
    /^always\s+(?:save|write|put|store|place)\s+.+?\s+(?:in|to|under|into)\s+(.+)$/
  );
  if (allowlist?.[1]) {
    const tail1 = tail(allowlist[1]);
    const paths = [];
    const parts = tail1.split(/[,;]| or | and /);
    for (const part of parts) {
      const concrete = extractConcrete(part) ?? part.trim();
      const cleaned = concrete.replace(/^[`"]|[`"]$/g, "").trim();
      if (cleaned) paths.push(cleaned);
    }
    if (paths.length > 0) {
      return makeEnforceable("allowlist-paths", source, rawText, text, {
        kind: "allowlist-paths",
        allowedPaths: paths
      });
    }
  }
  const alwaysBefore = text.match(/^always\s+(.+?)\s+before\s+(.+)$/);
  if (alwaysBefore?.[1] && alwaysBefore[2]) {
    const pre = extractBacktick(alwaysBefore[1]) ?? tail(alwaysBefore[1]);
    const action = extractBacktick(alwaysBefore[2]) ?? tail(alwaysBefore[2]);
    return makeEnforceable("always-before", source, rawText, text, {
      kind: "always-before",
      precondition: pre,
      action
    });
  }
  if (PROHIBITION.test(text)) {
    const body = text.replace(PROHIBITION, "").trim();
    const commitMatch = body.match(/^commit\s+(.+)$/);
    if (commitMatch?.[1]) {
      const concrete = extractConcrete(commitMatch[1]);
      if (concrete) {
        return makeEnforceable("never-commit", source, rawText, text, {
          kind: "never-commit",
          pattern: concrete
        });
      }
      return makeVague(
        source,
        rawText,
        `'never commit' rule without a concrete pattern: "${tail(commitMatch[1])}"`,
        'Rephrase with a concrete pattern, e.g. "NEVER commit `.env`" or "NEVER commit `*.pem`".'
      );
    }
    const editMatch = body.match(/^(?:edit|write|modify|touch)\s+(?:files?\s+in\s+|the\s+)?(.+)$/);
    if (editMatch?.[1]) {
      const concrete = extractConcrete(editMatch[1]);
      if (concrete) {
        return makeEnforceable("never-edit-path", source, rawText, text, {
          kind: "never-edit-path",
          pathPattern: concrete
        });
      }
      return makeVague(
        source,
        rawText,
        `'never edit' rule without a concrete path: "${tail(editMatch[1])}"`,
        'Rephrase with a concrete path, e.g. "NEVER edit files in `/vendor`" or "NEVER edit `*.lock`".'
      );
    }
    const runMatch = body.match(/^(?:run|use|execute|invoke|call)\s+(.+)$/);
    if (runMatch?.[1]) {
      const concrete = extractBacktick(runMatch[1]);
      if (concrete) {
        return makeEnforceable("never-run-cmd", source, rawText, text, {
          kind: "never-run-cmd",
          commandPattern: concrete
        });
      }
      const firstWord = tail(runMatch[1]).split(/\s+/)[0] ?? "";
      if (/^[a-z][\w-]{1,}$/i.test(firstWord)) {
        return makeEnforceable("never-run-cmd", source, rawText, text, {
          kind: "never-run-cmd",
          commandPattern: firstWord
        });
      }
      return makeVague(
        source,
        rawText,
        `'never run' rule without a recognizable command: "${tail(runMatch[1])}"`,
        'Rephrase with a concrete command, e.g. "NEVER run `rm -rf`" or "NEVER use `git push --force`".'
      );
    }
    return makeVague(
      source,
      rawText,
      `prohibition without a recognized predicate (commit/edit/run): "${body}"`
    );
  }
  const leader = text.split(/\s+/)[0] ?? "";
  if (VAGUE_LEADERS.has(leader)) {
    return makeVague(source, rawText, `qualitative rule starting with "${leader}"`);
  }
  return makeVague(source, rawText, "no rule shape detected");
}

// src/parser/markdown-ast.ts
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
function parseMarkdown(source) {
  return unified().use(remarkParse).parse(source);
}
function serializeInline(node) {
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode") return `\`${node.value}\``;
  if (node.type === "break") return "\n";
  if (node.type === "html") return node.value;
  if ("children" in node && Array.isArray(node.children)) {
    let out = "";
    for (const child of node.children) {
      out += serializeInline(child);
    }
    return out;
  }
  return "";
}
function collectRuleCandidates(root) {
  const out = [];
  visit(root, "paragraph", (node) => {
    const line = node.position?.start.line ?? 0;
    const text = serializeInline(node).trim();
    if (!text) return;
    for (const part of text.split(/\n+/)) {
      const trimmed = part.trim();
      if (trimmed) out.push({ text: trimmed, line });
    }
  });
  return out;
}

// src/parser/normalizer.ts
var ABBREV_MAP = {
  "don't": "do not",
  dont: "do not",
  "doesn't": "does not",
  "won't": "will not",
  "shouldn't": "should not",
  "musn't": "must not",
  "mustn't": "must not"
};
function stripEmphasis(input) {
  return input.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/(?<!\w)_([^_\s][^_]*)_(?!\w)/g, "$1");
}
function collapseWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}
function normalize(input) {
  let text = collapseWhitespace(stripEmphasis(input)).toLowerCase();
  for (const [abbrev, expansion] of Object.entries(ABBREV_MAP)) {
    text = text.replace(new RegExp(`\\b${abbrev}\\b`, "g"), expansion);
  }
  return text;
}
function stripListMarker(input) {
  return input.replace(/^\s*(?:[-*+]|\d+\.|>)\s+/, "");
}

// src/parser/rule-extractor.ts
function extractRulesFromMarkdown(source, options = {}) {
  const file = options.file ?? "CLAUDE.md";
  const ast = parseMarkdown(source);
  const candidates = collectRuleCandidates(ast);
  const result = { enforceable: [], vague: [] };
  for (const candidate of candidates) {
    const raw = stripListMarker(candidate.text);
    if (!raw) continue;
    const normalized = normalize(raw);
    if (!normalized) continue;
    const source2 = { file, line: candidate.line };
    const rule = classify(raw, normalized, source2);
    if (rule.status === "enforceable") {
      result.enforceable.push(rule);
    } else if (rule.reason !== "no rule shape detected") {
      result.vague.push(rule);
    }
  }
  return result;
}
function extractRulesFromFile(path) {
  const source = readFileSync2(path, "utf8");
  return extractRulesFromMarkdown(source, { file: path });
}

// src/compiler/dispatcher-asset.ts
var DISPATCHER_SOURCE = `#!/usr/bin/env node
// Generated by wisp-rulecast. Do not edit by hand.
// Re-run \`wisp-rulecast compile\` to regenerate.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const wispDir = join(projectDir, ".claude", "wisp-rulecast");
const rulesPath = join(wispDir, "rules.json");
const statePath = join(wispDir, "state.json");
const logPath = join(projectDir, ".claude", "wisp-rulecast.log");

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readStdinSync() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function loadJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(p, value) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 2));
}

function audit(entry) {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify(entry) + "\\n");
  } catch {
    // logging must never fail the hook
  }
}

function allow() {
  process.exit(0);
}

function deny(rule, reason, toolName, toolInput) {
  const where = rule.source ? \`(\${rule.source.file}:\${rule.source.line})\` : "";
  const message = \`wisp-rulecast: \${reason} \${where}\`.trim();
  audit({
    ts: new Date().toISOString(),
    rule: rule.id,
    kind: rule.kind,
    tool: toolName,
    input: toolInput,
    decision: "deny",
    reason: message,
  });
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: message,
      },
    }) + "\\n",
  );
  process.exit(0);
}

function normalizePath(p) {
  if (!p) return "";
  const abs = isAbsolute(p) ? p : resolve(projectDir, p);
  return abs.split(sep).join("/");
}

function patternMatches(pattern, target) {
  if (!pattern || !target) return false;
  const t = target.toLowerCase();
  const p = pattern.toLowerCase();
  if (p.startsWith("*.")) {
    return t.endsWith(p.slice(1));
  }
  if (p.startsWith("*")) {
    return t.includes(p.slice(1));
  }
  return t.includes(p);
}

function pathInside(target, allowed) {
  const t = normalizePath(target).toLowerCase();
  const a = normalizePath(allowed).toLowerCase();
  return t === a || t.startsWith(a.endsWith("/") ? a : a + "/");
}

function commandMatches(commandLine, pattern) {
  if (!commandLine || !pattern) return false;
  const c = commandLine.toLowerCase();
  const p = pattern.toLowerCase();
  return c.includes(p);
}

function checkNeverCommit(rule, toolInput) {
  if ((toolInput.command || "").toLowerCase().includes("git commit") ||
      (toolInput.command || "").toLowerCase().includes("git add") ||
      (toolInput.command || "").toLowerCase().includes("git push") ||
      (toolInput.command || "").toLowerCase().includes("git stash")) {
    const cmd = String(toolInput.command || "");
    if (commandMatches(cmd, rule.params.pattern)) {
      return \`NEVER commit \${rule.params.pattern}\`;
    }
  }
  return null;
}

function checkNeverEditPath(rule, toolInput) {
  const fp = normalizePath(toolInput.file_path || "");
  const pattern = rule.params.pathPattern;
  if (patternMatches(pattern, fp) || pathInside(fp, pattern)) {
    return \`NEVER edit \${pattern}\`;
  }
  return null;
}

function checkNeverRunCmd(rule, toolInput) {
  const cmd = String(toolInput.command || "");
  if (commandMatches(cmd, rule.params.commandPattern)) {
    return \`NEVER run \${rule.params.commandPattern}\`;
  }
  return null;
}

function checkAllowlistPaths(rule, toolInput) {
  const fp = normalizePath(toolInput.file_path || "");
  if (!fp) return null;
  const ok = rule.params.allowedPaths.some((p) => pathInside(fp, p) || patternMatches(p, fp));
  if (!ok) {
    return \`ONLY write inside: \${rule.params.allowedPaths.join(", ")}\`;
  }
  return null;
}

function recordPrecondition(rule) {
  const state = loadJson(statePath, { markers: {} });
  state.markers = state.markers || {};
  state.markers[rule.id] = Date.now();
  saveJson(statePath, state);
}

function checkAlwaysBefore(rule, toolInput) {
  const cmd = String(toolInput.command || "").toLowerCase();
  if (!cmd.includes(rule.params.action.toLowerCase())) return null;
  const state = loadJson(statePath, { markers: {} });
  const ts = state.markers && state.markers[rule.id];
  if (!ts) {
    return \`ALWAYS \${rule.params.precondition} before \${rule.params.action} (marker not set this session)\`;
  }
  return null;
}

function main() {
  const ruleId = getArg("--rule");
  if (!ruleId) allow();

  const stdin = readStdinSync();
  let event;
  try {
    event = JSON.parse(stdin || "{}");
  } catch {
    allow();
    return;
  }

  const registry = loadJson(rulesPath, { rules: [] });
  const rule = (registry.rules || []).find((r) => r.id === ruleId);
  if (!rule) allow();

  const toolInput = event.tool_input || {};
  const toolName = event.tool_name || "";
  const eventName = event.hook_event_name || "";

  if (rule.kind === "always-before" && eventName === "PostToolUse") {
    const cmd = String(toolInput.command || "").toLowerCase();
    if (cmd.includes(rule.params.precondition.toLowerCase())) {
      recordPrecondition(rule);
    }
    allow();
    return;
  }

  let reason = null;
  switch (rule.kind) {
    case "never-commit":
      reason = checkNeverCommit(rule, toolInput);
      break;
    case "never-edit-path":
      reason = checkNeverEditPath(rule, toolInput);
      break;
    case "never-run-cmd":
      reason = checkNeverRunCmd(rule, toolInput);
      break;
    case "always-before":
      reason = checkAlwaysBefore(rule, toolInput);
      break;
    case "allowlist-paths":
      reason = checkAllowlistPaths(rule, toolInput);
      break;
  }

  if (reason) deny(rule, reason, toolName, toolInput);
  allow();
}

main();
`;

// src/compiler/types.ts
var DISPATCHER_PATH = "${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs";
var DEFAULT_TIMEOUT = 5;
function emptyCompiled() {
  return { PreToolUse: [], PostToolUse: [] };
}

// src/compiler/utils.ts
function dispatcherEntry(ruleId2, ifClause) {
  const entry = {
    type: "command",
    command: "node",
    args: [DISPATCHER_PATH, "--rule", ruleId2],
    timeout: DEFAULT_TIMEOUT
  };
  if (ifClause) entry.if = ifClause;
  return entry;
}
function bashIfClause(action) {
  const tokens = action.trim().replace(/^[`"']|[`"']$/g, "").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "Bash(*)";
  const head = tokens[0];
  if (tokens.length >= 2 && /^(git|npm|pnpm|yarn|docker|kubectl|gh|cargo)$/.test(head ?? "")) {
    return `Bash(${head} ${tokens[1]} *)`;
  }
  return `Bash(${head} *)`;
}

// src/compiler/templates/allowlist-paths.ts
function allowlistPathsTemplate(rule) {
  if (rule.params.kind !== "allowlist-paths") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Edit|Write|MultiEdit",
    hooks: [dispatcherEntry(rule.id)]
  });
  return out;
}

// src/compiler/templates/always-before.ts
function alwaysBeforeTemplate(rule) {
  if (rule.params.kind !== "always-before") return emptyCompiled();
  const out = emptyCompiled();
  const preIf = bashIfClause(rule.params.precondition);
  const actionIf = bashIfClause(rule.params.action);
  out.PostToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, preIf)]
  });
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, actionIf)]
  });
  return out;
}

// src/compiler/templates/never-commit.ts
var GIT_FILTER = "Bash(git commit *|git add *|git push *|git stash *|git stash push *)";
function neverCommitTemplate(rule) {
  if (rule.params.kind !== "never-commit") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, GIT_FILTER)]
  });
  return out;
}

// src/compiler/templates/never-edit-path.ts
function neverEditPathTemplate(rule) {
  if (rule.params.kind !== "never-edit-path") return emptyCompiled();
  const out = emptyCompiled();
  out.PreToolUse.push({
    matcher: "Edit|Write|MultiEdit",
    hooks: [dispatcherEntry(rule.id)]
  });
  return out;
}

// src/compiler/templates/never-run-cmd.ts
function neverRunCmdTemplate(rule) {
  if (rule.params.kind !== "never-run-cmd") return emptyCompiled();
  const out = emptyCompiled();
  const ifClause = bashIfClause(rule.params.commandPattern);
  out.PreToolUse.push({
    matcher: "Bash",
    hooks: [dispatcherEntry(rule.id, ifClause)]
  });
  return out;
}

// src/compiler/templates/index.ts
var TEMPLATES = {
  "never-commit": neverCommitTemplate,
  "never-edit-path": neverEditPathTemplate,
  "never-run-cmd": neverRunCmdTemplate,
  "always-before": alwaysBeforeTemplate,
  "allowlist-paths": allowlistPathsTemplate
};
function applyTemplate(rule) {
  const template = TEMPLATES[rule.kind];
  return template(rule);
}

// src/compiler/hook-builder.ts
function buildHooks(rules) {
  const out = emptyCompiled();
  for (const rule of rules) {
    const compiled = applyTemplate(rule);
    out.PreToolUse.push(...compiled.PreToolUse);
    out.PostToolUse.push(...compiled.PostToolUse);
  }
  return out;
}

// src/compiler/registry.ts
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
var REGISTRY_VERSION = 1;
function buildRegistry(rules) {
  return {
    version: REGISTRY_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    rules
  };
}
function writeRegistry(path, registry) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}
`, "utf8");
}

// src/compiler/settings-merger.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { dirname as dirname2 } from "path";

// src/compiler/settings-schema.ts
import { z } from "zod";
var HookEntrySchema = z.record(z.unknown());
var HookGroupSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(HookEntrySchema)
}).passthrough();
var HooksSectionSchema = z.object({
  PreToolUse: z.array(HookGroupSchema).optional(),
  PostToolUse: z.array(HookGroupSchema).optional()
}).passthrough();
var SettingsSchema = z.object({
  hooks: HooksSectionSchema.optional()
}).passthrough();

// src/compiler/settings-merger.ts
var DISPATCHER_MARKER = "wisp-rulecast/dispatch";
function isOurEntry(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry;
  if (e.type !== "command") return false;
  if (!Array.isArray(e.args)) return false;
  const first = e.args[0];
  return typeof first === "string" && first.includes(DISPATCHER_MARKER);
}
function isOurGroup(group) {
  if (!group || !Array.isArray(group.hooks) || group.hooks.length === 0) return false;
  return group.hooks.every(isOurEntry);
}
function readSettings(path) {
  if (!existsSync2(path)) return {};
  const raw = readFileSync3(path, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  return SettingsSchema.parse(parsed);
}
function writeSettings(path, settings) {
  mkdirSync2(dirname2(path), { recursive: true });
  writeFileSync2(path, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}
function mergeHooks(existing, compiled) {
  const next = { ...existing };
  const hooks = { ...next.hooks ?? {} };
  for (const event of ["PreToolUse", "PostToolUse"]) {
    const prev = hooks[event] ?? [];
    const userGroups = prev.filter((g) => !isOurGroup(g));
    const ourGroups = compiled[event];
    hooks[event] = [...userGroups, ...ourGroups];
  }
  next.hooks = hooks;
  return next;
}
function stripOurHooks(existing) {
  return mergeHooks(existing, { PreToolUse: [], PostToolUse: [] });
}

// src/compiler/compile.ts
function compile(options) {
  const paths = projectPaths(options.cwd);
  if (!existsSync3(paths.claudeMd)) {
    throw new Error(`CLAUDE.md not found at ${paths.claudeMd}`);
  }
  const parse = extractRulesFromFile(paths.claudeMd);
  const compiled = buildHooks(parse.enforceable);
  const existing = readSettings(paths.settings);
  const merged = mergeHooks(existing, compiled);
  const registry = buildRegistry(parse.enforceable);
  const summary = {
    paths,
    parse,
    hookCounts: {
      PreToolUse: compiled.PreToolUse.length,
      PostToolUse: compiled.PostToolUse.length
    },
    wroteSettings: false,
    wroteRegistry: false,
    wroteDispatcher: false
  };
  if (options.dryRun) return summary;
  mkdirSync3(paths.wispDir, { recursive: true });
  writeRegistry(paths.rules, registry);
  summary.wroteRegistry = true;
  mkdirSync3(dirname3(paths.dispatcher), { recursive: true });
  writeFileSync3(paths.dispatcher, DISPATCHER_SOURCE, "utf8");
  summary.wroteDispatcher = true;
  writeSettings(paths.settings, merged);
  summary.wroteSettings = true;
  return summary;
}

// src/cli/compile-command.ts
function compileCommand(argv, cwd) {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  try {
    const summary = compile({ cwd, dryRun });
    const verb = dryRun ? "Would write" : "Wrote";
    const lines = [
      `wisp-rulecast: parsed ${summary.parse.enforceable.length} enforceable + ${summary.parse.vague.length} vague rule(s) from CLAUDE.md`,
      `  ${verb} ${summary.hookCounts.PreToolUse} PreToolUse + ${summary.hookCounts.PostToolUse} PostToolUse hook(s)`
    ];
    if (!dryRun) {
      lines.push(`  settings:   ${summary.paths.settings}`);
      lines.push(`  rules:      ${summary.paths.rules}`);
      lines.push(`  dispatcher: ${summary.paths.dispatcher}`);
    }
    if (summary.parse.vague.length > 0) {
      lines.push("");
      lines.push(
        `  ${summary.parse.vague.length} rule(s) flagged as vague \u2014 re-run with --explain to see them.`
      );
    }
    if (argv.includes("--explain")) {
      lines.push("");
      lines.push("Vague rules:");
      for (const v of summary.parse.vague) {
        lines.push(`  - ${v.source.file}:${v.source.line}  "${v.rawText}"`);
        lines.push(`      ${v.reason}`);
        if (v.suggestion) lines.push(`      suggestion: ${v.suggestion}`);
      }
    }
    process.stdout.write(`${lines.join("\n")}
`);
    return 0;
  } catch (err) {
    process.stderr.write(`wisp-rulecast: compile failed: ${err.message}
`);
    return 1;
  }
}

// src/cli/install-command.ts
import { existsSync as existsSync4 } from "fs";

// src/install/install.ts
import { mkdirSync as mkdirSync4, writeFileSync as writeFileSync4 } from "fs";
import { dirname as dirname4, resolve as resolve2 } from "path";

// src/install/assets.ts
var SKILL_MD = `---
name: wisp-rulecast
description: Keep Claude Code hooks in sync with CLAUDE.md. Use after the user edits CLAUDE.md, when they add a NEVER/ALWAYS/DO NOT rule, or whenever they ask to "compile rules", "enforce CLAUDE.md", or "regenerate hooks". Re-runs \`wisp-rulecast compile\` so behavioral rules become mechanical PreToolUse hooks.
allowed-tools: Bash(npx wisp-rulecast:*), Read
---

# wisp-rulecast \u2014 auto-compile CLAUDE.md rules

Behavioral rules in CLAUDE.md ("NEVER commit \`.env\`") are advisory. wisp-rulecast turns them into actual Claude Code PreToolUse hooks so the next \`git add .env\` is blocked before it runs.

## When to invoke

- The user edited CLAUDE.md and added/changed a NEVER, ALWAYS, or DO NOT rule.
- The user asked to "compile the rules", "enforce CLAUDE.md", "regenerate hooks", or "lock in the rules".
- A new repository was just initialized with CLAUDE.md and no \`.claude/settings.json\` hooks yet.

## What to do

1. Run \`npx wisp-rulecast compile\`.
2. If output flags vague rules, surface them to the user with the suggestion.
3. Run \`npx wisp-rulecast verify\` to confirm the dispatcher denies a synthetic violation per rule.

Do **not** edit \`.claude/settings.json\` by hand for rules that came from CLAUDE.md \u2014 they will be overwritten on the next compile.

## Auditing

- \`npx wisp-rulecast audit\` shows recent blocked violations as markdown.
- \`npx wisp-rulecast reset\` removes every wisp-rulecast hook without touching user hooks.
`;
var COMMAND_MD = `---
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
- \`--dry-run\` \u2014 compute everything, write nothing
- \`--explain\` \u2014 print details on vague rules

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

// src/install/install.ts
function install(cwd) {
  const skill = resolve2(cwd, ".claude", "skills", "wisp-rulecast", "SKILL.md");
  const command = resolve2(cwd, ".claude", "commands", "wisp-rulecast.md");
  mkdirSync4(dirname4(skill), { recursive: true });
  writeFileSync4(skill, SKILL_MD, "utf8");
  mkdirSync4(dirname4(command), { recursive: true });
  writeFileSync4(command, COMMAND_MD, "utf8");
  return { skill, command };
}

// src/cli/install-command.ts
function installCommand(argv, cwd) {
  const result = install(cwd);
  const lines = [
    "wisp-rulecast: installed skill + slash command",
    `  ${result.skill}`,
    `  ${result.command}`
  ];
  const paths = projectPaths(cwd);
  if (existsSync4(paths.claudeMd) && !argv.includes("--no-compile")) {
    try {
      const summary = compile({ cwd });
      lines.push("");
      lines.push(
        `Compiled ${summary.parse.enforceable.length} rule(s) \u2192 ${summary.hookCounts.PreToolUse} PreToolUse + ${summary.hookCounts.PostToolUse} PostToolUse hook(s).`
      );
    } catch (err) {
      lines.push("");
      lines.push(`(compile skipped: ${err.message})`);
    }
  } else if (!existsSync4(paths.claudeMd)) {
    lines.push("");
    lines.push("No CLAUDE.md found yet \u2014 run `wisp-rulecast compile` once you add one.");
  }
  process.stdout.write(`${lines.join("\n")}
`);
  return 0;
}

// src/cli/reset-command.ts
function resetCommand(_argv, cwd) {
  const paths = projectPaths(cwd);
  const before = readSettings(paths.settings);
  const after = stripOurHooks(before);
  writeSettings(paths.settings, after);
  process.stdout.write(`wisp-rulecast: removed our hooks from ${paths.settings}
`);
  return 0;
}

// src/cli/verify-command.ts
import { existsSync as existsSync5, readFileSync as readFileSync4 } from "fs";

// src/verify/self-check.ts
import { spawnSync } from "child_process";
function syntheticEvent(rule) {
  switch (rule.params.kind) {
    case "never-commit":
      return {
        tool_name: "Bash",
        tool_input: { command: `git add ${rule.params.pattern}` },
        hook_event_name: "PreToolUse"
      };
    case "never-edit-path": {
      const p = rule.params.pathPattern;
      const filePath = p.startsWith("/") ? `${p}/example.txt` : `/tmp/${p}`;
      return {
        tool_name: "Edit",
        tool_input: { file_path: filePath, old_string: "x", new_string: "y" },
        hook_event_name: "PreToolUse"
      };
    }
    case "never-run-cmd":
      return {
        tool_name: "Bash",
        tool_input: { command: `${rule.params.commandPattern} something` },
        hook_event_name: "PreToolUse"
      };
    case "always-before":
      return {
        tool_name: "Bash",
        tool_input: { command: rule.params.action },
        hook_event_name: "PreToolUse"
      };
    case "allowlist-paths":
      return {
        tool_name: "Write",
        tool_input: {
          file_path: "/this/path/is/not/in/the/allowlist/file.txt",
          content: "hello"
        },
        hook_event_name: "PreToolUse"
      };
  }
}
function runDispatcher(rule, opts) {
  const event = syntheticEvent(rule);
  const proc = spawnSync(process.execPath, [opts.dispatcherPath, "--rule", rule.id], {
    input: JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: opts.projectDir },
    timeout: 1e4
  });
  const stdout = proc.stdout ?? "";
  const stderr = proc.stderr ?? "";
  if (proc.status !== 0 && proc.status !== null) {
    return {
      rule,
      passed: false,
      decision: "error",
      reason: `dispatcher exited with code ${proc.status}: ${stderr.trim() || stdout.trim()}`,
      stdout,
      stderr
    };
  }
  const denied = stdout.includes('"permissionDecision":"deny"');
  return {
    rule,
    passed: denied,
    decision: denied ? "deny" : "allow",
    reason: denied ? "violation correctly blocked" : "dispatcher did not deny a synthetic violation",
    stdout,
    stderr
  };
}
function runSelfCheck(rules, opts) {
  const results = rules.map((r) => runDispatcher(r, opts));
  return {
    results,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length
  };
}

// src/cli/verify-command.ts
function verifyCommand(_argv, cwd) {
  const paths = projectPaths(cwd);
  if (!existsSync5(paths.rules) || !existsSync5(paths.dispatcher)) {
    process.stderr.write(
      "wisp-rulecast: no compiled output found \u2014 run `wisp-rulecast compile` first.\n"
    );
    return 1;
  }
  const registry = JSON.parse(readFileSync4(paths.rules, "utf8"));
  if (!registry.rules || registry.rules.length === 0) {
    process.stdout.write("wisp-rulecast: no enforceable rules to verify.\n");
    return 0;
  }
  const summary = runSelfCheck(registry.rules, {
    dispatcherPath: paths.dispatcher,
    projectDir: cwd
  });
  const lines = [
    `wisp-rulecast verify: ${summary.passed}/${summary.results.length} rule(s) fire correctly.`
  ];
  for (const r of summary.results) {
    const tick = r.passed ? "\u2713" : "\u2717";
    lines.push(`  ${tick} ${r.rule.id}  ${r.rule.kind}  \u2014 ${r.reason}`);
  }
  process.stdout.write(`${lines.join("\n")}
`);
  return summary.failed === 0 ? 0 : 1;
}

// src/index.ts
var VERSION = "0.1.0";
var HANDLERS = {
  compile: compileCommand,
  audit: auditCommand,
  verify: verifyCommand,
  reset: resetCommand,
  install: installCommand
};
function usage() {
  return [
    "wisp-rulecast \u2014 Compile your CLAUDE.md rules to real Claude Code hooks.",
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
    "  wisp-rulecast verify"
  ].join("\n");
}
async function main(argv) {
  const [, , cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(`${usage()}
`);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    process.stdout.write(`${VERSION}
`);
    return 0;
  }
  const handler = HANDLERS[cmd];
  if (!handler) {
    process.stderr.write(`wisp-rulecast: unknown command '${cmd}'

${usage()}
`);
    return 1;
  }
  try {
    return await handler(rest, process.cwd());
  } catch (err) {
    process.stderr.write(`wisp-rulecast: ${err.message}
`);
    return 1;
  }
}
main(process.argv).then((code) => process.exit(code));
//# sourceMappingURL=index.js.map