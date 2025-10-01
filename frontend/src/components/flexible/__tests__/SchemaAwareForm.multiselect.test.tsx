/**
 * Test Suite: SchemaAwareForm - Multi-Select Field Rendering
 * Story: 3.13 Phase 2 - FR-5 AC 22-27
 *
 * Tests multi-select field type implementation including rendering,
 * validation, default values, and user interaction workflows.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useForm, FormProvider } from 'react-hook-form';
import SchemaAwareForm from '../SchemaAwareForm';
import { ComponentSchema } from '../../../services/api';

// Wrapper component for testing
const TestWrapper: React.FC<{
  schema: ComponentSchema;
  initialValues?: any;
  onSubmit?: (data: any) => void;
  children?: React.ReactNode;
}> = ({ schema, initialValues, onSubmit, children }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const methods = useForm({ defaultValues: initialValues });

  const handleSubmit = (data: any) => {
    onSubmit?.(data);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)}>
          <SchemaAwareForm schema={schema} />
          <button type="submit">Submit</button>
          {children}
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
};

describe('SchemaAwareForm - Multi-Select Fields', () => {
  const mockSchema: ComponentSchema = {
    id: 'schema-456',
    project_id: 'project-789',
    name: 'Test Schema',
    description: 'Test schema with multiselect',
    is_default: false,
    is_active: true,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    fields: [
      {
        id: 'field-multiselect',
        schema_id: 'schema-456',
        field_name: 'materials',
        label: 'Materials Used',
        field_type: 'multiselect',
        is_required: false,
        is_active: true,
        display_order: 0,
        field_config: {
          options: ['Steel', 'Aluminum', 'Concrete', 'Wood', 'Composite'],
          placeholder: 'Select materials...',
        },
        help_text: 'Select one or more materials',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
  };

  describe('FR-5 AC 22: Multi-select field renders with Material-UI Autocomplete', () => {
    it('should render multi-select field with correct label', () => {
      render(<TestWrapper schema={mockSchema} />);

      expect(screen.getByLabelText('Materials Used')).toBeInTheDocument();
    });

    it('should display all options from field_config', async () => {
      const user = userEvent.setup();
      render(<TestWrapper schema={mockSchema} />);

      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);

      await waitFor(() => {
        expect(screen.getByText('Steel')).toBeInTheDocument();
        expect(screen.getByText('Aluminum')).toBeInTheDocument();
        expect(screen.getByText('Concrete')).toBeInTheDocument();
        expect(screen.getByText('Wood')).toBeInTheDocument();
        expect(screen.getByText('Composite')).toBeInTheDocument();
      });
    });

    it('should support selecting multiple values', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TestWrapper schema={mockSchema} onSubmit={onSubmit} />);

      const autocomplete = screen.getByRole('combobox');

      // Select first option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Steel' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Steel' }));

      // Re-open listbox and select second option (listbox closes after each selection)
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Aluminum' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Aluminum' }));

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData.materials).toContain('Steel');
        expect(formData.materials).toContain('Aluminum');
      });
    });
  });

  describe('FR-5 AC 23: Default value handling', () => {
    it('should initialize with empty array when no default provided', async () => {
      const onSubmit = jest.fn();
      render(<TestWrapper schema={mockSchema} onSubmit={onSubmit} />);

      const submitButton = screen.getByText('Submit');
      submitButton.click();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData.materials).toEqual([]);
      });
    });

    it('should initialize with field_config.default_value if provided', async () => {
      const schemaWithDefault: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            field_config: {
              ...mockSchema.fields[0].field_config,
              default_value: ['Steel', 'Aluminum'],
            },
          },
        ],
      };

      render(<TestWrapper schema={schemaWithDefault} />);

      await waitFor(() => {
        expect(screen.getByText('Steel')).toBeInTheDocument();
        expect(screen.getByText('Aluminum')).toBeInTheDocument();
      });
    });
  });

  describe('FR-5 AC 24: Validation rules', () => {
    it('should validate required multi-select fields', async () => {
      const requiredSchema: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            is_required: true,
          },
        ],
      };

      const onSubmit = jest.fn();
      render(<TestWrapper schema={requiredSchema} onSubmit={onSubmit} />);

      const submitButton = screen.getByText('Submit');
      submitButton.click();

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should enforce minimum selection count if configured', async () => {
      const minSelectionSchema: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            field_config: {
              ...mockSchema.fields[0].field_config,
              validation: { min_selections: 2 },
            },
          },
        ],
      };

      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TestWrapper schema={minSelectionSchema} onSubmit={onSubmit} />);

      const autocomplete = screen.getByRole('combobox');

      // Select first option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Steel' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Steel' }));

      // Try to submit with only 1 selection (should fail validation)
      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 2 option/i)).toBeInTheDocument();
      });
    });

    it('should pass validation when selections are within constraints', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TestWrapper schema={mockSchema} onSubmit={onSubmit} />);

      const autocomplete = screen.getByRole('combobox');

      // Select first option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Steel' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Steel' }));

      // Re-open and select second option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Aluminum' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Aluminum' }));

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('FR-5 AC 25: User interaction workflows', () => {
    it('should allow removing selected values by clicking chip delete icon', async () => {
      const user = userEvent.setup();
      render(<TestWrapper schema={mockSchema} initialValues={{ materials: ['Steel', 'Aluminum'] }} />);

      expect(screen.getByText('Steel')).toBeInTheDocument();
      expect(screen.getByText('Aluminum')).toBeInTheDocument();

      const steelChipDelete = screen.getAllByTestId('CancelIcon')[0];
      await user.click(steelChipDelete);

      await waitFor(() => {
        expect(screen.queryByText('Steel')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Aluminum')).toBeInTheDocument();
    });

    it('should allow clearing all selections via clear button', async () => {
      const user = userEvent.setup();
      render(<TestWrapper schema={mockSchema} initialValues={{ materials: ['Steel', 'Aluminum'] }} />);

      const clearButton = screen.getByTitle('Clear');
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('Steel')).not.toBeInTheDocument();
        expect(screen.queryByText('Aluminum')).not.toBeInTheDocument();
      });
    });

    it('should support search/filter functionality', async () => {
      const user = userEvent.setup();
      render(<TestWrapper schema={mockSchema} />);

      const autocomplete = screen.getByRole('combobox');
      await user.type(autocomplete, 'al');

      await waitFor(() => {
        expect(screen.getByText('Aluminum')).toBeInTheDocument();
        expect(screen.queryByText('Steel')).not.toBeInTheDocument();
      });
    });
  });

  describe('FR-5 AC 26: Integration with form submission', () => {
    it('should submit array of selected values', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TestWrapper schema={mockSchema} onSubmit={onSubmit} />);

      const autocomplete = screen.getByRole('combobox');

      // Select first option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Steel' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Steel' }));

      // Re-open and select second option
      await user.click(autocomplete);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Concrete' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Concrete' }));

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData.materials).toEqual(['Steel', 'Concrete']);
      });
    });

    it('should submit empty array when no selections made', async () => {
      const onSubmit = jest.fn();
      render(<TestWrapper schema={mockSchema} onSubmit={onSubmit} />);

      const submitButton = screen.getByText('Submit');
      submitButton.click();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData.materials).toEqual([]);
      });
    });
  });

  describe('FR-5 AC 27: Edit mode with existing values', () => {
    it('should pre-populate multi-select with existing component data', async () => {
      render(<TestWrapper schema={mockSchema} initialValues={{ materials: ['Steel', 'Aluminum'] }} />);

      await waitFor(() => {
        expect(screen.getByText('Steel')).toBeInTheDocument();
        expect(screen.getByText('Aluminum')).toBeInTheDocument();
      });
    });

    it('should allow modifying pre-populated selections', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(
        <TestWrapper
          schema={mockSchema}
          initialValues={{ materials: ['Steel', 'Aluminum'] }}
          onSubmit={onSubmit}
        />
      );

      // Remove Steel chip
      const steelChipDelete = screen.getAllByTestId('CancelIcon')[0];
      await user.click(steelChipDelete);

      await waitFor(() => {
        expect(screen.queryByText('Steel')).not.toBeInTheDocument();
      });

      // Add Concrete
      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Concrete' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Concrete' }));

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData.materials).toEqual(['Aluminum', 'Concrete']);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty options array', () => {
      const emptyOptionsSchema: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            field_config: { options: [] },
          },
        ],
      };

      render(<TestWrapper schema={emptyOptionsSchema} />);

      expect(screen.getByLabelText('Materials Used')).toBeInTheDocument();
    });

    it('should handle missing field_config gracefully', () => {
      const noConfigSchema: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            field_config: {},
          },
        ],
      };

      render(<TestWrapper schema={noConfigSchema} />);

      expect(screen.getByLabelText('Materials Used')).toBeInTheDocument();
    });

    it('should display validation errors with correct accessibility attributes', async () => {
      const requiredSchema: ComponentSchema = {
        ...mockSchema,
        fields: [
          {
            ...mockSchema.fields[0],
            is_required: true,
          },
        ],
      };

      render(<TestWrapper schema={requiredSchema} />);

      const submitButton = screen.getByText('Submit');
      submitButton.click();

      await waitFor(() => {
        const errorMessage = screen.getByText(/required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});
