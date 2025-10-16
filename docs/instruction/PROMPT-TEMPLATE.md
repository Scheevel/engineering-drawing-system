# Reusable Prompt: Create Feature Tutorial

**Purpose:** Generate executable feature tutorials that navigate TO a feature and pause for manual interaction

---

## THE PROMPT

Copy this template and fill in the bracketed sections:

```
/BMad:agents:bmad-master Create an executable feature tutorial for [FEATURE_NAME]

**Feature Details:**
- UI Location: [e.g., /components/schema, main toolbar, settings page]
- Primary Action: [e.g., "Create Schema button", "Export dropdown", "Edit icon"]
- When to Use: [Brief description of use case]

**Tutorial Structure:**

1. **Markdown Tutorial** (docs/instruction/[feature-name]-tutorial.md):
   - Minimal format (5-10 numbered steps only)
   - Prerequisites section (manual setup: make dev-up, etc.)
   - VSCode task link at top for clickable launch
   - "What you should see" validation section
   - Troubleshooting section (2-3 common issues)

2. **Playwright E2E** (docs/instruction/[feature-name]-tutorial.spec.ts):
   - Navigate to: [ROUTE_PATH]
   - Highlight element: [SELECTOR_DESCRIPTION - e.g., "blue Create Schema button top-right"]
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
```

---

## Fill-In Example

```
Create an executable feature tutorial for CSV Export

**Feature Details:**
- UI Location: /drawings page, toolbar next to "Upload Drawings" button
- Primary Action: "Export" button with download icon
- When to Use: When engineers need to export component data to Excel/spreadsheets
- Tutorial Type: Core Feature
- Frequency: Weekly

**Tutorial Structure:**

1. **Markdown Tutorial** (docs/instruction/csv-export-tutorial.md):
   - Minimal format (5-10 numbered steps only)
   - Prerequisites section (manual setup: make dev-up, make seed-test-data)
   - VSCode task link at top for clickable launch
   - "What you should see" validation section
   - Troubleshooting section (2-3 common issues)

2. **Playwright E2E** (docs/instruction/csv-export-tutorial.spec.ts):
   - Navigate to: http://localhost:3000/drawings
   - Highlight element: Export button in toolbar (next to Upload Drawings)
   - Add floating yellow instruction box (top-right)
   - Pause with await page.pause() - browser stays open for manual interaction
   - Include @recordGif test for optional full-flow video

3. **VSCode Task** (.vscode/tasks.json):
   - Add new task: "Tutorial: CSV Export"
   - Command: npx playwright test docs/instruction/csv-export-tutorial.spec.ts --headed --debug

**Deliverables:**
- docs/instruction/csv-export-tutorial.md
- docs/instruction/csv-export-tutorial.spec.ts
- Updated .vscode/tasks.json with new task
- Updated docs/instruction/README.md with link

**Constraints:**
- Markdown: Minimal steps only, no explanations
- E2E: Highlight primary action element, then pause
- Selector: button:has-text("Export") in toolbar
- No testing: E2E navigates only, doesn't assert outcomes

Generate the complete tutorial following templates in docs/instruction/_tutorial-template.*
```

---

## Quick Reference: When to Use Each Field

| Field | Purpose | Examples |
|-------|---------|----------|
| **FEATURE_NAME** | Human-readable feature name | "Create Schema", "CSV Export", "Add Dimensions" |
| **UI Location** | Where user starts | "/components/schema", "main toolbar", "component detail modal" |
| **Primary Action** | First interactive element | "Create Schema button", "Export dropdown", "Save icon" |
| **When to Use** | Use case context | "When defining new component types", "When exporting filtered data" |
| **Tutorial Type** | Core or vulnerable | Core Feature (used regularly) or Refactor-Vulnerable (easily broken) |
| **Frequency** | How often needed | Daily, Weekly, Monthly, Rarely |
| **ROUTE_PATH** | URL to navigate to | "/drawings", "/components/schema", "/settings" |
| **SELECTOR_DESCRIPTION** | Element to highlight | "blue button top-right", "export icon in toolbar" |

---

## Usage Instructions

1. **Copy the prompt template** above
2. **Fill in bracketed sections** with your feature details
3. **Run the prompt** with Claude (or any AI assistant)
4. **Verify generated files** match template structure
5. **Test the tutorial**:
   ```bash
   npx playwright test docs/instruction/[name]-tutorial.spec.ts --headed --debug
   ```
6. **Commit files** when working

---

## Advanced: GIF Recording

To generate a visual reference GIF after creating the tutorial:

```bash
# Run the @recordGif test with video enabled
npx playwright test docs/instruction/[name]-tutorial.spec.ts:recordGif --headed --video=on

# Video saved to: test-results/[test-name]/video.webm

# Convert to GIF (requires ffmpeg):
ffmpeg -i test-results/[test-name]/video.webm \
       -vf "fps=10,scale=1200:-1:flags=lanczos" \
       -loop 0 \
       docs/instruction/gifs/[name]-flow.gif
```

---

## Troubleshooting Prompt Usage

**AI doesn't generate both files:**
- Explicitly request: "Generate both the markdown tutorial AND the Playwright spec file"

**Selector is too fragile:**
- Specify: "Use data-testid if available, otherwise use text match with fallback"
- Provide example selectors from similar components

**Steps are too detailed:**
- Emphasize: "Minimal format - just numbered actions, no explanations"

**VSCode task format wrong:**
- Provide example task from .vscode/tasks.json
- Specify: "Match existing task structure exactly"

---

**Last Updated:** October 14, 2025
**Template Version:** 1.0
**Compatibility:** Playwright, VSCode Tasks, Markdown
