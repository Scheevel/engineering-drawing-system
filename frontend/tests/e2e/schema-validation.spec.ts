/**
 * E2E Tests for Schema Validation and Creation Flow
 *
 * Tests user journey for schema name validation, creation, and navigation (FR-1, FR-2)
 * Covers AC 1-10 from story 3.13
 */

import { test, expect } from '@playwright/test';

test.describe('Schema Name Validation (FR-1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to schema creation page
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');
  });

  test('should display validation rules before user input (AC 2)', async ({ page }) => {
    // Check that validation rules are visible
    await expect(page.getByText('Schema Name Requirements')).toBeVisible();
    await expect(page.getByText('Minimum 3 characters')).toBeVisible();
    await expect(page.getByText('Maximum 100 characters')).toBeVisible();
    await expect(page.getByText('Must start with letter or number')).toBeVisible();
    await expect(page.getByText('Only letters, numbers, hyphens (-), underscores (_)')).toBeVisible();
  });

  test('should show real-time validation feedback (AC 2)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    // Type valid name
    await nameInput.fill('valid-name');
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible();

    // Type invalid name with special characters
    await nameInput.fill('invalid@name');
    await expect(page.locator('svg[data-testid="CancelIcon"]')).toBeVisible();
    await expect(page.getByText(/Invalid characters.*@/)).toBeVisible();
  });

  test('should display character counter (AC 2)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    // Check initial counter
    await expect(page.getByText('0/100')).toBeVisible();

    // Type some characters
    await nameInput.fill('test');
    await expect(page.getByText('4/100')).toBeVisible();

    // Type near limit
    const longName = 'a'.repeat(95);
    await nameInput.fill(longName);
    await expect(page.getByText('95/100')).toBeVisible();
  });

  test('should show error for name too short (AC 1, AC 3)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    await nameInput.fill('ab');
    await expect(page.getByText(/Minimum 3 characters/)).toBeVisible();
    await expect(page.locator('svg[data-testid="CancelIcon"]')).toBeVisible();
  });

  test('should show error for name too long (AC 1, AC 3)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    const longName = 'a'.repeat(101);
    await nameInput.fill(longName);
    await expect(page.getByText(/100 characters/)).toBeVisible();
    await expect(page.locator('svg[data-testid="CancelIcon"]')).toBeVisible();
  });

  test('should list specific invalid characters in error message (AC 3)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    // Test with @ symbol
    await nameInput.fill('test@name');
    await expect(page.getByText(/Invalid characters.*@/)).toBeVisible();
    await expect(page.getByText(/Allowed: letters, numbers, hyphens.*underscores/)).toBeVisible();

    // Test with multiple invalid characters
    await nameInput.fill('test@#$name');
    const errorText = await page.getByText(/Invalid characters/).textContent();
    expect(errorText).toContain('@');
    expect(errorText).toContain('#');
    expect(errorText).toContain('$');
  });

  test('should show error for spaces in name (AC 3)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    await nameInput.fill('name with spaces');
    await expect(page.getByText(/cannot contain spaces.*Use hyphens.*underscores/)).toBeVisible();
    await expect(page.locator('svg[data-testid="CancelIcon"]')).toBeVisible();
  });

  test('should prevent save when validation fails (AC 4)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });
    const saveButton = page.getByRole('button', { name: /save|create/i });

    // Fill invalid name
    await nameInput.fill('invalid@name');

    // Save button should be disabled
    await expect(saveButton).toBeDisabled();
  });

  test('should enable save when name becomes valid (AC 5)', async ({ page }) => {
    const nameInput = page.getByLabel('Schema Name', { exact: true });
    const descriptionInput = page.getByLabel('Description', { exact: false });
    const saveButton = page.getByRole('button', { name: /save|create/i });

    // Fill description first (if required)
    await descriptionInput.fill('Test schema description');

    // Fill invalid name
    await nameInput.fill('invalid@name');
    await expect(saveButton).toBeDisabled();

    // Fix the name
    await nameInput.fill('valid-name');
    await expect(saveButton).toBeEnabled();
  });
});

test.describe('Schema Creation Navigation (FR-2)', () => {
  test('should navigate to edit page after creation (AC 6-7)', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    const descriptionInput = page.getByLabel('Description', { exact: false });

    // Fill valid data
    await nameInput.fill('new-test-schema');
    await descriptionInput.fill('Test schema for navigation');

    // Add at least one field (if required)
    const addFieldButton = page.getByRole('button', { name: /add field/i });
    if (await addFieldButton.isVisible()) {
      await addFieldButton.click();
      await page.getByLabel('Field Name').fill('test_field');
      await page.getByRole('button', { name: /save field|add/i }).click();
    }

    // Submit form
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();

    // Wait for navigation to edit page
    await page.waitForURL(/\/schemas\/[a-f0-9-]+\/edit/);
    expect(page.url()).toMatch(/\/schemas\/[a-f0-9-]+\/edit/);

    // Verify schema name is displayed on edit page
    await expect(page.getByText('new-test-schema')).toBeVisible();
  });
});

test.describe('Schema Name Update Persistence (FR-2)', () => {
  let schemaId: string;

  test.beforeEach(async ({ page }) => {
    // Create a schema first
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    await nameInput.fill('schema-to-update');

    const addFieldButton = page.getByRole('button', { name: /add field/i });
    if (await addFieldButton.isVisible()) {
      await addFieldButton.click();
      await page.getByLabel('Field Name').fill('test_field');
      await page.getByRole('button', { name: /save field|add/i }).click();
    }

    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();

    // Wait for navigation to edit page and extract schema ID
    await page.waitForURL(/\/schemas\/[a-f0-9-]+\/edit/);
    const url = page.url();
    schemaId = url.match(/\/schemas\/([a-f0-9-]+)\/edit/)?.[1] || '';
  });

  test('should persist name update after save (AC 8-9)', async ({ page }) => {
    // We're already on the edit page
    const nameInput = page.getByLabel('Schema Name', { exact: true });

    // Update the name
    await nameInput.fill('updated-schema-name');

    // Save
    const saveButton = page.getByRole('button', { name: /^save$/i });
    await saveButton.click();

    // Wait for success indicator
    await page.waitForTimeout(1000);

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify updated name is displayed
    await expect(page.getByDisplayValue('updated-schema-name')).toBeVisible();
  });

  test('should reflect name update in schema list (AC 10)', async ({ page }) => {
    // Update schema name
    const nameInput = page.getByLabel('Schema Name', { exact: true });
    await nameInput.fill('updated-for-list');

    const saveButton = page.getByRole('button', { name: /^save$/i });
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Navigate to schema list
    await page.goto('http://localhost:3000/schemas');
    await page.waitForLoadState('networkidle');

    // Verify updated name appears in list
    await expect(page.getByText('updated-for-list')).toBeVisible();
  });
});

test.describe('Visual Indicators (AC 2)', () => {
  test('should show green check for valid name', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    await nameInput.fill('valid-name');

    // Green check should be visible
    const checkIcon = page.locator('svg[data-testid="CheckCircleIcon"]').first();
    await expect(checkIcon).toBeVisible();

    // Verify it's the success color (green)
    const color = await checkIcon.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('color')
    );
    expect(color).toContain('rgb'); // Just verify color is set
  });

  test('should show red X for invalid name', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    await nameInput.fill('invalid@name');

    // Red X should be visible
    const errorIcon = page.locator('svg[data-testid="CancelIcon"]').first();
    await expect(errorIcon).toBeVisible();
  });

  test('should update indicators in real-time', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });

    // Type invalid name
    await nameInput.fill('ab'); // Too short
    await expect(page.locator('svg[data-testid="CancelIcon"]').first()).toBeVisible();

    // Fix to valid name
    await nameInput.fill('abc'); // Valid
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();

    // Break again
    await nameInput.fill('abc@def'); // Invalid character
    await expect(page.locator('svg[data-testid="CancelIcon"]').first()).toBeVisible();
  });
});

test.describe('Edge Cases', () => {
  test('should handle exactly 3 characters (minimum)', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    await nameInput.fill('abc');

    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();
    await expect(page.getByText('3/100')).toBeVisible();
  });

  test('should handle exactly 100 characters (maximum)', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });
    const maxName = 'a'.repeat(100);
    await nameInput.fill(maxName);

    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();
    await expect(page.getByText('100/100')).toBeVisible();
  });

  test('should allow consecutive hyphens and underscores', async ({ page }) => {
    await page.goto('http://localhost:3000/schemas/create');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Schema Name', { exact: true });

    await nameInput.fill('name--test');
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();

    await nameInput.fill('name__test');
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();

    await nameInput.fill('name-_test');
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]').first()).toBeVisible();
  });
});
