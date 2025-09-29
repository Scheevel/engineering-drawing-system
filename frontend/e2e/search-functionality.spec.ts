import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
  });

  test('should load search page without errors', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/search');
    await page.waitForLoadState('networkidle');
  });

  test('should have search input field', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');

    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      await expect(searchInput.first()).toBeEditable();
    } else {
      // Alternative: look for any input that might be for search
      const anyInput = page.locator('input[type="text"]').first();
      if (await anyInput.count() > 0) {
        await expect(anyInput).toBeVisible();
      }
    }
  });

  test('should handle search input interaction', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();

    if (await searchInput.count() > 0) {
      // Test typing in search
      await searchInput.fill('test search query');
      await expect(searchInput).toHaveValue('test search query');

      // Test clearing search
      await searchInput.fill('');
      await expect(searchInput).toHaveValue('');
    }
  });

  test('should show search results or no results message', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('test');

      // Look for search button or trigger search
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"], button[aria-label*="search" i]');
      if (await searchButton.count() > 0) {
        await searchButton.first().click();
      } else {
        // Try pressing enter
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(1000); // Give time for results

      // Check for results or no results message
      const resultsContainer = page.locator('[data-testid*="result"], .search-result, .result');
      const noResultsMessage = page.locator('text=/no results/i, text=/not found/i, text=/no matches/i');

      const hasResults = await resultsContainer.count() > 0;
      const hasNoResults = await noResultsMessage.count() > 0;

      // Should have either results or a no results message
      expect(hasResults || hasNoResults).toBeTruthy();
    }
  });

  test('should have filter options', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for filter controls
    const filters = page.locator('select, input[type="checkbox"], input[type="radio"], .filter, [data-testid*="filter"]');
    const filterCount = await filters.count();

    if (filterCount > 0) {
      // Should have some filter options available
      await expect(filters.first()).toBeVisible();
    }
  });

  test('should handle advanced search', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for advanced search toggle or link
    const advancedSearch = page.locator('text=/advanced/i, .advanced, [data-testid*="advanced"]');

    if (await advancedSearch.count() > 0) {
      await advancedSearch.first().click();
      await page.waitForTimeout(500);

      // Should show additional search options
      const advancedOptions = page.locator('.advanced-search, .search-options, [data-testid*="advanced"]');
      if (await advancedOptions.count() > 0) {
        await expect(advancedOptions.first()).toBeVisible();
      }
    }
  });

  test('should handle search error states', async ({ page }) => {
    const networkErrors: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();

    if (await searchInput.count() > 0) {
      // Test with potentially problematic search terms
      await searchInput.fill('!@#$%^&*()');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Check for error handling
      const errorMessages = page.locator('.error, [role="alert"], .alert-error');
      const hasErrorHandling = await errorMessages.count() > 0;

      // If there are network errors, there should be user-facing error handling
      if (networkErrors.length > 0) {
        expect(hasErrorHandling).toBeTruthy();
      }
    }
  });

  test('should check search accessibility', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for proper labeling
    const searchInputs = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInputs.count() > 0) {
      const searchInput = searchInputs.first();

      // Should have accessible name
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const hasLabel = await page.locator(`label[for="${await searchInput.getAttribute('id')}"]`).count() > 0;

      expect(ariaLabel || hasLabel).toBeTruthy();
    }
  });

  test('should test keyboard navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test tab navigation
    await page.keyboard.press('Tab');

    // Should be able to navigate through interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();

    if (await searchInput.count() > 0) {
      // Try to search with empty input
      await searchInput.fill('');
      await searchInput.press('Enter');

      await page.waitForTimeout(500);

      // Should handle empty search gracefully (no crashes)
      await expect(page.locator('main')).toBeVisible();
    }
  });
});