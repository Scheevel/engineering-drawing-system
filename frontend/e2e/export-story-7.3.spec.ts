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
    await page.goto('/export');
    await page.waitForLoadState('networkidle');
  });

  test('should display schema fields in Component Data group', async ({ page }) => {
    // Step 1: Verify page loaded
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Export');

    // Step 2: Wait for data to load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 3: Take screenshot of initial state
    await page.screenshot({
      path: '../.playwright-mcp/export-initial-load-story-7.3.png',
      fullPage: true
    });

    // Step 4: Find all checkboxes in Component Data section
    const componentDataHeading = page.getByText('Component Data');
    await expect(componentDataHeading).toBeVisible();

    // Step 5: Get all field labels to see what's discovered
    const fieldLabels = await page.locator('label').allTextContents();
    console.log('=== DISCOVERED FIELDS ===');
    console.log(fieldLabels.filter(label => label.includes('Piece Mark') || label.includes('Inspect') || label.includes('Result')));

    // Step 6: Look for schema fields (Story 7.3 - CRITICAL TEST)
    const pieceMarkField = page.getByText('Piece Mark', { exact: false });
    const inspectField = page.getByText('Inspect', { exact: false });
    const resultField = page.getByText('Result', { exact: false });

    // Verify standard field exists
    await expect(pieceMarkField).toBeVisible();

    // Take screenshot before schema field assertions
    await page.screenshot({
      path: '../.playwright-mcp/export-field-list-story-7.3.png',
      fullPage: true
    });

    // CRITICAL: These should be visible if getComponentDataFields() is discovering dynamic_data
    try {
      await expect(inspectField).toBeVisible({ timeout: 2000 });
      await expect(resultField).toBeVisible({ timeout: 2000 });
      console.log('✅ SUCCESS: Schema fields (Inspect, Result) are visible!');
    } catch (error) {
      console.error('❌ BUG CONFIRMED: Schema fields NOT visible in field list');
      console.error('This means getComponentDataFields() is not discovering dynamic_data fields');
      throw new Error('FIELD DISCOVERY BUG: Inspect and Result fields not visible. dynamic_data fields not being discovered.');
    }
  });

  test('should show schema field values in preview when selected', async ({ page }) => {
    // Step 1: Wait for data load
    await page.waitForSelector('text=Loaded', { timeout: 10000 });

    // Step 2: Select Piece Mark field
    const pieceMarkCheckbox = page.locator('input[type="checkbox"]').and(page.locator('[value*="piece_mark"], [id*="piece_mark"]')).first();
    if (await pieceMarkCheckbox.isVisible()) {
      await pieceMarkCheckbox.check();
    } else {
      // Alternative: find by label text
      await page.getByText('Piece Mark').locator('..').locator('input[type="checkbox"]').check();
    }

    // Step 3: Try to select Inspect field
    const inspectCheckbox = page.getByText('Inspect').locator('..').locator('input[type="checkbox"]');

    if (await inspectCheckbox.isVisible({ timeout: 2000 })) {
      await inspectCheckbox.check();

      // Step 4: Select Result field
      await page.getByText('Result').locator('..').locator('input[type="checkbox"]').check();

      // Step 5: Verify preview shows F106 with schema values
      await page.waitForTimeout(1000); // Let preview update

      // Take screenshot of preview
      await page.screenshot({
        path: '../.playwright-mcp/export-preview-f106-story-7.3.png',
        fullPage: true
      });

      // Verify F106 shows "Pass" and "Good" (not "—")
      const previewText = await page.textContent('body');
      expect(previewText).toContain('F106');
      expect(previewText).toContain('Pass');
      expect(previewText).toContain('Good');

      console.log('✅ SUCCESS: F106 preview shows Inspect=Pass, Result=Good');
    } else {
      // If Inspect field is not visible, fail the test with diagnostic info
      await page.screenshot({
        path: '../.playwright-mcp/export-field-discovery-failed.png',
        fullPage: true
      });

      throw new Error('FIELD DISCOVERY BUG: Inspect and Result fields not visible in field list');
    }
  });
});
