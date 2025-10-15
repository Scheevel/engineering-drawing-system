import { test, expect } from '@playwright/test';

/**
 * Tutorial: Create Custom Schema
 *
 * This E2E navigates to the schema creation feature and highlights
 * interactive elements, then pauses for manual interaction.
 *
 * Run: npx playwright test schema-create-tutorial.spec.ts --headed --debug
 * Or: Use VSCode task "Tutorial: Create Schema"
 */

test('Create Schema Tutorial - Navigate and Pause', async ({ page }) => {
  // Navigate to schema management page
  await page.goto('http://localhost:3000/components/schema');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Give UI time to render

  // Highlight the "Create Schema" button
  await page.evaluate(() => {
    // Find the button (adjust selector if UI changes)
    const button = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Schema'));

    if (button) {
      // Add visual highlight
      (button as HTMLElement).style.border = '3px solid #ff0000';
      (button as HTMLElement).style.boxShadow = '0 0 15px rgba(255,0,0,0.8)';
      (button as HTMLElement).style.position = 'relative';
      (button as HTMLElement).style.zIndex = '1000';

      // Scroll into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Add floating instruction box
  await page.evaluate(() => {
    const instructionBox = document.createElement('div');
    instructionBox.id = 'tutorial-instructions';
    instructionBox.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #333;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 350px;
      ">
        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
          📝 Tutorial: Create Schema
        </h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">
          <strong>Next Step:</strong> Click the red-highlighted "Create Schema" button
        </p>
        <p style="margin: 0; font-size: 12px; color: #666;">
          Follow the markdown instructions for remaining steps
        </p>
      </div>
    `;
    document.body.appendChild(instructionBox);
  });

  // Optional: Take a screenshot for reference
  await page.screenshot({
    path: 'docs/instruction/screenshots/schema-create-start.png',
    fullPage: false
  });

  console.log('✅ Tutorial setup complete!');
  console.log('📍 Location: /components/schema');
  console.log('🎯 Next: Click the highlighted "Create Schema" button');
  console.log('📖 Follow steps in: docs/instruction/schema-create-tutorial.md');

  // PAUSE HERE - User takes over
  await page.pause();

  // Note: Everything after pause() is for optional GIF recording
  // These steps won't run during normal tutorial use
});

/**
 * Optional: Full flow recording for GIF generation
 * Run with: npx playwright test schema-create-tutorial.spec.ts:recordGif --headed
 */
test('Create Schema Tutorial - Full Flow Recording @recordGif', async ({ page }) => {
  // This test runs the full flow for GIF recording
  // It won't pause, allowing video capture of complete workflow

  await page.goto('http://localhost:3000/components/schema');
  await page.waitForLoadState('networkidle');

  // Step 1: Click Create Schema
  await page.click('button:has-text("Create Schema")');
  await page.waitForTimeout(1000);

  // Step 2: Enter Component Type
  await page.fill('input[name="componentType"]', 'Beam');
  await page.waitForTimeout(500);

  // Step 3: Add Field
  await page.click('button:has-text("Add Field")');
  await page.waitForTimeout(1000);

  // Step 4: Configure Field
  await page.fill('input[name="fieldName"]', 'Length');
  await page.selectOption('select[name="fieldType"]', 'number');
  await page.waitForTimeout(500);

  // Step 5: Save Schema
  await page.click('button:has-text("Save Schema")');
  await page.waitForTimeout(2000);

  // Verify success
  await expect(page.locator('text=Schema created successfully')).toBeVisible();

  console.log('✅ Full flow recorded for GIF generation');
});
