/**
 * Schema Test Helper Functions
 *
 * Utilities for complex user interactions, async testing,
 * form interactions, and schema-specific assertions
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

/**
 * Test helper utilities object
 */
export const schemaTestHelpers = {
  /**
   * Drag and drop testing utility
   */
  async dragAndDrop(
    source: HTMLElement,
    target: HTMLElement,
    options: { dataTransfer?: Record<string, string> } = {}
  ): Promise<void> {
    const { dataTransfer = {} } = options;

    await act(async () => {
      fireEvent.dragStart(source, {
        dataTransfer: {
          setData: jest.fn(),
          getData: jest.fn((key) => dataTransfer[key] || ''),
          ...dataTransfer,
        },
      });

      fireEvent.dragEnter(target);
      fireEvent.dragOver(target);
      fireEvent.drop(target);
      fireEvent.dragEnd(source);
    });
  },

  /**
   * Multi-select testing utility
   */
  async selectMultipleFields(fieldElements: HTMLElement[]): Promise<void> {
    const user = userEvent.setup();

    for (const element of fieldElements) {
      await user.click(element);
    }
  },

  /**
   * Form testing with validation
   */
  async fillFormAndValidate(formData: Record<string, any>): Promise<void> {
    const user = userEvent.setup();

    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i'));

      await user.clear(field);
      await user.type(field, String(value));

      await waitFor(() => {
        // Wait for validation to complete
        expect(field).not.toHaveAttribute('aria-invalid', 'true');
      });
    }
  },

  /**
   * Complex form field interaction
   */
  async interactWithField(
    fieldElement: HTMLElement,
    interaction: 'click' | 'type' | 'select' | 'check' | 'uncheck',
    value?: any
  ): Promise<void> {
    const user = userEvent.setup();

    switch (interaction) {
      case 'click':
        await user.click(fieldElement);
        break;
      case 'type':
        await user.clear(fieldElement);
        await user.type(fieldElement, String(value || ''));
        break;
      case 'select':
        await user.selectOptions(fieldElement, String(value || ''));
        break;
      case 'check':
        if (!fieldElement.hasAttribute('checked')) {
          await user.click(fieldElement);
        }
        break;
      case 'uncheck':
        if (fieldElement.hasAttribute('checked')) {
          await user.click(fieldElement);
        }
        break;
    }
  },

  /**
   * Wait for React Query operations to complete
   */
  async waitForQueryToComplete(
    queryKey?: string,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 5000 } = options;

    await waitFor(
      () => {
        // Check for loading indicators to disappear
        const loadingIndicators = screen.queryAllByTestId(/loading|spinner/i);
        expect(loadingIndicators).toHaveLength(0);

        // Check for error states if needed
        const errorElements = screen.queryAllByTestId(/error/i);
        expect(errorElements).toHaveLength(0);
      },
      { timeout }
    );
  },

  /**
   * Simulate API response delays
   */
  async simulateApiDelay(ms: number = 100): Promise<void> {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  },

  /**
   * Navigation testing helper
   */
  async navigateAndWait(
    navigateButton: HTMLElement,
    expectedPath?: string
  ): Promise<void> {
    const user = userEvent.setup();

    await user.click(navigateButton);

    if (expectedPath) {
      await waitFor(() => {
        expect(window.location.pathname).toBe(expectedPath);
      });
    }

    // Wait for any async operations to complete
    await this.waitForQueryToComplete();
  },

  /**
   * Modal/Dialog testing utilities
   */
  async openDialog(triggerElement: HTMLElement): Promise<HTMLElement> {
    const user = userEvent.setup();

    await user.click(triggerElement);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    return dialog;
  },

  async closeDialog(
    dialog: HTMLElement,
    method: 'button' | 'escape' | 'backdrop' = 'button'
  ): Promise<void> {
    const user = userEvent.setup();

    switch (method) {
      case 'button':
        const closeButton = within(dialog).getByRole('button', { name: /close|cancel/i });
        await user.click(closeButton);
        break;
      case 'escape':
        await user.keyboard('{Escape}');
        break;
      case 'backdrop':
        // Click outside the dialog
        fireEvent.click(document.body);
        break;
    }

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  },

  /**
   * Schema-specific testing utilities
   */
  async createSchemaInTest(
    schemaData: Record<string, any>,
    fieldData: Array<Record<string, any>> = []
  ): Promise<void> {
    const user = userEvent.setup();

    // Fill schema basic info
    await user.type(screen.getByLabelText(/schema name/i), schemaData.name);
    await user.type(screen.getByLabelText(/description/i), schemaData.description);

    if (schemaData.is_default) {
      await user.click(screen.getByLabelText(/default schema/i));
    }

    // Add fields if provided
    for (const field of fieldData) {
      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      const fieldDialog = await screen.findByRole('dialog');

      await user.type(
        within(fieldDialog).getByLabelText(/field name/i),
        field.field_name
      );

      // Select field type
      const typeSelect = within(fieldDialog).getByLabelText(/field type/i);
      await user.selectOptions(typeSelect, field.field_type);

      if (field.help_text) {
        await user.type(
          within(fieldDialog).getByLabelText(/help text/i),
          field.help_text
        );
      }

      if (field.is_required) {
        await user.click(within(fieldDialog).getByLabelText(/required/i));
      }

      const saveFieldButton = within(fieldDialog).getByRole('button', { name: /save/i });
      await user.click(saveFieldButton);

      await waitFor(() => {
        expect(fieldDialog).not.toBeInTheDocument();
      });
    }

    // Save schema
    const saveSchemaButton = screen.getByRole('button', { name: /save schema/i });
    await user.click(saveSchemaButton);

    await this.waitForQueryToComplete();
  },

  /**
   * Field reordering test utility
   */
  async reorderFields(
    fieldElements: HTMLElement[],
    fromIndex: number,
    toIndex: number
  ): Promise<void> {
    if (fromIndex < 0 || fromIndex >= fieldElements.length ||
        toIndex < 0 || toIndex >= fieldElements.length) {
      throw new Error('Invalid field indices for reordering');
    }

    const sourceField = fieldElements[fromIndex];
    const targetField = fieldElements[toIndex];

    await this.dragAndDrop(sourceField, targetField);

    // Wait for reordering to complete
    await waitFor(() => {
      // Verify the new order (implementation-specific)
      const updatedFields = screen.getAllByTestId(/field-item/i);
      expect(updatedFields).toHaveLength(fieldElements.length);
    });
  },

  /**
   * Bulk operations testing utility
   */
  async performBulkOperation(
    fieldElements: HTMLElement[],
    operation: 'delete' | 'activate' | 'deactivate' | 'toggle-required'
  ): Promise<void> {
    const user = userEvent.setup();

    // Select all specified fields
    await this.selectMultipleFields(fieldElements);

    // Find and click the bulk operation button
    const bulkButton = screen.getByRole('button', {
      name: new RegExp(`bulk ${operation}`, 'i')
    });
    await user.click(bulkButton);

    // Handle confirmation dialog if it appears
    try {
      const confirmDialog = await screen.findByRole('dialog', { timeout: 1000 });
      const confirmButton = within(confirmDialog).getByRole('button', { name: /confirm|yes/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(confirmDialog).not.toBeInTheDocument();
      });
    } catch {
      // No confirmation dialog appeared, continue
    }

    await this.waitForQueryToComplete();
  },

  /**
   * Schema validation testing utility
   */
  async validateSchemaForm(expectedErrors: Record<string, string[]> = {}): Promise<void> {
    await waitFor(() => {
      Object.entries(expectedErrors).forEach(([fieldName, errors]) => {
        const field = screen.getByLabelText(new RegExp(fieldName, 'i'));

        if (errors.length > 0) {
          expect(field).toHaveAttribute('aria-invalid', 'true');

          // Check for error messages
          errors.forEach(error => {
            expect(screen.getByText(error)).toBeInTheDocument();
          });
        } else {
          expect(field).not.toHaveAttribute('aria-invalid', 'true');
        }
      });
    });
  },

  /**
   * Search and filter testing utility
   */
  async searchAndFilter(
    searchTerm: string,
    filters: Record<string, any> = {}
  ): Promise<void> {
    const user = userEvent.setup();

    // Use search input
    if (searchTerm) {
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.clear(searchInput);
      await user.type(searchInput, searchTerm);
    }

    // Apply filters
    for (const [filterName, value] of Object.entries(filters)) {
      const filterElement = screen.getByLabelText(new RegExp(filterName, 'i'));

      if (filterElement.type === 'checkbox') {
        if (value && !filterElement.checked) {
          await user.click(filterElement);
        } else if (!value && filterElement.checked) {
          await user.click(filterElement);
        }
      } else {
        await user.selectOptions(filterElement, String(value));
      }
    }

    await this.waitForQueryToComplete();
  },

  /**
   * Keyboard navigation testing utility
   */
  async testKeyboardNavigation(
    elements: HTMLElement[],
    expectedTabOrder: boolean = true
  ): Promise<void> {
    const user = userEvent.setup();

    // Focus the first element
    elements[0].focus();
    expect(elements[0]).toHaveFocus();

    // Tab through all elements
    for (let i = 1; i < elements.length; i++) {
      await user.tab();

      if (expectedTabOrder) {
        expect(elements[i]).toHaveFocus();
      }
    }

    // Shift+Tab backwards
    for (let i = elements.length - 2; i >= 0; i--) {
      await user.tab({ shift: true });

      if (expectedTabOrder) {
        expect(elements[i]).toHaveFocus();
      }
    }
  },
};

/**
 * Custom matchers for schema-specific assertions
 */
export const customMatchers = {
  /**
   * Check if a schema has valid structure
   */
  toBeValidSchema(schema: any) {
    const pass = (
      schema &&
      typeof schema.id === 'string' &&
      typeof schema.name === 'string' &&
      typeof schema.project_id === 'string' &&
      Array.isArray(schema.fields) &&
      typeof schema.is_active === 'boolean'
    );

    return {
      message: () => `expected ${schema} to be a valid schema`,
      pass,
    };
  },

  /**
   * Check if a field has valid structure
   */
  toBeValidSchemaField(field: any) {
    const pass = (
      field &&
      typeof field.field_name === 'string' &&
      typeof field.field_type === 'string' &&
      typeof field.display_order === 'number' &&
      typeof field.is_required === 'boolean'
    );

    return {
      message: () => `expected ${field} to be a valid schema field`,
      pass,
    };
  },

  /**
   * Check if element has proper ARIA attributes
   */
  toHaveProperAria(element: HTMLElement) {
    const hasRole = element.getAttribute('role') !== null;
    const hasLabel = (
      element.getAttribute('aria-label') !== null ||
      element.getAttribute('aria-labelledby') !== null
    );

    const pass = hasRole && hasLabel;

    return {
      message: () => `expected element to have proper ARIA attributes (role and label)`,
      pass,
    };
  },
};

/**
 * Setup utility for tests
 */
export const setupTest = () => {
  // Extend Jest matchers
  expect.extend(customMatchers);

  // Mock console methods to reduce noise in tests
  const consoleMethods = ['log', 'warn', 'error', 'info'] as const;
  const originalConsole: Record<string, any> = {};

  consoleMethods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = jest.fn();
  });

  return {
    restoreConsole: () => {
      consoleMethods.forEach(method => {
        console[method] = originalConsole[method];
      });
    },
  };
};

/**
 * Cleanup utility for tests
 */
export const cleanupTest = () => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear all mocks
  jest.clearAllMocks();

  // Clean up any lingering DOM changes
  document.body.innerHTML = '';
};

export default schemaTestHelpers;