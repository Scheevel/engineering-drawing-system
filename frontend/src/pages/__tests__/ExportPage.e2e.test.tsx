/**
 * ExportPage E2E Test - Story 7.3 Validation
 *
 * Tests dynamic schema field discovery and display in the export UI
 * Bug Report: Schema fields (inspect, result) not appearing in field selection list
 */
import { test, expect } from '@playwright/test';

test.describe('Export Page - Dynamic Schema Fields (Story 7.3)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to export page
    await page.goto('http://localhost:3000/export');
    await page.waitForLoadState('networkidle');
  });

  test('should display schema fields in Component Data group', async ({ page }) => {
    // Step 1: Verify page loaded
    await expect(page.locator('h1')).toContainText('Export');

    // Step 2: Wait for data to load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 3: Check if Component Data field group exists
    const componentDataGroup = page.locator('text=Component Data');
    await expect(componentDataGroup).toBeVisible();

    // Step 4: Expand Component Data group if collapsed
    const isExpanded = await componentDataGroup.locator('..').getAttribute('aria-expanded');
    if (isExpanded === 'false') {
      await componentDataGroup.click();
    }

    // Step 5: Look for standard fields (should exist)
    await expect(page.locator('text=Piece Mark')).toBeVisible();

    // Step 6: Look for schema fields (Story 7.3 - CRITICAL TEST)
    // These should appear if getComponentDataFields() is discovering dynamic_data
    const inspectField = page.locator('text=Inspect').first();
    const resultField = page.locator('text=Result').first();

    // Take screenshot for debugging
    await page.screenshot({
      path: '.playwright-mcp/export-field-list-story-7.3.png',
      fullPage: true
    });

    // Assertions
    await expect(inspectField).toBeVisible({ timeout: 5000 });
    await expect(resultField).toBeVisible({ timeout: 5000 });
  });

  test('should show schema field values in preview when selected', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Select Piece Mark field
    await page.locator('input[type="checkbox"]').filter({ hasText: 'Piece Mark' }).check();

    // Step 3: Select Inspect field (if visible)
    const inspectCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Inspect' });

    if (await inspectCheckbox.isVisible()) {
      await inspectCheckbox.check();

      // Step 4: Select Result field
      await page.locator('input[type="checkbox"]').filter({ hasText: 'Result' }).check();

      // Step 5: Verify preview shows F106 with schema values
      const previewSection = page.locator('[data-testid="export-preview"]').or(page.locator('text=Export Preview').locator('..')).first();

      // Look for F106 row in preview
      const f106Row = previewSection.locator('text=F106').locator('..').first();

      // Take screenshot of preview
      await page.screenshot({
        path: '.playwright-mcp/export-preview-f106-story-7.3.png',
        fullPage: true
      });

      // Verify F106 shows "Pass" and "Good" (not "—")
      await expect(f106Row).toContainText('Pass');
      await expect(f106Row).toContainText('Good');
    } else {
      // If Inspect field is not visible, fail the test with diagnostic info
      await page.screenshot({
        path: '.playwright-mcp/export-field-discovery-failed.png',
        fullPage: true
      });

      throw new Error('FIELD DISCOVERY BUG: Inspect and Result fields not visible in field list. Schema fields from dynamic_data are not being discovered by getComponentDataFields()');
    }
  });

  test('should discover all dynamic_data fields across components', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Count total fields in Component Data group
    const componentDataSection = page.locator('text=Component Data').locator('..');
    const allCheckboxes = componentDataSection.locator('input[type="checkbox"]');
    const fieldCount = await allCheckboxes.count();

    // Step 3: Get field labels for debugging
    const fieldLabels: string[] = [];
    for (let i = 0; i < fieldCount; i++) {
      const checkbox = allCheckboxes.nth(i);
      const label = await checkbox.locator('..').textContent();
      if (label) fieldLabels.push(label.trim());
    }

    console.log('Fields discovered:', fieldLabels);

    // Step 4: Verify expected schema fields exist
    // These should be discovered from component.dynamic_data
    const expectedSchemaFields = ['Inspect', 'Result', 'Thickness'];

    for (const fieldName of expectedSchemaFields) {
      const fieldExists = fieldLabels.some(label => label.includes(fieldName));

      if (!fieldExists) {
        console.error(`Missing schema field: ${fieldName}`);
        console.error('All discovered fields:', fieldLabels);

        await page.screenshot({
          path: `.playwright-mcp/missing-field-${fieldName.toLowerCase()}.png`,
          fullPage: true
        });
      }

      expect(fieldExists, `Schema field "${fieldName}" should be discovered from dynamic_data`).toBeTruthy();
    }
  });

  test('should handle sparse matrix data correctly', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Select multiple fields including schema fields
    await page.locator('input[type="checkbox"]').filter({ hasText: 'Piece Mark' }).check();

    // Try to select schema fields
    const inspectCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Inspect' });
    if (await inspectCheckbox.isVisible()) {
      await inspectCheckbox.check();

      const resultCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Result' });
      await resultCheckbox.check();

      const thicknessCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Thickness' });
      if (await thicknessCheckbox.isVisible()) {
        await thicknessCheckbox.check();
      }

      // Step 3: Verify preview shows sparse matrix (some components have fields, others don't)
      const preview = page.locator('text=Export Preview').locator('..');

      // F106 should have Inspect and Result, but not Thickness (empty cell "—")
      const f106Row = preview.locator('text=F106').locator('..').first();
      await expect(f106Row).toContainText('Pass'); // Inspect value
      await expect(f106Row).toContainText('Good'); // Result value
      // Thickness should be empty for F106

      // Take screenshot
      await page.screenshot({
        path: '.playwright-mcp/export-sparse-matrix-story-7.3.png',
        fullPage: true
      });
    } else {
      throw new Error('Schema fields not visible - cannot test sparse matrix behavior');
    }
  });
});
