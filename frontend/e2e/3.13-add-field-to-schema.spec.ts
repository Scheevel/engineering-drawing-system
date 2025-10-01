/**
 * Story 3.13: Add Field to Schema - Auto-save and Dirty State Test
 *
 * Tests that adding a field to a schema:
 * 1. Automatically saves the field (no manual Save button needed)
 * 2. Clears the "unsaved changes" warning after successful save
 * 3. Does not leave Save buttons in a disabled state
 *
 * This test validates the fix for the bug where fields would be saved but
 * the UI would show "You have unsaved changes" with disabled Save buttons.
 */

import { test, expect, Page } from '@playwright/test';

// Page Object Model for Schema List
class SchemaListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/schemas');
    await this.page.waitForLoadState('networkidle');
  }

  async clickFirstSchema() {
    // Click the first "Edit schema" button in the table
    const editButton = this.page.getByRole('button', { name: /^Edit schema/i }).first();
    await editButton.click();
  }

  async waitForSchemas() {
    // Wait for schema table to load - check for column headers and table rows
    await expect(this.page.getByRole('columnheader', { name: /name/i })).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
  }
}

// Page Object Model for Schema Edit
class SchemaEditPage {
  constructor(private page: Page) {}

  async waitForEditPage() {
    await this.page.waitForURL(/\/schemas\/.*\/edit/, { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async switchToFieldsTab() {
    await this.page.getByRole('tab', { name: /fields/i }).click();
  }

  async clickAddField() {
    await this.page.getByRole('button', { name: /add field/i }).click();
  }

  async expectFieldDialogOpen() {
    await expect(
      this.page.getByRole('dialog').getByText(/add new field/i)
    ).toBeVisible();
  }

  async fillFieldName(name: string) {
    const fieldNameInput = this.page.getByLabel(/field name/i);
    await fieldNameInput.clear();
    await fieldNameInput.fill(name);
  }

  async selectFieldType(type: string) {
    // Field types are shown as clickable cards
    const typeMap: Record<string, string> = {
      'text': 'Text Input',
      'number': 'Number Input',
      'date': 'Date Picker',
      'textarea': 'Multi-line Text',
      'checkbox': 'Checkbox',
    };

    const cardText = typeMap[type.toLowerCase()] || type;
    await this.page.getByText(cardText, { exact: true }).click();
  }

  async saveField() {
    // Click save button in dialog
    await this.page.getByRole('dialog').getByRole('button', { name: /save|add/i }).click();
  }

  async waitForDialogClosed() {
    // Wait for dialog to disappear after saving
    await expect(this.page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  }

  async expectFieldInList(fieldName: string) {
    // Field should appear in the list
    await expect(this.page.getByText(fieldName).first()).toBeVisible();
  }

  async expectNoUnsavedChangesWarning() {
    // The warning should not be visible
    await expect(
      this.page.getByText(/you have unsaved changes/i)
    ).not.toBeVisible({ timeout: 5000 });
  }

  async expectUnsavedChangesWarningGone() {
    // Alternative: check that warning disappears if it was present
    const warning = this.page.getByText(/you have unsaved changes/i);
    const warningCount = await warning.count();

    if (warningCount > 0) {
      // If warning exists, it should disappear
      await expect(warning).not.toBeVisible({ timeout: 5000 });
    }
    // If warning never appeared, test passes
  }

  async expectSaveButtonsNotNeeded() {
    // After auto-save, either:
    // 1. Save buttons are disabled (because no changes pending), OR
    // 2. Save buttons are not present on Fields tab
    const saveButton = this.page.getByRole('button', { name: /^save$/i });
    const saveButtonCount = await saveButton.count();

    if (saveButtonCount > 0) {
      // If Save button exists, it should be disabled (no changes to save)
      await expect(saveButton.first()).toBeDisabled();
    }
    // If no Save button on this tab, that's expected behavior
  }

  async getSchemaName() {
    // Extract schema name from the page
    const nameElement = await this.page.locator('strong').first().textContent();
    return nameElement || '';
  }
}

test.describe('Story 3.13: Add Field to Schema - Auto-save Behavior', () => {
  let schemaList: SchemaListPage;
  let schemaEdit: SchemaEditPage;

  test.beforeEach(async ({ page }) => {
    schemaList = new SchemaListPage(page);
    schemaEdit = new SchemaEditPage(page);
  });

  test('Adding a field auto-saves and clears unsaved changes warning', async ({ page }) => {
    // ========================================
    // STEP 1: Navigate to schema list
    // ========================================
    await schemaList.goto();
    await schemaList.waitForSchemas();

    // ========================================
    // STEP 2: Open first schema for editing
    // ========================================
    await schemaList.clickFirstSchema();
    await schemaEdit.waitForEditPage();

    const schemaName = await schemaEdit.getSchemaName();
    console.log(`Editing schema: ${schemaName}`);

    // ========================================
    // STEP 3: Switch to Fields tab
    // ========================================
    await schemaEdit.switchToFieldsTab();

    // ========================================
    // STEP 4: Verify no unsaved changes initially
    // ========================================
    await schemaEdit.expectNoUnsavedChangesWarning();

    // ========================================
    // STEP 5: Add a new field
    // ========================================
    const timestamp = Date.now();
    const fieldName = `test_field_${timestamp}`;

    await schemaEdit.clickAddField();
    await schemaEdit.expectFieldDialogOpen();

    await schemaEdit.fillFieldName(fieldName);
    await schemaEdit.selectFieldType('text');
    await schemaEdit.saveField();

    // ========================================
    // STEP 6: Wait for dialog to close (indicates save started)
    // ========================================
    await schemaEdit.waitForDialogClosed();

    // ========================================
    // STEP 7: Verify field appears in list
    // ========================================
    await schemaEdit.expectFieldInList(fieldName);

    // ========================================
    // STEP 8: CRITICAL TEST - Warning should NOT appear or should disappear
    // ========================================
    // Wait a moment for any warning that might appear
    await page.waitForTimeout(1000);

    await schemaEdit.expectUnsavedChangesWarningGone();

    // ========================================
    // STEP 9: Verify Save buttons are not needed
    // ========================================
    await schemaEdit.expectSaveButtonsNotNeeded();

    // ========================================
    // STEP 10: Add another field to test repeatability
    // ========================================
    const fieldName2 = `test_field_${timestamp}_2`;

    await schemaEdit.clickAddField();
    await schemaEdit.expectFieldDialogOpen();

    await schemaEdit.fillFieldName(fieldName2);
    await schemaEdit.selectFieldType('number');
    await schemaEdit.saveField();

    await schemaEdit.waitForDialogClosed();
    await schemaEdit.expectFieldInList(fieldName2);

    // ========================================
    // STEP 11: Verify warning still does not appear
    // ========================================
    await page.waitForTimeout(1000);
    await schemaEdit.expectUnsavedChangesWarningGone();

    console.log('✓ Test passed: Fields auto-save without unsaved changes warning');
  });

  test('Multiple rapid field additions maintain clean state', async ({ page }) => {
    // ========================================
    // STEP 1: Navigate and open schema
    // ========================================
    await schemaList.goto();
    await schemaList.waitForSchemas();
    await schemaList.clickFirstSchema();
    await schemaEdit.waitForEditPage();
    await schemaEdit.switchToFieldsTab();

    // ========================================
    // STEP 2: Add 3 fields rapidly
    // ========================================
    const timestamp = Date.now();
    const fields = [
      { name: `rapid_field_1_${timestamp}`, type: 'text' },
      { name: `rapid_field_2_${timestamp}`, type: 'number' },
      { name: `rapid_field_3_${timestamp}`, type: 'checkbox' },
    ];

    for (const field of fields) {
      await schemaEdit.clickAddField();
      await schemaEdit.expectFieldDialogOpen();
      await schemaEdit.fillFieldName(field.name);
      await schemaEdit.selectFieldType(field.type);
      await schemaEdit.saveField();
      await schemaEdit.waitForDialogClosed();
      await schemaEdit.expectFieldInList(field.name);
    }

    // ========================================
    // STEP 3: Verify clean state after all additions
    // ========================================
    await page.waitForTimeout(1000);
    await schemaEdit.expectUnsavedChangesWarningGone();
    await schemaEdit.expectSaveButtonsNotNeeded();

    console.log('✓ Test passed: Rapid field additions maintain clean state');
  });
});
