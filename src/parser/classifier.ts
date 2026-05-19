// Classifier: turn a normalized rule sentence into either an EnforceableRule
// or a VagueRule. Deterministic, regex-driven, no LLM.

import { createHash } from "node:crypto";
import type { EnforceableRule, RuleKind, RuleParams, SourceRef, VagueRule } from "./types.js";

const PROHIBITION = /^(?:never|do not|must not|no)\b/;

const VAGUE_LEADERS = new Set([
  "prefer",
  "consider",
  "try",
  "should",
  "may",
  "might",
  "avoid",
  "be",
  "keep",
  "write",
]);

const BACKTICK = /`([^`]+)`/;
// A path-like token: glob, dotfile, absolute path, namespaced path,
// or a bare filename with a recognizable extension.
const PATH_LIKE =
  /(?:^|\s|`)(\*?\.[a-z][a-z0-9]{0,7}\b|\*\.[\w-]+|\/[\w./-]+|[\w-]+\/[\w./-]+|[\w-]+\.[a-z][a-z0-9]{1,7}\b)/i;

function ruleId(kind: RuleKind | "vague", source: SourceRef, text: string): string {
  const hash = createHash("sha1")
    .update(`${kind}|${source.file}|${source.line}|${text}`)
    .digest("hex");
  return `${kind}-${hash.slice(0, 8)}`;
}

function makeEnforceable(
  kind: RuleKind,
  source: SourceRef,
  rawText: string,
  normalizedText: string,
  params: RuleParams,
): EnforceableRule {
  return {
    status: "enforceable",
    id: ruleId(kind, source, rawText),
    kind,
    source,
    rawText,
    normalizedText,
    params,
  };
}

function makeVague(
  source: SourceRef,
  rawText: string,
  reason: string,
  suggestion?: string,
): VagueRule {
  return {
    status: "vague",
    id: ruleId("vague", source, rawText),
    source,
    rawText,
    reason,
    ...(suggestion ? { suggestion } : {}),
  };
}

function extractBacktick(text: string): string | null {
  const m = text.match(BACKTICK);
  return m?.[1] ? m[1] : null;
}

function extractPathLike(text: string): string | null {
  const m = text.match(PATH_LIKE);
  return m?.[1] ? m[1] : null;
}

function extractConcrete(text: string): string | null {
  return extractBacktick(text) ?? extractPathLike(text);
}

function tail(s: string): string {
  return s.replace(/[.!?]+$/, "").trim();
}

export function classify(
  rawText: string,
  normalizedText: string,
  source: SourceRef,
): EnforceableRule | VagueRule {
  const text = normalizedText;

  // ALWAYS save/write X (in|to|under) Y → allowlist
  const allowlist = text.match(
    /^always\s+(?:save|write|put|store|place)\s+.+?\s+(?:in|to|under|into)\s+(.+)$/,
  );
  if (allowlist?.[1]) {
    const tail1 = tail(allowlist[1]);
    const paths: string[] = [];
    const parts = tail1.split(/[,;]| or | and /);
    for (const part of parts) {
      const concrete = extractConcrete(part) ?? part.trim();
      const cleaned = concrete.replace(/^[`"]|[`"]$/g, "").trim();
      if (cleaned) paths.push(cleaned);
    }
    if (paths.length > 0) {
      return makeEnforceable("allowlist-paths", source, rawText, text, {
        kind: "allowlist-paths",
        allowedPaths: paths,
      });
    }
  }

  // ALWAYS X before Y
  const alwaysBefore = text.match(/^always\s+(.+?)\s+before\s+(.+)$/);
  if (alwaysBefore?.[1] && alwaysBefore[2]) {
    const pre = extractBacktick(alwaysBefore[1]) ?? tail(alwaysBefore[1]);
    const action = extractBacktick(alwaysBefore[2]) ?? tail(alwaysBefore[2]);
    return makeEnforceable("always-before", source, rawText, text, {
      kind: "always-before",
      precondition: pre,
      action,
    });
  }

  // Prohibition forms
  if (PROHIBITION.test(text)) {
    const body = text.replace(PROHIBITION, "").trim();

    const commitMatch = body.match(/^commit\s+(.+)$/);
    if (commitMatch?.[1]) {
      const concrete = extractConcrete(commitMatch[1]);
      if (concrete) {
        return makeEnforceable("never-commit", source, rawText, text, {
          kind: "never-commit",
          pattern: concrete,
        });
      }
      return makeVague(
        source,
        rawText,
        `'never commit' rule without a concrete pattern: "${tail(commitMatch[1])}"`,
        'Rephrase with a concrete pattern, e.g. "NEVER commit `.env`" or "NEVER commit `*.pem`".',
      );
    }

    const editMatch = body.match(/^(?:edit|write|modify|touch)\s+(?:files?\s+in\s+|the\s+)?(.+)$/);
    if (editMatch?.[1]) {
      const concrete = extractConcrete(editMatch[1]);
      if (concrete) {
        return makeEnforceable("never-edit-path", source, rawText, text, {
          kind: "never-edit-path",
          pathPattern: concrete,
        });
      }
      return makeVague(
        source,
        rawText,
        `'never edit' rule without a concrete path: "${tail(editMatch[1])}"`,
        'Rephrase with a concrete path, e.g. "NEVER edit files in `/vendor`" or "NEVER edit `*.lock`".',
      );
    }

    const runMatch = body.match(/^(?:run|use|execute|invoke|call)\s+(.+)$/);
    if (runMatch?.[1]) {
      const concrete = extractBacktick(runMatch[1]);
      if (concrete) {
        return makeEnforceable("never-run-cmd", source, rawText, text, {
          kind: "never-run-cmd",
          commandPattern: concrete,
        });
      }
      // Fall back: first word looks command-like
      const firstWord = tail(runMatch[1]).split(/\s+/)[0] ?? "";
      if (/^[a-z][\w-]{1,}$/i.test(firstWord)) {
        return makeEnforceable("never-run-cmd", source, rawText, text, {
          kind: "never-run-cmd",
          commandPattern: firstWord,
        });
      }
      return makeVague(
        source,
        rawText,
        `'never run' rule without a recognizable command: "${tail(runMatch[1])}"`,
        'Rephrase with a concrete command, e.g. "NEVER run `rm -rf`" or "NEVER use `git push --force`".',
      );
    }

    return makeVague(
      source,
      rawText,
      `prohibition without a recognized predicate (commit/edit/run): "${body}"`,
    );
  }

  const leader = text.split(/\s+/)[0] ?? "";
  if (VAGUE_LEADERS.has(leader)) {
    return makeVague(source, rawText, `qualitative rule starting with "${leader}"`);
  }

  return makeVague(source, rawText, "no rule shape detected");
}
