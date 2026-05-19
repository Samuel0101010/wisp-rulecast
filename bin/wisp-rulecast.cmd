@echo off
REM wisp-rulecast launcher (Windows cmd / PowerShell).
REM CLAUDE_PLUGIN_ROOT is set by Claude Code when the plugin is enabled;
REM otherwise fall back to the parent of this script.

setlocal
if defined CLAUDE_PLUGIN_ROOT (
  set "ROOT=%CLAUDE_PLUGIN_ROOT%"
) else (
  set "ROOT=%~dp0.."
)
node "%ROOT%\dist\index.js" %*
endlocal
