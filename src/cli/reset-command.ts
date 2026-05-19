// `wisp-rulecast reset` — strip every wisp-rulecast hook from settings.json.
// User hooks are preserved. We leave the rules.json / dispatch.mjs in place;
// the user can delete those manually if they want to fully uninstall.

import { projectPaths } from "../compiler/paths.js";
import { readSettings, stripOurHooks, writeSettings } from "../compiler/settings-merger.js";

export function resetCommand(_argv: string[], cwd: string): number {
  const paths = projectPaths(cwd);
  const before = readSettings(paths.settings);
  const after = stripOurHooks(before);
  writeSettings(paths.settings, after);
  process.stdout.write(`wisp-rulecast: removed our hooks from ${paths.settings}\n`);
  return 0;
}
