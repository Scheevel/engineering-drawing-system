/**
 * Test: FieldEditForm Component
 *
 * Tests field editing functionality, validation, usage warnings, and preview
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FieldEditForm from './FieldEditForm';
import { ComponentSchemaField } from '../../services/api';

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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(),
});

const mockField: ComponentSchemaField = {
  id: 'field1',
  field_name: 'Test Field',
  field_type: 'text',
  field_config: { placeholder: 'Enter text', maxLength: 255 },
  help_text: 'This is help text',
  display_order: 1,
  is_required: true,
  is_active: true,
};

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  field: mockField,
  existingFieldNames: ['existing_field', 'another_field'],
  loading: false,
  isFieldInUse: false,
};

describe('FieldEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window.confirm as jest.Mock).mockReturnValue(true);
  });

  test('renders edit form when open', () => {
    render(<FieldEditForm {...defaultProps} />);

    expect(screen.getByText('Edit Field: Test Field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is help text')).toBeInTheDocument();
    expect(screen.getByText('Text Input')).toBeInTheDocument(); // Field type chip
  });

  test('does not render form when closed', () => {
    render(<FieldEditForm {...defaultProps} open={false} />);

    expect(screen.queryByText('Edit Field: Test Field')).not.toBeInTheDocument();
  });

  test('loads field data into form', () => {
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');
    expect(fieldNameInput).toBeInTheDocument();

    const helpTextInput = screen.getByDisplayValue('This is help text');
    expect(helpTextInput).toBeInTheDocument();

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    expect(requiredCheckbox).toBeChecked();
  });

  test('handles field name changes', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');

    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'Updated Field Name');
    });

    expect(fieldNameInput).toHaveValue('Updated Field Name');
  });

  test('validates field name length', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');

    // Test too short
    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'A');
    });

    await waitFor(() => {
      expect(screen.getByText('Field name must be at least 2 characters')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Test too long
    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'A'.repeat(51));
    });

    await waitFor(async () => {
      expect(await screen.findByText(/field name must be less than 50 characters/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('detects duplicate field names excluding current field', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');

    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'existing_field');
    });

    await waitFor(() => {
      expect(screen.getByText('A field with this name already exists')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('allows keeping the same field name', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');

    // Clear and retype the same name
    await user.clear(fieldNameInput);
    await user.type(fieldNameInput, 'Test Field');

    // Should not show duplicate error for same name
    await waitFor(() => {
      expect(screen.queryByText('A field with this name already exists')).not.toBeInTheDocument();
    });
  });

  test('handles required field toggle', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    expect(requiredCheckbox).toBeChecked();

    await user.click(requiredCheckbox);
    expect(requiredCheckbox).not.toBeChecked();
  });

  test('handles help text changes', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const helpTextInput = screen.getByDisplayValue('This is help text');
    await user.clear(helpTextInput);
    await user.type(helpTextInput, 'Updated help text');

    expect(helpTextInput).toHaveValue('Updated help text');
  });

  test('validates help text length', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const helpTextInput = screen.getByDisplayValue('This is help text');

    await act(async () => {
      await user.clear(helpTextInput);
      await user.type(helpTextInput, 'A'.repeat(201));
    });

    await waitFor(async () => {
      expect(await screen.findByText(/help text must be less than 200 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('shows character counts', async () => {
    render(<FieldEditForm {...defaultProps} />);

    // Wait for the form to be fully rendered
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Field')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('This is help text')).toBeInTheDocument();
    });

    // Now check for character counts
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return content === '10/50';
      })).toBeInTheDocument(); // Field name count
    });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return content === '16/200';
      })).toBeInTheDocument(); // Help text count
    });
  });

  test('switches between edit and preview tabs', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    // Should start on edit tab
    expect(screen.getByText('Field Name')).toBeInTheDocument();

    // Click preview tab
    const previewTab = screen.getByText('Preview');
    await user.click(previewTab);

    expect(screen.getByText('Field Preview')).toBeInTheDocument();
    expect(screen.getByText('Help text preview:')).toBeInTheDocument();
  });

  test('shows help text preview', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    // Switch to preview tab
    const previewTab = screen.getByText('Preview');
    await user.click(previewTab);

    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  test('shows no help text message in preview when empty', async () => {
    const user = userEvent.setup();
    const fieldWithoutHelp = { ...mockField, help_text: '' };
    render(<FieldEditForm {...defaultProps} field={fieldWithoutHelp} />);

    // Switch to preview tab
    const previewTab = screen.getByText('Preview');
    await user.click(previewTab);

    expect(screen.getByText('No help text provided')).toBeInTheDocument();
  });

  test('shows usage warning when field is in use', () => {
    render(<FieldEditForm {...defaultProps} isFieldInUse={true} usageWarning="Used by 5 components" />);

    expect(screen.getByText('Field In Use:')).toBeInTheDocument();
    expect(screen.getByText('Used by 5 components')).toBeInTheDocument();
  });

  test('disables field type editing when field is in use', () => {
    render(<FieldEditForm {...defaultProps} isFieldInUse={true} />);

    expect(screen.getByText('Cannot change - field in use')).toBeInTheDocument();
    expect(screen.queryByTestId('field-type-selector')).not.toBeInTheDocument();
  });

  test('disables required toggle when field is in use', () => {
    render(<FieldEditForm {...defaultProps} isFieldInUse={true} />);

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    expect(requiredCheckbox).toBeDisabled();
    expect(screen.getByText('Cannot change for fields in use')).toBeInTheDocument();
  });

  test('handles field type changes when allowed', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    // Should start with text type
    expect(screen.getByTestId('selected-type')).toHaveTextContent('text');

    // Change to number type
    const numberButton = screen.getByText('Select Number');
    await user.click(numberButton);

    expect(screen.getByTestId('selected-type')).toHaveTextContent('number');
  });

  test('handles cancel button', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });

    await act(async () => {
      await user.click(cancelButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('handles close button', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '' }); // Close icon button
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('prompts for confirmation when closing with unsaved changes', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    // Make a change
    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.type(fieldNameInput, ' Modified');

    // Try to close
    const closeButton = screen.getByRole('button', { name: '' });
    await user.click(closeButton);

    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
  });

  test('prevents closing when user cancels confirmation', async () => {
    const user = userEvent.setup();
    (window.confirm as jest.Mock).mockReturnValue(false);
    render(<FieldEditForm {...defaultProps} />);

    // Make a change
    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.type(fieldNameInput, ' Modified');

    // Try to close
    const closeButton = screen.getByRole('button', { name: '' });
    await user.click(closeButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  test('disables save button when form is invalid', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const saveButton = screen.getByText('Save Changes');

    // Form should be valid initially but not dirty
    expect(saveButton).toBeDisabled();

    // Make invalid change
    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.clear(fieldNameInput);
    await user.type(fieldNameInput, 'A'); // Too short

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
  });

  test('enables save button when form is valid and dirty', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.type(fieldNameInput, ' Modified');

    const saveButton = screen.getByText('Save Changes');

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  test('submits form with updated data', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    // Make changes with proper act() wrapping
    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await act(async () => {
      await user.clear(fieldNameInput);
      await user.type(fieldNameInput, 'Updated Field');
    });

    const helpTextInput = screen.getByDisplayValue('This is help text');
    await act(async () => {
      await user.clear(helpTextInput);
      await user.type(helpTextInput, 'Updated help text');
    });

    const requiredCheckbox = screen.getByRole('checkbox', { name: /Required Field/i });
    await act(async () => {
      await user.click(requiredCheckbox); // Uncheck
    });

    // Submit form with reliable button selector
    const saveButton = await screen.findByRole('button', { name: /save changes/i });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });

    await act(async () => {
      await user.click(saveButton);
    });

    expect(defaultProps.onSave).toHaveBeenCalledWith('field1', {
      field_name: 'Updated Field',
      field_type: 'text',
      field_config: { placeholder: '', maxLength: 255 },
      help_text: 'Updated help text',
      is_required: false,
    });
  });

  test('handles loading state', () => {
    render(<FieldEditForm {...defaultProps} loading={true} />);

    const saveButton = screen.getByText('Save Changes');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  test('prevents submission with duplicate field name', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.clear(fieldNameInput);
    await user.type(fieldNameInput, 'existing_field');

    const saveButton = screen.getByText('Save Changes');

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
  });

  test('shows submit error when save fails', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn(() => {
      throw new Error('Save failed');
    });

    render(<FieldEditForm {...defaultProps} onSave={mockOnSave} />);

    // Make valid change
    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.type(fieldNameInput, ' Modified');

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  test('resets form when field prop changes', () => {
    const { rerender } = render(<FieldEditForm {...defaultProps} />);

    // Initial field name should be displayed
    expect(screen.getByDisplayValue('Test Field')).toBeInTheDocument();

    // Change the field prop
    const newField = { ...mockField, field_name: 'Different Field' };
    rerender(<FieldEditForm {...defaultProps} field={newField} />);

    // Should show new field name
    expect(screen.getByDisplayValue('Different Field')).toBeInTheDocument();
  });

  test('trims whitespace from submitted values', async () => {
    const user = userEvent.setup();
    render(<FieldEditForm {...defaultProps} />);

    const fieldNameInput = screen.getByDisplayValue('Test Field');
    await user.clear(fieldNameInput);
    await user.type(fieldNameInput, '  Trimmed Field  ');

    const helpTextInput = screen.getByDisplayValue('This is help text');
    await user.clear(helpTextInput);
    await user.type(helpTextInput, '  Trimmed help text  ');

    const saveButton = screen.getByText('Save Changes');
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    await user.click(saveButton);

    expect(defaultProps.onSave).toHaveBeenCalledWith('field1',
      expect.objectContaining({
        field_name: 'Trimmed Field',
        help_text: 'Trimmed help text',
      })
    );
  });
});