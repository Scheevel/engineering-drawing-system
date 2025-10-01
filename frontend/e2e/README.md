# Playwright E2E Tests - Guide

## Overview

This directory contains end-to-end tests using Playwright to validate the complete user workflows in the Engineering Drawing System.

## Test Files

- **`app-navigation.spec.ts`** - Basic navigation and routing tests
- **`schema-management.spec.ts`** - Smoke tests for schema pages
- **`schema-workflow.spec.ts`** - Comprehensive workflow tests (CREATE, EDIT, ADD FIELDS)
- **`search-functionality.spec.ts`** - Search features
- **`upload-functionality.spec.ts`** - File upload workflows
- **`ui-components.spec.ts`** - Component rendering tests

## Running Tests

### Run all E2E tests
```bash
cd frontend
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test e2e/schema-workflow.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode (step through)
```bash
npx playwright test --debug
```

### Run specific test by name
```bash
npx playwright test -g "Complete workflow"
```

### Run only on specific browser
```bash
npx playwright test --project=chromium
```

## Test Reports

### View last test report
```bash
npx playwright show-report
```

### View trace for failed test
```bash
npx playwright show-trace trace.zip
```

## Test Structure

### Page Object Model

Tests use the Page Object Model pattern for maintainability:

```typescript
class SchemaEditPage {
  constructor(private page: Page) {}

  async switchToFieldsTab() {
    await this.page.getByRole('tab', { name: /fields/i }).click();
  }

  async clickAddField() {
    await this.page.getByRole('button', { name: /add field/i }).click();
  }
}
```

**Benefits:**
- **Reusable**: Page objects can be used across multiple tests
- **Maintainable**: UI changes only require updating page objects
- **Readable**: Tests read like user stories

### Test Anatomy

```typescript
test('descriptive test name', async ({ page }) => {
  // Arrange - Set up test data and navigate
  const schemaPage = new SchemaEditPage(page);
  await schemaPage.goto();

  // Act - Perform actions
  await schemaPage.clickAddField();
  await schemaPage.fillFieldName('test');

  // Assert - Verify expected outcomes
  await schemaPage.expectFieldInList('test');
});
```

## Best Practices

### 1. Use Semantic Selectors

```typescript
// ✅ Good - Semantic, resilient
await page.getByRole('button', { name: /submit/i })
await page.getByLabel(/schema name/i)
await page.getByText(/validation error/i)

// ❌ Avoid - Brittle, implementation-dependent
await page.locator('.btn-primary')
await page.locator('#schema-name-input')
```

### 2. Auto-Wait

Playwright automatically waits for elements. Avoid manual `waitFor` unless necessary:

```typescript
// ✅ Good - Auto-wait built in
await page.getByRole('button').click()

// ❌ Unnecessary - Playwright handles this
await page.waitForSelector('button')
await page.click('button')
```

### 3. Assertions with Retries

Use Playwright's `expect` for automatic retries:

```typescript
// ✅ Good - Retries until visible or times out
await expect(page.getByText('Success')).toBeVisible()

// ❌ Avoid - No retry, flaky
const text = await page.getByText('Success').textContent()
expect(text).toBe('Success')
```

### 4. Test Isolation

Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  // Reset to clean state
  await page.goto('/schemas')
  await page.evaluate(() => localStorage.clear())
})
```

### 5. Unique Test Data

Use timestamps or UUIDs to avoid conflicts:

```typescript
const schemaName = `test-schema-${Date.now()}`
```

## Common Patterns

### Filling Forms

```typescript
async fillSchemaForm(name: string, description: string) {
  await this.page.getByLabel(/schema name/i).fill(name)
  await this.page.getByLabel(/description/i).fill(description)
}
```

### Handling Dialogs

```typescript
async expectDialogOpen() {
  await expect(this.page.getByRole('dialog')).toBeVisible()
}

async closeDialog() {
  await this.page.keyboard.press('Escape')
  // or
  await this.page.getByRole('button', { name: /close/i }).click()
}
```

### Waiting for Navigation

```typescript
await this.page.waitForURL(/\/schemas\/.*\/edit/)
```

### Checking for Errors

```typescript
test('should not have console errors', async ({ page }) => {
  const errors: string[] = []

  page.on('pageerror', error => errors.push(error.message))

  // Run test actions...

  expect(errors).toEqual([])
})
```

### Testing API Responses

```typescript
// Intercept and mock API calls
await page.route('**/api/v1/schemas', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ schemas: [] })
  })
})
```

### Network Conditions

```typescript
// Test offline behavior
await page.context().setOffline(true)
await page.goto('/schemas')
await expect(page.getByText(/offline/i)).toBeVisible()
await page.context().setOffline(false)
```

## Debugging Tests

### 1. Use headed mode to watch
```bash
npx playwright test --headed --slowMo=1000
```

### 2. Add console.log statements
```typescript
console.log('Current URL:', page.url())
console.log('Element count:', await elements.count())
```

### 3. Take screenshots
```typescript
await page.screenshot({ path: 'debug.png' })
```

### 4. Pause execution
```typescript
await page.pause() // Opens Playwright Inspector
```

### 5. Use debug mode
```bash
npx playwright test --debug
```

## Continuous Integration

Tests run automatically on CI with:
- Retries for flaky tests (2 retries on CI)
- Video recording on failure
- Screenshots on failure
- JUnit XML reports for CI dashboards

## Coverage

### Current Coverage

- ✅ Schema creation with validation
- ✅ Multiple field addition (rapid succession)
- ✅ Field editing and deletion
- ✅ Unsaved changes warnings
- ✅ Data persistence after reload
- ✅ Error handling (network, validation)
- ✅ Browser console error detection

### Future Coverage

- ⏳ Schema duplication
- ⏳ Default schema toggle
- ⏳ Field reordering (drag-and-drop)
- ⏳ Schema deletion with dependencies
- ⏳ Advanced field configuration (select options, number ranges)
- ⏳ Component creation using schema

## Writing New Tests

### Step 1: Create Page Object

```typescript
class NewFeaturePage {
  constructor(private page: Page) {}

  async performAction() {
    await this.page.getByRole('button', { name: /action/i }).click()
  }

  async expectResult() {
    await expect(this.page.getByText(/success/i)).toBeVisible()
  }
}
```

### Step 2: Write Test

```typescript
test('new feature works', async ({ page }) => {
  const featurePage = new NewFeaturePage(page)

  await featurePage.performAction()
  await featurePage.expectResult()
})
```

### Step 3: Run and Debug

```bash
npx playwright test --headed --debug e2e/new-feature.spec.ts
```

## Troubleshooting

### Test times out
- Check if element selector is correct
- Verify element is actually rendered
- Increase timeout: `{ timeout: 10000 }`

### Element not found
- Use `page.locator('selector').count()` to check
- Verify page navigation completed
- Check for dynamic loading

### Flaky tests
- Add proper waits for network: `waitForLoadState('networkidle')`
- Use Playwright's auto-retry assertions
- Avoid time-based waits: `page.waitForTimeout()`

### Tests pass locally but fail on CI
- Check CI environment variables
- Verify backend services are running
- Review CI logs and video recordings

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## Contact

Questions about E2E tests? Check:
1. This README
2. Existing test files for examples
3. Playwright documentation
4. Team discussion channels
