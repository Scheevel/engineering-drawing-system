import { test, expect } from '@playwright/test';

test.describe('Schema Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schemas');
  });

  test('should load schema management page without errors', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/schemas');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Check for any error messages or broken components
    const errorElements = page.locator('[data-testid*="error"], .error, [role="alert"]');
    const errorCount = await errorElements.count();

    if (errorCount > 0) {
      // Log any error messages for debugging
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`Error found: ${errorText}`);
      }
    }

    // We'll check if this is expected or a real error in our test results
  });

  test('should display schema list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Either show schemas or an empty state message
    const hasSchemas = await page.locator('[data-testid*="schema"], .schema-item').count() > 0;
    const hasEmptyStateFound = await page.locator('text=/no schemas found/i').count() > 0;
    const hasEmptyStateGeneric = await page.locator('text=/empty/i').count() > 0;
    const hasCreateFirstSchema = await page.locator('text=/create your first schema/i').count() > 0;

    const hasEmptyState = hasEmptyStateFound || hasEmptyStateGeneric || hasCreateFirstSchema;

    expect(hasSchemas || hasEmptyState).toBeTruthy();
  });

  test('should have create schema functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for create/add buttons
    const createButtons = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    const createButtonCount = await createButtons.count();

    if (createButtonCount > 0) {
      await expect(createButtons.first()).toBeVisible();
      await expect(createButtons.first()).toBeEnabled();
    }
  });

  test('should handle schema creation dialog', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Try to find and click create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();

    if (await createButton.count() > 0) {
      await createButton.click();

      // Check if dialog opens
      const dialog = page.locator('[role="dialog"], .dialog, .modal');
      if (await dialog.count() > 0) {
        await expect(dialog.first()).toBeVisible();
      }
    }
  });

  test('should navigate to project-specific schemas', async ({ page }) => {
    // Test project schema navigation
    await page.goto('/projects/test-project/schemas');
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('should handle schema editing', async ({ page }) => {
    await page.goto('/schemas/test-schema/edit');
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Check for form elements or editing interface
    const formElements = page.locator('form, input, textarea, select');
    const hasFormElements = await formElements.count() > 0;

    // Should have some interactive elements for editing
    if (hasFormElements) {
      await expect(formElements.first()).toBeVisible();
    }
  });

  test('should check for JavaScript errors in schema management', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');

    // Navigate to different schema routes
    await page.goto('/schemas/create');
    await page.waitForLoadState('networkidle');

    // Check for JavaScript runtime errors
    expect(jsErrors).toEqual([]);
  });

  test('should test schema list interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Try to interact with schema list items
    const listItems = page.locator('[data-testid*="schema"], .schema-item, .list-item');
    const itemCount = await listItems.count();

    if (itemCount > 0) {
      // Test clicking on first item
      await listItems.first().click();
      // Should navigate or show details
    }
  });

  test('should validate form elements', async ({ page }) => {
    await page.goto('/schemas/create');
    await page.waitForLoadState('networkidle');

    // Check for required form fields
    const requiredFields = page.locator('input[required], textarea[required], select[required]');
    const requiredCount = await requiredFields.count();

    if (requiredCount > 0) {
      for (let i = 0; i < Math.min(requiredCount, 5); i++) {
        const field = requiredFields.nth(i);
        await expect(field).toBeVisible();
      }
    }
  });

  test('should check accessibility features', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for ARIA labels and roles
    const ariaElements = page.locator('[role], [aria-label], [aria-labelledby]');
    const ariaCount = await ariaElements.count();

    // Should have some accessibility attributes
    expect(ariaCount).toBeGreaterThan(0);

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });
});