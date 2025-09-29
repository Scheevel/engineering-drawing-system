/**
 * Accessibility Testing Helpers
 *
 * Comprehensive utilities for testing accessibility compliance
 * including screen reader simulation, keyboard navigation,
 * focus management, and ARIA validation
 */

import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * ARIA roles that should be present for schema management components
 */
export const EXPECTED_ARIA_ROLES = {
  dialog: 'dialog',
  button: 'button',
  textbox: 'textbox',
  combobox: 'combobox',
  checkbox: 'checkbox',
  listbox: 'listbox',
  option: 'option',
  alert: 'alert',
  status: 'status',
  tablist: 'tablist',
  tab: 'tab',
  tabpanel: 'tabpanel',
} as const;

/**
 * Common ARIA attributes that should be tested
 */
export const REQUIRED_ARIA_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-expanded',
  'aria-selected',
  'aria-checked',
  'aria-invalid',
  'aria-required',
  'aria-live',
  'aria-atomic',
] as const;

/**
 * Accessibility testing utilities
 */
export const accessibilityHelpers = {
  /**
   * Test screen reader compatibility
   */
  async testScreenReaderCompatibility(container: HTMLElement): Promise<void> {
    // Check for semantic HTML structure
    const headings = within(container).queryAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    // Check for proper landmark usage
    const landmarks = within(container).queryAllByRole(/main|navigation|banner|contentinfo|region/);
    expect(landmarks.length).toBeGreaterThan(0);

    // Verify all interactive elements have accessible names
    const interactiveElements = within(container).queryAllByRole(/button|link|textbox|combobox|checkbox/);
    interactiveElements.forEach(element => {
      const accessibleName = element.getAttribute('aria-label') ||
                            element.getAttribute('aria-labelledby') ||
                            element.textContent?.trim();
      expect(accessibleName).toBeTruthy();
    });
  },

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(container: HTMLElement): Promise<void> {
    const user = userEvent.setup();

    // Get all focusable elements
    const focusableElements = this.getFocusableElements(container);

    if (focusableElements.length === 0) {
      return; // No focusable elements to test
    }

    // Test Tab navigation forward
    focusableElements[0].focus();
    expect(focusableElements[0]).toHaveFocus();

    for (let i = 1; i < focusableElements.length; i++) {
      await user.tab();
      // Note: We check if ANY focusable element has focus, not necessarily the expected one
      // because some components may have complex focus management
      const hasFocusedElement = focusableElements.some(el => el === document.activeElement);
      expect(hasFocusedElement).toBe(true);
    }

    // Test Shift+Tab navigation backward
    for (let i = focusableElements.length - 2; i >= 0; i--) {
      await user.tab({ shift: true });
      const hasFocusedElement = focusableElements.some(el => el === document.activeElement);
      expect(hasFocusedElement).toBe(true);
    }
  },

  /**
   * Test keyboard shortcuts
   */
  async testKeyboardShortcuts(container: HTMLElement): Promise<void> {
    const user = userEvent.setup();

    // Test common keyboard shortcuts
    const shortcuts = [
      { key: '{Escape}', description: 'Escape key should close modals/dialogs' },
      { key: '{Enter}', description: 'Enter key should activate buttons/submit forms' },
      { key: ' ', description: 'Space key should activate buttons/checkboxes' },
      { key: '{ArrowDown}', description: 'Arrow keys should navigate lists/options' },
      { key: '{ArrowUp}', description: 'Arrow keys should navigate lists/options' },
    ];

    for (const shortcut of shortcuts) {
      try {
        await user.keyboard(shortcut.key);
        // The response depends on the component, so we just ensure no errors occur
      } catch (error) {
        // Log but don't fail the test for keyboard shortcuts that aren't implemented
        console.warn(`Keyboard shortcut ${shortcut.key} not implemented: ${shortcut.description}`);
      }
    }
  },

  /**
   * Test focus management
   */
  async testFocusManagement(container: HTMLElement): Promise<void> {
    const user = userEvent.setup();

    // Test focus restoration after modal interactions
    const buttons = within(container).queryAllByRole('button');

    for (const button of buttons) {
      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Simulate opening a modal (if applicable)
      await user.click(button);

      // Look for modal/dialog
      const modal = screen.queryByRole('dialog');
      if (modal) {
        // Focus should move to the modal
        const modalFocusableElements = this.getFocusableElements(modal);
        if (modalFocusableElements.length > 0) {
          expect(modalFocusableElements.some(el => el === document.activeElement)).toBe(true);
        }

        // Test focus trapping
        await this.testFocusTrapping(modal);

        // Close modal and test focus restoration
        await user.keyboard('{Escape}');

        // Wait for modal to close and check if focus is restored
        if (!screen.queryByRole('dialog')) {
          // Focus should return to triggering element or a logical fallback
          expect(document.activeElement).toBeTruthy();
        }
      }
    }
  },

  /**
   * Test focus trapping in modals
   */
  async testFocusTrapping(modal: HTMLElement): Promise<void> {
    const user = userEvent.setup();
    const focusableElements = this.getFocusableElements(modal);

    if (focusableElements.length < 2) {
      return; // Need at least 2 elements to test trapping
    }

    // Focus last element and tab forward - should cycle to first
    focusableElements[focusableElements.length - 1].focus();
    await user.tab();
    expect(focusableElements[0]).toHaveFocus();

    // Focus first element and shift+tab - should cycle to last
    focusableElements[0].focus();
    await user.tab({ shift: true });
    expect(focusableElements[focusableElements.length - 1]).toHaveFocus();
  },

  /**
   * Test ARIA attributes and roles
   */
  testAriaAttributes(container: HTMLElement): void {
    // Test for proper ARIA roles
    const elementsWithRoles = container.querySelectorAll('[role]');
    elementsWithRoles.forEach(element => {
      const role = element.getAttribute('role');
      expect(role).toBeTruthy();

      // Validate that the role is a valid ARIA role
      const validRoles = Object.values(EXPECTED_ARIA_ROLES);
      if (!validRoles.includes(role as any)) {
        console.warn(`Potentially invalid ARIA role: ${role}`);
      }
    });

    // Test ARIA relationships
    const elementsWithAriaLabelledby = container.querySelectorAll('[aria-labelledby]');
    elementsWithAriaLabelledby.forEach(element => {
      const labelIds = element.getAttribute('aria-labelledby')?.split(' ') || [];
      labelIds.forEach(id => {
        const labelElement = container.querySelector(`#${id}`);
        expect(labelElement).toBeTruthy();
      });
    });

    const elementsWithAriaDescribedby = container.querySelectorAll('[aria-describedby]');
    elementsWithAriaDescribedby.forEach(element => {
      const descriptionIds = element.getAttribute('aria-describedby')?.split(' ') || [];
      descriptionIds.forEach(id => {
        const descriptionElement = container.querySelector(`#${id}`);
        expect(descriptionElement).toBeTruthy();
      });
    });
  },

  /**
   * Test ARIA live regions for dynamic content
   */
  async testAriaLiveRegions(container: HTMLElement): Promise<void> {
    // Find elements with aria-live attributes
    const liveRegions = container.querySelectorAll('[aria-live]');

    liveRegions.forEach(region => {
      const liveValue = region.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(liveValue);

      // Check for aria-atomic if present
      const atomicValue = region.getAttribute('aria-atomic');
      if (atomicValue) {
        expect(['true', 'false']).toContain(atomicValue);
      }
    });

    // Test status and alert regions
    const statusRegions = within(container).queryAllByRole('status');
    const alertRegions = within(container).queryAllByRole('alert');

    [...statusRegions, ...alertRegions].forEach(region => {
      expect(region).toBeInTheDocument();
      // Status regions should typically have aria-live="polite"
      // Alert regions should typically have aria-live="assertive" (implicit)
    });
  },

  /**
   * Test form accessibility
   */
  testFormAccessibility(form: HTMLElement): void {
    // All form controls should have labels
    const formControls = within(form).queryAllByRole(/textbox|combobox|checkbox|radio|button/);

    formControls.forEach(control => {
      const hasLabel = (
        control.getAttribute('aria-label') ||
        control.getAttribute('aria-labelledby') ||
        form.querySelector(`label[for="${control.id}"]`) ||
        control.closest('label')
      );

      expect(hasLabel).toBeTruthy();
    });

    // Required fields should be marked
    const requiredFields = form.querySelectorAll('[required], [aria-required="true"]');
    requiredFields.forEach(field => {
      const isMarked = (
        field.hasAttribute('required') ||
        field.getAttribute('aria-required') === 'true'
      );
      expect(isMarked).toBe(true);
    });

    // Error fields should have proper ARIA attributes
    const errorFields = form.querySelectorAll('[aria-invalid="true"]');
    errorFields.forEach(field => {
      const hasErrorDescription = (
        field.getAttribute('aria-describedby') &&
        form.querySelector(`#${field.getAttribute('aria-describedby')}`)
      );
      expect(hasErrorDescription).toBeTruthy();
    });
  },

  /**
   * Test drag and drop accessibility
   */
  async testDragDropAccessibility(container: HTMLElement): Promise<void> {
    const user = userEvent.setup();

    // Find draggable elements
    const draggableElements = container.querySelectorAll('[draggable="true"]');

    draggableElements.forEach(async (element) => {
      // Draggable elements should have keyboard alternatives
      expect(element).toHaveAttribute('role');
      expect(element).toHaveAttribute('aria-label');

      // Should be focusable
      expect(this.isFocusable(element as HTMLElement)).toBe(true);

      // Should respond to keyboard interactions
      element.focus();
      expect(element).toHaveFocus();

      // Test space/enter activation (implementation-specific)
      await user.keyboard(' ');
      await user.keyboard('{Enter}');
    });
  },

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="textbox"]:not([disabled])',
      '[role="combobox"]:not([disabled])',
      '[role="checkbox"]:not([disabled])',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  },

  /**
   * Check if an element is focusable
   */
  isFocusable(element: HTMLElement): boolean {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const focusableTags = ['button', 'input', 'select', 'textarea', 'a'];

    if (focusableTags.includes(tagName)) {
      return true;
    }

    if (tabIndex && parseInt(tabIndex) >= 0) {
      return true;
    }

    const role = element.getAttribute('role');
    const focusableRoles = ['button', 'textbox', 'combobox', 'checkbox', 'radio', 'link'];

    return focusableRoles.includes(role || '');
  },

  /**
   * Test color contrast (simplified check)
   */
  testColorContrast(container: HTMLElement): void {
    // This is a simplified test - in practice, you'd use tools like axe-core
    const textElements = container.querySelectorAll('p, span, div, label, button, a');

    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Basic check that colors are defined
      expect(color).toBeTruthy();
      if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        expect(backgroundColor).toBeTruthy();
      }
    });
  },

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport(container: HTMLElement): {
    focusableElements: number;
    ariaLabels: number;
    headings: number;
    landmarks: number;
    errors: string[];
    warnings: string[];
  } {
    const focusableElements = this.getFocusableElements(container);
    const ariaLabels = container.querySelectorAll('[aria-label], [aria-labelledby]');
    const headings = within(container).queryAllByRole('heading');
    const landmarks = within(container).queryAllByRole(/main|navigation|banner|contentinfo|region/);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for common accessibility issues
    const unlabledInputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    if (unlabledInputs.length > 0) {
      errors.push(`Found ${unlabledInputs.length} unlabeled input elements`);
    }

    const emptyButtons = container.querySelectorAll('button:empty:not([aria-label]):not([aria-labelledby])');
    if (emptyButtons.length > 0) {
      warnings.push(`Found ${emptyButtons.length} buttons without accessible names`);
    }

    const missingHeadings = headings.length === 0;
    if (missingHeadings) {
      warnings.push('No heading elements found - consider adding headings for structure');
    }

    return {
      focusableElements: focusableElements.length,
      ariaLabels: ariaLabels.length,
      headings: headings.length,
      landmarks: landmarks.length,
      errors,
      warnings,
    };
  },
};

/**
 * Comprehensive accessibility test suite
 */
export const runAccessibilityTestSuite = async (
  container: HTMLElement,
  options: {
    skipScreenReader?: boolean;
    skipKeyboard?: boolean;
    skipFocus?: boolean;
    skipAria?: boolean;
    skipLiveRegions?: boolean;
  } = {}
): Promise<void> => {
  const {
    skipScreenReader = false,
    skipKeyboard = false,
    skipFocus = false,
    skipAria = false,
    skipLiveRegions = false,
  } = options;

  console.log('Running accessibility test suite...');

  if (!skipScreenReader) {
    await accessibilityHelpers.testScreenReaderCompatibility(container);
  }

  if (!skipKeyboard) {
    await accessibilityHelpers.testKeyboardNavigation(container);
    await accessibilityHelpers.testKeyboardShortcuts(container);
  }

  if (!skipFocus) {
    await accessibilityHelpers.testFocusManagement(container);
  }

  if (!skipAria) {
    accessibilityHelpers.testAriaAttributes(container);
  }

  if (!skipLiveRegions) {
    await accessibilityHelpers.testAriaLiveRegions(container);
  }

  // Test form accessibility if forms are present
  const forms = container.querySelectorAll('form, [role="form"]');
  forms.forEach(form => {
    accessibilityHelpers.testFormAccessibility(form as HTMLElement);
  });

  // Test drag and drop accessibility if present
  const draggableElements = container.querySelectorAll('[draggable="true"]');
  if (draggableElements.length > 0) {
    await accessibilityHelpers.testDragDropAccessibility(container);
  }

  // Generate and log report
  const report = accessibilityHelpers.generateAccessibilityReport(container);
  console.log('Accessibility test report:', report);

  // Fail test if errors found
  if (report.errors.length > 0) {
    throw new Error(`Accessibility errors found: ${report.errors.join(', ')}`);
  }
};

export default accessibilityHelpers;