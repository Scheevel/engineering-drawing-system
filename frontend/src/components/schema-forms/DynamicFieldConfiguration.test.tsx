/**
 * Test: DynamicFieldConfiguration Component
 *
 * Tests the master configuration interface that dynamically renders
 * field-specific configuration components based on field type selection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DynamicFieldConfiguration from './DynamicFieldConfiguration';
import { FieldType } from '../../types/schema';

// Mock all the field configuration components
jest.mock('./TextFieldConfig', () => {
  return function MockTextFieldConfig(props: any) {
    return (
      <div data-testid="text-field-config">
        <div>Text Field Configuration</div>
        <div>Field Type: {props.fieldType}</div>
        <div>Disabled: {props.disabled.toString()}</div>
        <div>Show Help: {props.showHelp.toString()}</div>
      </div>
    );
  };
});

jest.mock('./NumberFieldConfig', () => {
  return function MockNumberFieldConfig(props: any) {
    return (
      <div data-testid="number-field-config">
        <div>Number Field Configuration</div>
        <div>Field Type: {props.fieldType}</div>
        <div>Disabled: {props.disabled.toString()}</div>
        <div>Show Help: {props.showHelp.toString()}</div>
      </div>
    );
  };
});

jest.mock('./SelectFieldConfig', () => {
  return function MockSelectFieldConfig(props: any) {
    return (
      <div data-testid="select-field-config">
        <div>Select Field Configuration</div>
        <div>Field Type: {props.fieldType}</div>
        <div>Disabled: {props.disabled.toString()}</div>
        <div>Show Help: {props.showHelp.toString()}</div>
      </div>
    );
  };
});

jest.mock('./CheckboxFieldConfig', () => {
  return function MockCheckboxFieldConfig(props: any) {
    return (
      <div data-testid="checkbox-field-config">
        <div>Checkbox Field Configuration</div>
        <div>Field Type: {props.fieldType}</div>
        <div>Disabled: {props.disabled.toString()}</div>
        <div>Show Help: {props.showHelp.toString()}</div>
      </div>
    );
  };
});

jest.mock('./DateFieldConfig', () => {
  return function MockDateFieldConfig(props: any) {
    return (
      <div data-testid="date-field-config">
        <div>Date Field Configuration</div>
        <div>Field Type: {props.fieldType}</div>
        <div>Disabled: {props.disabled.toString()}</div>
        <div>Show Help: {props.showHelp.toString()}</div>
      </div>
    );
  };
});

const defaultProps = {
  fieldType: 'text' as FieldType,
  config: {},
  onChange: jest.fn(),
  errors: [],
  disabled: false,
  showHelp: true,
};

describe('DynamicFieldConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default title and field type', () => {
    render(<DynamicFieldConfiguration {...defaultProps} />);

    expect(screen.getByText('Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Text Field')).toBeInTheDocument();
    expect(screen.getByTestId('text-field-config')).toBeInTheDocument();
  });

  test('renders custom title and description', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        title="Custom Field Setup"
        description="Configure your field properties here"
      />
    );

    expect(screen.getByText('Custom Field Setup')).toBeInTheDocument();
    expect(screen.getByText('Configure your field properties here')).toBeInTheDocument();
  });

  test('renders text field configuration', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType="text" />);

    expect(screen.getByTestId('text-field-config')).toBeInTheDocument();
    expect(screen.getByText('Text Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Type: text')).toBeInTheDocument();
  });

  test('renders number field configuration', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType="number" />);

    expect(screen.getByTestId('number-field-config')).toBeInTheDocument();
    expect(screen.getByText('Number Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Type: number')).toBeInTheDocument();
  });

  test('renders select field configuration', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType="select" />);

    expect(screen.getByTestId('select-field-config')).toBeInTheDocument();
    expect(screen.getByText('Select Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Type: select')).toBeInTheDocument();
  });

  test('renders checkbox field configuration', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType="checkbox" />);

    expect(screen.getByTestId('checkbox-field-config')).toBeInTheDocument();
    expect(screen.getByText('Checkbox Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Type: checkbox')).toBeInTheDocument();
  });

  test('renders date field configuration', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType="date" />);

    expect(screen.getByTestId('date-field-config')).toBeInTheDocument();
    expect(screen.getByText('Date Field Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Type: date')).toBeInTheDocument();
  });

  test('shows selection prompt when no field type provided', () => {
    render(<DynamicFieldConfiguration {...defaultProps} fieldType={undefined} />);

    expect(screen.getByText('Please select a field type to configure its specific properties.')).toBeInTheDocument();
    expect(screen.queryByTestId('text-field-config')).not.toBeInTheDocument();
  });

  test('shows field type selector when allowFieldTypeChange is true', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Field Type')).toBeInTheDocument();
    expect(screen.getByText('Choose the type of field to configure its specific properties')).toBeInTheDocument();
  });

  test('hides field type selector when allowFieldTypeChange is false', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={false}
      />
    );

    expect(screen.queryByLabelText('Field Type')).not.toBeInTheDocument();
    expect(screen.getByText('Single or multi-line text input with validation patterns')).toBeInTheDocument();
  });

  test('handles field type selection', async () => {
    const user = userEvent.setup();
    const onFieldTypeChange = jest.fn();

    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={onFieldTypeChange}
      />
    );

    const fieldTypeSelect = screen.getByLabelText('Field Type');

    await act(async () => {
      await user.click(fieldTypeSelect);
    });

    await waitFor(() => {
      expect(screen.getByText('Number Field')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Number Field'));
    });

    expect(onFieldTypeChange).toHaveBeenCalledWith('number');
  });

  test('displays field type options with descriptions', async () => {
    const user = userEvent.setup();

    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={jest.fn()}
      />
    );

    const fieldTypeSelect = screen.getByLabelText('Field Type');

    await act(async () => {
      await user.click(fieldTypeSelect);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Text Field')).toHaveLength(2); // One in header, one in dropdown
      expect(screen.getAllByText('Single or multi-line text input with validation patterns')).toHaveLength(2); // One in header, one in dropdown
      expect(screen.getByText('Number Field')).toBeInTheDocument();
      expect(screen.getByText('Numeric input with min/max validation and unit display')).toBeInTheDocument();
      expect(screen.getByText('Select Field')).toBeInTheDocument();
      expect(screen.getByText('Dropdown selection with option management')).toBeInTheDocument();
      expect(screen.getByText('Checkbox Field')).toBeInTheDocument();
      expect(screen.getByText('Boolean checkbox with custom labels')).toBeInTheDocument();
      expect(screen.getByText('Date Field')).toBeInTheDocument();
      expect(screen.getByText('Date picker with format and range constraints')).toBeInTheDocument();
    });
  });

  test('passes props correctly to child components', () => {
    const config = { placeholder: 'Test placeholder' };
    const onChange = jest.fn();

    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        config={config}
        onChange={onChange}
        disabled={true}
        showHelp={false}
      />
    );

    expect(screen.getByText('Disabled: true')).toBeInTheDocument();
    expect(screen.getByText('Show Help: false')).toBeInTheDocument();
  });

  test('displays current field type when not allowing changes', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="number"
        allowFieldTypeChange={false}
      />
    );

    expect(screen.getByText('Number Field')).toBeInTheDocument();
    expect(screen.getByText('Numeric input with min/max validation and unit display')).toBeInTheDocument();
    expect(screen.queryByLabelText('Field Type')).not.toBeInTheDocument();
  });

  test('handles errors correctly', () => {
    const errors = ['Configuration is invalid', 'Field type not supported'];

    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        errors={errors}
      />
    );

    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();
    expect(screen.getByText('Configuration is invalid')).toBeInTheDocument();
    expect(screen.getByText('Field type not supported')).toBeInTheDocument();
  });

  test('shows warning for unsupported field type', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType={'unsupported' as FieldType}
      />
    );

    expect(screen.getByText('Unsupported field type: unsupported. Please select a supported field type.')).toBeInTheDocument();
    expect(screen.queryByTestId('text-field-config')).not.toBeInTheDocument();
  });

  test('disables field type selector when disabled prop is true', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={jest.fn()}
        disabled={true}
      />
    );

    const fieldTypeSelect = screen.getByRole('combobox', { name: 'Field Type' });
    expect(fieldTypeSelect).toHaveAttribute('aria-disabled', 'true');
  });

  test('switches field configuration when field type changes', async () => {
    const user = userEvent.setup();
    const onFieldTypeChange = jest.fn();

    const { rerender } = render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={onFieldTypeChange}
      />
    );

    expect(screen.getByTestId('text-field-config')).toBeInTheDocument();

    // Simulate field type change
    rerender(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="number"
        allowFieldTypeChange={true}
        onFieldTypeChange={onFieldTypeChange}
      />
    );

    expect(screen.queryByTestId('text-field-config')).not.toBeInTheDocument();
    expect(screen.getByTestId('number-field-config')).toBeInTheDocument();
  });

  test('displays all field type emojis correctly', async () => {
    const user = userEvent.setup();

    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        fieldType="text"
        allowFieldTypeChange={true}
        onFieldTypeChange={jest.fn()}
      />
    );

    const fieldTypeSelect = screen.getByLabelText('Field Type');

    await act(async () => {
      await user.click(fieldTypeSelect);
    });

    await waitFor(() => {
      // Check for emojis in the dropdown options - they appear multiple times
      expect(screen.getAllByText('📝')).toHaveLength(2); // Text field emoji (header + dropdown)
      expect(screen.getByText('🔢')).toBeInTheDocument(); // Number field
      expect(screen.getByText('📋')).toBeInTheDocument(); // Select field
      expect(screen.getByText('☑️')).toBeInTheDocument(); // Checkbox field
      expect(screen.getByText('📅')).toBeInTheDocument(); // Date field
    });
  });

  test('shows correct field type display for all types', () => {
    const fieldTypes: FieldType[] = ['text', 'number', 'select', 'checkbox', 'date'];

    fieldTypes.forEach((fieldType) => {
      const { rerender } = render(
        <DynamicFieldConfiguration
          {...defaultProps}
          fieldType={fieldType}
          allowFieldTypeChange={false}
        />
      );

      switch (fieldType) {
        case 'text':
          expect(screen.getByText('Text Field')).toBeInTheDocument();
          expect(screen.getByText('Single or multi-line text input with validation patterns')).toBeInTheDocument();
          break;
        case 'number':
          expect(screen.getByText('Number Field')).toBeInTheDocument();
          expect(screen.getByText('Numeric input with min/max validation and unit display')).toBeInTheDocument();
          break;
        case 'select':
          expect(screen.getByText('Select Field')).toBeInTheDocument();
          expect(screen.getByText('Dropdown selection with option management')).toBeInTheDocument();
          break;
        case 'checkbox':
          expect(screen.getByText('Checkbox Field')).toBeInTheDocument();
          expect(screen.getByText('Boolean checkbox with custom labels')).toBeInTheDocument();
          break;
        case 'date':
          expect(screen.getByText('Date Field')).toBeInTheDocument();
          expect(screen.getByText('Date picker with format and range constraints')).toBeInTheDocument();
          break;
      }
    });
  });

  test('handles empty config object', () => {
    render(
      <DynamicFieldConfiguration
        {...defaultProps}
        config={{}}
      />
    );

    expect(screen.getByTestId('text-field-config')).toBeInTheDocument();
  });

  test('maintains consistent prop passing across all field types', () => {
    const config = { test: 'value' };
    const onChange = jest.fn();
    const errors = ['test error'];

    const fieldTypes: FieldType[] = ['text', 'number', 'select', 'checkbox', 'date'];

    fieldTypes.forEach((fieldType) => {
      const { unmount } = render(
        <DynamicFieldConfiguration
          fieldType={fieldType}
          config={config}
          onChange={onChange}
          errors={errors}
          disabled={true}
          showHelp={false}
        />
      );

      expect(screen.getByText('Disabled: true')).toBeInTheDocument();
      expect(screen.getByText('Show Help: false')).toBeInTheDocument();
      expect(screen.getByText(`Field Type: ${fieldType}`)).toBeInTheDocument();

      unmount(); // Clean up each render
    });
  });
});