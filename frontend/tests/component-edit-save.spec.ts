import { test, expect } from '@playwright/test';

// Helper function to set up a test component
async function setupTestComponent(page) {
  // Navigate to a page with the component edit functionality
  await page.goto('http://localhost:3000');

  // Mock the API responses for testing
  await page.route('**/api/v1/flexible-components/*', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          id: 'test-component-id',
          piece_mark: 'TEST-001',
          drawing_id: 'test-drawing-id',
          schema_id: 'test-schema-id',
          dynamic_data: {
            description: 'Test description',
            component_type: 'Test Type',
          },
          schema_info: {
            id: 'test-schema-id',
            name: 'Test Schema',
            version: 1,
            fields: [
              {
                id: 'description',
                name: 'Description',
                field_type: 'text',
                required: false,
                metadata: {},
              },
            ],
          },
          is_type_locked: false,
        }
      });
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({
        json: {
          id: 'test-component-id',
          ...JSON.parse(route.request().postData() || '{}'),
        }
      });
    }
  });

  // Open component edit modal/dialog
  await page.click('[data-testid="edit-component-button"]');
  await page.waitForSelector('[role="dialog"]');
}

test.describe('Component Edit Card Save Functionality E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up basic page load and navigation
    await page.goto('http://localhost:3000');
  });

  // COMP-EDIT-E2E-001: User can successfully save description
  test('COMP-EDIT-E2E-001: should allow user to successfully save description changes', async ({ page }) => {
    await setupTestComponent(page);

    // Locate the description field
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();

    // Clear existing text and type new text
    await descriptionField.clear();
    await descriptionField.fill('testt');

    // Click the Save button
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify saving state appears
    await expect(page.locator('button:has-text("Saving...")')).toBeVisible();

    // Wait for save to complete and verify success
    await expect(page.locator('button:has-text("Save")')).toBeVisible();

    // Verify the field retains the new value
    await expect(descriptionField).toHaveValue('testt');
  });

  // COMP-EDIT-E2E-003: Success message appears after save
  test('COMP-EDIT-E2E-003: should display success message after successful save', async ({ page }) => {
    await setupTestComponent(page);

    // Make a change to trigger save
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();
    await descriptionField.clear();
    await descriptionField.fill('testt');

    // Click Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify success message appears
    await expect(page.locator('[role="alert"]:has-text("Component updated successfully")')).toBeVisible();

    // Verify success alert styling
    const successAlert = page.locator('[role="alert"]:has-text("Component updated successfully")');
    await expect(successAlert).toHaveClass(/MuiAlert-standardSuccess/);
  });

  // COMP-EDIT-E2E-002: Network error displays user message
  test('COMP-EDIT-E2E-002: should display error message when network error occurs', async ({ page }) => {
    // Set up network error response
    await page.route('**/api/v1/flexible-components/*', async route => {
      if (route.request().method() === 'PUT') {
        await route.abort('internetdisconnected');
      }
    });

    await setupTestComponent(page);

    // Make a change
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();
    await descriptionField.clear();
    await descriptionField.fill('testt');

    // Click Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify error message appears
    await expect(page.locator('[role="alert"]:has-text("Failed to save changes")')).toBeVisible();

    // Verify error alert styling
    const errorAlert = page.locator('[role="alert"]:has-text("Failed to save changes")');
    await expect(errorAlert).toHaveClass(/MuiAlert-standardError/);
  });

  // COMP-EDIT-E2E-004: Form resets/updates after successful save
  test('COMP-EDIT-E2E-004: should update form state after successful save', async ({ page }) => {
    await setupTestComponent(page);

    // Make a change
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();
    const originalValue = await descriptionField.inputValue();
    await descriptionField.clear();
    await descriptionField.fill('testt');

    // Click Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('[role="alert"]:has-text("Component updated successfully")')).toBeVisible();

    // Verify the form retains the new value
    await expect(descriptionField).toHaveValue('testt');

    // Verify the save button is re-enabled and ready for next edit
    await expect(saveButton).toBeEnabled();
    await expect(saveButton).toHaveText('Save');

    // Verify we can make another change
    await descriptionField.clear();
    await descriptionField.fill('another change');
    await expect(descriptionField).toHaveValue('another change');
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    await setupTestComponent(page);

    // Try to save with invalid data (if validation is implemented)
    const saveButton = page.locator('button:has-text("Save")');

    // If validation prevents save, button should be disabled
    // This depends on the specific validation rules implemented

    // Clear required field if any
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();
    await descriptionField.clear();

    // Check if validation error appears (if validation is implemented)
    // This test might need adjustment based on actual validation rules
  });

  test('should persist changes across page refresh', async ({ page }) => {
    await setupTestComponent(page);

    // Make and save a change
    const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await descriptionField.waitFor();
    await descriptionField.clear();
    await descriptionField.fill('persistent change');

    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for success
    await expect(page.locator('[role="alert"]:has-text("Component updated successfully")')).toBeVisible();

    // Close the modal
    await page.click('[data-testid="close-button"], button:has-text("Close")');

    // Refresh the page
    await page.reload();

    // Reopen the component edit
    await setupTestComponent(page);

    // Verify the change persisted
    const refreshedDescriptionField = page.locator('input[name="description"], textarea[name="description"]');
    await expect(refreshedDescriptionField).toHaveValue('persistent change');
  });
});