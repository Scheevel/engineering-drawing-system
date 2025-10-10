import { test, expect } from '@playwright/test';

/**
 * E2E Test for Sort Cycling Issue
 *
 * Tests that clicking a column header to sort asc → desc → asc works correctly.
 * User reported that the 3rd sort attempt (back to ascending) fails with results unchanged.
 */

test.describe('Column Sort Cycling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');

    // Wait for initial data to load
    await page.waitForSelector('table', { state: 'visible' });
    await page.waitForTimeout(1000); // Let data settle
  });

  test('should cycle through sort states: asc → desc → asc on Piece Mark column', async ({ page }) => {
    // Helper function to extract piece marks from the table
    const getPieceMarks = async () => {
      const cells = await page.locator('tbody tr td:first-child').allTextContents();
      return cells.map(text => text.trim()).filter(text => text.length > 0);
    };

    // Helper function to check if array is sorted
    const isSortedAscending = (arr: string[]) => {
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].toLowerCase() > arr[i + 1].toLowerCase()) {
          return false;
        }
      }
      return true;
    };

    const isSortedDescending = (arr: string[]) => {
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].toLowerCase() < arr[i + 1].toLowerCase()) {
          return false;
        }
      }
      return true;
    };

    // STEP 1: Click Piece Mark header to sort ASCENDING
    console.log('STEP 1: Sorting ascending...');
    const pieceMarkHeader = page.locator('th:has-text("Piece Mark")').first();
    await pieceMarkHeader.click();

    // Wait for dropdown menu
    await page.waitForSelector('role=menu', { state: 'visible' });

    // Click "Sort Ascending"
    await page.click('text=Sort Ascending');

    // Wait for sort to apply
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Verify URL contains sort parameter
    await expect(page).toHaveURL(/sort=piece_mark_asc/);

    // Get piece marks and verify ascending order
    const pieceMarks1 = await getPieceMarks();
    console.log('Piece marks after 1st sort (ascending):', pieceMarks1.slice(0, 5));
    expect(pieceMarks1.length).toBeGreaterThan(0);
    expect(isSortedAscending(pieceMarks1)).toBeTruthy();

    // STEP 2: Click Piece Mark header again to sort DESCENDING
    console.log('STEP 2: Sorting descending...');
    await pieceMarkHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Descending');

    // Wait for sort to apply
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Verify URL contains desc parameter
    await expect(page).toHaveURL(/sort=piece_mark_desc/);

    // Get piece marks and verify descending order
    const pieceMarks2 = await getPieceMarks();
    console.log('Piece marks after 2nd sort (descending):', pieceMarks2.slice(0, 5));
    expect(pieceMarks2.length).toBeGreaterThan(0);
    expect(isSortedDescending(pieceMarks2)).toBeTruthy();

    // Verify the order actually changed from step 1
    expect(pieceMarks2).not.toEqual(pieceMarks1);

    // STEP 3: Click Piece Mark header again to sort ASCENDING (CRITICAL TEST)
    console.log('STEP 3: Sorting ascending again (the problematic 3rd click)...');
    await pieceMarkHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');

    // Wait for sort to apply
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Verify URL contains asc parameter again
    await expect(page).toHaveURL(/sort=piece_mark_asc/);

    // Get piece marks and verify ascending order again
    const pieceMarks3 = await getPieceMarks();
    console.log('Piece marks after 3rd sort (ascending again):', pieceMarks3.slice(0, 5));
    expect(pieceMarks3.length).toBeGreaterThan(0);

    // CRITICAL: Verify the 3rd sort actually changed the order
    console.log('Comparing 2nd sort (desc) vs 3rd sort (asc)...');
    expect(pieceMarks3).not.toEqual(pieceMarks2); // Should be different from descending

    // Verify it's back to ascending order
    expect(isSortedAscending(pieceMarks3)).toBeTruthy();

    // Should match the first ascending sort result
    expect(pieceMarks3).toEqual(pieceMarks1);
  });

  test('should cycle through sort states on Type column', async ({ page }) => {
    const getTypes = async () => {
      // Type is the second column
      const cells = await page.locator('tbody tr td:nth-child(2)').allTextContents();
      return cells.map(text => text.trim()).filter(text => text.length > 0);
    };

    const typeHeader = page.locator('th:has-text("Type")').first();

    // Sort ascending
    await typeHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    const types1 = await getTypes();
    console.log('Types after 1st sort (asc):', types1.slice(0, 3));

    // Sort descending
    await typeHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Descending');
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    const types2 = await getTypes();
    console.log('Types after 2nd sort (desc):', types2.slice(0, 3));
    expect(types2).not.toEqual(types1);

    // Sort ascending again (3rd click - the problematic case)
    await typeHeader.click();
    await page.waitForSelector('role=menu', { state: 'visible' });
    await page.click('text=Sort Ascending');
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    const types3 = await getTypes();
    console.log('Types after 3rd sort (asc again):', types3.slice(0, 3));

    // CRITICAL: 3rd sort should change results back to ascending
    expect(types3).not.toEqual(types2);
    expect(types3).toEqual(types1);
  });
});
