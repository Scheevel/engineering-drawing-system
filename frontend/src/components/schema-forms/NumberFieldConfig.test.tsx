/**
 * Test: NumberFieldConfig Component
 *
 * Tests advanced number field configuration including min/max values,
 * step increments, unit display, and number formatting options
 */

import React from 'react';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import NumberFieldConfig from './NumberFieldConfig';
import { FieldConfigurationProps } from '../../types/schema';

const defaultProps: FieldConfigurationProps = {
  fieldType: 'number',
  config: {
    min: 0,
    max: 100,
    step: 1,
    unit: '',
    precision: 2,
  },
  onChange: jest.fn(),
  errors: [],
  disabled: false,
  showHelp: true,
};

describe('NumberFieldConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders basic configuration options', () => {
    render(<NumberFieldConfig {...defaultProps} />);

    expect(screen.getByText('Value Range & Validation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // min value
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // max value
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // step value
  });

  test('shows help text when showHelp is true', () => {
    render(<NumberFieldConfig {...defaultProps} />);

    expect(screen.getByText(/Configure numeric input validation, precision/)).toBeInTheDocument();
  });

  test('hides help text when showHelp is false', () => {
    render(<NumberFieldConfig {...defaultProps} showHelp={false} />);

    expect(screen.queryByText(/Configure numeric input validation, precision/)).not.toBeInTheDocument();
  });

  test('displays current configuration values', () => {
    const config = {
      min: 10,
      max: 50,
      step: 0.5,
      unit: 'kg',
      precision: 3,
      integerOnly: true,
    };

    render(<NumberFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kg')).toBeInTheDocument();

    const integerOnlySwitch = screen.getByRole('checkbox', { name: /Integer Only/ });
    expect(integerOnlySwitch).toBeChecked();
  });

  test('handles minimum value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    const minInput = screen.getByLabelText('Minimum Value (Optional)');

    await act(async () => {
      await user.click(minInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(minInput, '5');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          min: 5,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles maximum value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    const maxInput = screen.getByLabelText('Maximum Value (Optional)');

    await act(async () => {
      await user.click(maxInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(maxInput, '200');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 200,
        })
      );
    }, { timeout: 1000 });
  });

  test('validates minimum value is less than maximum value', async () => {
    const user = userEvent.setup();

    render(<NumberFieldConfig {...defaultProps} config={{ min: 10, max: 50 }} />);

    const minInput = screen.getByLabelText('Minimum Value (Optional)');

    await act(async () => {
      await user.click(minInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(minInput, '100'); // Greater than max (50)
    });

    await waitFor(() => {
      expect(screen.getByText('Minimum value must be less than maximum value')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('handles integer only toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    const integerOnlySwitch = screen.getByRole('checkbox', { name: /Integer Only/ });
    expect(integerOnlySwitch).not.toBeChecked();

    await act(async () => {
      await user.click(integerOnlySwitch);
    });

    expect(integerOnlySwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          integerOnly: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles decimal places configuration', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} config={{ integerOnly: false }} onChange={onChange} />);

    const decimalPlacesInput = screen.getByLabelText('Decimal Places');

    await act(async () => {
      await user.click(decimalPlacesInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(decimalPlacesInput, '4');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          precision: 4,
        })
      );
    }, { timeout: 1000 });
  });

  test('hides decimal places when integer only is enabled', async () => {
    const user = userEvent.setup();

    render(<NumberFieldConfig {...defaultProps} config={{ integerOnly: true }} />);

    expect(screen.queryByLabelText('Decimal Places')).not.toBeInTheDocument();
  });

  test('expands step and precision accordion', async () => {
    const user = userEvent.setup();
    render(<NumberFieldConfig {...defaultProps} />);

    const stepAccordion = screen.getByText('Step & Precision Control');

    await act(async () => {
      await user.click(stepAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Step Increment Presets')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select step increment preset...')).toBeInTheDocument();
    });
  });

  test('selects step preset from dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand step accordion
    const stepAccordion = screen.getByText('Step & Precision Control');
    await act(async () => {
      await user.click(stepAccordion);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Select step increment preset...')).toBeInTheDocument();
    });

    // Click on the autocomplete
    const autocomplete = screen.getByPlaceholderText('Select step increment preset...');
    await act(async () => {
      await user.click(autocomplete);
    });

    // Wait for options to appear and select one
    await waitFor(() => {
      expect(screen.getByText('Fine (0.1)')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Fine (0.1)'));
    });

    // Wait for step to be applied
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 0.1,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles custom step input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand step accordion
    const stepAccordion = screen.getByText('Step & Precision Control');
    await act(async () => {
      await user.click(stepAccordion);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Step Increment')).toBeInTheDocument();
    });

    const stepInput = screen.getByLabelText('Step Increment');

    await act(async () => {
      await user.click(stepInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(stepInput, '2.5');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2.5,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles thousands separator toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand step accordion
    const stepAccordion = screen.getByText('Step & Precision Control');
    await act(async () => {
      await user.click(stepAccordion);
    });

    const thousandsSeparatorSwitch = await screen.findByRole('checkbox', { name: /Thousands Separator/ });

    await act(async () => {
      await user.click(thousandsSeparatorSwitch);
    });

    expect(thousandsSeparatorSwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          thousandsSeparator: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('expands unit display accordion', async () => {
    const user = userEvent.setup();
    render(<NumberFieldConfig {...defaultProps} />);

    const unitAccordion = screen.getByText('Unit Display');

    await act(async () => {
      await user.click(unitAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering Units')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select engineering unit...')).toBeInTheDocument();
    });
  });

  test('selects engineering unit from dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand unit accordion
    const unitAccordion = screen.getByText('Unit Display');
    await act(async () => {
      await user.click(unitAccordion);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Select engineering unit...')).toBeInTheDocument();
    });

    // Click on the autocomplete
    const autocomplete = screen.getByPlaceholderText('Select engineering unit...');
    await act(async () => {
      await user.click(autocomplete);
    });

    // Wait for options to appear and select one
    await waitFor(() => {
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('kg'));
    });

    // Wait for unit to be applied
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'kg',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles custom unit input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand unit accordion
    const unitAccordion = screen.getByText('Unit Display');
    await act(async () => {
      await user.click(unitAccordion);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Custom Unit (Optional)')).toBeInTheDocument();
    });

    const customUnitInput = screen.getByLabelText('Custom Unit (Optional)');

    await act(async () => {
      await user.type(customUnitInput, 'mph');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'mph',
        })
      );
    }, { timeout: 1000 });
  });

  test('clears custom unit when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} config={{ unit: 'kg' }} />);

    // Expand unit accordion
    const unitAccordion = screen.getByText('Unit Display');
    await act(async () => {
      await user.click(unitAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear');
    await act(async () => {
      await user.click(clearButton);
    });

    // Wait for unit to be cleared
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: undefined,
        })
      );
    }, { timeout: 1000 });
  });

  test('expands field preview accordion', async () => {
    const user = userEvent.setup();
    render(<NumberFieldConfig {...defaultProps} />);

    const previewAccordion = screen.getByText('Field Preview');

    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('How this field will appear to users:')).toBeInTheDocument();
      expect(screen.getByLabelText('Sample Number Field')).toBeInTheDocument();
    });
  });

  test('validates test value against configuration', async () => {
    const user = userEvent.setup();
    const config = {
      min: 10,
      max: 50,
    };

    render(<NumberFieldConfig {...defaultProps} config={config} />);

    // Expand preview accordion
    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Sample Number Field')).toBeInTheDocument();
    });

    const testInput = screen.getByLabelText('Sample Number Field');

    // Test value below minimum
    await act(async () => {
      await user.click(testInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(testInput, '5');
    });

    await waitFor(() => {
      expect(screen.getByText('Value must be at least 10')).toBeInTheDocument();
    });

    // Test value above maximum
    await act(async () => {
      await user.click(testInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(testInput, '100');
    });

    await waitFor(() => {
      expect(screen.getByText('Value must be at most 50')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('validates integer only configuration', async () => {
    const user = userEvent.setup();
    const config = {
      integerOnly: true,
    };

    render(<NumberFieldConfig {...defaultProps} config={config} />);

    // Expand preview accordion
    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    const testInput = await screen.findByLabelText('Sample Number Field');

    // Test decimal value when integer only is enabled
    await act(async () => {
      await user.click(testInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(testInput, '3.14');
    });

    await waitFor(() => {
      expect(screen.getByText('Value must be a whole number')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('shows configuration summary with chips', async () => {
    const user = userEvent.setup();
    const config = {
      integerOnly: true,
      step: 5,
      unit: 'kg',
      thousandsSeparator: true,
    };

    render(<NumberFieldConfig {...defaultProps} config={config} />);

    // Expand preview accordion
    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Integers Only')).toBeInTheDocument();
      expect(screen.getByText('Step: 5')).toBeInTheDocument();
      expect(screen.getByText('Unit: kg')).toBeInTheDocument();
      expect(screen.getByText('Thousands Separator')).toBeInTheDocument();
    });
  });

  test('disables inputs when disabled prop is true', () => {
    render(<NumberFieldConfig {...defaultProps} disabled={true} />);

    const minInput = screen.getByLabelText('Minimum Value (Optional)');
    const maxInput = screen.getByLabelText('Maximum Value (Optional)');
    const integerOnlySwitch = screen.getByRole('checkbox', { name: /Integer Only/ });

    expect(minInput).toBeDisabled();
    expect(maxInput).toBeDisabled();
    expect(integerOnlySwitch).toBeDisabled();
  });

  test('displays error messages', () => {
    const errors = ['Invalid range configuration', 'Step value is required'];

    render(<NumberFieldConfig {...defaultProps} errors={errors} />);

    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();
    expect(screen.getByText('Invalid range configuration')).toBeInTheDocument();
    expect(screen.getByText('Step value is required')).toBeInTheDocument();
  });

  test('shows unit chip when unit is set', () => {
    render(<NumberFieldConfig {...defaultProps} config={{ unit: 'kg' }} />);

    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  test('debounces onChange calls correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<NumberFieldConfig {...defaultProps} onChange={onChange} />);

    const minInput = screen.getByLabelText('Minimum Value (Optional)');

    // Type multiple characters quickly
    await act(async () => {
      await user.type(minInput, '123', { delay: 50 }); // Fast typing
    });

    // Should not call onChange immediately
    expect(onChange).not.toHaveBeenCalled();

    // Wait for debounce to trigger
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });

  test('handles empty config object', () => {
    render(<NumberFieldConfig {...defaultProps} config={{}} />);

    // Should render with default values
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // default step

    const integerOnlySwitch = screen.getByRole('checkbox', { name: /Integer Only/ });
    expect(integerOnlySwitch).not.toBeChecked(); // default false
  });

  test('formats numbers correctly in preview', async () => {
    const user = userEvent.setup();
    const config = {
      precision: 2,
      thousandsSeparator: true,
      unit: 'kg',
    };

    render(<NumberFieldConfig {...defaultProps} config={config} />);

    // Expand preview accordion
    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    const testInput = await screen.findByLabelText('Sample Number Field');

    await act(async () => {
      await user.click(testInput);
      await user.keyboard('{Control>}a{/Control}');
      await user.type(testInput, '12345.67');
    });

    await waitFor(() => {
      expect(screen.getByText('Formatted Display: 12,345.67 kg')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});