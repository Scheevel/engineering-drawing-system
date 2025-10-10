import { test, expect } from '@playwright/test';

/**
 * E2E Test for Confidence Column Sorting
 *
 * Verifies that confidence sorting (ascending and descending) properly orders results.
 */

test.describe('Confidence Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { state: 'visible' });
    await page.waitForTimeout(1000);
  });

  test('should sort confidence ascending (low to high)', async ({ page }) => {
    // Helper to extract confidence percentages from table
    const getConfidenceValues = async () => {
      // Confidence is typically shown as "20%" or similar
      const cells = await page.locator('tbody tr td:nth-child(5)').allTextContents();
      return cells.map(text => {
        // Extract numeric value from strings like "20%", "Low confidence - Manual review required 20%", etc.
        const match = text.match(/(\d+)%/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(val => val !== null);
    };

    // Click Confidence header
    const confidenceHeader = page.locator('th:has-text("Confidence")').first();
    await confidenceHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Click Sort Ascending
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // Verify URL
    await expect(page).toHaveURL(/sort=confidence_asc/);

    // Get confidence values
    const confidences = await getConfidenceValues();
    console.log('Confidence values (ascending):', confidences);

    // Verify ascending order (low to high)
    expect(confidences.length).toBeGreaterThan(0);
    for (let i = 0; i < confidences.length - 1; i++) {
      expect(confidences[i]).toBeLessThanOrEqual(confidences[i + 1]);
    }
  });

  test('should sort confidence descending (high to low)', async ({ page }) => {
    const getConfidenceValues = async () => {
      const cells = await page.locator('tbody tr td:nth-child(5)').allTextContents();
      return cells.map(text => {
        const match = text.match(/(\d+)%/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(val => val !== null);
    };

    // Click Confidence header
    const confidenceHeader = page.locator('th:has-text("Confidence")').first();
    await confidenceHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Click Sort Descending
    await page.click('text=Sort Descending');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // Verify URL
    await expect(page).toHaveURL(/sort=confidence_desc/);

    // Get confidence values
    const confidences = await getConfidenceValues();
    console.log('Confidence values (descending):', confidences);

    // Verify descending order (high to low)
    expect(confidences.length).toBeGreaterThan(0);
    for (let i = 0; i < confidences.length - 1; i++) {
      expect(confidences[i]).toBeGreaterThanOrEqual(confidences[i + 1]);
    }
  });

  test('should properly cycle: asc → desc → asc for confidence', async ({ page }) => {
    const getConfidenceValues = async () => {
      const cells = await page.locator('tbody tr td:nth-child(5)').allTextContents();
      return cells.map(text => {
        const match = text.match(/(\d+)%/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(val => val !== null);
    };

    const confidenceHeader = page.locator('th:has-text("Confidence")').first();

    // Sort ascending
    await confidenceHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    const conf1 = await getConfidenceValues();
    console.log('1st sort (asc):', conf1.slice(0, 5));

    // Sort descending
    await confidenceHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Descending');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    const conf2 = await getConfidenceValues();
    console.log('2nd sort (desc):', conf2.slice(0, 5));

    // Verify they're different
    expect(conf2).not.toEqual(conf1);

    // Sort ascending again
    await confidenceHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    const conf3 = await getConfidenceValues();
    console.log('3rd sort (asc):', conf3.slice(0, 5));

    // Should match first sort
    expect(conf3).toEqual(conf1);
  });
});
