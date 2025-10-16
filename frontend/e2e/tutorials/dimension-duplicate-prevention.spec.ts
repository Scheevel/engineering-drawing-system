import { test, expect } from '@playwright/test';

/**
 * Tutorial: Dimension Duplicate Prevention (Story 6.4)
 *
 * This E2E navigates to a component editor and highlights the "Add Dimension"
 * button, then pauses for manual interaction to demonstrate duplicate prevention.
 *
 * Run: cd frontend && npx playwright test e2e/tutorials/dimension-duplicate-prevention.spec.ts --headed --debug
 * Or: Use VSCode task "Tutorial: Dimension Duplicate Prevention"
 */

test('Dimension Duplicate Prevention Tutorial - Navigate and Pause', async ({ page }) => {
  // Navigate to main page to find a component
  await page.goto('/');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give components time to load

  // Try to find and click on the first component card
  try {
    // Look for component cards on the main page or search page
    const componentCard = page.locator('[data-testid*="component-card"]').first();
    const alternateCard = page.locator('.MuiCard-root').first();

    if (await componentCard.isVisible({ timeout: 3000 })) {
      await componentCard.click();
    } else if (await alternateCard.isVisible({ timeout: 3000 })) {
      await alternateCard.click();
    } else {
      console.log('⚠️  No component cards found. Navigate to a component manually.');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('⚠️  Could not auto-navigate to component. Please navigate manually.');
  }

  // Highlight "Add Dimension" button in the Dimensions section
  await page.evaluate(() => {
    // Find Add Dimension button (look for button with text "Add Dimension")
    const buttons = Array.from(document.querySelectorAll('button'));
    const addDimensionBtn = buttons.find(btn =>
      btn.textContent?.includes('Add Dimension') ||
      btn.textContent?.includes('Add')
    );

    if (addDimensionBtn) {
      // Add visual highlight with pulsing animation
      (addDimensionBtn as HTMLElement).style.border = '3px solid #ff0000';
      (addDimensionBtn as HTMLElement).style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
      (addDimensionBtn as HTMLElement).style.position = 'relative';
      (addDimensionBtn as HTMLElement).style.zIndex = '1000';
      (addDimensionBtn as HTMLElement).style.animation = 'pulse 2s infinite';

      // Add keyframe animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,0,0,0.8); }
          50% { box-shadow: 0 0 40px rgba(255,0,0,1); }
        }
      `;
      document.head.appendChild(style);

      // Scroll into view
      addDimensionBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.log('⚠️  "Add Dimension" button not found on page');
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
        max-width: 380px;
        line-height: 1.6;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #d97706;">
          📝 Tutorial: Dimension Duplicate Prevention
        </h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">
          <strong>Next Step:</strong> Click the highlighted <strong>"Add Dimension"</strong> button
        </p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #555;">
          Then observe which dimension types are <em>disabled</em> (grayed out) in the dropdown
        </p>
        <p style="margin: 0; font-size: 12px; color: #666; border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px;">
          💡 Hover over disabled options to see tooltip explaining why
        </p>
      </div>
    `;
    document.body.appendChild(instructionBox);
  });

  console.log('✅ Tutorial setup complete!');
  console.log('📍 Location: Component Editor (Dimensions section)');
  console.log('🎯 Next: Click "Add Dimension" button and observe disabled dimension types');
  console.log('📖 See: docs/instruction/dimension-duplicate-prevention-tutorial.md');

  // PAUSE HERE - User takes over
  await page.pause();
});

/**
 * Optional: Full flow recording for GIF generation
 * Run with: cd frontend && npx playwright test e2e/tutorials/dimension-duplicate-prevention.spec.ts:recordGif --headed
 */
test('Dimension Duplicate Prevention Tutorial - Full Flow @recordGif', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const componentCard = page.locator('.MuiCard-root').first();
  await componentCard.click();
  await page.waitForTimeout(1500);

  const addDimensionBtn = page.locator('button:has-text("Add Dimension")');
  await addDimensionBtn.click();
  await page.waitForTimeout(1500);

  const dimensionTypeSelect = page.locator('label:has-text("Dimension Type")').locator('xpath=following-sibling::div[1]');
  await dimensionTypeSelect.click();
  await page.waitForTimeout(2000);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  await page.locator('label:has-text("Dimension Type")').locator('xpath=following-sibling::div[1]').click();
  await page.locator('li[role="option"]:has-text("Length")').first().click();
  await page.locator('input[placeholder*="15.75"]').fill('15.75');
  await page.locator('label:has-text("Unit")').locator('xpath=following-sibling::div[1]').click();
  await page.locator('li[role="option"]:has-text("Inches")').click();
  await page.locator('button:has-text("Create")').click();
  await page.waitForTimeout(2000);

  await addDimensionBtn.click();
  await page.waitForTimeout(1000);
  await page.locator('label:has-text("Dimension Type")').locator('xpath=following-sibling::div[1]').click();
  await page.waitForTimeout(2000);

  console.log('✅ Full flow recorded');
});
