# Feature Tutorials

**Purpose:** Executable step-by-step guides that navigate you TO a feature, then hand off control for manual interaction.

---

## How to Use

1. **Prerequisites:** Ensure dev environment is running
   ```bash
   docker-compose up -d         # Start all services
   # OR
   make dev-up                  # If using Makefile
   ```

2. **Launch Tutorial:** Press `Cmd+Shift+P` → "Run Task" → Select tutorial
   - Browser opens automatically
   - Navigates to feature
   - Highlights interactive elements
   - Pauses with Playwright inspector open
   - You take over and interact manually

3. **Follow Steps:** Use the markdown instructions while interacting with the UI

---

## Available Tutorials

### Core Features
- [Add Component Dimension with Duplicate Prevention](./dimension-duplicate-prevention-tutorial.md) - Prevent duplicate dimension types (Story 6.4)
- [Export Component Dimensions to CSV](./export-dimension-values-tutorial.md) - Export dimension values in CSV format (Story 7.4)

---

## Tutorial File Locations

**Markdown Documentation:** `docs/instruction/[feature-name]-tutorial.md`
- Prerequisites, steps, troubleshooting
- Quick launch instructions

**Playwright Test Scripts:** `frontend/e2e/tutorials/[feature-name].spec.ts`
- Automated navigation and highlighting
- Pause for manual interaction
- Optional GIF recording mode (@recordGif)

**VSCode Tasks:** `.vscode/tasks.json`
- Quick launch via `Cmd+Shift+P` → "Run Task"
- Automatically runs from frontend directory

---

## Adding New Tutorials

See [TUTORIAL-CREATION-GUIDE.md](./TUTORIAL-CREATION-GUIDE.md) for step-by-step instructions on creating new tutorials.

**Quick Steps:**
1. Create test file: `frontend/e2e/tutorials/[feature-name].spec.ts`
2. Create markdown: `docs/instruction/[feature-name]-tutorial.md`
3. Add VSCode task to `.vscode/tasks.json`
4. Add link to this README

---

## Troubleshooting

**Tutorial won't launch from VSCode:**
- Verify `.vscode/tasks.json` exists
- Check task name matches the tutorial
- Try running manually: `cd frontend && npx playwright test e2e/tutorials/[name].spec.ts --headed --debug`

**Browser opens but feature not highlighted:**
- Check Playwright selector in spec file
- Verify element exists on page (inspect with DevTools)
- Update selector if UI changed

**Playwright inspector doesn't pause:**
- Ensure `await page.pause()` is present in spec file
- Check Playwright is running in `--debug` mode
- Try `PWDEBUG=1` environment variable

**"No tests found" error:**
- Ensure you're running from `frontend` directory
- Check Playwright config points to `testDir: './e2e'`
- Verify test file exists in `frontend/e2e/tutorials/`

---

**Last Updated:** October 15, 2025
