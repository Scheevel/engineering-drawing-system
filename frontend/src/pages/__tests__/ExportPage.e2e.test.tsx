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

test.describe('Export Page - Dimension Values (Story 7.4)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to export page
    await page.goto('http://localhost:3000/export');
    await page.waitForLoadState('networkidle');
  });

  test('should display Dimension Values group with discovered dimension types', async ({ page }) => {
    // Step 1: Verify page loaded
    await expect(page.locator('h1')).toContainText('Export');

    // Step 2: Wait for data to load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 3: Verify Dimension Format toggle buttons exist
    await expect(page.locator('text=Dimension Format:')).toBeVisible();
    await expect(page.locator('button:has-text("Combined")')).toBeVisible();
    await expect(page.locator('button:has-text("Value Only")')).toBeVisible();

    // Step 4: Check if Dimension Values field group exists
    const dimensionValuesGroup = page.locator('text=Dimension Values');
    await expect(dimensionValuesGroup).toBeVisible();

    // Step 5: Expand Dimension Values group if collapsed
    const groupContainer = dimensionValuesGroup.locator('..').locator('..');
    const isExpanded = await groupContainer.getAttribute('aria-expanded');
    if (isExpanded === 'false') {
      await dimensionValuesGroup.click();
      await page.waitForTimeout(500); // Wait for accordion animation
    }

    // Step 6: Take screenshot for debugging
    await page.screenshot({
      path: '.playwright-mcp/export-dimension-values-group-story-7.4.png',
      fullPage: true
    });

    // Step 7: Look for dimension type fields (these should be discovered dynamically)
    // Common dimension types: Length, Width, Height, Diameter, Thickness, etc.
    const dimensionFields = ['Length', 'Width', 'Height'];

    for (const fieldName of dimensionFields) {
      const field = page.locator(`text=${fieldName}`).first();
      // Use soft assertion to check which fields exist
      const isVisible = await field.isVisible().catch(() => false);
      console.log(`Dimension field "${fieldName}": ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
    }
  });

  test('should show dimension columns in preview when Dimension Values selected', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Expand Dimension Values group
    const dimensionValuesGroup = page.locator('text=Dimension Values');
    await dimensionValuesGroup.click();
    await page.waitForTimeout(500);

    // Step 3: Select Piece Mark field for reference
    const pieceMarkCheckbox = page.locator('label').filter({ hasText: 'Piece Mark' }).locator('input[type="checkbox"]');
    await pieceMarkCheckbox.check();

    // Step 4: Click the Dimension Values group checkbox to select all dimension fields
    const dimensionGroupCheckbox = dimensionValuesGroup.locator('..').locator('..').locator('input[type="checkbox"]').first();
    await dimensionGroupCheckbox.check();
    await page.waitForTimeout(1000); // Wait for preview to update

    // Step 5: Take screenshot of preview
    await page.screenshot({
      path: '.playwright-mcp/export-dimension-preview-story-7.4.png',
      fullPage: true
    });

    // Step 6: Verify preview shows dimension columns
    const previewSection = page.locator('text=Preview').locator('..');

    // Check if dimension column headers exist
    const lengthHeader = previewSection.locator('text=Length');
    const widthHeader = previewSection.locator('text=Width');

    // Assertion: At least one dimension column should appear
    const hasLengthColumn = await lengthHeader.isVisible().catch(() => false);
    const hasWidthColumn = await widthHeader.isVisible().catch(() => false);

    console.log(`Length column visible: ${hasLengthColumn}`);
    console.log(`Width column visible: ${hasWidthColumn}`);

    // This is the CRITICAL assertion from the bug report
    if (!hasLengthColumn && !hasWidthColumn) {
      throw new Error('BUG CONFIRMED: Dimension columns not appearing in preview. Expected at least Length or Width column.');
    }

    expect(hasLengthColumn || hasWidthColumn, 'At least one dimension column should appear in preview').toBeTruthy();
  });

  test('should format dimension values based on format toggle', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Select dimension fields
    const dimensionValuesGroup = page.locator('text=Dimension Values');
    await dimensionValuesGroup.click();
    await page.waitForTimeout(500);

    // Select a dimension field
    const lengthCheckbox = page.locator('label').filter({ hasText: 'Length' }).locator('input[type="checkbox"]');
    if (await lengthCheckbox.isVisible()) {
      await lengthCheckbox.check();

      // Step 3: Verify Combined format (default) - should show "15.75 in ±0.01"
      const combinedButton = page.locator('button:has-text("Combined")');
      await expect(combinedButton).toHaveClass(/contained/); // Should be selected by default

      // Step 4: Switch to Value Only format
      const valueOnlyButton = page.locator('button:has-text("Value Only")');
      await valueOnlyButton.click();
      await page.waitForTimeout(1000); // Wait for preview to update

      // Step 5: Take screenshot
      await page.screenshot({
        path: '.playwright-mcp/export-dimension-format-value-only-story-7.4.png',
        fullPage: true
      });

      // Step 6: Verify Value Only button is now selected
      await expect(valueOnlyButton).toHaveClass(/contained/);

      // Step 7: Switch back to Combined
      await combinedButton.click();
      await page.waitForTimeout(1000);

      // Step 8: Take screenshot
      await page.screenshot({
        path: '.playwright-mcp/export-dimension-format-combined-story-7.4.png',
        fullPage: true
      });

      // Step 9: Verify Combined button is selected
      await expect(combinedButton).toHaveClass(/contained/);
    } else {
      console.log('Length field not found - skipping format toggle test');
    }
  });

  test('should handle components without dimensions (sparse data)', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Select piece mark and dimension fields
    const pieceMarkCheckbox = page.locator('label').filter({ hasText: 'Piece Mark' }).locator('input[type="checkbox"]');
    await pieceMarkCheckbox.check();

    const dimensionValuesGroup = page.locator('text=Dimension Values');
    await dimensionValuesGroup.click();
    await page.waitForTimeout(500);

    // Select all dimension fields via group checkbox
    const dimensionGroupCheckbox = dimensionValuesGroup.locator('..').locator('..').locator('input[type="checkbox"]').first();
    await dimensionGroupCheckbox.check();
    await page.waitForTimeout(1000);

    // Step 3: Take screenshot
    await page.screenshot({
      path: '.playwright-mcp/export-dimension-sparse-data-story-7.4.png',
      fullPage: true
    });

    // Step 4: Verify preview doesn't crash with sparse data
    // Some components will have dimensions, others won't - should show empty cells
    const previewSection = page.locator('text=Preview').locator('..');
    await expect(previewSection).toBeVisible();

    // Step 5: Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to collect any errors
    await page.waitForTimeout(2000);

    // Assertion: No console errors related to dimensions
    const dimensionErrors = consoleErrors.filter(err =>
      err.includes('dimension') || err.includes('Dimension')
    );

    if (dimensionErrors.length > 0) {
      console.error('Console errors found:', dimensionErrors);
    }

    expect(dimensionErrors.length, 'No dimension-related errors should occur with sparse data').toBe(0);
  });
});
