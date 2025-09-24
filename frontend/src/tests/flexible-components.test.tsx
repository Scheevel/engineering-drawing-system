import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import flexible components
import SchemaAwareForm from '../components/flexible/SchemaAwareForm.tsx';
import TypeSelectionDropdown from '../components/flexible/TypeSelectionDropdown.tsx';
import ContextualHelpPanel from '../components/flexible/ContextualHelpPanel.tsx';
import { ComponentSchema } from '../services/api.ts';

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock schema for testing
const mockSchema: ComponentSchema = {
  id: 'test-schema-1',
  project_id: 'test-project-1',
  name: 'Test Schema',
  description: 'A test schema for unit testing',
  version: 1,
  is_default: true,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  fields: [
    {
      id: 'field-1',
      field_name: 'component_type',
      field_type: 'select' as const,
      field_config: {
        options: ['girder', 'brace', 'plate'],
        allow_custom: false,
      },
      help_text: 'Select the component type',
      display_order: 0,
      is_required: true,
      is_active: true,
    },
    {
      id: 'field-2',
      field_name: 'description',
      field_type: 'textarea' as const,
      field_config: {
        max_length: 500,
      },
      help_text: 'Describe the component',
      display_order: 1,
      is_required: false,
      is_active: true,
    },
    {
      id: 'field-3',
      field_name: 'length',
      field_type: 'number' as const,
      field_config: {
        min: 0,
        max: 1000,
        unit: 'ft',
      },
      help_text: 'Component length in feet',
      display_order: 2,
      is_required: true,
      is_active: true,
    },
  ],
};

describe('Flexible Components', () => {
  describe('SchemaAwareForm', () => {
    test('renders form fields based on schema', () => {
      render(
        <TestWrapper>
          <SchemaAwareForm
            schema={mockSchema}
            onValuesChange={() => {}}
            onValidationChange={() => {}}
          />
        </TestWrapper>
      );

      // Check that form fields are rendered
      expect(screen.getByLabelText(/component type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/length/i)).toBeInTheDocument();
    });

    test('shows help text when enabled', () => {
      render(
        <TestWrapper>
          <SchemaAwareForm
            schema={mockSchema}
            showHelpText={true}
            onValuesChange={() => {}}
            onValidationChange={() => {}}
          />
        </TestWrapper>
      );

      // Check that help text is visible
      expect(screen.getByText('Select the component type')).toBeInTheDocument();
      expect(screen.getByText('Describe the component')).toBeInTheDocument();
      expect(screen.getByText('Component length in feet')).toBeInTheDocument();
    });

    test('handles different field types correctly', () => {
      render(
        <TestWrapper>
          <SchemaAwareForm
            schema={mockSchema}
            onValuesChange={() => {}}
            onValidationChange={() => {}}
          />
        </TestWrapper>
      );

      // Select field should have options
      const selectField = screen.getByLabelText(/component type/i);
      expect(selectField).toBeInTheDocument();

      // Textarea should be multiline
      const textareaField = screen.getByLabelText(/description/i);
      expect(textareaField).toHaveAttribute('rows');

      // Number field should have type="number"
      const numberField = screen.getByLabelText(/length/i);
      expect(numberField).toHaveAttribute('type', 'number');
    });
  });

  describe('TypeSelectionDropdown', () => {
    const mockAvailableSchemas = [mockSchema];
    const mockLockStatus = {
      is_locked: false,
      lock_reason: undefined,
      locked_fields: [],
      can_unlock: false,
    };

    test('renders schema selection dropdown', () => {
      render(
        <TestWrapper>
          <TypeSelectionDropdown
            availableSchemas={mockAvailableSchemas}
            lockStatus={mockLockStatus}
            onSchemaChange={() => {}}
          />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/component schema/i)).toBeInTheDocument();
    });

    test('shows unlock status when not locked', () => {
      render(
        <TestWrapper>
          <TypeSelectionDropdown
            availableSchemas={mockAvailableSchemas}
            lockStatus={mockLockStatus}
            onSchemaChange={() => {}}
            showLockDetails={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Unlocked')).toBeInTheDocument();
      expect(screen.getByText('Schema can be changed')).toBeInTheDocument();
    });

    test('shows lock status when locked', () => {
      const lockedStatus = {
        is_locked: true,
        lock_reason: 'Component contains data',
        locked_fields: ['component_type', 'length'],
        can_unlock: true,
      };

      render(
        <TestWrapper>
          <TypeSelectionDropdown
            availableSchemas={mockAvailableSchemas}
            lockStatus={lockedStatus}
            onSchemaChange={() => {}}
            showLockDetails={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Type Locked')).toBeInTheDocument();
    });
  });

  describe('ContextualHelpPanel', () => {
    test('renders schema information', () => {
      render(
        <TestWrapper>
          <ContextualHelpPanel
            schema={mockSchema}
            position="sidebar"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Schema: Test Schema')).toBeInTheDocument();
      expect(screen.getByText('A test schema for unit testing')).toBeInTheDocument();
      expect(screen.getByText(/3 fields/)).toBeInTheDocument();
    });

    test('shows field-specific help when current field is selected', () => {
      render(
        <TestWrapper>
          <ContextualHelpPanel
            schema={mockSchema}
            currentField="component_type"
            position="sidebar"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Component Type')).toBeInTheDocument();
      expect(screen.getByText('Select the component type')).toBeInTheDocument();
    });

    test('displays validation results', () => {
      const validationResult = {
        is_valid: false,
        errors: ['Component Type is required', 'Length must be a positive number'],
        validated_data: {},
      };

      render(
        <TestWrapper>
          <ContextualHelpPanel
            schema={mockSchema}
            validationResult={validationResult}
            position="sidebar"
          />
        </TestWrapper>
      );

      expect(screen.getByText(/2 validation errors/)).toBeInTheDocument();
      expect(screen.getByText('Component Type is required')).toBeInTheDocument();
    });

    test('shows quick field reference', () => {
      render(
        <TestWrapper>
          <ContextualHelpPanel
            schema={mockSchema}
            position="sidebar"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Quick Reference')).toBeInTheDocument();
      expect(screen.getByText('Component Type *')).toBeInTheDocument(); // Required field
      expect(screen.getByText('Description')).toBeInTheDocument(); // Optional field
      expect(screen.getByText('Length *')).toBeInTheDocument(); // Required field
    });
  });
});

describe('Integration Tests', () => {
  test('components work together in a complete workflow', () => {
    const handleSchemaChange = jest.fn();
    const handleValuesChange = jest.fn();
    const handleValidationChange = jest.fn();

    render(
      <TestWrapper>
        <div>
          <TypeSelectionDropdown
            availableSchemas={[mockSchema]}
            currentSchemaId={mockSchema.id}
            lockStatus={{
              is_locked: false,
              locked_fields: [],
              can_unlock: false,
            }}
            onSchemaChange={handleSchemaChange}
          />

          <SchemaAwareForm
            schema={mockSchema}
            onValuesChange={handleValuesChange}
            onValidationChange={handleValidationChange}
          />

          <ContextualHelpPanel
            schema={mockSchema}
            position="sidebar"
          />
        </div>
      </TestWrapper>
    );

    // All components should render together
    expect(screen.getByLabelText(/component schema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/component type/i)).toBeInTheDocument();
    expect(screen.getByText('Schema: Test Schema')).toBeInTheDocument();
  });
});