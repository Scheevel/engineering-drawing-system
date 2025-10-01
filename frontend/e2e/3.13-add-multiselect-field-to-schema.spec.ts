/**
 * Story 3.13: Add Multi-Select Field to Schema - Validation Test
 *
 * Tests that adding a multi-select field to a schema:
 * 1. Successfully creates the field with type "Multi-Select"
 * 2. Automatically saves the field to the backend
 * 3. Field persists in the schema after save
 * 4. No "unsaved changes" warning appears
 *
 * This test specifically validates multi-select field creation, which requires
 * selecting the "Multi-Select" field type card in the field creation dialog.
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

  async selectMultiSelectFieldType() {
    // Multi-Select field type is shown as a clickable card
    // Scope the search to the dialog to avoid conflicts with already-created fields
    const dialog = this.page.getByRole('dialog');
    const multiSelectCard = dialog.getByRole('heading', { name: 'Multi-Select' });
    await multiSelectCard.click();
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

  async expectFieldWithType(fieldName: string, fieldType: string) {
    // Find the field in the list and verify its type chip
    await expect(this.page.getByText(fieldName).first()).toBeVisible();

    // Look for the field type badge/chip near the field name
    // The type is usually shown as a chip/badge like "Multi-Select"
    const fieldContainer = this.page.locator(`text="${fieldName}"`).locator('..').first();
    await expect(fieldContainer.getByText(fieldType).first()).toBeVisible();
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

  async getSchemaName() {
    // Extract schema name from the page
    const nameElement = await this.page.locator('strong').first().textContent();
    return nameElement || '';
  }

  async getFieldCount() {
    // Count the number of fields in the list
    const fieldItems = this.page.locator('[data-testid*="field-item"], .MuiBox-root:has(button[aria-label*="Edit field"])');
    return await fieldItems.count();
  }
}

test.describe('Story 3.13: Add Multi-Select Field to Schema', () => {
  let schemaList: SchemaListPage;
  let schemaEdit: SchemaEditPage;

  test.beforeEach(async ({ page }) => {
    schemaList = new SchemaListPage(page);
    schemaEdit = new SchemaEditPage(page);
  });

  test('Create a multi-select field and validate it is saved', async ({ page }) => {
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
    // STEP 4: Get initial field count
    // ========================================
    const initialFieldCount = await schemaEdit.getFieldCount();
    console.log(`Initial field count: ${initialFieldCount}`);

    // ========================================
    // STEP 5: Create a multi-select field
    // ========================================
    const timestamp = Date.now();
    const fieldName = `multiselect_field_${timestamp}`;

    await schemaEdit.clickAddField();
    await schemaEdit.expectFieldDialogOpen();

    await schemaEdit.fillFieldName(fieldName);
    await schemaEdit.selectMultiSelectFieldType();
    await schemaEdit.saveField();

    // ========================================
    // STEP 6: Wait for dialog to close (indicates save started)
    // ========================================
    await schemaEdit.waitForDialogClosed();

    // ========================================
    // STEP 7: VALIDATION - Field appears in list
    // ========================================
    await schemaEdit.expectFieldInList(fieldName);
    console.log(`✓ Field "${fieldName}" appears in list`);

    // ========================================
    // STEP 8: VALIDATION - Field has correct type
    // ========================================
    await schemaEdit.expectFieldWithType(fieldName, 'Multi-Select');
    console.log(`✓ Field has type "Multi-Select"`);

    // ========================================
    // STEP 9: VALIDATION - Field count increased
    // ========================================
    const newFieldCount = await schemaEdit.getFieldCount();
    expect(newFieldCount).toBe(initialFieldCount + 1);
    console.log(`✓ Field count increased from ${initialFieldCount} to ${newFieldCount}`);

    // ========================================
    // STEP 10: VALIDATION - No unsaved changes warning
    // ========================================
    await page.waitForTimeout(1000); // Allow any warning to appear
    await schemaEdit.expectUnsavedChangesWarningGone();
    console.log(`✓ No unsaved changes warning present`);

    // ========================================
    // STEP 11: VALIDATION - Refresh page and verify persistence
    // ========================================
    console.log('Refreshing page to verify field persistence...');
    await page.reload();
    await schemaEdit.waitForEditPage();
    await schemaEdit.switchToFieldsTab();

    // Field should still be there after page refresh
    await schemaEdit.expectFieldInList(fieldName);
    await schemaEdit.expectFieldWithType(fieldName, 'Multi-Select');
    console.log(`✓ Field persisted after page refresh`);

    // ========================================
    // FINAL VALIDATION
    // ========================================
    console.log('✅ All validations passed: Multi-select field created and saved successfully');
  });

  test('Create multiple multi-select fields sequentially', async ({ page }) => {
    // ========================================
    // STEP 1: Navigate and open schema
    // ========================================
    await schemaList.goto();
    await schemaList.waitForSchemas();
    await schemaList.clickFirstSchema();
    await schemaEdit.waitForEditPage();
    await schemaEdit.switchToFieldsTab();

    const initialFieldCount = await schemaEdit.getFieldCount();

    // ========================================
    // STEP 2: Create 2 multi-select fields
    // ========================================
    const timestamp = Date.now();
    const fields = [
      `multiselect_A_${timestamp}`,
      `multiselect_B_${timestamp}`,
    ];

    for (const fieldName of fields) {
      await schemaEdit.clickAddField();
      await schemaEdit.expectFieldDialogOpen();
      await schemaEdit.fillFieldName(fieldName);
      await schemaEdit.selectMultiSelectFieldType();
      await schemaEdit.saveField();
      await schemaEdit.waitForDialogClosed();

      // Validate immediately after each creation
      await schemaEdit.expectFieldInList(fieldName);
      await schemaEdit.expectFieldWithType(fieldName, 'Multi-Select');
      console.log(`✓ Created field: ${fieldName}`);
    }

    // ========================================
    // STEP 3: Validate all fields created
    // ========================================
    const newFieldCount = await schemaEdit.getFieldCount();
    expect(newFieldCount).toBe(initialFieldCount + fields.length);
    console.log(`✓ Created ${fields.length} multi-select fields successfully`);

    // ========================================
    // STEP 4: No unsaved changes warning
    // ========================================
    await page.waitForTimeout(1000);
    await schemaEdit.expectUnsavedChangesWarningGone();
    console.log(`✓ No unsaved changes warning after creating ${fields.length} fields`);

    console.log('✅ All validations passed: Multiple multi-select fields created successfully');
  });
});
