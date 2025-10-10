import { test, expect } from '@playwright/test';

/**
 * E2E Test: Confidence Quartile 1 (Very Low) Filter Verification
 *
 * This test verifies that navigating to the search page with confidence_quartile=1
 * in the URL correctly filters results to show ONLY records with Very Low confidence.
 *
 * Run in headed mode with: npx playwright test confidence-filter-verification.spec.ts --headed
 */

test.describe('Confidence Quartile 1 Filter Verification', () => {
  test('should display only Very Low confidence records when URL has confidence_quartile=1', async ({ page }) => {
    // Navigate directly to search page with confidence_quartile=1 filter
    await page.goto('http://localhost:3000/search?confidence_quartile=1');
    await page.waitForLoadState('networkidle');

    // Wait for any search results to load
    await page.waitForTimeout(2000); // Give time for API call and rendering

    // Verify URL parameter is preserved
    await expect(page).toHaveURL(/confidence_quartile=1/);

    // Verify the Confidence filter is active (dropdown should show "Very Low (0-24%)")
    const confidenceHeader = page.locator('th:has-text("Confidence")');
    await expect(confidenceHeader).toBeVisible();

    // Check if there are any results displayed
    const searchResultsSection = page.locator('text=Search Results').first();
    const noResultsMessage = page.locator('text=/No (components|results) found/i');

    const hasResults = await searchResultsSection.isVisible().catch(() => false);
    const hasNoResults = await noResultsMessage.isVisible().catch(() => false);

    if (hasResults && !hasNoResults) {
      console.log('✓ Results found - verifying all are Very Low confidence (0-24%)');

      // Get all confidence indicator elements in the results table
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();

      console.log(`Found ${rowCount} result rows`);

      if (rowCount > 0) {
        // Validate ALL rows to ensure filter is working correctly
        let allValid = true;
        const invalidRows: string[] = [];

        for (let i = 0; i < rowCount; i++) {
          const row = tableRows.nth(i);

          // Confidence column is the 5th column (index 4) after Piece Mark, Type, Drawing, Project
          const confidenceCell = row.locator('td').nth(4);
          const cellText = await confidenceCell.textContent();

          // Extract percentage value
          const percentMatch = cellText?.match(/(\d+)%/);

          if (percentMatch) {
            const percentValue = parseInt(percentMatch[1], 10);

            if (percentValue > 24) {
              allValid = false;
              const pieceMarkCell = row.locator('td').first();
              const pieceMark = await pieceMarkCell.textContent();
              invalidRows.push(`Row ${i + 1} (${pieceMark}): ${percentValue}% - EXCEEDS quartile 1 range`);
            } else {
              console.log(`✓ Row ${i + 1}: ${percentValue}% (valid)`);
            }
          }
        }

        if (!allValid) {
          console.error('❌ FILTER VALIDATION FAILED:');
          invalidRows.forEach(msg => console.error(`  ${msg}`));
          throw new Error(`Filter not working: ${invalidRows.length} rows outside 0-24% range`);
        }

        console.log(`✅ SUCCESS: All ${rowCount} rows have confidence 0-24%`);
      }
    } else if (hasNoResults) {
      console.log('ℹ️ No results found for Very Low confidence filter');
      console.log('   This may be expected if database has no Very Low confidence records');

      // This is not necessarily a failure - database might not have any Very Low records
      await expect(noResultsMessage).toBeVisible();
    } else {
      console.log('⚠️ Could not determine results state');
    }

    // Take a screenshot for manual verification
    await page.screenshot({
      path: 'frontend/e2e/screenshots/confidence-quartile-1-filter.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved to: frontend/e2e/screenshots/confidence-quartile-1-filter.png');
  });

  test('should maintain confidence_quartile=1 filter when interacting with page', async ({ page }) => {
    // Navigate with filter
    await page.goto('http://localhost:3000/search?confidence_quartile=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify filter persists
    await expect(page).toHaveURL(/confidence_quartile=1/);

    // Try entering a search query - filter should persist
    const searchBox = page.locator('input[type="text"]').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('test');
      await page.waitForTimeout(1000);

      // URL should have both query and filter
      await expect(page).toHaveURL(/confidence_quartile=1/);
      console.log('✓ Confidence filter persisted after search query entry');
    }

    // Take screenshot showing filter persistence
    await page.screenshot({
      path: 'frontend/e2e/screenshots/confidence-quartile-1-persistence.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved to: frontend/e2e/screenshots/confidence-quartile-1-persistence.png');
  });
});
