# vhs demo tape — record with `vhs scripts/demo.tape` after polishing.
# Produces docs/demo.gif. Adjust paths/timing during recording.

Output docs/demo.gif

Set FontSize 16
Set Width 1100
Set Height 700
Set Theme "Dracula"
Set Padding 30

Type "cat CLAUDE.md"
Enter
Sleep 2s

Type "clear"
Enter
Sleep 500ms

Type "npx wisp-rulecast compile"
Enter
Sleep 3s

Type "cat .claude/settings.json | head -40"
Enter
Sleep 4s

Type "git add .env"
Enter
Sleep 2s

Type "npx wisp-rulecast audit"
Enter
Sleep 3s
