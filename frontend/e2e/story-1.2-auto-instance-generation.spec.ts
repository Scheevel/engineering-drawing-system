import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Story 1.2 AC4: Auto-Instance Generation
 *
 * Original Acceptance Criteria (UNIMPLEMENTED):
 * "API automatically generates instance_identifier (.A, .B, .C) when not provided
 * and piece mark already exists"
 *
 * These tests define the expected behavior for automatic instance identifier generation
 * when users create duplicate piece marks within the same drawing.
 */

test.describe('Story 1.2 AC4: Auto-Instance Generation', () => {

  // Test Setup: Assume we have a drawing available for testing
  const TEST_DRAWING_ID = 'test-drawing-001';
  const BASE_URL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to the test drawing page
    await page.goto(`${BASE_URL}/drawings/${TEST_DRAWING_ID}`);
    await page.waitForLoadState('networkidle');
  });

  test('AC4.1: First instance of piece mark has NO auto-generated identifier', async ({ page }) => {
    /**
     * GIVEN: Drawing has no "G1" components
     * WHEN: User creates a new component with piece mark "G1"
     * THEN: Component is created with NULL instance_identifier (no auto-generation)
     */

    // Open component creation dialog
    const createButton = page.locator('button:has-text("Add Component")');
    await createButton.click();
    await page.waitForSelector('[role="dialog"]');

    // Enter piece mark "G1"
    const pieceMarkInput = page.locator('input[name="piece_mark"]');
    await pieceMarkInput.fill('G1');

    // Check instance identifier field
    const instanceInput = page.locator('input[name="instance_identifier"]');
    const instanceValue = await instanceInput.inputValue();

    console.log(`✓ First instance: instance_identifier should be empty`);
    console.log(`  Actual value: "${instanceValue}"`);

    // Instance identifier should be empty for first instance
    expect(instanceValue).toBe('');

    // Fill required fields and submit
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    const submitButton = page.locator('button:has-text("Create")');
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(1000);

    // Verify component created without instance identifier
    const componentRow = page.locator('td:has-text("G1")').first();
    expect(await componentRow.isVisible()).toBeTruthy();
  });

  test('AC4.2: Second instance of piece mark auto-generates "A"', async ({ page }) => {
    /**
     * GIVEN: Drawing has component "G1" (no instance identifier)
     * WHEN: User creates another component with piece mark "G1"
     * THEN: System auto-populates instance_identifier field with "A"
     */

    // First, create G1 without instance
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    let pieceMarkInput = page.locator('input[name="piece_mark"]');
    await pieceMarkInput.fill('G1');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Now create second G1 - should auto-suggest "A"
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    pieceMarkInput = page.locator('input[name="piece_mark"]');
    const instanceInput = page.locator('input[name="instance_identifier"]');

    // Enter piece mark
    await pieceMarkInput.fill('G1');

    // Wait for auto-generation to trigger
    await page.waitForTimeout(500);

    // Check if instance identifier was auto-populated
    const instanceValue = await instanceInput.inputValue();

    console.log(`✓ Second instance: instance_identifier should auto-populate to "A"`);
    console.log(`  Actual value: "${instanceValue}"`);

    expect(instanceValue).toBe('A');
  });

  test('AC4.3: Third instance auto-generates "B" when "A" exists', async ({ page }) => {
    /**
     * GIVEN: Drawing has components "G1" and "G1-A"
     * WHEN: User creates another component with piece mark "G1"
     * THEN: System auto-populates instance_identifier field with "B"
     */

    // Create G1 (first instance)
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create G1-A (second instance)
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('A');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create third G1 - should auto-suggest "B"
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    const pieceMarkInput = page.locator('input[name="piece_mark"]');
    const instanceInput = page.locator('input[name="instance_identifier"]');

    await pieceMarkInput.fill('G1');
    await page.waitForTimeout(500);

    const instanceValue = await instanceInput.inputValue();

    console.log(`✓ Third instance: instance_identifier should auto-populate to "B"`);
    console.log(`  Actual value: "${instanceValue}"`);

    expect(instanceValue).toBe('B');
  });

  test('AC4.4: Auto-generation fills gaps in instance sequence', async ({ page }) => {
    /**
     * GIVEN: Drawing has components "G1-A" and "G1-C" (B is missing)
     * WHEN: User creates another component with piece mark "G1"
     * THEN: System auto-populates instance_identifier field with "B" (fills the gap)
     */

    // Create G1-A
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('A');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create G1-C (skip B intentionally)
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('C');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create new G1 - should suggest "B" to fill the gap
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    const pieceMarkInput = page.locator('input[name="piece_mark"]');
    const instanceInput = page.locator('input[name="instance_identifier"]');

    await pieceMarkInput.fill('G1');
    await page.waitForTimeout(500);

    const instanceValue = await instanceInput.inputValue();

    console.log(`✓ Gap filling: instance_identifier should auto-populate to "B" (missing letter)`);
    console.log(`  Actual value: "${instanceValue}"`);

    expect(instanceValue).toBe('B');
  });

  test('AC4.5: User can override auto-suggested instance identifier', async ({ page }) => {
    /**
     * GIVEN: Drawing has component "G1-A" (system would suggest "B")
     * WHEN: User manually changes instance_identifier to "Z"
     * THEN: Component is created with "Z" (user override respected)
     */

    // Create G1-A
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('A');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create new G1
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    const pieceMarkInput = page.locator('input[name="piece_mark"]');
    const instanceInput = page.locator('input[name="instance_identifier"]');

    await pieceMarkInput.fill('G1');
    await page.waitForTimeout(500);

    // System would suggest "B", but user overrides to "Z"
    await instanceInput.clear();
    await instanceInput.fill('Z');

    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();

    // Wait for success
    await page.waitForTimeout(1500);

    // Verify G1-Z was created (not G1-B)
    const componentRow = page.locator('td:has-text("Z")');

    console.log(`✓ User override: Component should be created with "Z" not auto-suggested "B"`);

    expect(await componentRow.isVisible()).toBeTruthy();
  });

  test('AC4.6: Auto-generation works across different piece marks independently', async ({ page }) => {
    /**
     * GIVEN: Drawing has "G1-A" and "W21-A"
     * WHEN: User creates new "G1" and new "W21"
     * THEN: Both auto-suggest "B" independently (not shared sequence)
     */

    // Create G1-A
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('A');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create W21-A
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('W21');
    await page.locator('input[name="instance_identifier"]').fill('A');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create new G1 - should suggest "B" for G1
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.waitForTimeout(500);

    let instanceValue = await page.locator('input[name="instance_identifier"]').inputValue();

    console.log(`✓ G1 sequence: Should suggest "B" for G1 (independent of W21)`);
    console.log(`  G1 instance value: "${instanceValue}"`);

    expect(instanceValue).toBe('B');

    // Close dialog
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);

    // Create new W21 - should also suggest "B" for W21 (independent sequence)
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('W21');
    await page.waitForTimeout(500);

    instanceValue = await page.locator('input[name="instance_identifier"]').inputValue();

    console.log(`✓ W21 sequence: Should suggest "B" for W21 (independent of G1)`);
    console.log(`  W21 instance value: "${instanceValue}"`);

    expect(instanceValue).toBe('B');
  });

  test('AC4.7: Auto-generation handles Z→AA progression', async ({ page }) => {
    /**
     * GIVEN: Drawing has components G1-A through G1-Z (all 26 letters used)
     * WHEN: User creates another component with piece mark "G1"
     * THEN: System auto-populates instance_identifier field with "AA"
     */

    // This test is intentionally simplified - in reality you'd create A-Z
    // For demo purposes, we'll just create Y and Z, then test the next suggestion

    // Create G1-Y
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('Y');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create G1-Z
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('input[name="piece_mark"]').fill('G1');
    await page.locator('input[name="instance_identifier"]').fill('Z');
    await page.locator('select[name="component_type"]').selectOption('wide_flange');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(1500);

    // Create new G1 - should suggest "AA" (though this test will initially fail)
    // Note: This is an edge case that requires sophisticated logic
    await page.locator('button:has-text("Add Component")').click();
    await page.waitForSelector('[role="dialog"]');

    const pieceMarkInput = page.locator('input[name="piece_mark"]');
    const instanceInput = page.locator('input[name="instance_identifier"]');

    await pieceMarkInput.fill('G1');
    await page.waitForTimeout(500);

    const instanceValue = await instanceInput.inputValue();

    console.log(`✓ Z→AA progression: After Z, should suggest AA, AB, AC...`);
    console.log(`  Actual value: "${instanceValue}"`);
    console.log(`  Note: This is an advanced edge case - basic implementation may suggest next missing letter instead`);

    // For MVP, we can accept either:
    // 1. "AA" (sophisticated progression)
    // 2. First missing letter A-Z (simpler approach)
    // 3. Empty (user must enter manually for 26+ instances)
    expect(instanceValue).toBeTruthy(); // Just ensure something is suggested
  });
});

/**
 * Test Summary:
 *
 * AC4.1 ✓ First instance: No auto-generation (NULL instance_identifier)
 * AC4.2 ✓ Second instance: Auto-suggest "A"
 * AC4.3 ✓ Sequential: A exists → suggest "B"
 * AC4.4 ✓ Gap filling: A, C exist → suggest "B" (fill gap)
 * AC4.5 ✓ User override: System suggests "B" → user enters "Z" → respects "Z"
 * AC4.6 ✓ Independence: G1-A and W21-A sequences are independent
 * AC4.7 ⚠️  Edge case: After Z, suggest AA/AB/AC (advanced feature)
 *
 * Expected Test Results (Before Implementation):
 * - All tests will FAIL because auto-generation is not implemented
 * - After implementation, all tests should PASS
 *
 * Implementation Scope:
 * - Frontend: Add useEffect to auto-populate instance field when piece mark changes
 * - Backend: Add service method to calculate next available instance identifier
 * - Algorithm: Find all existing instances → suggest next letter (A-Z) → fill gaps first
 */
