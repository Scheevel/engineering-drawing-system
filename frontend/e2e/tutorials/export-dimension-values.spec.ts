import { test, expect } from '@playwright/test';

/**
 * Tutorial: Export Dimension Values (Story 7.4)
 *
 * This E2E navigates to the /export page and highlights the dimension format
 * toggle and dimension field selection, then pauses for manual interaction.
 *
 * Run: cd frontend && npx playwright test e2e/tutorials/export-dimension-values.spec.ts --headed --debug
 * Or: Use VSCode task "Tutorial: Export Dimension Values"
 */

test('Export Dimension Values Tutorial - Navigate and Pause', async ({ page }) => {
  // Navigate to export page
  await page.goto('/export');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give export data time to load

  // Highlight the Dimension Format toggle section
  await page.evaluate(() => {
    const allText = Array.from(document.querySelectorAll('*')).filter(el =>
      el.textContent?.includes('Dimension Format:')
    );

    let toggleSection: HTMLElement | null = null;

    for (const el of allText) {
      const parent = el.closest('[class*="MuiBox-root"]') as HTMLElement;
      if (parent && parent.textContent?.includes('Combined') && parent.textContent?.includes('Value Only')) {
        toggleSection = parent;
        break;
      }
    }

    if (toggleSection) {
      toggleSection.style.border = '3px solid #ff0000';
      toggleSection.style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
      toggleSection.style.boxShadow = '0 0 20px rgba(255,0,0,0.6)';
      toggleSection.style.padding = '12px';
      toggleSection.style.borderRadius = '8px';
      toggleSection.style.position = 'relative';
      toggleSection.style.zIndex = '1000';
      toggleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.log('⚠️  Dimension Format toggle not found');
    }
  });

  await page.waitForTimeout(500);

  // Also highlight the "Dimension Values" accordion
  await page.evaluate(() => {
    const accordions = Array.from(document.querySelectorAll('[class*="MuiAccordion"]'));
    const dimensionAccordion = accordions.find(acc =>
      acc.textContent?.includes('Dimension Values')
    ) as HTMLElement;

    if (dimensionAccordion) {
      dimensionAccordion.style.border = '2px dashed #0066cc';
      dimensionAccordion.style.borderRadius = '4px';
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
        max-width: 400px;
        line-height: 1.6;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #d97706;">
          📊 Tutorial: Export Dimension Values
        </h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">
          <strong>Next Steps:</strong>
        </p>
        <ol style="margin: 0 0 10px 0; padding-left: 20px; font-size: 13px; color: #555;">
          <li>Toggle <strong>Dimension Format</strong> (Combined/Value Only)</li>
          <li>Notice preview updates <em>instantly</em></li>
          <li>Expand <strong>"Dimension Values"</strong> accordion</li>
          <li>Toggle dimension field checkboxes</li>
          <li>Observe preview table with dimension columns</li>
        </ol>
        <p style="margin: 0; font-size: 12px; color: #666; border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px;">
          💡 Only dimension types in your components appear
        </p>
      </div>
    `;
    document.body.appendChild(instructionBox);
  });

  console.log('✅ Tutorial setup complete!');
  console.log('📍 Location: /export page');
  console.log('🎯 Next: Toggle Dimension Format and observe field selection');
  console.log('📖 See: docs/instruction/export-dimension-values-tutorial.md');

  // PAUSE HERE - User takes over
  await page.pause();
});

/**
 * Optional: Full flow recording for GIF generation
 * Run with: cd frontend && npx playwright test e2e/tutorials/export-dimension-values.spec.ts:recordGif --headed
 */
test('Export Dimension Values Tutorial - Full Flow @recordGif', async ({ page }) => {
  await page.goto('/export');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const combinedBtn = page.locator('button:has-text("Combined")');
  await combinedBtn.click();
  await page.waitForTimeout(1500);

  const valueOnlyBtn = page.locator('button:has-text("Value Only")');
  await valueOnlyBtn.click();
  await page.waitForTimeout(1500);

  await combinedBtn.click();
  await page.waitForTimeout(1000);

  const dimensionAccordion = page.locator('text=Dimension Values').first();
  await dimensionAccordion.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  try {
    const accordionButton = dimensionAccordion.locator('xpath=ancestor::button');
    if (await accordionButton.getAttribute('aria-expanded') === 'false') {
      await accordionButton.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    // Already expanded
  }

  try {
    const lengthCheckbox = page.locator('label:has-text("Length")').locator('input[type="checkbox"]');
    if (await lengthCheckbox.isVisible({ timeout: 2000 })) {
      if (await lengthCheckbox.isChecked()) {
        await lengthCheckbox.uncheck();
        await page.waitForTimeout(1500);
        await lengthCheckbox.check();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.log('Length checkbox not found');
  }

  const preview = page.locator('text=Preview').first();
  await preview.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  await page.locator('text=Export Components to CSV').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  console.log('✅ Full flow recorded');
});
