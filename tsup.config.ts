import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  // The CLI ships in the Claude Code plugin cache where no `node_modules`
  // is installed alongside it. Inline every dependency into the bundle so
  // it runs standalone — without this, `wisp-rulecast compile` crashes
  // with ERR_MODULE_NOT_FOUND on remark-parse at first invocation.
  noExternal: [/.*/],
  minify: true,
  splitting: false,
  shims: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
