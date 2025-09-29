/**
 * Test: TextFieldConfig Component
 *
 * Tests advanced text field configuration including multiline options,
 * character limits, pattern validation, and preview functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TextFieldConfig from './TextFieldConfig';
import { FieldConfigurationProps } from '../../types/schema';

const defaultProps: FieldConfigurationProps = {
  fieldType: 'text',
  config: {
    placeholder: 'Test placeholder',
    maxLength: 100,
    minLength: 2,
    pattern: '',
    multiline: false,
  },
  onChange: jest.fn(),
  errors: [],
  disabled: false,
  showHelp: true,
};

describe('TextFieldConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders basic configuration options', () => {
    render(<TextFieldConfig {...defaultProps} />);

    expect(screen.getByText('Basic Configuration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test placeholder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // maxLength
    expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // minLength
  });

  test('shows help text when showHelp is true', () => {
    render(<TextFieldConfig {...defaultProps} />);

    expect(screen.getByText(/Configure how text input fields behave/)).toBeInTheDocument();
  });

  test('hides help text when showHelp is false', () => {
    render(<TextFieldConfig {...defaultProps} showHelp={false} />);

    expect(screen.queryByText(/Configure how text input fields behave/)).not.toBeInTheDocument();
  });

  test('displays current configuration values', () => {
    const config = {
      placeholder: 'Enter component ID',
      maxLength: 50,
      minLength: 5,
      multiline: true,
    };

    render(<TextFieldConfig {...defaultProps} config={config} />);

    expect(screen.getByDisplayValue('Enter component ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();

    const multilineSwitch = screen.getByRole('checkbox', { name: /Multiline Text Area/ });
    expect(multilineSwitch).toBeChecked();
  });

  test('handles multiline toggle changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const multilineSwitch = screen.getByRole('checkbox', { name: /Multiline Text Area/ });
    expect(multilineSwitch).not.toBeChecked();

    await act(async () => {
      await user.click(multilineSwitch);
    });

    expect(multilineSwitch).toBeChecked();

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          multiline: true,
        })
      );
    }, { timeout: 1000 });
  });

  test('handles placeholder text changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const placeholderInput = screen.getByLabelText('Placeholder Text');

    await act(async () => {
      await user.clear(placeholderInput);
      await user.type(placeholderInput, 'New placeholder text');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: 'New placeholder text',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles character limit changes', async () => {
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const maxLengthInput = screen.getByLabelText('Maximum Length');

    await act(async () => {
      // Use fireEvent.change to directly set the value, avoiding input concatenation
      fireEvent.change(maxLengthInput, { target: { value: '200' } });
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maxLength: 200,
        })
      );
    }, { timeout: 1000 });
  });

  test('validates minimum length is less than maximum length', async () => {
    const user = userEvent.setup();

    render(<TextFieldConfig {...defaultProps} config={{ maxLength: 50, minLength: 10 }} />);

    const minLengthInput = screen.getByLabelText('Minimum Length');

    await act(async () => {
      await user.clear(minLengthInput);
      await user.type(minLengthInput, '100'); // Greater than maxLength (50)
    });

    await waitFor(() => {
      expect(screen.getByText('Minimum length must be less than maximum length')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('expands pattern validation accordion', async () => {
    const user = userEvent.setup();
    render(<TextFieldConfig {...defaultProps} />);

    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });

    await act(async () => {
      await user.click(patternAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Engineering Patterns')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select a common engineering pattern...')).toBeInTheDocument();
    });
  });

  test('selects engineering pattern from dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand pattern accordion - use role to target the accordion header specifically
    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });
    await act(async () => {
      await user.click(patternAccordion);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Select a common engineering pattern...')).toBeInTheDocument();
    });

    // Click on the autocomplete
    const autocomplete = screen.getByPlaceholderText('Select a common engineering pattern...');
    await act(async () => {
      await user.click(autocomplete);
    });

    // Wait for options to appear and select one
    await waitFor(() => {
      expect(screen.getByText('Component Mark (ABC-123)')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Component Mark (ABC-123)'));
    });

    // Wait for pattern to be applied
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: '^[A-Z]+[0-9]+$',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles custom pattern input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    // Expand pattern accordion - use role to target the accordion header specifically
    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });
    await act(async () => {
      await user.click(patternAccordion);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Custom Pattern (Regular Expression)')).toBeInTheDocument();
    });

    const customPatternInput = screen.getByLabelText('Custom Pattern (Regular Expression)');

    await act(async () => {
      // Use fireEvent.change to directly set the value, avoiding userEvent issues with regex characters
      fireEvent.change(customPatternInput, { target: { value: '^[A-Z]{2,3}[0-9]{2,4}$' } });
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: '^[A-Z]{2,3}[0-9]{2,4}$',
        })
      );
    }, { timeout: 1000 });
  });

  test('validates invalid regex patterns', async () => {
    const user = userEvent.setup();

    render(<TextFieldConfig {...defaultProps} />);

    // Expand pattern accordion - use role to target the accordion header specifically
    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });
    await act(async () => {
      await user.click(patternAccordion);
    });

    const customPatternInput = await screen.findByLabelText('Custom Pattern (Regular Expression)');

    await act(async () => {
      // Use fireEvent.change to directly set the value, avoiding userEvent issues with regex characters
      fireEvent.change(customPatternInput, { target: { value: '[invalid regex' } }); // Invalid regex
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid regular expression pattern')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('tests pattern validation with sample values', async () => {
    const user = userEvent.setup();

    render(<TextFieldConfig {...defaultProps} config={{ pattern: '^[A-Z]+[0-9]+$' }} />);

    // Expand pattern accordion - use role to target the accordion header specifically
    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });
    await act(async () => {
      await user.click(patternAccordion);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Test Value')).toBeInTheDocument();
    });

    const testInput = screen.getByLabelText('Test Value');

    // Test valid pattern
    await act(async () => {
      await user.type(testInput, 'ABC123');
    });

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    // Test invalid pattern
    await act(async () => {
      await user.clear(testInput);
      await user.type(testInput, '123ABC'); // Numbers before letters
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('clears pattern when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} config={{ pattern: '^[A-Z]+$' }} />);

    // Expand pattern accordion - use role to target the accordion header specifically
    const patternAccordion = screen.getByRole('button', { name: /pattern validation/i });
    await act(async () => {
      await user.click(patternAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear');
    await act(async () => {
      await user.click(clearButton);
    });

    // Wait for pattern to be cleared
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: undefined,
        })
      );
    }, { timeout: 1000 });
  });

  test('expands field preview accordion', async () => {
    const user = userEvent.setup();
    render(<TextFieldConfig {...defaultProps} />);

    const previewAccordion = screen.getByText('Field Preview');

    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('How this field will appear to users:')).toBeInTheDocument();
      expect(screen.getByLabelText('Sample Field Name')).toBeInTheDocument();
    });
  });

  test('shows configuration summary in preview', async () => {
    const user = userEvent.setup();
    const config = {
      multiline: true,
      maxLength: 500,
      minLength: 10,
      pattern: '^[A-Z]+$',
    };

    render(<TextFieldConfig {...defaultProps} config={config} />);

    const previewAccordion = screen.getByText('Field Preview');
    await act(async () => {
      await user.click(previewAccordion);
    });

    await waitFor(() => {
      expect(screen.getByText('Multiline')).toBeInTheDocument();
      expect(screen.getByText('10-500 chars')).toBeInTheDocument();
      // Look for pattern validation chip/label specifically, not the accordion header
      expect(screen.getAllByText('Pattern Validation')).toHaveLength(2); // Accordion + chip
    });
  });

  test('disables inputs when disabled prop is true', () => {
    render(<TextFieldConfig {...defaultProps} disabled={true} />);

    const placeholderInput = screen.getByLabelText('Placeholder Text');
    const maxLengthInput = screen.getByLabelText('Maximum Length');
    const multilineSwitch = screen.getByRole('checkbox', { name: /Multiline Text Area/ });

    expect(placeholderInput).toBeDisabled();
    expect(maxLengthInput).toBeDisabled();
    expect(multilineSwitch).toBeDisabled();
  });

  test('displays error messages', () => {
    const errors = ['Invalid configuration', 'Pattern is required'];

    render(<TextFieldConfig {...defaultProps} errors={errors} />);

    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();
    expect(screen.getByText('Invalid configuration')).toBeInTheDocument();
    expect(screen.getByText('Pattern is required')).toBeInTheDocument();
  });

  test('handles format hint input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const formatHintInput = screen.getByLabelText('Format Hint (Optional)');

    await act(async () => {
      await user.type(formatHintInput, 'Format: ABC-123');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          formatHint: 'Format: ABC-123',
        })
      );
    }, { timeout: 1000 });
  });

  test('shows pattern active chip when pattern is set', () => {
    render(<TextFieldConfig {...defaultProps} config={{ pattern: '^[A-Z]+$' }} />);

    expect(screen.getByText('Pattern Active')).toBeInTheDocument();
  });

  test('debounces onChange calls correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const placeholderInput = screen.getByLabelText('Placeholder Text');

    // Type multiple characters quickly
    await act(async () => {
      await user.type(placeholderInput, 'test', { delay: 50 }); // Fast typing
    });

    // Should not call onChange immediately
    expect(onChange).not.toHaveBeenCalled();

    // Wait for debounce to trigger
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });

  test('trims whitespace from configuration values', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextFieldConfig {...defaultProps} onChange={onChange} />);

    const placeholderInput = screen.getByLabelText('Placeholder Text');

    await act(async () => {
      await user.clear(placeholderInput);
      await user.type(placeholderInput, '  trimmed value  ');
    });

    // Wait for debounced onChange call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: 'trimmed value',
        })
      );
    }, { timeout: 1000 });
  });

  test('handles empty config object', () => {
    render(<TextFieldConfig {...defaultProps} config={{}} />);

    // Should render with default values
    expect(screen.getByDisplayValue('255')).toBeInTheDocument(); // default maxLength
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // default minLength

    const multilineSwitch = screen.getByRole('checkbox', { name: /Multiline Text Area/ });
    expect(multilineSwitch).not.toBeChecked(); // default false
  });
});