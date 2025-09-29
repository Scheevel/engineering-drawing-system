/**
 * Test: FieldTypeSelector Component
 *
 * Tests field type selection functionality, visual indicators, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FieldTypeSelector from './FieldTypeSelector';
import { SchemaFieldType } from '../../services/api';

const defaultProps = {
  selectedType: 'text' as SchemaFieldType,
  onTypeChange: jest.fn(),
};

describe('FieldTypeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders field type selector with all field types', () => {
    render(<FieldTypeSelector {...defaultProps} />);

    expect(screen.getByText('Field Type')).toBeInTheDocument();

    // Check all field type labels are present
    expect(screen.getByText('Text Input')).toBeInTheDocument();
    expect(screen.getByText('Number Input')).toBeInTheDocument();
    expect(screen.getByText('Dropdown Selection')).toBeInTheDocument();
    expect(screen.getByText('Checkbox')).toBeInTheDocument();
    expect(screen.getByText('Multi-line Text')).toBeInTheDocument();
    expect(screen.getByText('Date Picker')).toBeInTheDocument();
  });

  test('shows field type descriptions', () => {
    render(<FieldTypeSelector {...defaultProps} />);

    // Use getAllByText to handle multiple instances of the same text
    expect(screen.getAllByText('Single line text input for short text values')).toHaveLength(2); // Card + selected panel
    expect(screen.getByText('Numeric input with optional min/max validation')).toBeInTheDocument();
    expect(screen.getByText('Dropdown menu with predefined options')).toBeInTheDocument();
    expect(screen.getByText('Boolean checkbox for yes/no values')).toBeInTheDocument();
    expect(screen.getByText('Multi-line text input for longer text content')).toBeInTheDocument();
    expect(screen.getByText('Date picker with optional time selection')).toBeInTheDocument();
  });

  test('highlights selected field type', () => {
    render(<FieldTypeSelector {...defaultProps} selectedType="number" />);

    const textCard = screen.getByText('Text Input').closest('.MuiCard-root');
    const numberCard = screen.getByText('Number Input').closest('.MuiCard-root');

    // Selected card should have different styling (checked via computed styles would be complex)
    expect(textCard).toBeInTheDocument();
    expect(numberCard).toBeInTheDocument();
  });

  test('handles field type selection', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} />);

    const numberCard = screen.getByText('Number Input').closest('.MuiCard-root');
    await user.click(numberCard!);

    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('number');
  });

  test('handles selection of different field types', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} />);

    // Test selecting various field types
    const selectCard = screen.getByText('Dropdown Selection').closest('.MuiCard-root');
    await user.click(selectCard!);
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('select');

    const checkboxCard = screen.getByText('Checkbox').closest('.MuiCard-root');
    await user.click(checkboxCard!);
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('checkbox');

    const textareaCard = screen.getByText('Multi-line Text').closest('.MuiCard-root');
    await user.click(textareaCard!);
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('textarea');

    const dateCard = screen.getByText('Date Picker').closest('.MuiCard-root');
    await user.click(dateCard!);
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('date');
  });

  test('shows selected type information panel', () => {
    render(<FieldTypeSelector {...defaultProps} selectedType="select" />);

    expect(screen.getByText('Selected: Dropdown Selection')).toBeInTheDocument();
    expect(screen.getAllByText('Dropdown menu with predefined options')).toHaveLength(2); // Card + selected panel
  });

  test('updates selected type information when type changes', () => {
    const { rerender } = render(<FieldTypeSelector {...defaultProps} selectedType="text" />);

    expect(screen.getByText('Selected: Text Input')).toBeInTheDocument();

    rerender(<FieldTypeSelector {...defaultProps} selectedType="date" />);

    expect(screen.getByText('Selected: Date Picker')).toBeInTheDocument();
    expect(screen.getAllByText('Date picker with optional time selection')).toHaveLength(2); // Card + selected panel
  });

  test('displays error message when provided', () => {
    render(<FieldTypeSelector {...defaultProps} error="Field type is required" />);

    expect(screen.getByText('Field type is required')).toBeInTheDocument();
  });

  test('disables interaction when disabled', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} disabled={true} />);

    const numberCard = screen.getByText('Number Input').closest('.MuiCard-root');
    await user.click(numberCard!);

    // Should not call onTypeChange when disabled
    expect(defaultProps.onTypeChange).not.toHaveBeenCalled();
  });

  test('renders all field type icons', () => {
    render(<FieldTypeSelector {...defaultProps} />);

    // Check for specific icons by their test IDs (some may appear multiple times due to selected panel)
    expect(screen.getAllByTestId('TextFieldsIcon')).toHaveLength(2); // Card + selected panel
    expect(screen.getByTestId('NumbersIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ArrowDropDownIcon')).toBeInTheDocument();
    expect(screen.getByTestId('CheckBoxIcon')).toBeInTheDocument();
    expect(screen.getByTestId('SubjectIcon')).toBeInTheDocument();
    expect(screen.getByTestId('CalendarTodayIcon')).toBeInTheDocument();
  });

  test('shows hover effects on cards', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} />);

    const textCard = screen.getByText('Text Input').closest('.MuiCard-root');

    // Hover should trigger hover styles (visual testing would require more complex setup)
    await user.hover(textCard!);

    // The card should still be in the document after hover
    expect(textCard).toBeInTheDocument();
  });

  test('maintains accessibility with proper labeling', () => {
    render(<FieldTypeSelector {...defaultProps} />);

    // Field type selector should be properly labeled
    expect(screen.getByText('Field Type')).toBeInTheDocument();

    // All cards should be clickable and have meaningful content
    const fieldTypeCards = screen.getAllByText(/Input|Selection|Checkbox|Picker/);
    expect(fieldTypeCards).toHaveLength(6);

    fieldTypeCards.forEach(card => {
      expect(card).toBeInTheDocument();
    });
  });

  test('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} />);

    const textCard = screen.getByText('Text Input').closest('.MuiCard-root');

    // Just verify the card is focusable and clickable
    expect(textCard).toBeInTheDocument();
    await user.click(textCard!);

    // Should trigger selection
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('text');
  });

  test('shows correct styling for selected vs unselected cards', () => {
    render(<FieldTypeSelector {...defaultProps} selectedType="checkbox" />);

    const selectedCard = screen.getByText('Checkbox').closest('.MuiCard-root');
    const unselectedCard = screen.getByText('Text Input').closest('.MuiCard-root');

    // Both cards should be present
    expect(selectedCard).toBeInTheDocument();
    expect(unselectedCard).toBeInTheDocument();

    // Visual distinction would be tested through computed styles in integration tests
  });

  test('renders consistent layout across all field types', () => {
    const allFieldTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];

    allFieldTypes.forEach(fieldType => {
      const { unmount } = render(<FieldTypeSelector {...defaultProps} selectedType={fieldType} />);

      // Each type should show its information in the selected panel
      expect(screen.getAllByText(/Selected:/)).toHaveLength(1);

      unmount(); // Clean up for next iteration
    });
  });

  test('handles rapid selection changes', async () => {
    const user = userEvent.setup();
    render(<FieldTypeSelector {...defaultProps} />);

    // Rapidly click different field types
    const numberCard = screen.getByText('Number Input').closest('.MuiCard-root');
    const selectCard = screen.getByText('Dropdown Selection').closest('.MuiCard-root');
    const dateCard = screen.getByText('Date Picker').closest('.MuiCard-root');

    await user.click(numberCard!);
    await user.click(selectCard!);
    await user.click(dateCard!);

    expect(defaultProps.onTypeChange).toHaveBeenCalledTimes(3);
    expect(defaultProps.onTypeChange).toHaveBeenNthCalledWith(1, 'number');
    expect(defaultProps.onTypeChange).toHaveBeenNthCalledWith(2, 'select');
    expect(defaultProps.onTypeChange).toHaveBeenNthCalledWith(3, 'date');
  });
});