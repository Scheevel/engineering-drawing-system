<strikethrough>check /docs/stories/backlog and /docs/stories-archive/ to see if any of these observations are already accounted for in any of the existing stories</strikethrough>

✅ Commands whitelisted in ~/.claude/settings.local.json: pip, pip3, grep, npm start, npx esbuild, npx eslint
✅ Hook system configured: Auto-approve safe commands + optional logging (see ~/.claude/hooks/README.md)

✅ Dashboard "View Drawings" tile title sizing - RESOLVED (commit b70fcaf)
   - Investigation: All tiles technically identical (18px, 500 weight, 28.8px line-height)
   - Root cause: Visual perception due to font rendering variations across browsers
   - Fix: Applied cross-browser font smoothing (WebkitFontSmoothing, MozOsxFontSmoothing)
   - Result: Improved rendering consistency without breaking Material-UI best practices

make a yagni folder

At the "/drawings" route, my expectation is that a clickable list of saved drawings would be visible

If the default schema is truly hardcoded, then it should be static and not editable

How do I delete a schema?
what purpose does the looking glass serve?
Just "save" is sufficient No need for "save & return" button
The feature to delete a field from schema fails

I can't edit "piece markings" field on the component detail card

schema settings take up too much real-estate

/schema
