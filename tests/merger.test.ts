import { describe, expect, it } from "vitest";
import { mergeHooks, stripOurHooks } from "../src/compiler/settings-merger.js";
import type { Settings } from "../src/compiler/settings-schema.js";
import type { CompiledHooks } from "../src/compiler/types.js";

const DISPATCHER = "${CLAUDE_PROJECT_DIR}/.claude/wisp-rulecast/dispatch.mjs";

function ourCompiled(): CompiledHooks {
  return {
    PreToolUse: [
      {
        matcher: "Bash",
        hooks: [
          {
            type: "command",
            command: "node",
            args: [DISPATCHER, "--rule", "never-commit-aaaa1111"],
            timeout: 5,
            if: "Bash(git commit *)",
          },
        ],
      },
    ],
    PostToolUse: [],
  };
}

describe("settings-merger", () => {
  it("creates the hooks section when settings is empty", () => {
    const merged = mergeHooks({}, ourCompiled());
    expect(merged.hooks?.PreToolUse?.length).toBe(1);
  });

  it("preserves unrelated keys in the settings object", () => {
    const existing: Settings = {
      enabledMcpjsonServers: ["ruflo"],
      enableAllProjectMcpServers: true,
    };
    const merged = mergeHooks(existing, ourCompiled());
    expect(merged.enabledMcpjsonServers).toEqual(["ruflo"]);
    expect(merged.enableAllProjectMcpServers).toBe(true);
  });

  it("keeps user-owned hook groups intact", () => {
    const existing: Settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                type: "command",
                command: "/usr/local/bin/user-validator.sh",
                args: [],
              },
            ],
          },
        ],
      },
    };
    const merged = mergeHooks(existing, ourCompiled());
    const groups = merged.hooks?.PreToolUse ?? [];
    expect(groups.length).toBe(2);
    expect(groups[0]?.hooks?.[0]).toMatchObject({ command: "/usr/local/bin/user-validator.sh" });
  });

  it("is idempotent — re-merging replaces our previous groups", () => {
    const after1 = mergeHooks({}, ourCompiled());
    const after2 = mergeHooks(after1, ourCompiled());
    expect(after2.hooks?.PreToolUse?.length).toBe(1);
  });

  it("drops only fully-owned groups", () => {
    const after1 = mergeHooks({}, ourCompiled());
    after1.hooks = after1.hooks ?? {};
    (after1.hooks.PreToolUse ?? []).push({
      matcher: "Edit",
      hooks: [{ type: "command", command: "my-linter" }],
    });
    const after2 = mergeHooks(after1, ourCompiled());
    const groups = after2.hooks?.PreToolUse ?? [];
    expect(groups.length).toBe(2);
    expect(groups.some((g) => g.matcher === "Edit")).toBe(true);
  });

  it("stripOurHooks leaves user groups but drops ours", () => {
    const after = mergeHooks({}, ourCompiled());
    const stripped = stripOurHooks(after);
    expect(stripped.hooks?.PreToolUse).toEqual([]);
  });
});
