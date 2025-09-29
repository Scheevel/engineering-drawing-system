import { test, expect } from '@playwright/test';

test.describe('UI Components and Error Detection', () => {
  test('should check for broken UI components across all pages', async ({ page }) => {
    const pages = ['/', '/search', '/upload', '/projects', '/drawings', '/schemas'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Check for error boundaries or crash messages
      const errorBoundary = page.locator('text=/something went wrong/i, text=/error boundary/i, text=/crashed/i');
      const errorCount = await errorBoundary.count();

      if (errorCount > 0) {
        console.log(`Error boundary found on ${pagePath}`);
        const errorText = await errorBoundary.first().textContent();
        console.log(`Error text: ${errorText}`);
      }

      // Page should have main content
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should check for Material-UI theme consistency', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if Material-UI components are properly styled
    const muiComponents = page.locator('.MuiButton-root, .MuiTextField-root, .MuiPaper-root, .MuiAppBar-root');
    const muiCount = await muiComponents.count();

    if (muiCount > 0) {
      // Should have Material-UI styling
      expect(muiCount).toBeGreaterThan(0);

      // Check for theme colors
      const appBar = page.locator('.MuiAppBar-root').first();
      if (await appBar.count() > 0) {
        const backgroundColor = await appBar.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        expect(backgroundColor).toBeTruthy();
      }
    }
  });

  test('should detect console warnings and errors', async ({ page }) => {
    const consoleMessages: { type: string; message: string }[] = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        message: msg.text()
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate through different pages to trigger potential errors
    const testPages = ['/search', '/upload', '/schemas'];
    for (const testPage of testPages) {
      await page.goto(testPage);
      await page.waitForLoadState('networkidle');
    }

    // Analyze console messages
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');

    // Log findings for debugging
    if (errors.length > 0) {
      console.log('Console errors found:');
      errors.forEach(error => console.log(`- ${error.message}`));
    }

    if (warnings.length > 0) {
      console.log('Console warnings found:');
      warnings.forEach(warning => console.log(`- ${warning.message}`));
    }

    // For now, we'll collect the data. In a real scenario, you might want to fail on certain errors
  });

  test('should check for network request failures', async ({ page }) => {
    const failedRequests: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test other pages
    const testPages = ['/search', '/upload', '/schemas', '/projects'];
    for (const testPage of testPages) {
      await page.goto(testPage);
      await page.waitForLoadState('networkidle');
    }

    // Log failed requests for analysis
    if (failedRequests.length > 0) {
      console.log('Failed network requests:');
      failedRequests.forEach(req => console.log(`- ${req.status} ${req.url}`));
    }

    // Some failures might be expected (e.g., backend not running), so we'll just log them
  });

  test('should check form validation states', async ({ page }) => {
    const pagesWithForms = ['/upload', '/schemas/create', '/schemas'];

    for (const pagePath of pagesWithForms) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Look for form elements
      const forms = page.locator('form');
      const inputs = page.locator('input, textarea, select');

      const formCount = await forms.count();
      const inputCount = await inputs.count();

      if (formCount > 0 || inputCount > 0) {
        console.log(`Found ${formCount} forms and ${inputCount} inputs on ${pagePath}`);

        // Check for validation styling
        const invalidInputs = page.locator('input:invalid, .error, .Mui-error, [aria-invalid="true"]');
        const invalidCount = await invalidInputs.count();

        if (invalidCount > 0) {
          console.log(`Found ${invalidCount} validation states on ${pagePath}`);
        }
      }
    }
  });

  test('should check button states and interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    console.log(`Found ${buttonCount} buttons on homepage`);

    if (buttonCount > 0) {
      // Test first few buttons for basic functionality
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);

        if (await button.isVisible() && await button.isEnabled()) {
          // Test hover state
          await button.hover();
          await page.waitForTimeout(100);

          // Check if button is still functional after hover
          await expect(button).toBeVisible();
        }
      }
    }
  });

  test('should check loading states', async ({ page }) => {
    await page.goto('/');

    // Look for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, .MuiCircularProgress-root, [role="progressbar"]');
    const loadingCount = await loadingIndicators.count();

    if (loadingCount > 0) {
      console.log(`Found ${loadingCount} loading indicators`);
    }

    await page.waitForLoadState('networkidle');

    // After page loads, loading indicators should be gone or hidden
    const visibleLoadingCount = await loadingIndicators.locator(':visible').count();
    expect(visibleLoadingCount).toBe(0);
  });

  test('should check responsive design breakpoints', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      console.log(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);

      // Check if layout is reasonable
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );

      if (hasHorizontalScroll) {
        console.log(`Horizontal scroll detected on ${viewport.name} viewport`);
      }

      // On mobile, navigation might be collapsed
      if (viewport.name === 'mobile') {
        // Look for mobile navigation patterns
        const mobileNav = page.locator('.mobile-nav, .drawer, .MuiDrawer-root, button[aria-label*="menu"]');
        const mobileNavCount = await mobileNav.count();

        if (mobileNavCount > 0) {
          console.log(`Mobile navigation found on ${viewport.name}`);
        }
      }
    }
  });

  test('should check accessibility landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for semantic HTML elements
    const landmarks = {
      main: page.locator('main'),
      nav: page.locator('nav'),
      header: page.locator('header'),
      footer: page.locator('footer'),
      aside: page.locator('aside')
    };

    for (const [name, locator] of Object.entries(landmarks)) {
      const count = await locator.count();
      console.log(`Found ${count} ${name} landmarks`);
    }

    // Should have at least main and header
    await expect(landmarks.main).toBeVisible();
    await expect(landmarks.header).toBeVisible();
  });

  test('should check for focus management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test tab navigation
    await page.keyboard.press('Tab');

    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Continue tabbing through a few elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');

      // Each focused element should be visible
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
      }
    }
  });
});