# Feature Tutorials

**Purpose:** Executable step-by-step guides that navigate you TO a feature, then hand off control for manual interaction.

---

## How to Use

1. **Prerequisites:** Ensure dev environment is running
   ```bash
   make dev-up              # Start all services
   make seed-test-data      # Load test data (if needed)
   ```

2. **Launch Tutorial:** Click the "▶️ Launch Tutorial" link in any tutorial markdown
   - Browser opens automatically
   - Navigates to feature
   - Highlights interactive elements
   - Pauses with Playwright inspector open
   - You take over and interact manually

3. **Follow Steps:** Use the markdown instructions while interacting with the UI

---

## Available Tutorials

### Core Features
- [Create Custom Schema](./schema-create-tutorial.md) - Build new component type schemas
- [CSV Export with Filters](./csv-export-tutorial.md) - Export component data to spreadsheets
- [Add Component Dimensions](./component-dimensions-tutorial.md) - Manage dimensional data
- [Search & Filter Components](./search-filter-tutorial.md) - Find specific components

### Hyper-Specific (Refactor-Vulnerable)
- [Verify Schema Change Audit Trail](./schema-audit-trail-tutorial.md) - Test audit logging after schema refactor
- [Export Dynamic Schema Fields](./export-dynamic-fields-tutorial.md) - Verify custom fields appear in exports

---

## Adding New Tutorials

See [TUTORIAL-CREATION-GUIDE.md](./TUTORIAL-CREATION-GUIDE.md) for step-by-step instructions on creating new tutorials.

**Quick Template:**
1. Copy `_tutorial-template.md` and `_tutorial-template.spec.ts`
2. Rename to `[feature-name]-tutorial.*`
3. Update markdown steps and Playwright navigation
4. Add task to `.vscode/tasks.json`
5. Add link to this README

---

## Troubleshooting

**Tutorial won't launch from VSCode:**
- Verify `.vscode/tasks.json` exists
- Check task name matches markdown link
- Try running manually: `npx playwright test [name]-tutorial.spec.ts --headed --debug`

**Browser opens but feature not highlighted:**
- Check Playwright selector in spec file
- Verify element exists on page (inspect with DevTools)
- Update selector if UI changed

**Playwright inspector doesn't pause:**
- Ensure `await page.pause()` is present in spec file
- Check Playwright is running in `--debug` mode
- Try `PWDEBUG=1` environment variable

---

**Last Updated:** October 14, 2025
