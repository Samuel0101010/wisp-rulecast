// Top-level rule extraction pipeline:
//   markdown → AST → text candidates → normalize → classify → ParseResult.

import { readFileSync } from "node:fs";
import { classify } from "./classifier.js";
import { collectRuleCandidates, parseMarkdown } from "./markdown-ast.js";
import { normalize, stripListMarker } from "./normalizer.js";
import type { ParseResult, SourceRef } from "./types.js";

export interface ExtractOptions {
  /** Filename to record in source refs. Defaults to "CLAUDE.md". */
  file?: string;
}

export function extractRulesFromMarkdown(
  source: string,
  options: ExtractOptions = {},
): ParseResult {
  const file = options.file ?? "CLAUDE.md";
  const ast = parseMarkdown(source);
  const candidates = collectRuleCandidates(ast);

  const result: ParseResult = { enforceable: [], vague: [] };

  for (const candidate of candidates) {
    const raw = stripListMarker(candidate.text);
    if (!raw) continue;

    const normalized = normalize(raw);
    if (!normalized) continue;

    const source: SourceRef = { file, line: candidate.line };
    const rule = classify(raw, normalized, source);

    if (rule.status === "enforceable") {
      result.enforceable.push(rule);
    } else if (rule.reason !== "no rule shape detected") {
      // Only surface vague rules that *look* like attempted rules.
      // Pure prose paragraphs ("no rule shape detected") are dropped silently.
      result.vague.push(rule);
    }
  }

  return result;
}

export function extractRulesFromFile(path: string): ParseResult {
  const source = readFileSync(path, "utf8");
  return extractRulesFromMarkdown(source, { file: path });
}
