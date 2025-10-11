import { test, expect } from '@playwright/test';

/**
 * E2E Test: Component Type Save Flow
 *
 * User Story 3.14 - Component Type Display and Editing
 *
 * Bug Report: Component type selection does not persist after save
 * Expected: Selected component type should be visible on component card after save
 * Reality: Component type shows as blank after save
 */

test.describe('Component Type Save Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should persist component type selection after save', async ({ page }) => {
    // Step 1: Click any component's view action
    const firstComponentAction = page.locator('[aria-label*="View component"], button:has-text("View")').first();
    await firstComponentAction.click();

    // Wait for component card/modal to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Step 2: Click "Edit" action on the component
    const editButton = page.locator('button:has-text("Edit")');
    await editButton.click();

    // Wait for edit mode to activate
    await expect(page.locator('button:has-text("Save")')).toBeVisible();

    // Step 3: Select a component type
    // Find the component type dropdown by label
    const componentTypeDropdown = page.locator('[aria-label="Component type selector"]');
    await componentTypeDropdown.click();

    // Wait for dropdown menu to open
    await page.waitForSelector('[role="listbox"]', { state: 'visible' });

    // Select "Wide Flange" type
    const wideFlangeOption = page.locator('[role="option"]:has-text("Wide Flange")');
    await wideFlangeOption.click();

    // Verify dropdown shows selected value
    await expect(componentTypeDropdown).toHaveValue('wide_flange');

    // Step 4: Click "Save" action
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for save success message
    await expect(page.locator('text=/updated successfully/i')).toBeVisible({ timeout: 10000 });

    // Step 5: Verify component type is visible on component card
    // Component should have switched to view mode
    await expect(editButton).toBeVisible(); // Edit button should be visible again

    // Check that component type is displayed with human-readable label
    const componentTypeLabel = page.locator('text="Component Type"').locator('..').locator('..').locator('text="Wide Flange"');

    // Expected: Component type should show "Wide Flange"
    // Reality: Component type is blank
    await expect(componentTypeLabel).toBeVisible({ timeout: 5000 });

    // Additional verification: Check the value is not blank
    const systemInfoSection = page.locator('text="System Information"').locator('..');
    const componentTypeValue = systemInfoSection.locator('text="Component Type"').locator('..').locator('..').innerText();
    await expect(componentTypeValue).not.toMatch(/^—$/); // Should not be blank (—)
    await expect(componentTypeValue).toMatch(/Wide Flange/);
  });

  test('should show console errors if component type save fails', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture network errors
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        consoleErrors.push(`Network error: ${response.status()} ${response.url()}`);
      }
    });

    // Perform the same flow
    const firstComponentAction = page.locator('[aria-label*="View component"], button:has-text("View")').first();
    await firstComponentAction.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const editButton = page.locator('button:has-text("Edit")');
    await editButton.click();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();

    const componentTypeDropdown = page.locator('[aria-label="Component type selector"]');
    await componentTypeDropdown.click();
    await page.waitForSelector('[role="listbox"]', { state: 'visible' });

    const hssOption = page.locator('[role="option"]:has-text("HSS")');
    await hssOption.click();

    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait a moment for any errors to appear
    await page.waitForTimeout(2000);

    // Log captured errors
    if (consoleErrors.length > 0) {
      console.log('=== Console/Network Errors Detected ===');
      consoleErrors.forEach(error => console.error(error));
    }

    // Log all console messages for debugging
    console.log('=== All Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
  });

  test('should verify backend receives component_type in update payload', async ({ page }) => {
    const networkRequests: any[] = [];

    // Intercept network requests
    page.on('request', request => {
      if (request.url().includes('/api/') && request.method() === 'PUT') {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postDataJSON(),
        });
      }
    });

    // Perform the save flow
    const firstComponentAction = page.locator('[aria-label*="View component"], button:has-text("View")').first();
    await firstComponentAction.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const editButton = page.locator('button:has-text("Edit")');
    await editButton.click();

    const componentTypeDropdown = page.locator('[aria-label="Component type selector"]');
    await componentTypeDropdown.click();
    await page.waitForSelector('[role="listbox"]', { state: 'visible' });

    const channelOption = page.locator('[role="option"]:has-text("Channel")');
    await channelOption.click();

    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for request to complete
    await page.waitForTimeout(1000);

    // Verify request payload includes component_type
    const updateRequest = networkRequests.find(req => req.url.includes('flexible-components'));
    console.log('=== Update Request Payload ===');
    console.log(JSON.stringify(updateRequest, null, 2));

    if (updateRequest) {
      expect(updateRequest.postData).toHaveProperty('component_type');
      expect(updateRequest.postData.component_type).toBe('channel');
    } else {
      throw new Error('No update request found - check if API endpoint is correct');
    }
  });
});
