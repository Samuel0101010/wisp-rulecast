// Project-relative paths owned by wisp-rulecast.

import { resolve } from "node:path";

export interface ProjectPaths {
  root: string;
  settings: string;
  claudeMd: string;
  wispDir: string;
  rules: string;
  dispatcher: string;
  state: string;
  log: string;
}

export function projectPaths(root: string): ProjectPaths {
  const wispDir = resolve(root, ".claude", "wisp-rulecast");
  return {
    root,
    settings: resolve(root, ".claude", "settings.json"),
    claudeMd: resolve(root, "CLAUDE.md"),
    wispDir,
    rules: resolve(wispDir, "rules.json"),
    dispatcher: resolve(wispDir, "dispatch.mjs"),
    state: resolve(wispDir, "state.json"),
    log: resolve(root, ".claude", "wisp-rulecast.log"),
  };
}
