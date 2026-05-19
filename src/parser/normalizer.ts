// Text normalization helpers for rule extraction.
// We KEEP inline code (backticks) — they signal "this is a concrete pattern"
// and the classifier relies on them.

const ABBREV_MAP: Record<string, string> = {
  "don't": "do not",
  dont: "do not",
  "doesn't": "does not",
  "won't": "will not",
  "shouldn't": "should not",
  "musn't": "must not",
  "mustn't": "must not",
};

/** Strip bold/italic markers but KEEP backticks. */
export function stripEmphasis(input: string): string {
  return input
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(?<!\w)_([^_\s][^_]*)_(?!\w)/g, "$1");
}

/** Collapse whitespace to single spaces, trim ends. */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Lowercased, abbrev-expanded, emphasis-stripped, whitespace-collapsed. */
export function normalize(input: string): string {
  let text = collapseWhitespace(stripEmphasis(input)).toLowerCase();
  for (const [abbrev, expansion] of Object.entries(ABBREV_MAP)) {
    text = text.replace(new RegExp(`\\b${abbrev}\\b`, "g"), expansion);
  }
  return text;
}

/** Strip leading bullet markers, numbers, and quote indicators. */
export function stripListMarker(input: string): string {
  return input.replace(/^\s*(?:[-*+]|\d+\.|>)\s+/, "");
}
