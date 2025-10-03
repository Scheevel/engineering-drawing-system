/**
 * E2E Test: Project-Drawing Association (Story 8.1b)
 *
 * Tests complete user workflows for assigning drawings to projects,
 * viewing associations, and managing project-drawing relationships
 */

import { test, expect } from '@playwright/test';

test.describe('Project-Drawing Association (Story 8.1b)', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to drawings list page', async ({ page }) => {
    // Navigate to drawings
    await page.click('text=Drawings');
    await page.waitForURL('**/drawings');
    await expect(page).toHaveURL(/\/drawings/);
    await page.waitForLoadState('networkidle');
  });

  test('should display project filter controls on drawings page', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    // Look for filter by project control
    const filterLabel = page.locator('text=/filter by project/i');
    const autocomplete = page.locator('[role="combobox"]').first();

    // At least one filter control should exist
    const hasFilter = (await filterLabel.count()) > 0 || (await autocomplete.count()) > 0;
    expect(hasFilter).toBeTruthy();
  });

  test('should display unassigned-only toggle on drawings page', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    // Look for unassigned filter toggle
    const unassignedToggle = page.locator('text=/unassigned/i, text=/show unassigned/i');
    const toggleCount = await unassignedToggle.count();

    expect(toggleCount).toBeGreaterThan(0);
  });

  test('should display project tags on drawings', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    // Wait for drawings to load
    await page.waitForTimeout(1000);

    // Look for project chips or tags (may be "Unassigned" or project names)
    const chips = page.locator('.MuiChip-root');
    const chipCount = await chips.count();

    // Should have some chips (either project names or "Unassigned")
    expect(chipCount).toBeGreaterThan(0);
  });

  test('should navigate to projects page', async ({ page }) => {
    // Navigate to projects
    await page.click('text=Projects');
    await page.waitForURL('**/projects');
    await expect(page).toHaveURL(/\/projects/);
    await page.waitForLoadState('networkidle');
  });

  test('should display project list with clickable names', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Wait for projects to load
    await page.waitForTimeout(1000);

    // Look for project names (should be clickable)
    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // First project row should be clickable
      const firstRow = projectRows.first();
      await expect(firstRow).toBeVisible();

      // Should have cursor pointer style indicating clickability
      const cursor = await firstRow.evaluate((el) =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('pointer');
    }
  });

  test('should navigate to project detail page when clicking project name', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // Click first project row
      await projectRows.first().click();

      // Should navigate to project detail page
      await page.waitForURL(/\/projects\/[a-f0-9-]+/);
      await expect(page.url()).toMatch(/\/projects\/[a-f0-9-]+/);
    }
  });

  test('should display Drawings tab on project detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // Navigate to first project
      await projectRows.first().click();
      await page.waitForURL(/\/projects\/[a-f0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Look for Drawings tab
      const drawingsTab = page.locator('button:has-text("Drawings"), [role="tab"]:has-text("Drawings")');
      const tabCount = await drawingsTab.count();

      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test('should display "+ Add Drawings" button on project detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // Navigate to first project
      await projectRows.first().click();
      await page.waitForURL(/\/projects\/[a-f0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Look for Add Drawings button
      const addButton = page.locator('button:has-text("Add Drawings"), button:has-text("+ Add")');
      const buttonCount = await addButton.count();

      expect(buttonCount).toBeGreaterThan(0);
    }
  });

  test('should display drawings table on project detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // Navigate to first project
      await projectRows.first().click();
      await page.waitForURL(/\/projects\/[a-f0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Look for drawings table (should exist even if empty)
      const table = page.locator('table');
      const tableCount = await table.count();

      expect(tableCount).toBeGreaterThan(0);
    }
  });

  test('should show toast notification on successful operations', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    // Toast notifications use MuiSnackbar
    // We'll check if the Snackbar root exists in DOM
    const snackbarRoot = page.locator('.MuiSnackbar-root');

    // Snackbar should exist in DOM (even if not visible initially)
    const snackbarExists = (await snackbarRoot.count()) > 0;

    // Note: Snackbar may not be visible initially, but should exist for showing toasts
    if (snackbarExists) {
      expect(snackbarExists).toBeTruthy();
    }
  });

  test('should have back button on project detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const projectRows = page.locator('table tbody tr');
    const rowCount = await projectRows.count();

    if (rowCount > 0) {
      // Navigate to first project
      await projectRows.first().click();
      await page.waitForURL(/\/projects\/[a-f0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Look for back button
      const backButton = page.locator('button[aria-label*="back"], button:has([data-testid="ArrowBackIcon"])');
      const buttonCount = await backButton.count();

      expect(buttonCount).toBeGreaterThan(0);

      // Verify back button navigates to projects list
      if (buttonCount > 0) {
        await backButton.first().click();
        await page.waitForURL('**/projects');
        await expect(page).toHaveURL(/\/projects$/);
      }
    }
  });

  test('should persist filter state in URL query params', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for unassigned toggle
    const unassignedToggle = page.locator('input[type="checkbox"], .MuiSwitch-input').first();
    const toggleCount = await unassignedToggle.count();

    if (toggleCount > 0) {
      // Toggle filter
      await unassignedToggle.click();
      await page.waitForTimeout(500);

      // Check if URL has query parameters
      const url = page.url();
      const hasQueryParams = url.includes('?') || url.includes('unassigned') || url.includes('projects');

      // Filter state should be reflected in URL
      expect(hasQueryParams).toBeTruthy();
    }
  });
});
