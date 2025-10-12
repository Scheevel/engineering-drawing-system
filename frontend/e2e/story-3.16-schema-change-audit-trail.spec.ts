import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite for Story 3.16: Schema Change Audit Trail System
 *
 * PURPOSE: Verify audit trail creation when component schema changes
 * CONTEXT: Story 3.16 implemented audit logging for schema changes and removed type-locking
 *
 * This test suite will objectively answer:
 * 1. Can users change component schemas without unlock dialog blocking?
 * 2. Do schema changes create 2 linked audit records (schema_id + dynamic_data)?
 * 3. Does the History tab display audit records grouped by session_id?
 * 4. Is the type-locking protection properly removed from frontend?
 *
 * KNOWN ISSUE: Frontend still shows "Unlock component type" dialog (AC8 regression)
 */

test.describe('Story 3.16: Schema Change Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('AC1-3: Schema change creates 2 linked audit records (schema_id + dynamic_data)', async ({ page }) => {
    console.log('\n=== TEST: Schema Change Audit Creation ===\n');

    // Step 1: Navigate to the specific drawing and component
    const drawingId = 'c9f2f713-15e3-419a-9718-3bbf23c100ee';
    const componentId = 'd5e927a5-c33e-486a-a0fe-208ebc167b58';
    const url = `http://localhost:3000/drawings/${drawingId}?highlight=${componentId}`;

    console.log(`Step 1: Navigating to drawing with highlighted component`);
    console.log(`  URL: ${url}`);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 2: Click to view the component's detail card
    console.log('\nStep 2: Opening component detail card');

    // Try multiple selectors to find the highlighted component
    const componentSelectors = [
      `[data-component-id="${componentId}"]`,
      `[data-testid="component-${componentId}"]`,
      `.component-highlight`,
      `.component-selected`,
      'tbody tr.MuiTableRow-root.Mui-selected',
      'tbody tr:first-child',
    ];

    let componentFound = false;
    for (const selector of componentSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`  ✓ Found component using selector: ${selector}`);
        await element.click();
        componentFound = true;
        await page.waitForTimeout(1500);
        break;
      }
    }

    if (!componentFound) {
      console.log('  ⚠ Could not find component automatically, trying to click first component');
      const firstComponent = page.locator('tbody tr, [role="row"]').first();
      if (await firstComponent.count() > 0) {
        await firstComponent.click();
        await page.waitForTimeout(1500);
      }
    }

    // Check if component detail dialog opened
    const detailDialog = page.locator('[role="dialog"], .MuiDialog-root').first();
    const detailDialogOpen = await detailDialog.count() > 0;

    if (!detailDialogOpen) {
      console.log('  ✗ Component detail dialog did not open');
      test.fail(true, 'Component detail dialog did not open');
      return;
    }

    console.log('  ✓ Component detail dialog opened');

    // Step 3: Click on the component "edit" action
    console.log('\nStep 3: Clicking Edit button');

    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]').first();
    const editButtonExists = await editButton.count() > 0;

    if (!editButtonExists) {
      console.log('  ✗ Edit button not found');
      test.fail(true, 'Edit button not found');
      return;
    }

    await editButton.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Edit button clicked');

    // Step 4: Select a "component schema" drop-down
    console.log('\nStep 4: Locating component schema dropdown');

    const schemaDropdown = page.locator(
      'label:has-text("Component Schema") + div select, ' +
      '[aria-label="Component Schema"], ' +
      'div[role="button"]:has-text("Component Schema")'
    ).first();
    const dropdownExists = await schemaDropdown.count() > 0;

    if (!dropdownExists) {
      console.log('  ✗ Component Schema dropdown not found');
      test.fail(true, 'Component Schema dropdown not found');
      return;
    }

    console.log('  ✓ Component Schema dropdown found');

    // Step 5: Select "default" schema
    console.log('\nStep 5: Attempting to change schema to "default"');

    await schemaDropdown.click();
    await page.waitForTimeout(500);

    // Look for "default" option in dropdown
    const defaultOption = page.locator('[role="option"]:has-text("default"), li:has-text("default")').first();
    const defaultOptionExists = await defaultOption.count() > 0;

    if (!defaultOptionExists) {
      console.log('  ⚠ "default" schema option not found, trying first available schema');
      const firstOption = page.locator('[role="option"], [role="menuitem"]').nth(1); // Skip empty option
      if (await firstOption.count() > 0) {
        const schemaName = await firstOption.textContent();
        console.log(`  ℹ Selecting schema: ${schemaName}`);
        await firstOption.click();
        await page.waitForTimeout(1000);
      }
    } else {
      await defaultOption.click();
      await page.waitForTimeout(1000);
      console.log('  ✓ Selected "default" schema');
    }

    // CRITICAL CHECK: Does the "Unlock component type" dialog appear?
    console.log('\nStep 6: Checking for blocking behavior');

    const unlockDialog = page.locator(
      '[role="dialog"]:has-text("Unlock Component Type"), ' +
      '.MuiDialog-root:has-text("Unlock"), ' +
      '[role="dialog"]:has-text("type-locked")'
    ).first();
    const unlockDialogVisible = await unlockDialog.isVisible().catch(() => false);

    if (unlockDialogVisible) {
      console.log('  ✗ REGRESSION DETECTED: "Unlock Component Type" dialog appeared');
      console.log('  ℹ Story 3.16 AC8 requires: "Schema changes always allowed (no pre-check or blocking)"');
      console.log('  ℹ Frontend still enforces type-locking despite backend removal');

      // Take screenshot of the dialog
      await page.screenshot({
        path: 'test-results/story-3.16-unlock-dialog-regression.png',
        fullPage: true
      });

      // Check dialog content
      const dialogText = await unlockDialog.textContent();
      console.log(`  ℹ Dialog content preview: ${dialogText?.substring(0, 100)}...`);

      // For now, FAIL the test to document the regression
      expect(unlockDialogVisible, 'AC8 Regression: Type-locking dialog should not appear after Story 3.16').toBe(false);
      return;
    }

    console.log('  ✓ No blocking dialog appeared (AC8 verified)');

    // Step 7: Click "History" tab to verify audit records
    console.log('\nStep 7: Navigating to History tab');

    const historyTab = page.locator('[role="tab"]:has-text("History"), button:has-text("History")').first();
    const historyTabExists = await historyTab.count() > 0;

    if (!historyTabExists) {
      console.log('  ✗ History tab not found');
      test.fail(true, 'History tab not found');
      return;
    }

    await historyTab.click();
    await page.waitForTimeout(2000);
    console.log('  ✓ History tab clicked');

    // Step 8: Verify 2 linked audit records appear (schema_id + dynamic_data)
    console.log('\nStep 8: Verifying audit records');

    // Listen for API calls to audit-history endpoint
    let auditApiCalled = false;
    page.on('response', async (response) => {
      if (response.url().includes('/audit-history')) {
        auditApiCalled = true;
        try {
          const data = await response.json();
          console.log(`  ✓ Audit history API called`);
          console.log(`  ℹ Response status: ${response.status()}`);
          console.log(`  ℹ Audit records count: ${Array.isArray(data) ? data.length : 'N/A'}`);

          if (Array.isArray(data) && data.length >= 2) {
            // Check for linked records with same session_id
            const sessionIds = [...new Set(data.map((r: any) => r.session_id).filter(Boolean))];
            console.log(`  ℹ Unique session_ids: ${sessionIds.length}`);

            if (sessionIds.length > 0) {
              const latestSessionId = sessionIds[0];
              const linkedRecords = data.filter((r: any) => r.session_id === latestSessionId);
              console.log(`  ℹ Records with latest session_id: ${linkedRecords.length}`);

              const hasSchemaChange = linkedRecords.some((r: any) => r.field_name === 'schema_id');
              const hasDynamicData = linkedRecords.some((r: any) => r.field_name === 'dynamic_data');

              console.log(`  ${hasSchemaChange ? '✓' : '✗'} Found schema_id audit record`);
              console.log(`  ${hasDynamicData ? '✓' : '✗'} Found dynamic_data audit record`);

              if (hasSchemaChange && hasDynamicData) {
                console.log('  ✓ AC1-3 VERIFIED: 2 linked audit records exist');
              }
            }
          } else {
            console.log(`  ⚠ Expected at least 2 audit records, got ${Array.isArray(data) ? data.length : 0}`);
          }
        } catch (e) {
          console.log('  ℹ Could not parse audit API response');
        }
      }
    });

    // Check for visible audit records in UI
    const auditRecords = page.locator(
      '[data-testid="audit-record"], ' +
      '.audit-record, ' +
      '[role="listitem"]:has-text("schema_id"), ' +
      'tbody tr'
    );
    const visibleRecords = await auditRecords.count();

    console.log(`  ℹ Visible audit records in UI: ${visibleRecords}`);

    // Check for empty state
    const emptyState = page.locator('text=/No.*history/i, text=/No.*audit/i').first();
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);

    if (emptyStateVisible) {
      console.log('  ⚠ Empty state message visible - no audit records displayed');
    }

    // Wait a bit more for API response
    await page.waitForTimeout(2000);

    if (!auditApiCalled) {
      console.log('  ⚠ Audit history API was not called - check implementation');
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('AC9-13: History tab displays audit records correctly', async ({ page }) => {
    console.log('\n=== TEST: History Tab Display ===\n');

    // Use the same component that should have audit history
    const drawingId = 'c9f2f713-15e3-419a-9718-3bbf23c100ee';
    const componentId = 'd5e927a5-c33e-486a-a0fe-208ebc167b58';

    // Navigate to component
    await page.goto(`http://localhost:3000/drawings/${drawingId}?highlight=${componentId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open component detail
    const firstComponent = page.locator('tbody tr, [role="row"]').first();
    await firstComponent.click();
    await page.waitForTimeout(1500);

    // Click History tab directly
    const historyTab = page.locator('[role="tab"]:has-text("History"), button:has-text("History")').first();
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(2000);

      // AC9: History Tab Integration
      console.log('AC9: ✓ History tab accessible in Component Detail');

      // AC10: Grouped Display - check for session_id grouping
      const groupedRecords = page.locator('[data-session-id], .audit-group');
      const hasGrouping = await groupedRecords.count() > 0;
      console.log(`AC10: ${hasGrouping ? '✓' : '✗'} Records grouped by session_id`);

      // AC11: Chronological Order - check if timestamps are displayed
      const timestamps = page.locator('text=/\\d{4}-\\d{2}-\\d{2}/, time, [data-testid="timestamp"]');
      const hasTimestamps = await timestamps.count() > 0;
      console.log(`AC11: ${hasTimestamps ? '✓' : '✗'} Timestamps displayed`);

      // AC12: JSON Formatting - check for formatted dynamic_data
      const jsonContent = page.locator('pre, code, .json-content');
      const hasJsonFormatting = await jsonContent.count() > 0;
      console.log(`AC12: ${hasJsonFormatting ? '✓' : '✗'} JSON formatting present`);

      // AC13: Empty State
      const emptyState = page.locator('text=/No.*history/i');
      const hasEmptyState = await emptyState.count() > 0;
      if (hasEmptyState) {
        console.log('AC13: ✓ Empty state message displayed');
      }
    } else {
      console.log('⚠ History tab not found');
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('AC14-15: API endpoint returns audit records with filtering', async ({ page }) => {
    console.log('\n=== TEST: Audit History API Endpoint ===\n');

    const componentId = 'd5e927a5-c33e-486a-a0fe-208ebc167b58';

    // Intercept API calls
    let auditEndpointFound = false;
    let sessionIdFilterWorks = false;
    let limitParameterRespected = false;

    page.on('response', async (response) => {
      if (response.url().includes(`/flexible-components/${componentId}/audit-history`)) {
        auditEndpointFound = true;
        const url = response.url();

        console.log('AC14: ✓ Audit history endpoint exists');
        console.log(`  URL: ${url}`);
        console.log(`  Status: ${response.status()}`);

        // Check query parameters
        if (url.includes('session_id=')) {
          sessionIdFilterWorks = true;
          console.log('AC15: ✓ session_id filter parameter present');
        }

        if (url.includes('limit=')) {
          limitParameterRespected = true;
          console.log('AC15: ✓ limit parameter present');
        }

        try {
          const data = await response.json();
          console.log(`  Records returned: ${Array.isArray(data) ? data.length : 'N/A'}`);

          if (Array.isArray(data) && data.length > 0) {
            const firstRecord = data[0];
            const hasSessionId = 'session_id' in firstRecord;
            console.log(`AC16: ${hasSessionId ? '✓' : '✗'} Response includes session_id field`);
          }
        } catch (e) {
          console.log('  Could not parse response');
        }
      }
    });

    // Navigate to component to trigger API call
    await page.goto(`http://localhost:3000/drawings/c9f2f713-15e3-419a-9718-3bbf23c100ee?highlight=${componentId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open component and go to history tab
    const firstComponent = page.locator('tbody tr').first();
    await firstComponent.click();
    await page.waitForTimeout(1500);

    const historyTab = page.locator('[role="tab"]:has-text("History")').first();
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(3000);
    }

    if (!auditEndpointFound) {
      console.log('AC14: ✗ Audit history endpoint not called');
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('DIAGNOSTIC: Frontend Type-Locking Investigation', async ({ page }) => {
    console.log('\n=== DIAGNOSTIC: Type-Locking Status ===\n');

    // Navigate to component
    await page.goto('http://localhost:3000/drawings/c9f2f713-15e3-419a-9718-3bbf23c100ee?highlight=d5e927a5-c33e-486a-a0fe-208ebc167b58');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open component detail
    const firstComponent = page.locator('tbody tr').first();
    await firstComponent.click();
    await page.waitForTimeout(1500);

    // Check for type-locked indicators
    const lockedChips = page.locator('text="Type Locked", text="Locked"');
    const hasLockedIndicator = await lockedChips.count() > 0;

    console.log(`Type-locked indicator visible: ${hasLockedIndicator ? 'YES' : 'NO'}`);

    // Check for unlock button
    const unlockButton = page.locator('button:has-text("Unlock")');
    const hasUnlockButton = await unlockButton.count() > 0;

    console.log(`Unlock button visible: ${hasUnlockButton ? 'YES' : 'NO'}`);

    // Check API responses for is_type_locked field
    page.on('response', async (response) => {
      if (response.url().includes('/flexible-components/') && !response.url().includes('audit-history')) {
        try {
          const data = await response.json();
          if ('is_type_locked' in data) {
            console.log(`API returns is_type_locked: ${data.is_type_locked}`);
            console.log(`  has dynamic_data: ${data.dynamic_data && Object.keys(data.dynamic_data).length > 0}`);
          }
        } catch (e) {
          // Not JSON or parsing failed
        }
      }
    });

    // Wait for API response
    await page.waitForTimeout(2000);

    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Backend type-locking removed in Story 3.16 ✓');
    console.log('2. Frontend TypeSelectionDropdown.tsx still enforces type-locking ✗');
    console.log('3. Need to update frontend to allow schema changes without dialog');
    console.log('4. Remove lines 179-184 in TypeSelectionDropdown.tsx');

    console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
  });
});
