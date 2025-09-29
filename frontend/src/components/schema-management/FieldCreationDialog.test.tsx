/**
 * Test: FieldCreationDialog Component
 *
 * Tests field creation dialog functionality, validation, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FieldCreationDialog from './FieldCreationDialog';
import { ComponentSchemaFieldCreate } from '../../services/api';

// Mock the FieldTypeSelector component
jest.mock('./FieldTypeSelector', () => {
  return function MockFieldTypeSelector({
    selectedType,
    onTypeChange,
    error
  }: {
    selectedType: string;
    onTypeChange: (type: any) => void;
    error?: string;
  }) {
    return (
      <div data-testid="field-type-selector">
        <span data-testid="selected-type">{selectedType}</span>
        <button onClick={() => onTypeChange('number')}>Select Number</button>
        <button onClick={() => onTypeChange('text')}>Select Text</button>
        {error && <span data-testid="type-error">{error}</span>}
      </div>
    );
  };
});

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  existingFieldNames: ['existing_field', 'another_field'],
  displayOrder: 3,
  loading: false,
};

describe('FieldCreationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dialog when open', async () => {
    render(<FieldCreationDialog {...defaultProps} />);

    expect(screen.getByText('Add New Field')).toBeInTheDocument();
    expect(await screen.findByLabelText(/field name/i)).toBeInTheDocument();
    expect(screen.getByTestId('field-type-selector')).toBeInTheDocument();
    expect(await screen.findByLabelText(/help text/i)).toBeInTheDocument();
  });

  test('does not render dialog when closed', () => {
    render(<FieldCreationDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Add New Field')).not.toBeInTheDocument();
  });

  test('handles field name input', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);

    await act(async () => {
      await user.type(fieldNameInput, 'Test Field');
    });

    expect(fieldNameInput).toHaveValue('Test Field');
  });

  test('shows character count for field name', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'Test');

    expect(screen.getByText('4/50')).toBeInTheDocument();
  });

  test('validates field name length', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);

    // Test too short
    await act(async () => {
      await user.type(fieldNameInput, 'A');
    });

    // Wait for debounced validation (300ms + buffer)
    await waitFor(() => {
      expect(screen.getByText('Field name must be at least 2 characters')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Clear and test too long
    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'A'.repeat(51));
    });

    await waitFor(async () => {
      expect(await screen.findByText(/field name must be less than 50 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('validates field name format', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);

    // Test invalid format (starting with number)
    await user.type(fieldNameInput, '123Invalid');
    await waitFor(() => {
      expect(screen.getByText(/Field name must start with a letter/)).toBeInTheDocument();
    });
  });

  test('detects duplicate field names', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);

    await act(async () => {
      await user.type(fieldNameInput, 'existing_field');
    });

    await waitFor(() => {
      expect(screen.getByText('A field with this name already exists')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('ignores case in duplicate field name detection', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'EXISTING_FIELD');

    await waitFor(() => {
      expect(screen.getByText('A field with this name already exists')).toBeInTheDocument();
    });
  });

  test('handles required field checkbox', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    expect(requiredCheckbox).not.toBeChecked();

    await user.click(requiredCheckbox);
    expect(requiredCheckbox).toBeChecked();
  });

  test('handles help text input', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const helpTextInput = await screen.findByLabelText(/help text/i);
    await user.type(helpTextInput, 'This is help text');

    expect(helpTextInput).toHaveValue('This is help text');
    expect(screen.getByText('17/200')).toBeInTheDocument();
  });

  test('validates help text length', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const helpTextInput = await screen.findByLabelText(/help text/i);

    await act(async () => {
      await user.type(helpTextInput, 'A'.repeat(201));
    });

    await waitFor(async () => {
      expect(await screen.findByText(/help text must be less than 200 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('shows field type information', () => {
    render(<FieldCreationDialog {...defaultProps} />);

    // Should show info about the default field type (text)
    expect(screen.getByText(/Text Input:/)).toBeInTheDocument();
    expect(screen.getByText(/Single line text input for short text values/)).toBeInTheDocument();
  });

  test('handles field type changes', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    // Should start with text type
    expect(screen.getByTestId('selected-type')).toHaveTextContent('text');

    // Change to number type
    const numberButton = screen.getByText('Select Number');
    await user.click(numberButton);

    expect(screen.getByTestId('selected-type')).toHaveTextContent('number');
  });

  test('handles cancel button', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    // Use more reliable button selector
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });

    await act(async () => {
      await user.click(cancelButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('handles close button', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '' }); // Close icon button
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('disables form submission when invalid', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const addButton = screen.getByText('Add Field');
    expect(addButton).toBeDisabled();

    // Type invalid field name
    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'A'); // Too short

    await waitFor(() => {
      expect(addButton).toBeDisabled();
    });
  });

  test('enables form submission when valid', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'Valid Field Name');

    const addButton = screen.getByText('Add Field');

    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });
  });

  test('prevents submission with duplicate field name', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'existing_field');

    const addButton = screen.getByText('Add Field');

    await waitFor(() => {
      expect(addButton).toBeDisabled();
    });
  });

  test('submits valid field data', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    // Fill out form with proper act() wrapping
    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await act(async () => {
      await user.type(fieldNameInput, 'New Field');
    });

    const helpTextInput = await screen.findByLabelText(/help text/i);
    await act(async () => {
      await user.type(helpTextInput, 'Help text for field');
    });

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    await act(async () => {
      await user.click(requiredCheckbox);
    });

    // Submit form with reliable button selector
    const addButton = await screen.findByRole('button', { name: /add field/i });
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    }, { timeout: 10000 });

    await act(async () => {
      await user.click(addButton);
    });

    expect(defaultProps.onSave).toHaveBeenCalledWith({
      field_name: 'New Field',
      field_type: 'text',
      field_config: { placeholder: '', maxLength: 255 },
      help_text: 'Help text for field',
      display_order: 3,
      is_required: true,
    });
  });

  test('trims whitespace from field name and help text', async () => {
    const user = userEvent.setup();
    render(<FieldCreationDialog {...defaultProps} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, '  Trimmed Field  ');

    const helpTextInput = await screen.findByLabelText(/help text/i);
    await user.type(helpTextInput, '  Trimmed help text  ');

    const addButton = screen.getByText('Add Field');
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });

    await user.click(addButton);

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field_name: 'Trimmed Field',
        help_text: 'Trimmed help text',
      })
    );
  });

  test('handles loading state', () => {
    render(<FieldCreationDialog {...defaultProps} loading={true} />);

    const addButton = screen.getByText('Add Field');
    const cancelButton = screen.getByText('Cancel');

    expect(addButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  test('resets form when dialog opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FieldCreationDialog {...defaultProps} open={false} />);

    // Open dialog and fill form
    rerender(<FieldCreationDialog {...defaultProps} open={true} />);

    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'Test Field');

    // Close and reopen dialog
    rerender(<FieldCreationDialog {...defaultProps} open={false} />);
    rerender(<FieldCreationDialog {...defaultProps} open={true} />);

    // Form should be reset
    await waitFor(async () => {
      expect(await screen.findByLabelText(/field name/i)).toHaveValue('');
    });
  });

  test('shows submit error when provided', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn(() => {
      throw new Error('API Error');
    });

    render(<FieldCreationDialog {...defaultProps} onSave={mockOnSave} />);

    // Fill and submit form
    const fieldNameInput = await screen.findByLabelText(/field name/i);
    await user.type(fieldNameInput, 'Test Field');

    const addButton = screen.getByText('Add Field');
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});