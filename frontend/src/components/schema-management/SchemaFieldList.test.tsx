/**
 * Test: SchemaFieldList Component
 *
 * Tests field list display, activation toggles, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SchemaFieldList from './SchemaFieldList';
import { ComponentSchemaField } from '../../services/api';

// Mock data for testing
const mockFields: ComponentSchemaField[] = [
  {
    id: 'field1',
    field_name: 'Component Name',
    field_type: 'text',
    field_config: {},
    help_text: 'Enter the component name',
    display_order: 1,
    is_required: true,
    is_active: true,
  },
  {
    id: 'field2',
    field_name: 'Quantity',
    field_type: 'number',
    field_config: { min: 1 },
    display_order: 2,
    is_required: false,
    is_active: true,
  },
  {
    id: 'field3',
    field_name: 'Material Type',
    field_type: 'select',
    field_config: { options: ['Steel', 'Aluminum', 'Concrete'] },
    help_text: 'Select material type',
    display_order: 3,
    is_required: false,
    is_active: false,
  },
];

const defaultProps = {
  fields: mockFields,
  loading: false,
  onFieldEdit: jest.fn(),
  onFieldDelete: jest.fn(),
  onFieldToggleActive: jest.fn(),
  disabled: false,
  showReorderHandles: false,
};

describe('SchemaFieldList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders field list with all fields', () => {
    render(<SchemaFieldList {...defaultProps} />);

    // Check for field names
    expect(screen.getByText('Component Name')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Material Type')).toBeInTheDocument();

    // Check for field count badge
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('displays field types correctly', () => {
    render(<SchemaFieldList {...defaultProps} />);

    // Check for field type chips
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  test('shows required field indicators', () => {
    render(<SchemaFieldList {...defaultProps} />);

    // Only Component Name should have Required chip
    const requiredChips = screen.getAllByText('Required');
    expect(requiredChips).toHaveLength(1);
  });

  test('displays help text when available', () => {
    render(<SchemaFieldList {...defaultProps} />);

    expect(screen.getByText('Enter the component name')).toBeInTheDocument();
    expect(screen.getByText('Select material type')).toBeInTheDocument();
  });

  test('shows visual distinction for inactive fields', () => {
    render(<SchemaFieldList {...defaultProps} />);

    // Material Type field is inactive (is_active: false in mockFields)
    const materialTypeSwitch = screen.getByLabelText('Activate field');

    // The inactive field's toggle should not be checked
    expect(materialTypeSwitch).not.toBeChecked();

    // Verify it's the Material Type field we're checking
    const materialTypeItem = screen.getByText('Material Type').closest('li');
    expect(materialTypeItem).toBeInTheDocument();
    expect(materialTypeItem).toContainElement(materialTypeSwitch);
  });

  test('renders loading skeleton when loading', () => {
    render(<SchemaFieldList {...defaultProps} loading={true} />);

    // Should show skeleton elements
    const skeletons = screen.getAllByText('Fields'); // Header should still be present
    expect(skeletons).toHaveLength(1);

    // Should have skeleton components (MUI Skeleton has specific classes)
    const container = screen.getByText('Fields').closest('div');
    const skeletonElements = container?.querySelectorAll('.MuiSkeleton-root');
    expect(skeletonElements?.length).toBeGreaterThan(0);
  });

  test('renders empty state when no fields', () => {
    render(<SchemaFieldList {...defaultProps} fields={[]} />);

    expect(screen.getByText('No Fields Yet')).toBeInTheDocument();
    expect(screen.getByText(/Add fields to define the data structure/)).toBeInTheDocument();
  });

  test('handles field edit button click', async () => {
    const user = userEvent.setup();
    render(<SchemaFieldList {...defaultProps} />);

    const editButtons = screen.getAllByLabelText('Edit field');
    await user.click(editButtons[0]);

    expect(defaultProps.onFieldEdit).toHaveBeenCalledWith(mockFields[0]);
  });

  test('handles field delete button click', async () => {
    const user = userEvent.setup();
    render(<SchemaFieldList {...defaultProps} />);

    const deleteButtons = screen.getAllByLabelText('Delete field');
    await user.click(deleteButtons[0]);

    expect(defaultProps.onFieldDelete).toHaveBeenCalledWith('field1');
  });

  test('handles field activation toggle', async () => {
    const user = userEvent.setup();
    render(<SchemaFieldList {...defaultProps} />);

    // Find toggle for active field (should be checked)
    const switches = screen.getAllByRole('checkbox');
    const firstSwitch = switches[0];

    expect(firstSwitch).toBeChecked();

    await user.click(firstSwitch);

    expect(defaultProps.onFieldToggleActive).toHaveBeenCalledWith('field1', false);
  });

  test('handles field activation toggle for inactive field', async () => {
    const user = userEvent.setup();
    render(<SchemaFieldList {...defaultProps} />);

    // Find toggle for inactive field (Material Type - should be unchecked)
    const switches = screen.getAllByRole('checkbox');
    const inactiveSwitch = switches[2]; // Third switch (Material Type)

    expect(inactiveSwitch).not.toBeChecked();

    await user.click(inactiveSwitch);

    expect(defaultProps.onFieldToggleActive).toHaveBeenCalledWith('field3', true);
  });

  test('disables interactions when disabled prop is true', () => {
    render(<SchemaFieldList {...defaultProps} disabled={true} />);

    const editButtons = screen.getAllByLabelText('Edit field');
    const deleteButtons = screen.getAllByLabelText('Delete field');
    const switches = screen.getAllByRole('checkbox');

    editButtons.forEach(button => {
      expect(button).toBeDisabled();
    });

    deleteButtons.forEach(button => {
      expect(button).toBeDisabled();
    });

    switches.forEach(switchEl => {
      expect(switchEl).toBeDisabled();
    });
  });

  test('shows reorder handles when showReorderHandles is true', () => {
    render(<SchemaFieldList {...defaultProps} showReorderHandles={true} />);

    const dragButtons = screen.getAllByLabelText('Drag to reorder');
    expect(dragButtons).toHaveLength(mockFields.length);
  });

  test('handles missing field id gracefully', () => {
    const fieldsWithoutId = [
      {
        field_name: 'Test Field',
        field_type: 'text' as const,
        field_config: {},
        display_order: 1,
        is_required: false,
        is_active: true,
      },
    ];

    render(<SchemaFieldList {...defaultProps} fields={fieldsWithoutId} />);

    expect(screen.getByText('Test Field')).toBeInTheDocument();
  });

  test('prevents multiple simultaneous toggle operations', async () => {
    const user = userEvent.setup();
    const slowToggleFunction = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <SchemaFieldList
        {...defaultProps}
        onFieldToggleActive={slowToggleFunction}
      />
    );

    const switches = screen.getAllByRole('checkbox');
    const firstSwitch = switches[0];

    // Click multiple times quickly without awaiting
    user.click(firstSwitch);
    user.click(firstSwitch);
    user.click(firstSwitch);

    // Wait for the component to handle the clicks
    await waitFor(() => {
      expect(slowToggleFunction).toHaveBeenCalledTimes(1);
    });
  });

  test('displays correct field type icons', () => {
    render(<SchemaFieldList {...defaultProps} />);

    // We can't easily test for specific icons, but we can ensure icons are present
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(mockFields.length);

    // Each list item should have an icon area
    listItems.forEach(item => {
      const iconContainer = item.querySelector('[data-testid="field-type-icon"]');
      // Icons are present as SVG elements within the ListItemIcon
      expect(item.querySelector('svg')).toBeInTheDocument();
    });
  });

  test('truncates long help text appropriately', () => {
    const longHelpTextField: ComponentSchemaField = {
      id: 'field-long-help',
      field_name: 'Long Help Field',
      field_type: 'text',
      field_config: {},
      help_text: 'This is a very long help text that should be truncated when displayed in the field list to maintain proper UI formatting and readability',
      display_order: 1,
      is_required: false,
      is_active: true,
    };

    render(<SchemaFieldList {...defaultProps} fields={[longHelpTextField]} />);

    const helpTextElement = screen.getByText(longHelpTextField.help_text);
    expect(helpTextElement).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
  });
});