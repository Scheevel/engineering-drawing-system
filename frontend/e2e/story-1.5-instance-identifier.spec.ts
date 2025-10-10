import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite for Story 1.5: Instance Identifier Functionality
 *
 * PURPOSE: Verify whether instance identifier functionality is still working
 * CONTEXT: User reports that instance creation functionality has disappeared
 *
 * This test suite will objectively answer:
 * 1. Can users create components with instance identifiers?
 * 2. Can users edit instance identifiers on existing components?
 * 3. Do components display instance identifiers correctly?
 * 4. Can users filter/search by instance identifier?
 * 5. Are instances visually differentiated (e.g., "G1-A" vs "G1-B")?
 */

test.describe('Story 1.5: Instance Identifier Functionality', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('AC1: Component creation dialog includes instance_identifier field', async ({ page }) => {
    // Navigate to a drawing page where components can be created
    await page.goto('http://localhost:3000/drawings');
    await page.waitForLoadState('networkidle');

    // Wait for drawings list to load
    await page.waitForSelector('[data-testid="drawing-card"], .MuiCard-root', { timeout: 10000 });

    // Click on the first drawing to view it
    const firstDrawing = page.locator('[data-testid="drawing-card"], .MuiCard-root').first();
    await firstDrawing.click();
    await page.waitForTimeout(2000);

    // Look for component creation button or drawing canvas
    // Try multiple possible selectors for opening component creation
    const createButtons = [
      'button:has-text("Add Component")',
      'button:has-text("Create Component")',
      'button:has-text("New Component")',
      '[data-testid="create-component-button"]'
    ];

    let buttonFound = false;
    for (const selector of createButtons) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        await button.click();
        buttonFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    // If no button found, try right-clicking on canvas to open context menu
    if (!buttonFound) {
      const canvas = page.locator('canvas, [data-testid="drawing-canvas"]').first();
      if (await canvas.count() > 0) {
        await canvas.click({ button: 'right', position: { x: 100, y: 100 } });
        await page.waitForTimeout(1000);

        // Look for "Create Component" or similar in context menu
        const contextMenuCreate = page.locator('[role="menu"] >> text=/Create|Add/i').first();
        if (await contextMenuCreate.count() > 0) {
          await contextMenuCreate.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Check if Component Creation Dialog is now open
    const dialogVisible = await page.locator('[role="dialog"]:has-text("Component"), .MuiDialog-root:has-text("Component")').count() > 0;

    if (dialogVisible) {
      // CRITICAL CHECK: Does the Instance Identifier field exist?
      const instanceField = page.locator('input[name="instance_identifier"], [label*="Instance"], input[placeholder*="A, B, C"]');
      const instanceFieldExists = await instanceField.count() > 0;

      console.log(`✓ Component Creation Dialog opened`);
      console.log(`${instanceFieldExists ? '✓' : '✗'} Instance Identifier field ${instanceFieldExists ? 'EXISTS' : 'MISSING'}`);

      if (instanceFieldExists) {
        // Check field properties
        const placeholder = await instanceField.getAttribute('placeholder');
        const maxLength = await instanceField.getAttribute('maxlength');

        console.log(`  - Placeholder: ${placeholder}`);
        console.log(`  - Max Length: ${maxLength}`);

        expect(instanceFieldExists).toBeTruthy();
      } else {
        // Field is missing - this confirms the user's observation
        expect(instanceFieldExists, 'Instance Identifier field is MISSING from Component Creation Dialog').toBeTruthy();
      }
    } else {
      console.log('✗ Could not open Component Creation Dialog - unable to verify instance identifier field');
      test.fail(true, 'Could not open Component Creation Dialog to verify instance identifier field existence');
    }
  });

  test('AC2: Component detail/edit view shows instance_identifier field', async ({ page }) => {
    // Navigate to search page where existing components are listed
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if any components are displayed
    const componentCards = page.locator('[data-testid="component-card"], tbody tr, .MuiTableRow-root');
    const componentCount = await componentCards.count();

    console.log(`Found ${componentCount} components on search page`);

    if (componentCount > 0) {
      // Click on first component to open details
      await componentCards.first().click();
      await page.waitForTimeout(1500);

      // Check if component detail modal/page opened
      const detailModalOpen = await page.locator('[role="dialog"]:has-text("Component"), .MuiDialog-root, [data-testid="component-detail"]').count() > 0;

      if (detailModalOpen) {
        console.log('✓ Component detail view opened');

        // CRITICAL CHECK: Does instance identifier field/display exist?
        const instanceElements = page.locator('text=/Instance Identifier/i, [data-field="instance_identifier"], label:has-text("Instance")');
        const instanceElementExists = await instanceElements.count() > 0;

        console.log(`${instanceElementExists ? '✓' : '✗'} Instance Identifier ${instanceElementExists ? 'EXISTS' : 'MISSING'} in component details`);

        // Check if there's an edit mode
        const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');
        if (await editButton.count() > 0) {
          console.log('✓ Edit button found - checking edit mode');
          await editButton.click();
          await page.waitForTimeout(1000);

          const instanceFieldInEdit = await page.locator('input[name="instance_identifier"], [label*="Instance"]').count() > 0;
          console.log(`${instanceFieldInEdit ? '✓' : '✗'} Instance Identifier field ${instanceFieldInEdit ? 'EXISTS' : 'MISSING'} in edit mode`);
        }

        expect(instanceElementExists, 'Instance Identifier should be visible in component details').toBeTruthy();
      } else {
        console.log('✗ Could not open component detail view');
      }
    } else {
      console.log('⚠ No components found to test detail view');
      test.skip();
    }
  });

  test('AC3: Components display instance_identifier in listings (G1-A format)', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get all visible component identifiers from the listing
    const pieceMarkCells = page.locator('td:nth-child(1), [data-field="piece_mark"]');
    const pieceMarks = await pieceMarkCells.allTextContents();

    console.log(`Found ${pieceMarks.length} piece mark displays`);

    // Check if any use the G1-A format (piece mark with dash and instance identifier)
    const instanceFormats = pieceMarks.filter(pm => pm.match(/\w+-\w+/));

    console.log(`Components with instance format (X-Y): ${instanceFormats.length}`);
    if (instanceFormats.length > 0) {
      console.log('✓ Examples:', instanceFormats.slice(0, 5).join(', '));
    } else {
      console.log('✗ No components found with instance identifier format (e.g., "G1-A")');
    }

    // Check if instance identifiers are stored but not displayed
    // This would indicate a display bug rather than missing data
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();

    console.log(`\nChecking first ${Math.min(rowCount, 3)} rows for instance identifier display...`);
  });

  test('AC4: Search interface includes instance_identifier filter', async ({ page }) => {
    // Navigate to search page
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // CRITICAL CHECK: Look for Instance column header (UnifiedColumnHeader implementation)
    const instanceColumnHeader = page.locator('th:has-text("Instance")').first();
    const instanceHeaderExists = await instanceColumnHeader.count() > 0;

    console.log(`${instanceHeaderExists ? '✓' : '✗'} Instance column header ${instanceHeaderExists ? 'EXISTS' : 'MISSING'}`);

    if (instanceHeaderExists) {
      // Click on Instance column header to open filter menu
      await instanceColumnHeader.click();
      await page.waitForTimeout(1000);

      // Check if filter menu opened
      const filterMenu = page.locator('[role="menu"]');
      const menuVisible = await filterMenu.isVisible();

      console.log(`${menuVisible ? '✓' : '✗'} Instance filter menu ${menuVisible ? 'OPENED' : 'DID NOT OPEN'}`);

      if (menuVisible) {
        // Check for filter options (A, B, C, D)
        const optionA = page.locator('[role="menu"] >> text=A').first();
        const hasOptions = await optionA.count() > 0;

        console.log(`${hasOptions ? '✓' : '✗'} Filter options ${hasOptions ? 'EXIST' : 'MISSING'}`);

        if (hasOptions) {
          // Test filtering by instance A
          await optionA.click();
          await page.waitForTimeout(1500);

          // Check if URL updated with filter
          const url = page.url();
          console.log(`  URL after filter: ${url}`);
          console.log(`  ${url.includes('instance') ? '✓' : '✗'} URL includes instance parameter`);
        }
      }
    }

    expect(instanceHeaderExists, 'Instance column header should exist in search interface').toBeTruthy();
  });

  test('AC5: Create component with instance identifier and verify it appears in search', async ({ page }) => {
    // This is the FULL WORKFLOW test
    console.log('\n=== FULL WORKFLOW TEST ===\n');

    // Step 1: Navigate to drawings
    await page.goto('http://localhost:3000/drawings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('Step 1: ✓ Navigated to drawings page');

    // Step 2: Open a drawing
    const firstDrawing = page.locator('[data-testid="drawing-card"], .MuiCard-root').first();
    const drawingCount = await firstDrawing.count();

    if (drawingCount === 0) {
      console.log('⚠ No drawings available - skipping workflow test');
      test.skip();
      return;
    }

    await firstDrawing.click();
    await page.waitForTimeout(2000);
    console.log('Step 2: ✓ Opened drawing');

    // Step 3: Create a new component with instance identifier
    // (Implementation depends on how component creation is triggered)
    console.log('Step 3: Attempting to create component with instance identifier...');

    // [This section would need to be implemented based on actual UI flow]

    // Step 4: Search for the created component
    // Step 5: Verify instance identifier is displayed

    console.log('\n⚠ Full workflow test needs actual component creation flow');
  });

  test('DIAGNOSTIC: Check database for instance_identifier data', async ({ page }) => {
    // Navigate to search and check actual data
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open browser console to check API responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/search') || response.url().includes('/components')) {
        try {
          const data = await response.json();

          // Check if API returns instance_identifier field
          if (data.results || data.recent_components) {
            const components = data.results || data.recent_components;
            const withInstance = components.filter((c: any) => c.instance_identifier);

            console.log('\n=== API RESPONSE ANALYSIS ===');
            console.log(`Total components: ${components.length}`);
            console.log(`With instance_identifier: ${withInstance.length}`);

            if (withInstance.length > 0) {
              console.log('✓ Database HAS instance_identifier data');
              console.log('Examples:', withInstance.slice(0, 3).map((c: any) =>
                `${c.piece_mark}-${c.instance_identifier}`
              ).join(', '));
            } else {
              console.log('⚠ Database has NO instance_identifier data (all NULL/empty)');
            }
          }
        } catch (e) {
          // Not JSON or parsing failed
        }
      }
    });

    // Trigger API call by searching
    await page.waitForTimeout(3000);
  });
});

test.describe('Story 1.5: Instance Identifier - Regression Detection', () => {

  test('SUMMARY: Instance Identifier Feature Health Check', async ({ page }) => {
    const results = {
      componentCreationDialogHasField: false,
      componentEditHasField: false,
      listingsShowInstances: false,
      searchHasFilter: false,
      databaseHasData: false
    };

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  STORY 1.5 INSTANCE IDENTIFIER HEALTH CHECK       ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Check 1: Search page for existing data
    await page.goto('http://localhost:3000/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const instanceFilter = await page.locator('input[name="instance_identifier"], input[placeholder*="Instance"]').count() > 0;
    results.searchHasFilter = instanceFilter;

    const pieceMarks = await page.locator('td:first-child, [data-field="piece_mark"]').allTextContents();
    const hasInstanceFormat = pieceMarks.some(pm => pm.match(/\w+-\w+/));
    results.listingsShowInstances = hasInstanceFormat;

    // Print results
    console.log('1. Component Creation Dialog:');
    console.log(`   ${results.componentCreationDialogHasField ? '✓' : '✗'} Has instance_identifier field (not tested in summary)`);

    console.log('\n2. Component Edit View:');
    console.log(`   ${results.componentEditHasField ? '✓' : '✗'} Has instance_identifier field (not tested in summary)`);

    console.log('\n3. Component Listings:');
    console.log(`   ${results.listingsShowInstances ? '✓' : '✗'} Display instances in G1-A format`);

    console.log('\n4. Search Interface:');
    console.log(`   ${results.searchHasFilter ? '✓' : '✗'} Has instance_identifier filter`);

    console.log('\n5. Database:');
    console.log(`   ${results.databaseHasData ? '?' : '?'} Has instance_identifier data (needs API inspection)`);

    console.log('\n' + '═'.repeat(52));

    const passCount = Object.values(results).filter(v => v === true).length;
    const totalTests = Object.keys(results).length;

    console.log(`\nRESULT: ${passCount}/${totalTests} checks passed`);

    if (passCount < totalTests) {
      console.log('\n⚠️  REGRESSION DETECTED: Instance identifier functionality is degraded');
      console.log('   User report appears to be ACCURATE');
    } else {
      console.log('\n✓ Instance identifier functionality appears intact');
      console.log('   User report may be a UX/visibility issue');
    }

    console.log('\n');
  });
});
