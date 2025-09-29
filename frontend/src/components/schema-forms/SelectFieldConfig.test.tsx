/**
 * Test: SelectFieldConfig Component
 *
 * Tests advanced select field configuration including option management,
 * multiple selection, custom values, grouping, and template imports
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SelectFieldConfig from './SelectFieldConfig';
import { FieldConfigurationProps } from '../../types/schema';

const defaultProps: FieldConfigurationProps = {
  fieldType: 'select',
  config: {
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ],
    multiple: false,
    allowCustom: false,
  },
  onChange: jest.fn(),
  errors: [],
  disabled: false,
  showHelp: true,
};

describe('SelectFieldConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders basic configuration options', () => {
    render(<SelectFieldConfig {...defaultProps} />);

    expect(screen.getByText('Selection Configuration')).toBeInTheDocument();
    expect(screen.getByText('Option Management (2 options)')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  test('shows help text when showHelp is true', () => {
    render(<SelectFieldConfig {...defaultProps} />);

    expect(screen.getByText(/Configure dropdown\/select fields with custom options/)).toBeInTheDocument();
  });

  test('hides help text when showHelp is false', () => {
    render(<SelectFieldConfig {...defaultProps} showHelp={false} />);

    expect(screen.queryByText(/Configure dropdown\/select fields with custom options/)).not.toBeInTheDocument();
  });

  test('displays current configuration values', () => {
    const config = {
      options: [
        { value: 'steel', label: 'Steel', group: 'Materials' },
        { value: 'aluminum', label: 'Aluminum', group: 'Materials' },
      ],
      multiple: true,
      allowCustom: true,
      defaultValue: 'steel',
    };

    render(<SelectFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByText('Steel')).toBeInTheDocument();
    expect(screen.getByText('Aluminum')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument(); // Group chip

    const multipleSwitch = screen.getByRole('checkbox', { name: /Multiple Selection/ });
    expect(multipleSwitch).toBeChecked();

    const customSwitch = screen.getByRole('checkbox', { name: /Allow Custom Values/ });
    expect(customSwitch).toBeChecked();
  });

  test('handles multiple selection toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    const multipleSwitch = screen.getByRole('checkbox', { name: /Multiple Selection/ });
    expect(multipleSwitch).not.toBeChecked();

    await act(async () => {
      await user.click(multipleSwitch);
    });

    expect(multipleSwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          multiple: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles allow custom values toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    const customSwitch = screen.getByRole('checkbox', { name: /Allow Custom Values/ });
    expect(customSwitch).not.toBeChecked();

    await act(async () => {
      await user.click(customSwitch);
    });

    expect(customSwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          allowCustom: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles default value selection', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    // Click on default value dropdown
    const defaultSelect = screen.getByLabelText('Default Selection (Optional)');
    await act(async () => {
      await user.click(defaultSelect);
    });

    // Wait for options to appear
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    // Select an option
    await act(async () => {
      await user.click(screen.getByText('Option 1'));
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: 'option1',
        })
      );
    }, { timeout: 1000 });
  });

  test('adds new option when Add Option button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    const addButton = screen.getByRole('button', { name: /Add Option/ });

    await act(async () => {
      await user.click(addButton);
    });

    // Should now show 3 options
    await waitFor(() => {
      expect(screen.getByText('Option Management (3 options)')).toBeInTheDocument();
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'option3', label: 'Option 3' }),
          ]),
        })
      );
    }, { timeout: 1000 });
  });

  test('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();

    render(<SelectFieldConfig {...defaultProps} />);

    const editButtons = screen.getAllByLabelText('Edit');

    await act(async () => {
      await user.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Option')).toBeInTheDocument();
      expect(screen.getByDisplayValue('option1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument();
    });
  });

  test('saves edited option with validation', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    // Open edit dialog
    const editButtons = screen.getAllByLabelText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Option')).toBeInTheDocument();
    });

    // Edit the option
    const valueInput = screen.getByLabelText('Value');
    const labelInput = screen.getByLabelText('Label');
    const groupInput = screen.getByLabelText('Group (Optional)');

    await act(async () => {
      await user.clear(valueInput);
      await user.type(valueInput, 'steel');
      await user.clear(labelInput);
      await user.type(labelInput, 'Steel Material');
      await user.type(groupInput, 'Materials');
    });

    // Save the option
    const saveButton = screen.getByRole('button', { name: /Save Option/ });
    await act(async () => {
      await user.click(saveButton);
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Edit Option')).not.toBeInTheDocument();
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              value: 'steel',
              label: 'Steel Material',
              group: 'Materials',
            }),
          ]),
        })
      );
    }, { timeout: 1000 });
  });

  test('validates option value format', async () => {
    const user = userEvent.setup();

    render(<SelectFieldConfig {...defaultProps} />);

    // Open edit dialog
    const editButtons = screen.getAllByLabelText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    // Enter invalid value with spaces and special characters
    const valueInput = screen.getByLabelText('Value');
    await act(async () => {
      await user.clear(valueInput);
      await user.type(valueInput, 'invalid value!');
    });

    // Try to save
    const saveButton = screen.getByRole('button', { name: /Save Option/ });
    await act(async () => {
      await user.click(saveButton);
    });

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Value must contain only letters, numbers, hyphens, and underscores/)).toBeInTheDocument();
    });
  });

  test('prevents duplicate option values', async () => {
    const user = userEvent.setup();

    render(<SelectFieldConfig {...defaultProps} />);

    // Open edit dialog for first option
    const editButtons = screen.getAllByLabelText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    // Try to set value to same as existing option
    const valueInput = screen.getByLabelText('Value');
    await act(async () => {
      await user.clear(valueInput);
      await user.type(valueInput, 'option2'); // Same as existing option
    });

    // Try to save
    const saveButton = screen.getByRole('button', { name: /Save Option/ });
    await act(async () => {
      await user.click(saveButton);
    });

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Value must be unique')).toBeInTheDocument();
    });
  });

  test('deletes option when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    const deleteButtons = screen.getAllByLabelText('Delete');

    await act(async () => {
      await user.click(deleteButtons[0]);
    });

    // Should now show 1 option
    await waitFor(() => {
      expect(screen.getByText('Option Management (1 options)')).toBeInTheDocument();
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'option2' }),
          ]),
        })
      );
    }, { timeout: 1000 });
  });

  test('prevents deleting when only one option remains', () => {
    const config = {
      options: [{ value: 'option1', label: 'Option 1' }],
    };

    render(<SelectFieldConfig {...defaultProps} config={config} />);

    const deleteButton = screen.getByLabelText('Delete');
    expect(deleteButton).toBeDisabled();
  });

  test('opens template import dialog', async () => {
    const user = userEvent.setup();

    render(<SelectFieldConfig {...defaultProps} />);

    const importButton = screen.getByRole('button', { name: /Import Template/ });

    await act(async () => {
      await user.click(importButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Import Option Template')).toBeInTheDocument();
      expect(screen.getByText('Material Types')).toBeInTheDocument();
      expect(screen.getByText('Steel Grades')).toBeInTheDocument();
    });
  });

  test('imports template options', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    // Open template dialog
    const importButton = screen.getByRole('button', { name: /Import Template/ });
    await act(async () => {
      await user.click(importButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Material Types')).toBeInTheDocument();
    });

    // Click on Material Types template
    await act(async () => {
      await user.click(screen.getByText('Material Types'));
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Import Option Template')).not.toBeInTheDocument();
    });

    // Should import template options
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'steel', label: 'Steel' }),
            expect.objectContaining({ value: 'aluminum', label: 'Aluminum' }),
          ]),
        })
      );
    }, { timeout: 1000 });
  });

  test('shows option groups summary', () => {
    const config = {
      options: [
        { value: 'steel', label: 'Steel', group: 'Metals' },
        { value: 'aluminum', label: 'Aluminum', group: 'Metals' },
        { value: 'concrete', label: 'Concrete', group: 'Composites' },
      ],
    };

    render(<SelectFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByText('Option Groups (2)')).toBeInTheDocument();
    expect(screen.getByText('Metals')).toBeInTheDocument();
    expect(screen.getByText('Composites')).toBeInTheDocument();
  });

  test('expands field preview accordion', async () => {
    const user = userEvent.setup();
    render(<SelectFieldConfig {...defaultProps} />);

    const previewAccordion = screen.getByText('Field Preview');

    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('How this field will appear to users:')).toBeInTheDocument();
      expect(screen.getByLabelText('Sample Select Field')).toBeInTheDocument();
    });
  });

  test('shows configuration summary in preview', async () => {
    const user = userEvent.setup();
    const config = {
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ],
      multiple: true,
      allowCustom: true,
    };

    render(<SelectFieldConfig {...defaultProps} config={config} />);

    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('2 options')).toBeInTheDocument();
      expect(screen.getByText('Multiple')).toBeInTheDocument();
      expect(screen.getByText('Custom Values')).toBeInTheDocument();
    });
  });

  test('disables inputs when disabled prop is true', () => {
    render(<SelectFieldConfig {...defaultProps} disabled={true} />);

    const multipleSwitch = screen.getByRole('checkbox', { name: /Multiple Selection/ });
    const customSwitch = screen.getByRole('checkbox', { name: /Allow Custom Values/ });
    const addButton = screen.getByRole('button', { name: /Add Option/ });

    expect(multipleSwitch).toBeDisabled();
    expect(customSwitch).toBeDisabled();
    expect(addButton).toBeDisabled();
  });

  test('displays error messages', () => {
    const errors = ['Invalid option configuration', 'Duplicate values found'];

    render(<SelectFieldConfig {...defaultProps} errors={errors} />);

    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();
    expect(screen.getByText('Invalid option configuration')).toBeInTheDocument();
    expect(screen.getByText('Duplicate values found')).toBeInTheDocument();
  });

  test('debounces onChange calls correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    const multipleSwitch = screen.getByRole('checkbox', { name: /Multiple Selection/ });

    // Make multiple rapid changes
    await act(async () => {
      await user.click(multipleSwitch);
    });

    // Should not call onChange immediately
    expect(onChange).not.toHaveBeenCalled();

    // Wait for debounce to trigger
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });

  test('handles empty config object', () => {
    render(<SelectFieldConfig {...defaultProps} config={{}} />);

    // Should render with default values
    expect(screen.getByText('Option Management (1 options)')).toBeInTheDocument();

    const multipleSwitch = screen.getByRole('checkbox', { name: /Multiple Selection/ });
    expect(multipleSwitch).not.toBeChecked(); // default false
  });

  test('shows disabled option in list', () => {
    const config = {
      options: [
        { value: 'option1', label: 'Option 1', disabled: true },
        { value: 'option2', label: 'Option 2' },
      ],
    };

    render(<SelectFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  test('cancels edit dialog without saving', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    // Open edit dialog
    const editButtons = screen.getAllByLabelText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Option')).toBeInTheDocument();
    });

    // Make some changes
    const labelInput = screen.getByLabelText('Label');
    await act(async () => {
      await user.clear(labelInput);
      await user.type(labelInput, 'Changed Label');
    });

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await act(async () => {
      await user.click(cancelButton);
    });

    // Dialog should close without changes
    await waitFor(() => {
      expect(screen.queryByText('Edit Option')).not.toBeInTheDocument();
    });

    // Should not have called onChange for the edit
    expect(onChange).not.toHaveBeenCalled();
  });

  test('moves options up and down', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<SelectFieldConfig {...defaultProps} onChange={onChange} />);

    // Move first option down
    const moveDownButtons = screen.getAllByText('↓');
    await act(async () => {
      await user.click(moveDownButtons[0]);
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            expect.objectContaining({ value: 'option2' }),
            expect.objectContaining({ value: 'option1' }),
          ],
        })
      );
    }, { timeout: 1000 });
  });

  test('disables move buttons appropriately', () => {
    render(<SelectFieldConfig {...defaultProps} />);

    const moveUpButtons = screen.getAllByText('↑');
    const moveDownButtons = screen.getAllByText('↓');

    // First option's up button should be disabled
    expect(moveUpButtons[0]).toBeDisabled();
    // Last option's down button should be disabled
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
  });
});