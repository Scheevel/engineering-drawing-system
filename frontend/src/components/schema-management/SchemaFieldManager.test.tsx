/**
 * Test: SchemaFieldManager Component
 *
 * Tests the unified field management interface including template integration,
 * mode switching, and coordination between different field management capabilities.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import { SchemaFieldManager } from './SchemaFieldManager';
import { ComponentSchemaField, ComponentSchemaFieldCreate } from '../../types/schema';

// Mock the child components
jest.mock('./SchemaFieldList', () => ({
  __esModule: true,
  default: ({ fields, onFieldEdit, onFieldDelete, onFieldToggleActive }: any) => (
    <div data-testid="schema-field-list">
      {fields.map((field: ComponentSchemaField) => (
        <div key={field.id} data-testid={`field-${field.id}`}>
          <span>{field.field_name}</span>
          <button onClick={() => onFieldEdit?.(field)}>Edit</button>
          <button onClick={() => onFieldDelete?.(field.id)}>Delete</button>
          <button onClick={() => onFieldToggleActive?.(field.id, !field.is_active)}>
            Toggle
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('./FieldCreationDialog', () => ({
  __esModule: true,
  default: ({ open, onClose, onSave }: any) => (
    open ? (
      <div data-testid="field-creation-dialog">
        <button onClick={() => onSave({
          field_name: 'New Field',
          field_type: 'text',
          is_required: false,
          display_order: 1,
        })}>
          Save Field
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

jest.mock('./FieldTemplateSelector', () => ({
  FieldTemplateSelector: ({ open, onClose, onApplyTemplate }: any) => (
    open ? (
      <div data-testid="template-selector">
        <button onClick={() => onApplyTemplate([
          { field_name: 'Template Field 1', field_type: 'text', is_required: true, display_order: 1 },
          { field_name: 'Template Field 2', field_type: 'number', is_required: false, display_order: 2 },
        ])}>
          Apply Template
        </button>
        <button onClick={onClose}>Close Template</button>
      </div>
    ) : null
  ),
}));

jest.mock('./FieldReorderInterface', () => ({
  FieldReorderInterface: ({ fields }: any) => (
    <div data-testid="reorder-interface">
      {fields.map((field: ComponentSchemaField) => (
        <div key={field.id} data-testid={`reorder-field-${field.id}`}>
          {field.field_name}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('./FieldSelectionManager', () => ({
  FieldSelectionManager: ({ fields, selectedCount }: any) => (
    <div data-testid="selection-manager">
      <span data-testid="selected-count">{selectedCount} selected</span>
      {fields.map((field: ComponentSchemaField) => (
        <div key={field.id} data-testid={`selectable-field-${field.id}`}>
          {field.field_name}
        </div>
      ))}
    </div>
  ),
}));

// Mock hooks
jest.mock('../../hooks/schema/useFieldSelection', () => ({
  useFieldSelection: () => ({
    selectedFields: [],
    selectedFieldIds: [],
    selectedCount: 0,
    isAllSelected: false,
    isPartiallySelected: false,
    canSelectMore: true,
    maxSelections: 50,
    handleFieldToggle: jest.fn(),
    handleSelectAll: jest.fn(),
    handleClearSelection: jest.fn(),
    isFieldSelected: jest.fn(() => false),
  }),
}));

jest.mock('../../hooks/schema/useFieldReordering', () => ({
  useFieldReordering: () => ({
    reorderedFields: null,
    isReordering: false,
    handleReorderStart: jest.fn(),
    handleReorderEnd: jest.fn(),
    canReorder: true,
    hasUnsavedChanges: false,
    handleSaveOrder: jest.fn(),
    handleCancelReorder: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const theme = createTheme();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const mockFields: ComponentSchemaField[] = [
  {
    id: '1',
    field_name: 'Component Name',
    field_type: 'text',
    field_config: {},
    help_text: 'Name of the component',
    is_required: true,
    is_active: true,
    display_order: 1,
  },
  {
    id: '2',
    field_name: 'Weight',
    field_type: 'number',
    field_config: {},
    help_text: 'Weight in kilograms',
    is_required: false,
    is_active: true,
    display_order: 2,
  },
];

const defaultProps = {
  schemaId: 'schema-1',
  fields: mockFields,
  onFieldCreate: jest.fn(),
  onFieldUpdate: jest.fn(),
  onFieldDelete: jest.fn(),
  onFieldsReorder: jest.fn(),
  onTemplateApply: jest.fn(),
};

describe('SchemaFieldManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders field management interface', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Schema Fields')).toBeInTheDocument();
    expect(screen.getByText('2 fields')).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();
    expect(screen.getByText('1 required')).toBeInTheDocument();
  });

  it('displays field list in default mode', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('schema-field-list')).toBeInTheDocument();
    expect(screen.getByTestId('field-1')).toBeInTheDocument();
    expect(screen.getByTestId('field-2')).toBeInTheDocument();
  });

  it('opens field creation dialog when add field clicked', async () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    const addButton = screen.getByText('Add Field');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('field-creation-dialog')).toBeInTheDocument();
    });
  });

  it('opens template selector when use template clicked', async () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    const templateButton = screen.getByText('Use Template');
    fireEvent.click(templateButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-selector')).toBeInTheDocument();
    });
  });

  it('calls onFieldCreate when field is created', async () => {
    const mockOnFieldCreate = jest.fn().mockResolvedValue(undefined);
    const Wrapper = createWrapper();

    render(
      <SchemaFieldManager {...defaultProps} onFieldCreate={mockOnFieldCreate} />,
      { wrapper: Wrapper }
    );

    // Open field creation dialog
    fireEvent.click(screen.getByText('Add Field'));

    await waitFor(() => {
      expect(screen.getByTestId('field-creation-dialog')).toBeInTheDocument();
    });

    // Save field
    fireEvent.click(screen.getByText('Save Field'));

    await waitFor(() => {
      expect(mockOnFieldCreate).toHaveBeenCalledWith({
        field_name: 'New Field',
        field_type: 'text',
        is_required: false,
        display_order: 1,
      });
    });
  });

  it('calls onTemplateApply when template is applied', async () => {
    const mockOnTemplateApply = jest.fn().mockResolvedValue(undefined);
    const Wrapper = createWrapper();

    render(
      <SchemaFieldManager {...defaultProps} onTemplateApply={mockOnTemplateApply} />,
      { wrapper: Wrapper }
    );

    // Open template selector
    fireEvent.click(screen.getByText('Use Template'));

    await waitFor(() => {
      expect(screen.getByTestId('template-selector')).toBeInTheDocument();
    });

    // Apply template
    fireEvent.click(screen.getByText('Apply Template'));

    await waitFor(() => {
      expect(mockOnTemplateApply).toHaveBeenCalledWith([
        { field_name: 'Template Field 1', field_type: 'text', is_required: true, display_order: 1 },
        { field_name: 'Template Field 2', field_type: 'number', is_required: false, display_order: 2 },
      ]);
    });
  });

  it('switches to reorder mode when reorder button clicked', async () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    const reorderButton = screen.getByText('Reorder');
    fireEvent.click(reorderButton);

    await waitFor(() => {
      expect(screen.getByTestId('reorder-interface')).toBeInTheDocument();
      expect(screen.getByTestId('reorder-field-1')).toBeInTheDocument();
      expect(screen.getByTestId('reorder-field-2')).toBeInTheDocument();
    });
  });

  it('switches to bulk mode when bulk button clicked', async () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} />, { wrapper: Wrapper });

    const bulkButton = screen.getByText('Bulk');
    fireEvent.click(bulkButton);

    await waitFor(() => {
      expect(screen.getByTestId('selection-manager')).toBeInTheDocument();
      expect(screen.getByText('Select Fields for Bulk Operations')).toBeInTheDocument();
    });
  });

  it('shows empty state when no fields exist', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} fields={[]} />, { wrapper: Wrapper });

    expect(screen.getByText('No Fields Defined')).toBeInTheDocument();
    expect(screen.getByText('Add First Field')).toBeInTheDocument();
    expect(screen.getByText('Start from Template')).toBeInTheDocument();
  });

  it('disables add field button when max limit reached', () => {
    const Wrapper = createWrapper();
    render(
      <SchemaFieldManager {...defaultProps} maxFields={2} />,
      { wrapper: Wrapper }
    );

    const addButton = screen.getByText('Add Field');
    expect(addButton).toBeDisabled();
    expect(screen.getByText(/Field limit reached/)).toBeInTheDocument();
  });

  it('shows field limit warning when approaching limit', () => {
    const Wrapper = createWrapper();
    render(
      <SchemaFieldManager {...defaultProps} maxFields={5} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Approaching field limit/)).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} disabled />, { wrapper: Wrapper });

    expect(screen.getByText('Add Field')).toBeDisabled();
    expect(screen.getByText('Use Template')).toBeDisabled();
  });

  it('respects loading prop', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} loading />, { wrapper: Wrapper });

    expect(screen.getByText('Add Field')).toBeDisabled();
    expect(screen.getByText('Use Template')).toBeDisabled();
  });

  it('hides template functionality when allowTemplates is false', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} allowTemplates={false} />, { wrapper: Wrapper });

    expect(screen.queryByText('Use Template')).not.toBeInTheDocument();
  });

  it('hides bulk operations when allowBulkOperations is false', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} allowBulkOperations={false} />, { wrapper: Wrapper });

    expect(screen.queryByText('Bulk')).not.toBeInTheDocument();
  });

  it('hides reordering when allowReordering is false', () => {
    const Wrapper = createWrapper();
    render(<SchemaFieldManager {...defaultProps} allowReordering={false} />, { wrapper: Wrapper });

    expect(screen.queryByText('Reorder')).not.toBeInTheDocument();
  });
});