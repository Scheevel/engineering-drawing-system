import { test, expect } from '@playwright/test';

test.describe('Application Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main application header', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Engineering Drawing Index System')).toBeVisible();
  });

  test('should have working navigation menu', async ({ page }) => {
    // Check if navigation drawer is present
    const navigation = page.locator('nav, [role="navigation"]');
    await expect(navigation).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();

    // Dashboard should be the default route
    await expect(page).toHaveURL('/');
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/search');
  });

  test('should navigate to upload page', async ({ page }) => {
    await page.goto('/upload');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/upload');
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/projects');
  });

  test('should navigate to drawings page', async ({ page }) => {
    await page.goto('/drawings');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/drawings');
  });

  test('should navigate to schemas page', async ({ page }) => {
    await page.goto('/schemas');
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL('/schemas');
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should not have console errors on page load', async ({ page }) => {
    const consoleMessages: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for console errors
    const errors = consoleMessages.filter(msg =>
      !msg.includes('Warning:') && // React warnings are OK for now
      !msg.includes('Download the React DevTools') // Dev tools warning is OK
    );

    expect(errors).toEqual([]);
  });

  test('should have proper document title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Engineering Drawing/);
  });

  test('should not have broken images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for broken images
    const images = await page.locator('img').all();
    for (const image of images) {
      const src = await image.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        // For actual image URLs, check if they load
        const response = await page.request.get(src);
        expect(response.status()).toBeLessThan(400);
      }
    }
  });
});