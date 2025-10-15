# Tutorial Creation Guide

**Purpose:** Step-by-step instructions for creating new executable feature tutorials

---

## When to Create a Tutorial

Create tutorials for:
- ✅ Core features used infrequently (monthly or less)
- ✅ Complex multi-step workflows you forget
- ✅ Hyper-specific tasks vulnerable to refactoring
- ✅ Features with non-obvious UI entry points
- ❌ Don't create for: Daily tasks, single-click actions, obvious features

---

## Step-by-Step Creation Process

### Step 1: Copy Templates

```bash
cd docs/instruction/

# Copy markdown template
cp _tutorial-template.md [feature-name]-tutorial.md

# Copy Playwright spec template
cp _tutorial-template.spec.ts [feature-name]-tutorial.spec.ts
```

**Naming convention:** Use kebab-case: `schema-create-tutorial`, `csv-export-tutorial`

---

### Step 2: Update Markdown Tutorial

Open `[feature-name]-tutorial.md` and replace placeholders:

1. **Title Section**
   - Replace `[FEATURE_NAME]` with human-readable feature name
   - Update "When to use" with clear context

2. **Prerequisites Section**
   - Specify if test data needed
   - Note any special environment requirements

3. **Launch Tutorial Section**
   - Update task name to match VSCode task (Step 5)
   - Update file name references

4. **Steps Section**
   - Write 5-10 numbered steps (minimal, just actions)
   - Include example values where helpful
   - No explanations of "why" - just "what to do"

5. **What You Should See**
   - List 2-4 expected outcomes
   - Use checkmark emoji (✅) for each

6. **Troubleshooting**
   - Document 2-3 most common issues
   - Provide quick resolution steps

7. **Footer Metadata**
   - Tutorial Type: "Core Feature" or "Refactor-Vulnerable"
   - Frequency: Daily | Weekly | Monthly | Rarely
   - Update date

---

### Step 3: Update Playwright Spec

Open `[feature-name]-tutorial.spec.ts` and update:

1. **Test Description (Lines 3-9)**
   - Replace `[FEATURE_NAME]` and `[feature-name]`
   - Update file path references

2. **Navigation (Line 14)**
   - Update route: `await page.goto('http://localhost:3000/[YOUR_ROUTE]');`

3. **Element Highlighting (Lines 20-32)**
   - **CRITICAL:** Update selector to match your UI element
   - Examples:
     ```typescript
     // Button with specific text
     const element = Array.from(document.querySelectorAll('button'))
       .find(btn => btn.textContent?.includes('Create Schema'));

     // By ID
     const element = document.getElementById('export-button');

     // By data attribute
     const element = document.querySelector('[data-testid="add-dimension"]');

     // By class and text
     const element = document.querySelector('.primary-action:has-text("Save")');
     ```
   - Test selector in browser DevTools first!

4. **Instruction Box (Lines 37-62)**
   - Update title: `📝 Tutorial: [YOUR_FEATURE]`
   - Update next step description
   - Update file path reference at bottom

5. **Screenshot Path (Line 67)**
   - Update filename: `screenshots/[feature-name]-start.png`
   - Screenshots saved automatically when tutorial runs

6. **Console Logs (Lines 69-72)**
   - Update route and action descriptions

7. **Optional: GIF Recording Test (Lines 79-110)**
   - Add Playwright actions for each step
   - This runs the full flow without pausing
   - Used to generate reference GIF videos

---

### Step 4: Test Your Tutorial

```bash
# Run tutorial manually
npx playwright test docs/instruction/[feature-name]-tutorial.spec.ts --headed --debug

# Verify:
# ✅ Browser opens at correct page
# ✅ Element is highlighted in red
# ✅ Yellow instruction box appears
# ✅ Playwright inspector pauses
# ✅ You can interact with page manually
```

**Common Issues:**
- **Element not highlighted:** Selector is wrong, update in spec file
- **Page doesn't load:** Check route URL, verify dev environment running
- **Inspector doesn't pause:** Ensure `--debug` flag is present

---

### Step 5: Add VSCode Task

Edit `.vscode/tasks.json` and add new task:

```json
{
  "label": "Tutorial: [Feature Name]",
  "type": "shell",
  "command": "npx playwright test docs/instruction/[feature-name]-tutorial.spec.ts --headed --debug",
  "problemMatcher": [],
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "shared",
    "showReuseMessage": false,
    "clear": false
  },
  "group": {
    "kind": "test",
    "isDefault": false
  }
}
```

**Test VSCode task:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Run Task"
3. Find your tutorial task
4. Verify it launches correctly

---

### Step 6: Add to Tutorial Index

Edit `docs/instruction/README.md`:

1. **Add link to appropriate section:**
   ```markdown
   ### Core Features
   - [Your Feature](./[feature-name]-tutorial.md) - Brief description
   ```

2. **Update tutorial count** if shown in README

---

### Step 7: Optional - Generate Reference GIF

To create a visual reference GIF of the complete flow:

```bash
# Record full flow with video
npx playwright test docs/instruction/[feature-name]-tutorial.spec.ts:recordGif --headed --video=on

# Video saved to: test-results/[test-name]/video.webm

# Convert to GIF (requires ffmpeg):
ffmpeg -i test-results/[test-name]/video.webm \
       -vf "fps=10,scale=1200:-1:flags=lanczos" \
       -loop 0 \
       docs/instruction/gifs/[feature-name]-flow.gif
```

**Add GIF to markdown:**
```markdown
## Visual Reference

![Feature Flow](./gifs/[feature-name]-flow.gif)
```

---

## Tutorial Maintenance

### When to Update

Update tutorials when:
- ✅ UI changes (routes, button text, element IDs)
- ✅ Feature refactored (different workflow)
- ✅ Common troubleshooting issues discovered
- ✅ Prerequisites change (new dependencies)

### How to Update

1. **Update Playwright selector** if element changed
2. **Update markdown steps** if workflow changed
3. **Update troubleshooting** with new issues
4. **Re-test** to verify updates work
5. **Update "Last Updated" date** in footer

---

## Quick Checklist

Use this when creating a new tutorial:

- [ ] Copied template files with correct naming
- [ ] Updated markdown with feature-specific steps
- [ ] Updated Playwright spec with correct route
- [ ] Updated element selector (tested in DevTools)
- [ ] Updated instruction box text
- [ ] Tested tutorial manually (browser opens, highlights work, pauses)
- [ ] Added VSCode task to tasks.json
- [ ] Tested VSCode task launches correctly
- [ ] Added link to README.md index
- [ ] Optional: Generated reference GIF
- [ ] Committed files to git

---

## Example Selectors Reference

```typescript
// Common UI element patterns in this project:

// Material-UI Button with text
Array.from(document.querySelectorAll('button'))
  .find(btn => btn.textContent?.includes('Button Text'));

// Form input by name
document.querySelector('input[name="fieldName"]');

// By data-testid (if present)
document.querySelector('[data-testid="export-dialog"]');

// Toolbar button
document.querySelector('[role="toolbar"] button:has-text("Export")');

// Modal/Dialog
document.querySelector('[role="dialog"]');

// Table row
document.querySelector('table tbody tr:first-child');
```

---

## Troubleshooting Tutorial Creation

**Playwright can't find element:**
1. Open browser DevTools (F12)
2. Use "Select element" tool to inspect
3. Look at element attributes (id, class, data-testid)
4. Test selector in DevTools console: `document.querySelector('YOUR_SELECTOR')`

**Tutorial launches wrong page:**
- Check route in `page.goto()` matches actual URL
- Verify dev environment is running
- Try navigating manually first to confirm route

**VSCode task not appearing:**
- Verify tasks.json has no JSON syntax errors
- Reload VSCode: Cmd+Shift+P → "Reload Window"
- Check task label matches search term

**Screenshot not saving:**
- Verify `screenshots/` directory exists in `docs/instruction/`
- Check file permissions
- Try absolute path instead of relative

---

**Questions?** Review existing tutorials in `docs/instruction/` for working examples.

**Last Updated:** October 14, 2025
