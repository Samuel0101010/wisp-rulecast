// Thin wrapper around remark-parse. Yields one TextNodeRef per *paragraph*.
// We serialize children ourselves so backticks around inline code survive —
// mdast-util-to-string strips them, and the classifier needs them as a
// "this is a concrete pattern" signal.

import type { Nodes, Paragraph, Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface TextNodeRef {
  text: string;
  line: number;
}

export function parseMarkdown(source: string): Root {
  return unified().use(remarkParse).parse(source) as Root;
}

function serializeInline(node: Nodes): string {
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode") return `\`${node.value}\``;
  if (node.type === "break") return "\n";
  if (node.type === "html") return node.value;
  if ("children" in node && Array.isArray(node.children)) {
    let out = "";
    for (const child of node.children) {
      out += serializeInline(child as Nodes);
    }
    return out;
  }
  return "";
}

export function collectRuleCandidates(root: Root): TextNodeRef[] {
  const out: TextNodeRef[] = [];

  visit(root, "paragraph", (node: Paragraph) => {
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
