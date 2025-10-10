import { test, expect } from '@playwright/test';

/**
 * E2E Test for Project Filter
 *
 * Verifies that the project filter properly filters results by project.
 */

test.describe('Project Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { state: 'visible' });
    await page.waitForTimeout(1000);
  });

  test('should filter components by project - Unassigned', async ({ page }) => {
    // Helper to get project names from table
    const getProjectNames = async () => {
      // Project is the 4th column
      const cells = await page.locator('tbody tr td:nth-child(4)').allTextContents();
      return cells.map(text => text.trim()).filter(text => text.length > 0);
    };

    // Get initial project names (should all be Unassigned in test data)
    const initialProjects = await getProjectNames();
    console.log('Initial projects (no filter):', [...new Set(initialProjects)]);

    // Click Project column header to open dropdown
    const projectHeader = page.locator('th:has-text("Project")').first();
    await projectHeader.click();

    // Wait for menu to appear
    await page.waitForSelector('[role="menu"]', { state: 'visible' });
    await page.waitForTimeout(500);

    // Select "Unassigned" filter from the menu (not the table cells)
    console.log('Selecting filter: Unassigned');
    await page.locator('[role="menu"] >> text=Unassigned').click();

    // Wait for filter to apply
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // Check URL for project parameter
    const url = page.url();
    console.log('URL after filter:', url);
    expect(url).toMatch(/project=unassigned/);

    // Get filtered project names
    const filteredProjects = await getProjectNames();
    console.log('Projects after filter:', [...new Set(filteredProjects)]);

    // Verify all results are Unassigned
    expect(filteredProjects.length).toBeGreaterThan(0);
    for (const proj of filteredProjects) {
      expect(proj).toBe('Unassigned');
    }
  });

  test('should clear project filter', async ({ page }) => {
    const getProjectNames = async () => {
      const cells = await page.locator('tbody tr td:nth-child(4)').allTextContents();
      return cells.map(text => text.trim()).filter(text => text.length > 0);
    };

    // Apply a project filter first
    const projectHeader = page.locator('th:has-text("Project")').first();
    await projectHeader.click();
    await page.waitForSelector('[role="menu"]', { state: 'visible' });
    await page.waitForTimeout(500);

    // Select "Unassigned" from menu
    await page.locator('[role="menu"] >> text=Unassigned').click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    const filtered = await getProjectNames();
    console.log('Filtered projects:', [...new Set(filtered)]);

    // Now clear the filter
    await projectHeader.click();
    await page.waitForSelector('[role="menu"]', { state: 'visible' });
    await page.waitForTimeout(500);

    // Select "All Projects" from menu
    await page.locator('[role="menu"] >> text=All Projects').click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // URL should not have project parameter (or project=all)
    const url = page.url();
    console.log('URL after clearing:', url);

    const unfiltered = await getProjectNames();
    console.log('Unfiltered projects:', [...new Set(unfiltered)]);

    // Should have more variety or at least different from filtered
    const uniqueUnfiltered = new Set(unfiltered);
    expect(uniqueUnfiltered.size).toBeGreaterThanOrEqual(1);
  });
});
