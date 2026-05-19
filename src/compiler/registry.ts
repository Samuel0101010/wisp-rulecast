// Rule registry: the source of truth the runtime dispatcher reads.
// Lives at .claude/wisp-rulecast/rules.json.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EnforceableRule } from "../parser/types.js";

export const REGISTRY_VERSION = 1;

export interface RegistryFile {
  version: number;
  generatedAt: string;
  rules: EnforceableRule[];
}

export function buildRegistry(rules: EnforceableRule[]): RegistryFile {
  return {
    version: REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),
    rules,
  };
}

export function writeRegistry(path: string, registry: RegistryFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}
