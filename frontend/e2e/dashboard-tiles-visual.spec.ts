/**
 * Dashboard Tiles Visual Test
 * Bug Report: "View Drawings" title not same size as other tiles
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard Tiles Visual Consistency', () => {
  test('should have consistent title sizes across all tiles', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await page.screenshot({
      path: '../.playwright-mcp/dashboard-tiles-overview.png',
      fullPage: true
    });

    // Get all Quick Action tiles
    const tiles = page.locator('h3'); // component="h3" from Dashboard.tsx line 85

    // Check each tile title
    const titles = await tiles.allTextContents();
    console.log('=== TILE TITLES ===');
    console.log(titles);

    // Get computed styles for each h3 title
    for (let i = 0; i < await tiles.count(); i++) {
      const tile = tiles.nth(i);
      const text = await tile.textContent();
      const fontSize = await tile.evaluate(el => window.getComputedStyle(el).fontSize);
      const fontWeight = await tile.evaluate(el => window.getComputedStyle(el).fontWeight);
      const lineHeight = await tile.evaluate(el => window.getComputedStyle(el).lineHeight);

      console.log(`\nTile ${i + 1}: "${text}"`);
      console.log(`  Font Size: ${fontSize}`);
      console.log(`  Font Weight: ${fontWeight}`);
      console.log(`  Line Height: ${lineHeight}`);
    }

    // Take individual tile screenshots
    const quickActionsGrid = page.locator('h6:has-text("Quick Actions")').locator('..').locator('..').locator('> div').last();
    const cards = quickActionsGrid.locator('> div');

    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i);
      const title = await card.locator('h3').textContent();
      const fileName = title?.toLowerCase().replace(/\s+/g, '-') || `card-${i}`;

      await card.screenshot({
        path: `../.playwright-mcp/dashboard-tile-${fileName}.png`
      });
    }

    console.log('\n✅ Screenshots captured for visual inspection');
  });
});
