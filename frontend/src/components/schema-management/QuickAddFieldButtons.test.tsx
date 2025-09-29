/**
 * Test: QuickAddFieldButtons Component
 *
 * Tests the quick field creation functionality including smart defaults,
 * contextual suggestions, and recently used prioritization.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import { QuickAddFieldButtons } from './QuickAddFieldButtons';
import { ComponentSchemaField } from '../../services/api';

const theme = createTheme();

const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

const mockFields: ComponentSchemaField[] = [
  {
    id: '1',
    field_name: 'Component Weight',
    field_type: 'number',
    field_config: {},
    help_text: 'Weight in kilograms',
    is_required: true,
    is_active: true,
    display_order: 1,
  },
  {
    id: '2',
    field_name: 'Material Grade',
    field_type: 'select',
    field_config: {},
    help_text: 'Steel grade specification',
    is_required: false,
    is_active: true,
    display_order: 2,
  },
];

const defaultProps = {
  existingFields: mockFields,
  onQuickAdd: jest.fn(),
  disabled: false,
  maxFields: undefined,
  currentFieldCount: 2,
  compact: false,
};

describe('QuickAddFieldButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quick add interface', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Quick Add Fields')).toBeInTheDocument();
    expect(screen.getByText('All Field Types')).toBeInTheDocument();
  });

  it('shows contextual suggestions based on existing fields', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    // Should show suggestions section when contextual suggestions exist
    expect(screen.getByText('Suggested for this schema')).toBeInTheDocument();
  });

  it('displays all field type buttons', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    // Check that field type buttons exist (may appear multiple times)
    expect(screen.getAllByText('Text').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Number').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Select').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Checkbox').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Text Area').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Date').length).toBeGreaterThan(0);
  });

  it('calls onQuickAdd when field type button clicked', async () => {
    const mockOnQuickAdd = jest.fn();
    const Wrapper = createWrapper();

    render(
      <QuickAddFieldButtons {...defaultProps} onQuickAdd={mockOnQuickAdd} />,
      { wrapper: Wrapper }
    );

    // Click the Text field button (find the first one that's a button)
    const textButtons = screen.getAllByText('Text');
    const textButton = textButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    expect(textButton).toBeTruthy();
    fireEvent.click(textButton!);

    await waitFor(() => {
      expect(mockOnQuickAdd).toHaveBeenCalledWith({
        field_name: 'Text Field',
        field_type: 'text',
        display_order: 3,
        field_config: {
          max_length: 100,
          placeholder: 'Enter text...',
        },
        is_required: false,
      });
    });
  });

  it('generates unique field names for duplicates', async () => {
    const fieldsWithDuplicate = [
      ...mockFields,
      {
        id: '3',
        field_name: 'Text Field',
        field_type: 'text',
        field_config: {},
        help_text: '',
        is_required: false,
        is_active: true,
        display_order: 3,
      },
    ];

    const mockOnQuickAdd = jest.fn();
    const Wrapper = createWrapper();

    render(
      <QuickAddFieldButtons
        {...defaultProps}
        existingFields={fieldsWithDuplicate}
        onQuickAdd={mockOnQuickAdd}
      />,
      { wrapper: Wrapper }
    );

    // Click the Text field button (find the first one that's a button)
    const textButtons = screen.getAllByText('Text');
    const textButton = textButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    expect(textButton).toBeTruthy();
    fireEvent.click(textButton!);

    await waitFor(() => {
      expect(mockOnQuickAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          field_name: 'Text Field 1', // Should append number for uniqueness
          field_type: 'text',
        })
      );
    });
  });

  it('respects field limits', () => {
    const Wrapper = createWrapper();
    render(
      <QuickAddFieldButtons
        {...defaultProps}
        maxFields={2}
        currentFieldCount={2}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Field limit reached/)).toBeInTheDocument();

    // All buttons should be disabled
    const textButtons = screen.getAllByText('Text');
    const textButton = textButtons.find(element => element.closest('button'));
    expect(textButton?.closest('button')).toBeDisabled();
  });

  it('shows different configurations for different field types', async () => {
    const mockOnQuickAdd = jest.fn();
    const Wrapper = createWrapper();

    render(
      <QuickAddFieldButtons {...defaultProps} onQuickAdd={mockOnQuickAdd} />,
      { wrapper: Wrapper }
    );

    // Test number field - find the first button with Number text
    const numberButtons = screen.getAllByText('Number');
    const numberButton = numberButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    expect(numberButton).toBeTruthy();
    fireEvent.click(numberButton!);

    await waitFor(() => {
      expect(mockOnQuickAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          field_name: 'Number Field',
          field_type: 'number',
          field_config: {
            min_value: null,
            max_value: null,
            decimal_places: 2,
            unit: '',
          },
        })
      );
    });

    jest.clearAllMocks();

    // Test select field - find the first button with Select text
    const selectButtons = screen.getAllByText('Select');
    const selectButton = selectButtons.find(element =>
      element.closest('button') && !element.closest('button')?.disabled
    );
    expect(selectButton).toBeTruthy();
    fireEvent.click(selectButton!);

    await waitFor(() => {
      expect(mockOnQuickAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          field_name: 'Select Field',
          field_type: 'select',
          field_config: {
            options: ['Option 1', 'Option 2', 'Option 3'],
            allow_multiple: false,
          },
        })
      );
    });
  });

  it('renders in compact mode correctly', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} compact={true} />, { wrapper: Wrapper });

    // In compact mode, should show minimal interface
    expect(screen.getByText('Quick Add Fields')).toBeInTheDocument();

    // Should have expand button (look for ExpandMore icon)
    const expandButtons = screen.getAllByTestId('ExpandMoreIcon');
    const expandButton = expandButtons.find(icon => icon.closest('button'))?.closest('button');
    expect(expandButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton!);

    // Should now show full interface
    expect(screen.getByText('All Field Types')).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} disabled={true} />, { wrapper: Wrapper });

    // All buttons should be disabled - find first button with Text
    const textButtons = screen.getAllByText('Text');
    const textButton = textButtons.find(element => element.closest('button'))?.closest('button');
    expect(textButton).toBeDisabled();

    // Find first button with Number
    const numberButtons = screen.getAllByText('Number');
    const numberButton = numberButtons.find(element => element.closest('button'))?.closest('button');
    expect(numberButton).toBeDisabled();
  });

  it('shows correct contextual suggestions for engineering fields', () => {
    const engineeringFields: ComponentSchemaField[] = [
      {
        id: '1',
        field_name: 'Component Name',
        field_type: 'text',
        field_config: {},
        is_required: true,
        is_active: true,
        display_order: 1,
      },
      {
        id: '2',
        field_name: 'Load Capacity',
        field_type: 'number',
        field_config: {},
        is_required: false,
        is_active: true,
        display_order: 2,
      },
      {
        id: '3',
        field_name: 'Installation Date',
        field_type: 'date',
        field_config: {},
        is_required: false,
        is_active: true,
        display_order: 3,
      },
    ];

    const Wrapper = createWrapper();
    render(
      <QuickAddFieldButtons {...defaultProps} existingFields={engineeringFields} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Suggested for this schema')).toBeInTheDocument();
  });

  it('opens dropdown menu with additional options', async () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    // Find dropdown button by looking for ExpandMoreIcon in field type sections
    const expandIcons = screen.getAllByTestId('ExpandMoreIcon');
    // Get the first expand icon that's in a small button (the dropdown buttons)
    const dropdownButton = expandIcons.find(icon => {
      const button = icon.closest('button');
      return button && button.textContent === '';
    })?.closest('button');

    expect(dropdownButton).toBeInTheDocument();
    fireEvent.click(dropdownButton!);

    await waitFor(() => {
      expect(screen.getByText('Add Text')).toBeInTheDocument();
      expect(screen.getByText('Add with customization')).toBeInTheDocument();
    });
  });

  it('handles empty fields list correctly', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} existingFields={[]} />, { wrapper: Wrapper });

    expect(screen.getByText('Quick Add Fields')).toBeInTheDocument();
    expect(screen.getByText('All Field Types')).toBeInTheDocument();

    // Should still show field type buttons
    expect(screen.getAllByText('Text').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Number').length).toBeGreaterThan(0);
  });

  it('shows informational help text', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText(/Click any field type for quick creation with smart defaults/)).toBeInTheDocument();
  });

  it('prioritizes field types correctly', () => {
    const Wrapper = createWrapper();
    render(<QuickAddFieldButtons {...defaultProps} />, { wrapper: Wrapper });

    // The order of buttons should reflect prioritization
    // Text and Number should typically appear early due to high usage weights
    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map(button => button.textContent);

    // Text should be among the first few buttons (high usage weight)
    const textIndex = buttonTexts.findIndex(text => text?.includes('Text'));
    expect(textIndex).toBeLessThan(6); // Should be in first 6 buttons
  });
});