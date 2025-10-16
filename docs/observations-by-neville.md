/BMad:agents:qa *review and *gate @ 

6.4 > {-6.5-} > 7.4 > 7.5


/BMad:agents:bmad-master Create an executable feature tutorial for stories 6.4 and 7.4

**Feature Details:**
- UI Location: [e.g., /components/etc, main toolbar, settings page]
- Primary Action: [e.g., "Option button", "Export dropdown", etc]
- When to Use: describe export

**Tutorial Structure:**

1. **Markdown Tutorial** (docs/instruction/[feature-name]-tutorial.md):
   - Minimal format (5-10 numbered steps only)
   - Prerequisites section (manual setup: make dev-up, etc.)
   - VSCode task link at top for clickable launch
   - "What you should see" validation section
   - Troubleshooting section (2-3 common issues)

2. **Playwright E2E** (docs/instruction/[feature-name]-tutorial.spec.ts):
   - Navigate to: [ROUTE_PATH]
   - Highlight element: [SELECTOR_DESCRIPTION - e.g., "blue option button top-right"]
   - Add floating yellow instruction box (top-right)
   - Pause with await page.pause() - browser stays open for manual interaction
   - Include @recordGif test for optional full-flow video

3. **VSCode Task** (.vscode/tasks.json):
   - Add new task: "Tutorial: [FEATURE_NAME]"
   - Command: npx playwright test docs/instruction/[feature-name]-tutorial.spec.ts --headed --debug

**Deliverables:**
- docs/instruction/[feature-name]-tutorial.md
- docs/instruction/[feature-name]-tutorial.spec.ts
- Updated .vscode/tasks.json with new task
- Updated docs/instruction/README.md with link

**Constraints:**
- Markdown: Minimal steps only, no explanations
- E2E: Highlight primary action element, then pause
- Selector: Use robust selector (data-testid preferred, text match as fallback)
- No testing: E2E navigates only, doesn't assert outcomes

Generate the complete tutorial following templates in docs/instruction/_tutorial-template.*
Ask me any clarifying questions