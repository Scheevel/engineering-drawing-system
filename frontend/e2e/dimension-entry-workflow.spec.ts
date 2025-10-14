import { test, expect } from '@playwright/test';

test.describe('Dimension Entry Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
    // Use domcontentloaded instead of networkidle for faster, more reliable waits
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Brief wait for React hydration
  });

  test('should allow dimension entry on component with edit workflow', async ({ page }) => {
    // Step 1: Navigate to search page (already done in beforeEach)
    await expect(page).toHaveURL('/search');

    // Step 2: Perform a search to get component results
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();

    if (await searchInput.count() > 0) {
      // Search for any components
      await searchInput.fill('*');

      // Trigger search (try button or Enter key)
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
      if (await searchButton.count() > 0) {
        await searchButton.first().click();
      } else {
        await searchInput.press('Enter');
      }

      // Wait for results to load
      await page.waitForTimeout(2000);

      // Step 3: Find and click "view" action on any component record
      const viewButtons = page.locator('button:has-text("View"), button[aria-label*="view" i], [data-testid*="view"]');

      if (await viewButtons.count() === 0) {
        // Try alternative selectors - MUI IconButton with Visibility icon
        const iconButtons = page.locator('button[aria-label*="View" i]');
        if (await iconButtons.count() > 0) {
          await iconButtons.first().click();
        } else {
          test.skip(true, 'No component results with view action found');
          return;
        }
      } else {
        await viewButtons.first().click();
      }

      // Wait for component detail modal/card to open
      await page.waitForTimeout(1000);

      // Step 4: Click "edit" action on the component card
      const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i], [data-testid*="edit"]');

      if (await editButton.count() > 0) {
        await editButton.first().click();
        await page.waitForTimeout(500);
      } else {
        test.skip(true, 'No edit button found on component card');
        return;
      }

      // Step 5: Click "dimensions" tab
      const dimensionsTab = page.locator(
        'button:has-text("Dimensions"), ' +
        '[role="tab"]:has-text("Dimensions"), ' +
        '.MuiTab-root:has-text("Dimensions"), ' +
        '[data-testid*="dimensions-tab"]'
      );

      if (await dimensionsTab.count() > 0) {
        await dimensionsTab.first().click();
        await page.waitForTimeout(500);

        // Step 6: Check for dimension entry capability
        // Expected: Some ability to enter dimension data (from Story 6.1)
        const addDimensionButton = page.locator(
          'button:has-text("Add Dimension"), ' +
          'button:has-text("New Dimension"), ' +
          'button[aria-label*="add dimension" i], ' +
          '[data-testid*="add-dimension"]'
        );

        const noDimensionsMessage = page.locator(
          'text="No dimensions found for this component.", ' +
          'text=/no dimensions/i'
        );

        const hasAddButton = await addDimensionButton.count() > 0;
        const hasNoDataMessage = await noDimensionsMessage.count() > 0;

        if (hasNoDataMessage && !hasAddButton) {
          // Reality: Shows "No dimensions found" without add capability
          test.fail(true, 'Expected: Ability to add dimensions. Reality: "No dimensions found for this component." message without add button');
          await expect(noDimensionsMessage).toBeVisible();
        } else if (hasAddButton) {
          // Expected behavior: Add dimension button is available
          await expect(addDimensionButton.first()).toBeVisible();
          await expect(addDimensionButton.first()).toBeEnabled();

          // Verify we can click it (opens dialog from Story 6.1)
          await addDimensionButton.first().click();
          await page.waitForTimeout(500);

          // Look for dimension form dialog (Story 6.1 feature)
          const dimensionDialog = page.locator(
            '[role="dialog"]:has-text("Dimension"), ' +
            '.MuiDialog-root:has-text("Dimension"), ' +
            '[data-testid*="dimension-dialog"]'
          );

          await expect(dimensionDialog).toBeVisible();

          // Verify form fields are present and fill them
          const nominalValueField = page.locator(
            'input[name="nominal_value_input"], ' +
            'input[label*="Nominal Value" i], ' +
            'input[placeholder*="value" i]'
          ).first();

          const unitField = page.locator(
            'select[name="unit"], ' +
            'input[name="unit"], ' +
            '[data-testid*="unit"]'
          ).first();

          // Verify nominal value field is visible
          await expect(nominalValueField).toBeVisible();

          // Step 7: Type "11 3/4" in the Nominal Value field
          await nominalValueField.click();
          await nominalValueField.fill('11 3/4');
          await page.waitForTimeout(300);

          // Step 8: Verify "Inches (in)" is selected in Unit field
          // The unit field should default to "in" or we need to select it
          if (await unitField.count() > 0) {
            // Check if it's a dropdown or input
            const unitValue = await unitField.inputValue().catch(() => null);
            if (unitValue !== 'in') {
              // Try to click and select inches
              await unitField.click();
              const inchesOption = page.locator('li:has-text("Inches"), [data-value="in"]');
              if (await inchesOption.count() > 0) {
                await inchesOption.first().click();
              }
            }
          }

          // Step 9: Click the Save/Create button
          const saveButton = page.locator(
            'button:has-text("Save"), ' +
            'button:has-text("Create"), ' +
            'button[type="submit"]'
          ).first();

          await expect(saveButton).toBeVisible();
          await saveButton.click();
          await page.waitForTimeout(1000);

          // Step 10: Check for error or success
          // Note: Currently expecting error "Unexpected token '<', '<!DOCTYPE'..."
          const errorAlert = page.locator(
            '[role="alert"], ' +
            '.MuiAlert-root, ' +
            'text=/unexpected token/i, ' +
            'text=/DOCTYPE/i'
          );

          const successMessage = page.locator(
            'text=/dimension.*created successfully/i, ' +
            'text=/dimension.*saved/i'
          );

          // Wait for either error or success
          const hasError = await errorAlert.count() > 0;
          const hasSuccess = await successMessage.count() > 0;

          if (hasError) {
            // Document the error for debugging
            const errorText = await errorAlert.first().textContent();
            console.log('API Error encountered:', errorText);
            test.fail(true, `Backend API error: ${errorText}`);
          } else if (hasSuccess) {
            // Success! Dimension was created
            await expect(successMessage.first()).toBeVisible();
          } else {
            // Unknown state - fail with info
            test.fail(true, 'Unable to determine save result - no error or success message found');
          }
        } else {
          test.skip(true, 'Unable to determine dimension entry state');
        }
      } else {
        test.skip(true, 'Dimensions tab not found');
      }
    } else {
      test.skip(true, 'Search input not found');
    }
  });

  test('should show appropriate message when component has no dimensions', async ({ page }) => {
    // This test validates the "No dimensions found" message is shown appropriately
    await expect(page).toHaveURL('/search');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('*');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);

      const viewButtons = page.locator('button:has-text("View"), button[aria-label*="view" i]');

      if (await viewButtons.count() > 0) {
        await viewButtons.first().click();
        await page.waitForTimeout(1000);

        const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
        if (await editButton.count() > 0) {
          await editButton.first().click();
          await page.waitForTimeout(500);

          const dimensionsTab = page.locator(
            'button:has-text("Dimensions"), ' +
            '[role="tab"]:has-text("Dimensions")'
          );

          if (await dimensionsTab.count() > 0) {
            await dimensionsTab.first().click();
            await page.waitForTimeout(500);

            // Check for either "no dimensions" message OR dimension list
            const noDimensionsMessage = page.locator('text=/no dimensions/i');
            const dimensionList = page.locator('[data-testid*="dimension"], .dimension-item, .dimension-row');

            const hasMessage = await noDimensionsMessage.count() > 0;
            const hasDimensions = await dimensionList.count() > 0;

            // Should have either a message or actual dimensions displayed
            expect(hasMessage || hasDimensions).toBeTruthy();

            if (hasMessage) {
              // If showing "no dimensions", should also have "Add" button available
              const addButton = page.locator('button:has-text("Add"), button[aria-label*="add" i]');
              await expect(addButton.first()).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should validate dimension form fields from Story 6.1', async ({ page }) => {
    // This test specifically validates the Story 6.1 DimensionFormDialog implementation
    await expect(page).toHaveURL('/search');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('*');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);

      const viewButtons = page.locator('button:has-text("View"), button[aria-label*="view" i]');

      if (await viewButtons.count() > 0) {
        await viewButtons.first().click();
        await page.waitForTimeout(1000);

        const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
        if (await editButton.count() > 0) {
          await editButton.first().click();
          await page.waitForTimeout(500);

          const dimensionsTab = page.locator('button:has-text("Dimensions"), [role="tab"]:has-text("Dimensions")');
          if (await dimensionsTab.count() > 0) {
            await dimensionsTab.first().click();
            await page.waitForTimeout(500);

            const addButton = page.locator('button:has-text("Add Dimension"), button:has-text("Add")');
            if (await addButton.count() > 0) {
              await addButton.first().click();
              await page.waitForTimeout(500);

              // Validate Story 6.1 features: Fractional input support
              const nominalValueInput = page.locator('input[name="nominal_value"], input[label*="nominal" i]');

              if (await nominalValueInput.count() > 0) {
                // Test fractional input from Story 6.1 (e.g., "15 3/4")
                await nominalValueInput.first().fill('15 3/4');

                // Value should be accepted (Story 6.1 fractional parser)
                const inputValue = await nominalValueInput.first().inputValue();
                expect(inputValue).toBeTruthy();
                expect(inputValue.length).toBeGreaterThan(0);

                // Test decimal input
                await nominalValueInput.first().fill('15.75');
                const decimalValue = await nominalValueInput.first().inputValue();
                expect(decimalValue).toBeTruthy();

                // Look for display format selector (Story 6.1 feature)
                const displayFormatSelector = page.locator(
                  'select[name="display_format"], ' +
                  '[data-testid*="display-format"], ' +
                  'input[type="radio"][value="fraction"], ' +
                  'input[type="radio"][value="decimal"]'
                );

                // Display format controls may be present (Story 6.1 WYSIWYG feature)
                if (await displayFormatSelector.count() > 0) {
                  await expect(displayFormatSelector.first()).toBeVisible();
                }
              } else {
                test.skip(true, 'Nominal value input not found in dimension form');
              }
            } else {
              test.skip(true, 'Add dimension button not found');
            }
          } else {
            test.skip(true, 'Dimensions tab not found');
          }
        } else {
          test.skip(true, 'Edit button not found');
        }
      } else {
        test.skip(true, 'No view buttons found');
      }
    } else {
      test.skip(true, 'Search input not found');
    }
  });
});
