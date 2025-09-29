/**
 * Test: CheckboxFieldConfig Component
 *
 * Tests checkbox field configuration including default states,
 * custom labels, help text, and engineering label templates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CheckboxFieldConfig from './CheckboxFieldConfig';
import { FieldConfigurationProps } from '../../types/schema';

const defaultProps: FieldConfigurationProps = {
  fieldType: 'checkbox',
  config: {
    trueLabel: 'Yes',
    falseLabel: 'No',
    defaultChecked: false,
  },
  onChange: jest.fn(),
  errors: [],
  disabled: false,
  showHelp: true,
};

describe('CheckboxFieldConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders basic configuration options', () => {
    render(<CheckboxFieldConfig {...defaultProps} />);

    expect(screen.getByText('Checkbox Configuration')).toBeInTheDocument();
    expect(screen.getByText('Custom Labels')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('No')).toBeInTheDocument();
  });

  test('shows help text when showHelp is true', () => {
    render(<CheckboxFieldConfig {...defaultProps} />);

    expect(screen.getByText(/Configure checkbox fields for boolean values/)).toBeInTheDocument();
  });

  test('hides help text when showHelp is false', () => {
    render(<CheckboxFieldConfig {...defaultProps} showHelp={false} />);

    expect(screen.queryByText(/Configure checkbox fields for boolean values/)).not.toBeInTheDocument();
  });

  test('displays current configuration values', () => {
    const config = {
      trueLabel: 'Approved',
      falseLabel: 'Pending',
      defaultChecked: true,
      indeterminate: true,
      helpText: 'Check if approved',
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByDisplayValue('Approved')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pending')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Check if approved')).toBeInTheDocument();

    const defaultCheckedRadio = screen.getByDisplayValue('checked');
    expect(defaultCheckedRadio).toBeChecked();

    const indeterminateSwitch = screen.getByRole('checkbox', { name: /Allow Indeterminate State/ });
    expect(indeterminateSwitch).toBeChecked();
  });

  test('handles default state changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const checkedRadio = screen.getByDisplayValue('checked');

    await act(async () => {
      await user.click(checkedRadio);
    });

    expect(checkedRadio).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultChecked: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles indeterminate toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const indeterminateSwitch = screen.getByRole('checkbox', { name: /Allow Indeterminate State/ });
    expect(indeterminateSwitch).not.toBeChecked();

    await act(async () => {
      await user.click(indeterminateSwitch);
    });

    expect(indeterminateSwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          indeterminate: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles true label changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const trueLabelInput = screen.getByLabelText('Checked State Label');

    await act(async () => {
      await user.clear(trueLabelInput);
      await user.type(trueLabelInput, 'Approved');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          trueLabel: 'Approved',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles false label changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const falseLabelInput = screen.getByLabelText('Unchecked State Label');

    await act(async () => {
      await user.clear(falseLabelInput);
      await user.type(falseLabelInput, 'Pending');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          falseLabel: 'Pending',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles help text changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const helpTextInput = screen.getByLabelText('Help Text (Optional)');

    await act(async () => {
      await user.type(helpTextInput, 'Check if component is approved');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          helpText: 'Check if component is approved',
        })
      );
    }, { timeout: 1000 });
  });

  test('validates label length limits', async () => {
    const user = userEvent.setup();

    render(<CheckboxFieldConfig {...defaultProps} />);

    const trueLabelInput = screen.getByLabelText('Checked State Label');

    await act(async () => {
      await user.clear(trueLabelInput);
      await user.type(trueLabelInput, 'A'.repeat(51)); // Over 50 character limit
    });

    await waitFor(() => {
      expect(screen.getByText('True label must be less than 50 characters')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('validates help text length limits', async () => {
    const user = userEvent.setup();

    render(<CheckboxFieldConfig {...defaultProps} />);

    const helpTextInput = screen.getByLabelText('Help Text (Optional)');

    await act(async () => {
      await user.type(helpTextInput, 'A'.repeat(201)); // Over 200 character limit
    });

    await waitFor(() => {
      expect(screen.getByText('Help text must be less than 200 characters')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('resets to default labels when reset button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} config={{ trueLabel: 'Approved', falseLabel: 'Pending' }} onChange={onChange} />);

    const resetButton = screen.getByRole('button', { name: /Reset to Yes\/No/ });

    await act(async () => {
      await user.click(resetButton);
    });

    // Should reset to default values
    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('No')).toBeInTheDocument();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          trueLabel: 'Yes',
          falseLabel: 'No',
        })
      );
    }, { timeout: 1000 });
  });

  test('expands engineering label templates accordion', async () => {
    const user = userEvent.setup();
    render(<CheckboxFieldConfig {...defaultProps} />);

    const templatesAccordion = screen.getByText('Engineering Label Templates');

    await act(async () => {
      await user.click(templatesAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Inspection')).toBeInTheDocument();
      expect(screen.getByText('Safety')).toBeInTheDocument();
    });
  });

  test('applies template labels when template is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand templates accordion
    const templatesAccordion = screen.getByText('Engineering Label Templates');
    await act(async () => {
      await user.click(templatesAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Compliant')).toBeInTheDocument();
    });

    // Click on Compliant/Non-Compliant template
    const compliantTemplate = screen.getByText('Compliant').closest('button');
    await act(async () => {
      await user.click(compliantTemplate!);
    });

    // Should update the labels
    expect(screen.getByDisplayValue('Compliant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Non-Compliant')).toBeInTheDocument();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          trueLabel: 'Compliant',
          falseLabel: 'Non-Compliant',
        })
      );
    }, { timeout: 1000 });
  });

  test('expands field preview accordion', async () => {
    const user = userEvent.setup();
    render(<CheckboxFieldConfig {...defaultProps} />);

    const previewAccordion = screen.getByText('Field Preview');

    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('How this field will appear to users:')).toBeInTheDocument();
      expect(screen.getByText('Sample Checkbox Field')).toBeInTheDocument();
    });
  });

  test('shows current state in preview', async () => {
    const user = userEvent.setup();
    const config = {
      trueLabel: 'Approved',
      falseLabel: 'Pending',
      defaultChecked: false,
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    // Expand preview accordion
    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument(); // Should show false label initially
    });

    // Check the preview checkbox
    const previewCheckbox = screen.getByRole('checkbox', { name: /Sample Checkbox Field/ });
    await act(async () => {
      await user.click(previewCheckbox);
    });

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument(); // Should show true label when checked
    });
  });

  test('shows configuration summary in preview', async () => {
    const user = userEvent.setup();
    const config = {
      trueLabel: 'Active',
      falseLabel: 'Inactive',
      defaultChecked: true,
      indeterminate: true,
      helpText: 'Component status',
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Default: Active')).toBeInTheDocument();
      expect(screen.getByText('Labels: Active/Inactive')).toBeInTheDocument();
      expect(screen.getByText('Indeterminate')).toBeInTheDocument();
      expect(screen.getByText('Has Help Text')).toBeInTheDocument();
    });
  });

  test('shows help text in preview when configured', async () => {
    const user = userEvent.setup();
    const config = {
      helpText: 'Check if component meets safety requirements',
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Check if component meets safety requirements')).toBeInTheDocument();
    });
  });

  test('shows data value examples in preview', async () => {
    const user = userEvent.setup();
    const config = {
      trueLabel: 'Compliant',
      falseLabel: 'Non-Compliant',
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Checked: true → "Compliant"')).toBeInTheDocument();
      expect(screen.getByText('Unchecked: false → "Non-Compliant"')).toBeInTheDocument();
    });
  });

  test('disables inputs when disabled prop is true', () => {
    render(<CheckboxFieldConfig {...defaultProps} disabled={true} />);

    const trueLabelInput = screen.getByLabelText('Checked State Label');
    const falseLabelInput = screen.getByLabelText('Unchecked State Label');
    const indeterminateSwitch = screen.getByRole('checkbox', { name: /Allow Indeterminate State/ });

    expect(trueLabelInput).toBeDisabled();
    expect(falseLabelInput).toBeDisabled();
    expect(indeterminateSwitch).toBeDisabled();
  });

  test('displays error messages', () => {
    const errors = ['Invalid label configuration', 'Help text is required'];

    render(<CheckboxFieldConfig {...defaultProps} errors={errors} />);

    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();
    expect(screen.getByText('Invalid label configuration')).toBeInTheDocument();
    expect(screen.getByText('Help text is required')).toBeInTheDocument();
  });

  test('shows current labels in quick actions', () => {
    const config = {
      trueLabel: 'Approved',
      falseLabel: 'Pending',
    };

    render(<CheckboxFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByText('Current: "Approved" / "Pending"')).toBeInTheDocument();
  });

  test('debounces onChange calls correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const trueLabelInput = screen.getByLabelText('Checked State Label');

    // Type multiple characters quickly
    await act(async () => {
      await user.type(trueLabelInput, 'test', { delay: 50 }); // Fast typing
    });

    // Should not call onChange immediately
    expect(onChange).not.toHaveBeenCalled();

    // Wait for debounce to trigger
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });

  test('handles empty config object', () => {
    render(<CheckboxFieldConfig {...defaultProps} config={{}} />);

    // Should render with default values
    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('No')).toBeInTheDocument();

    const defaultUncheckedRadio = screen.getByDisplayValue('unchecked');
    expect(defaultUncheckedRadio).toBeChecked(); // default false

    const indeterminateSwitch = screen.getByRole('checkbox', { name: /Allow Indeterminate State/ });
    expect(indeterminateSwitch).not.toBeChecked(); // default false
  });

  test('trims whitespace from configuration values', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    const trueLabelInput = screen.getByLabelText('Checked State Label');

    await act(async () => {
      await user.clear(trueLabelInput);
      await user.type(trueLabelInput, '  Approved  ');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          trueLabel: 'Approved',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles radio button interactions correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<CheckboxFieldConfig {...defaultProps} onChange={onChange} />);

    // Initially unchecked should be selected
    const uncheckedRadio = screen.getByDisplayValue('unchecked');
    const checkedRadio = screen.getByDisplayValue('checked');

    expect(uncheckedRadio).toBeChecked();
    expect(checkedRadio).not.toBeChecked();

    // Click checked radio
    await act(async () => {
      await user.click(checkedRadio);
    });

    expect(checkedRadio).toBeChecked();
    expect(uncheckedRadio).not.toBeChecked();

    // Click unchecked radio again
    await act(async () => {
      await user.click(uncheckedRadio);
    });

    expect(uncheckedRadio).toBeChecked();
    expect(checkedRadio).not.toBeChecked();
  });
});