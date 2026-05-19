#!/usr/bin/env bash
# Publish flow for wisp-rulecast — run from the project root.
# Bash on Windows (Git Bash / WSL) or any POSIX shell.
#
# Two paths below. Pick ONE and execute the steps in order.
# Every step is short and reversible until step 3.
#
# Prereqs (verify before starting):
#   gh auth status     → logged in as Samuel0101010
#   gh auth refresh -h github.com -s workflow
#                       → grants the workflow scope; the current token
#                         only has 'repo' and the initial push will fail
#                         without 'workflow' because the commit adds
#                         .github/workflows/*.yml. This opens a browser
#                         once. Free, reversible, required.
#   npm whoami         → logged in to the npm account that should own
#                         this package. Required only for the release step.

set -euo pipefail

cd "$(dirname "$0")/.."

# ───────────────────────────────────────────────────────────────
# Path A — staged launch (recommended; matches the project roadmap):
#   private GitHub repo first, then flip to public after a manual smoke.
# ───────────────────────────────────────────────────────────────

private_first() {
  gh repo create Samuel0101010/wisp-rulecast \
    --private \
    --source=. \
    --remote=origin \
    --description="Compile your CLAUDE.md rules to real Claude Code hooks." \
    --push

  echo
  echo "Repo created (private) and pushed."
  echo "Open in browser:  gh repo view --web"
  echo "Wait for CI matrix to pass on Ubuntu/macOS/Windows × Node 20/22,"
  echo "then flip public with:"
  echo
  echo "  gh repo edit Samuel0101010/wisp-rulecast --visibility public --accept-visibility-change-consequences"
}

# ───────────────────────────────────────────────────────────────
# Path B — direct public launch.
# ───────────────────────────────────────────────────────────────

public_now() {
  gh repo create Samuel0101010/wisp-rulecast \
    --public \
    --source=. \
    --remote=origin \
    --description="Compile your CLAUDE.md rules to real Claude Code hooks." \
    --push
}

# ───────────────────────────────────────────────────────────────
# Step 3 — npm publish via release.yml.
# Run AFTER the repo is on GitHub and CI is green.
#
# 3a. Set the NPM_TOKEN secret on the repo. You need an "Automation"
#     token from https://www.npmjs.com/settings/<your-npm-user>/tokens.
#     Then:
#
#       gh secret set NPM_TOKEN --repo Samuel0101010/wisp-rulecast
#       # paste token when prompted
#
# 3b. Tag and push. The release workflow fires on tag push.
#
#       git tag -a v0.1.0 -m "v0.1.0 — initial release"
#       git push origin v0.1.0
#
#     release.yml will run npm publish --access public --provenance.
# ───────────────────────────────────────────────────────────────

echo "Pick a path:"
echo "  private_first   — recommended"
echo "  public_now      — direct"
echo
echo "Then in this shell:  $0 <path>"

[[ "${1:-}" == "private_first" ]] && private_first
[[ "${1:-}" == "public_now"    ]] && public_now
