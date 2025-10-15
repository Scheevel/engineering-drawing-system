import { test, expect } from '@playwright/test';

/**
 * Tutorial: [FEATURE_NAME]
 *
 * This E2E navigates to [feature location] and highlights
 * interactive elements, then pauses for manual interaction.
 *
 * Run: npx playwright test [feature-name]-tutorial.spec.ts --headed --debug
 * Or: Use VSCode task "Tutorial: [FEATURE_NAME]"
 */

test('[FEATURE_NAME] Tutorial - Navigate and Pause', async ({ page }) => {
  // Navigate to feature starting point
  await page.goto('http://localhost:3000/[ROUTE_PATH]');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Give UI time to render

  // Highlight primary interactive element
  await page.evaluate(() => {
    // Find the target element (UPDATE SELECTOR)
    const element = document.querySelector('[PRIMARY_ELEMENT_SELECTOR]');

    if (element) {
      // Add visual highlight
      (element as HTMLElement).style.border = '3px solid #ff0000';
      (element as HTMLElement).style.boxShadow = '0 0 15px rgba(255,0,0,0.8)';
      (element as HTMLElement).style.position = 'relative';
      (element as HTMLElement).style.zIndex = '1000';

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          📝 Tutorial: [FEATURE_NAME]
        </h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">
          <strong>Next Step:</strong> [FIRST_ACTION_DESCRIPTION]
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
    path: 'docs/instruction/screenshots/[feature-name]-start.png',
    fullPage: false
  });

  console.log('✅ Tutorial setup complete!');
  console.log('📍 Location: [ROUTE_PATH]');
  console.log('🎯 Next: [FIRST_ACTION_DESCRIPTION]');
  console.log('📖 Follow steps in: docs/instruction/[feature-name]-tutorial.md');

  // PAUSE HERE - User takes over
  await page.pause();

  // Note: Everything after pause() is for optional GIF recording
  // These steps won't run during normal tutorial use
});

/**
 * Optional: Full flow recording for GIF generation
 * Run with: npx playwright test [feature-name]-tutorial.spec.ts:recordGif --headed
 */
test('[FEATURE_NAME] Tutorial - Full Flow Recording @recordGif', async ({ page }) => {
  // This test runs the full flow for GIF recording
  // It won't pause, allowing video capture of complete workflow

  await page.goto('http://localhost:3000/[ROUTE_PATH]');
  await page.waitForLoadState('networkidle');

  // Step 1: [FIRST_ACTION]
  // TODO: Add Playwright actions for step 1
  await page.waitForTimeout(1000);

  // Step 2: [SECOND_ACTION]
  // TODO: Add Playwright actions for step 2
  await page.waitForTimeout(1000);

  // Step 3: [THIRD_ACTION]
  // TODO: Add Playwright actions for step 3
  await page.waitForTimeout(1000);

  // Add more steps as needed...

  // Final verification
  // await expect(page.locator('[SUCCESS_INDICATOR]')).toBeVisible();

  console.log('✅ Full flow recorded for GIF generation');
});
