// Shared types for the rule parser.
// A rule is either enforceable (we can generate a hook) or vague (we only flag it).

export type RuleKind =
  | "never-commit"
  | "never-edit-path"
  | "never-run-cmd"
  | "always-before"
  | "allowlist-paths";

export interface SourceRef {
  file: string;
  line: number;
}

export type RuleParams =
  | { kind: "never-commit"; pattern: string }
  | { kind: "never-edit-path"; pathPattern: string }
  | { kind: "never-run-cmd"; commandPattern: string }
  | { kind: "always-before"; precondition: string; action: string }
  | { kind: "allowlist-paths"; allowedPaths: string[] };

export interface EnforceableRule {
  status: "enforceable";
  id: string;
  kind: RuleKind;
  source: SourceRef;
  rawText: string;
  normalizedText: string;
  params: RuleParams;
}

export interface VagueRule {
  status: "vague";
  id: string;
  source: SourceRef;
  rawText: string;
  reason: string;
  suggestion?: string;
}

export type Rule = EnforceableRule | VagueRule;

export interface ParseResult {
  enforceable: EnforceableRule[];
  vague: VagueRule[];
}
