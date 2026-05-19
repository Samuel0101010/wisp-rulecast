// `wisp-rulecast install` — copy the skill + slash command into the user's
// project so the agent can re-invoke wisp-rulecast on its own. Idempotent.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { COMMAND_MD, SKILL_MD } from "./assets.js";

export interface InstallResult {
  skill: string;
  command: string;
}

export function install(cwd: string): InstallResult {
  const skill = resolve(cwd, ".claude", "skills", "wisp-rulecast", "SKILL.md");
  const command = resolve(cwd, ".claude", "commands", "wisp-rulecast.md");

  mkdirSync(dirname(skill), { recursive: true });
  writeFileSync(skill, SKILL_MD, "utf8");

  mkdirSync(dirname(command), { recursive: true });
  writeFileSync(command, COMMAND_MD, "utf8");

  return { skill, command };
}
