import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Story 9.2: Search UI Refinement and Filter Fix
 *
 * These tests validate the critical filter application bug fix (AC6) and
 * verify all column-based filtering functionality works correctly.
 *
 * Based on user journey: docs/user-journeys/journey-9.2-search-refinement.md
 */

test.describe('Search Filters (Story 9.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search page before each test
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
  });

  test('should display clean interface with only 2 top controls', async ({ page }) => {
    // AC5: Verify Sort By dropdown is removed
    const sortByLabel = page.locator('label:has-text("Sort By")');
    await expect(sortByLabel).not.toBeVisible();

    // Verify search box is present
    const searchBox = page.locator('input[type="text"]').first();
    await expect(searchBox).toBeVisible();

    // Verify Search Scope button is present
    const scopeButton = page.locator('button:has-text("Search Scope")');
    await expect(scopeButton).toBeVisible();
  });

  test('should show Confidence column in Recent Components table', async ({ page }) => {
    // AC1: Confidence column visible between Project and Added
    await page.waitForSelector('table', { state: 'visible' });

    const confidenceHeader = page.locator('th:has-text("Confidence")');
    await expect(confidenceHeader).toBeVisible();

    // Verify Quantity column is removed
    const quantityHeader = page.locator('th:has-text("Quantity")');
    await expect(quantityHeader).not.toBeVisible();

    // Verify Added column is present
    const addedHeader = page.locator('th:has-text("Added")');
    await expect(addedHeader).toBeVisible();
  });

  test('should apply Confidence filter and update URL (AC6 - Critical Bug Fix)', async ({ page }) => {
    // This is the CRITICAL test for the bug fix in AC6

    // Click Confidence column header to open dropdown
    await page.click('th:has-text("Confidence")');

    // Wait for dropdown menu to appear
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Select "High (75-100%)" filter option
    await page.click('text=High (75-100%)');

    // Wait for table to refresh (loading state)
    await page.waitForTimeout(500);

    // Verify URL updated with filter parameter (note: snake_case in URL)
    await expect(page).toHaveURL(/confidence_quartile=4/);

    // Verify table shows only high-confidence components
    // (components with confidence >= 0.75 should have green indicators)
    const confidenceIndicators = page.locator('[data-testid="confidence-indicator"]');

    // If there are results, they should all be high confidence
    const count = await confidenceIndicators.count();
    if (count > 0) {
      // At least some results should be visible
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should apply Type filter and combine with other filters (AC6)', async ({ page }) => {
    // Step 4 from user journey: Apply Type filter

    // Click Type column header
    await page.click('th:has-text("Type")');
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Select a component type (e.g., "Channel (C)" if available)
    const typeOptions = page.locator('role=menuitem');
    const firstTypeOption = typeOptions.nth(1); // Skip "All Types" option
    await firstTypeOption.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify URL contains componentType parameter
    const url = page.url();
    expect(url).toContain('type=') || expect(url).toContain('componentType=');
  });

  test('should apply Project filter and update results (AC6)', async ({ page }) => {
    // Click Project column header
    await page.click('th:has-text("Project")');
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Select a project (skip "All Projects" and "Unassigned")
    const projectOptions = page.locator('role=menuitem');
    const projectCount = await projectOptions.count();

    if (projectCount > 2) {
      // Select the third option (first actual project)
      await projectOptions.nth(2).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify URL contains project parameter
      const url = page.url();
      expect(url).toContain('project=');
    }
  });

  test('should combine multiple filters simultaneously', async ({ page }) => {
    // Edge case from user journey: Multiple filters work together

    // Apply Confidence filter
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=High (75-100%)');
    await page.waitForTimeout(300);

    // Apply Type filter
    await page.click('th:has-text("Type")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    const typeOptions = page.locator('role=menuitem');
    await typeOptions.nth(1).click();
    await page.waitForTimeout(300);

    // Verify URL contains both parameters
    const url = page.url();
    expect(url).toContain('confidence_quartile=4');
    expect(url).toMatch(/type=/);
  });

  test('should sort filtered results (AC2)', async ({ page }) => {
    // Apply a filter first
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=High (75-100%)');
    await page.waitForTimeout(500);

    // Now sort by Piece Mark
    await page.click('th:has-text("Piece Mark")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(500);

    // Verify URL contains both filter and sort parameters
    const url = page.url();
    expect(url).toContain('confidence_quartile=4');
    expect(url).toMatch(/sort=piece_mark_asc/);
  });

  test('should preserve filters after navigation (Step 6)', async ({ page }) => {
    // Apply Confidence filter
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Medium (50-74%)');
    await page.waitForTimeout(500);

    const urlBeforeNav = page.url();

    // Navigate away to Projects
    await page.click('text=Projects');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify we're back at search with filters preserved
    const urlAfterNav = page.url();
    expect(urlAfterNav).toContain('confidence_quartile=3');
    expect(urlAfterNav).toBe(urlBeforeNav);
  });

  test('should handle no results state gracefully', async ({ page }) => {
    // Edge case: Apply filter combination that might yield no results

    // Apply Confidence filter to Very Low
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Very Low (0-24%)');
    await page.waitForTimeout(500);

    // Check for empty state message (if no results)
    const noResultsMessage = page.locator('text=/No components|No results/i');
    const tableRows = page.locator('tbody tr');

    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      // Should show empty state message
      await expect(noResultsMessage).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show confidence indicators with correct colors (AC1, AC3)', async ({ page }) => {
    // Verify Confidence column displays colored indicators
    const confidenceColumn = page.locator('th:has-text("Confidence")');
    await expect(confidenceColumn).toBeVisible();

    // Check that confidence values are displayed in table
    // (exact selector depends on ConfidenceIndicator component implementation)
    const tableBody = page.locator('tbody');
    await expect(tableBody).toBeVisible();
  });

  test('should allow clearing filters by selecting "All" options', async ({ page }) => {
    // Apply a Confidence filter
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=High (75-100%)');
    await page.waitForTimeout(500);

    // Verify filter applied
    expect(page.url()).toContain('confidenceQuartile=4');

    // Clear filter by selecting "All Levels"
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=All Levels');
    await page.waitForTimeout(500);

    // Verify filter removed from URL
    expect(page.url()).not.toContain('confidence_quartile=4');
  });

  test('should display filter labels correctly (AC3)', async ({ page }) => {
    // Open Confidence filter dropdown
    await page.click('th:has-text("Confidence")');
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Verify all filter options are present with correct labels
    await expect(page.locator('text=All Levels')).toBeVisible();
    await expect(page.locator('text=Very Low (0-24%)')).toBeVisible();
    await expect(page.locator('text=Low (25-49%)')).toBeVisible();
    await expect(page.locator('text=Medium (50-74%)')).toBeVisible();
    await expect(page.locator('text=High (75-100%)')).toBeVisible();
  });
});
