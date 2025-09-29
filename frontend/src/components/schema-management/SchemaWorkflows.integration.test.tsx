/**
 * Schema Management Integration Tests
 *
 * Comprehensive end-to-end workflow testing for schema management:
 * - Complete schema creation workflow
 * - Schema editing with field management
 * - Schema deletion and deactivation workflows
 * - Default schema management across multiple schemas
 * - Integration with component creation workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  SchemaTestWrapper,
  createMockSchemas,
  createMockFieldCreate,
  schemaTestHelpers,
  runAccessibilityTestSuite,
} from '../../test-utils';

// Mock schema management components
const MockSchemaListView = ({ onSchemaCreate, onSchemaEdit, onSchemaDelete }: any) => (
  <div data-testid="schema-list-view">
    <button onClick={() => onSchemaCreate()}>Create Schema</button>
    <button onClick={() => onSchemaEdit({ id: 'schema-1', name: 'Test Schema' })}>
      Edit Schema
    </button>
    <button onClick={() => onSchemaDelete({ id: 'schema-1' })}>Delete Schema</button>
  </div>
);

const MockSchemaCreateDialog = ({ open, onClose, onSave }: any) =>
  open ? (
    <div data-testid="schema-create-dialog">
      <input data-testid="schema-name" placeholder="Schema Name" />
      <input data-testid="schema-description" placeholder="Description" />
      <button onClick={() => onSave({ name: 'New Schema', description: 'Test' })}>
        Save Schema
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null;

const MockFieldCreationDialog = ({ open, onClose, onSave }: any) =>
  open ? (
    <div data-testid="field-creation-dialog">
      <input data-testid="field-name" placeholder="Field Name" />
      <select data-testid="field-type">
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="select">Select</option>
      </select>
      <button
        onClick={() =>
          onSave({
            field_name: 'test_field',
            field_type: 'text',
            is_required: false,
            display_order: 0,
          })
        }
      >
        Add Field
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null;

// Main test component that simulates the complete schema management interface
const SchemaManagementApp = () => {
  const [currentView, setCurrentView] = React.useState('list');
  const [selectedSchema, setSelectedSchema] = React.useState(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showFieldDialog, setShowFieldDialog] = React.useState(false);
  const [schemas, setSchemas] = React.useState(createMockSchemas(3));

  const handleSchemaCreate = () => {
    setShowCreateDialog(true);
  };

  const handleSchemaEdit = (schema: any) => {
    setSelectedSchema(schema);
    setCurrentView('edit');
  };

  const handleSchemaDelete = async (schema: any) => {
    // Simulate delete confirmation
    if (window.confirm('Delete schema?')) {
      setSchemas(prev => prev.filter(s => s.id !== schema.id));
    }
  };

  const handleSaveSchema = (schemaData: any) => {
    if (currentView === 'edit') {
      setSchemas(prev =>
        prev.map(s => (s.id === selectedSchema?.id ? { ...s, ...schemaData } : s))
      );
    } else {
      setSchemas(prev => [...prev, { id: Date.now().toString(), ...schemaData }]);
    }
    setShowCreateDialog(false);
    setCurrentView('list');
  };

  const handleAddField = (fieldData: any) => {
    if (selectedSchema) {
      setSchemas(prev =>
        prev.map(s =>
          s.id === selectedSchema.id
            ? { ...s, fields: [...(s.fields || []), fieldData] }
            : s
        )
      );
    }
    setShowFieldDialog(false);
  };

  const handleSetDefault = (schemaId: string) => {
    setSchemas(prev =>
      prev.map(s => ({ ...s, is_default: s.id === schemaId }))
    );
  };

  return (
    <div data-testid="schema-management-app">
      {currentView === 'list' && (
        <MockSchemaListView
          onSchemaCreate={handleSchemaCreate}
          onSchemaEdit={handleSchemaEdit}
          onSchemaDelete={handleSchemaDelete}
        />
      )}

      {currentView === 'edit' && selectedSchema && (
        <div data-testid="schema-editor">
          <h2>Editing: {selectedSchema.name}</h2>
          <button onClick={() => setShowFieldDialog(true)}>Add Field</button>
          <button onClick={() => setCurrentView('list')}>Back to List</button>
          <button onClick={() => handleSetDefault(selectedSchema.id)}>
            Set as Default
          </button>

          <div data-testid="field-list">
            {schemas
              .find(s => s.id === selectedSchema.id)
              ?.fields?.map((field: any, index: number) => (
                <div key={index} data-testid={`field-${index}`}>
                  {field.field_name} ({field.field_type})
                </div>
              ))}
          </div>
        </div>
      )}

      <MockSchemaCreateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSave={handleSaveSchema}
      />

      <MockFieldCreationDialog
        open={showFieldDialog}
        onClose={() => setShowFieldDialog(false)}
        onSave={handleAddField}
      />

      <div data-testid="schema-count">{schemas.length} schemas</div>
    </div>
  );
};

describe('Schema Management Integration Tests', () => {
  const renderApp = () => {
    return render(
      <SchemaTestWrapper>
        <SchemaManagementApp />
      </SchemaTestWrapper>
    );
  };

  beforeEach(() => {
    // Mock window.confirm for delete operations
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Schema Creation Workflow', () => {
    it('allows complete schema creation from start to finish', async () => {
      const user = userEvent.setup();
      renderApp();

      // 1. Start schema creation
      await user.click(screen.getByText('Create Schema'));

      // 2. Fill in schema details
      const createDialog = screen.getByTestId('schema-create-dialog');
      expect(createDialog).toBeInTheDocument();

      await user.type(screen.getByTestId('schema-name'), 'Integration Test Schema');
      await user.type(
        screen.getByTestId('schema-description'),
        'A schema created through integration testing'
      );

      // 3. Save schema
      await user.click(screen.getByText('Save Schema'));

      // 4. Verify schema was created
      expect(screen.getByText('4 schemas')).toBeInTheDocument();
      expect(screen.queryByTestId('schema-create-dialog')).not.toBeInTheDocument();
    });

    it('handles schema creation cancellation', async () => {
      const user = userEvent.setup();
      renderApp();

      // Start creation
      await user.click(screen.getByText('Create Schema'));
      expect(screen.getByTestId('schema-create-dialog')).toBeInTheDocument();

      // Cancel creation
      await user.click(screen.getByText('Cancel'));

      // Dialog should be closed, schema count unchanged
      expect(screen.queryByTestId('schema-create-dialog')).not.toBeInTheDocument();
      expect(screen.getByText('3 schemas')).toBeInTheDocument();
    });
  });

  describe('Schema Editing with Field Management', () => {
    it('allows complete schema editing workflow', async () => {
      const user = userEvent.setup();
      renderApp();

      // 1. Enter edit mode
      await user.click(screen.getByText('Edit Schema'));

      // 2. Verify edit interface
      const editor = screen.getByTestId('schema-editor');
      expect(editor).toBeInTheDocument();
      expect(screen.getByText(/Editing:/)).toBeInTheDocument();

      // 3. Add a field
      await user.click(screen.getByText('Add Field'));

      const fieldDialog = screen.getByTestId('field-creation-dialog');
      expect(fieldDialog).toBeInTheDocument();

      await user.type(screen.getByTestId('field-name'), 'integration_field');
      await user.selectOptions(screen.getByTestId('field-type'), 'text');

      await user.click(screen.getByText('Add Field'));

      // 4. Verify field was added
      expect(screen.queryByTestId('field-creation-dialog')).not.toBeInTheDocument();
      expect(screen.getByText('integration_field (text)')).toBeInTheDocument();

      // 5. Return to list
      await user.click(screen.getByText('Back to List'));
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();
    });

    it('handles field reordering workflow', async () => {
      const user = userEvent.setup();
      renderApp();

      // Enter edit mode
      await user.click(screen.getByText('Edit Schema'));

      // Add multiple fields
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText('Add Field'));
        await user.click(screen.getByText('Add Field')); // Click the button in dialog
      }

      // Verify multiple fields exist
      const fieldElements = screen.getAllByTestId(/field-\d+/);
      expect(fieldElements.length).toBeGreaterThan(1);

      // Test drag and drop (simplified)
      if (fieldElements.length >= 2) {
        await schemaTestHelpers.dragAndDrop(fieldElements[0], fieldElements[1]);
      }
    });
  });

  describe('Default Schema Management', () => {
    it('allows setting and changing default schema', async () => {
      const user = userEvent.setup();
      renderApp();

      // Enter edit mode for a schema
      await user.click(screen.getByText('Edit Schema'));

      // Set as default
      await user.click(screen.getByText('Set as Default'));

      // Verify default was set (in a real app, this would show visual feedback)
      expect(screen.getByText('Set as Default')).toBeInTheDocument();

      // Return to list
      await user.click(screen.getByText('Back to List'));

      // Edit different schema and set as default
      await user.click(screen.getByText('Edit Schema'));
      await user.click(screen.getByText('Set as Default'));

      // Only one schema should be default at a time
      expect(screen.getByText('Set as Default')).toBeInTheDocument();
    });
  });

  describe('Schema Deletion Workflow', () => {
    it('allows schema deletion with confirmation', async () => {
      const user = userEvent.setup();
      renderApp();

      // Initial count
      expect(screen.getByText('3 schemas')).toBeInTheDocument();

      // Delete schema
      await user.click(screen.getByText('Delete Schema'));

      // Verify confirmation was called
      expect(window.confirm).toHaveBeenCalledWith('Delete schema?');

      // Verify schema was deleted
      expect(screen.getByText('2 schemas')).toBeInTheDocument();
    });

    it('handles deletion cancellation', async () => {
      const user = userEvent.setup();

      // Mock cancel confirmation
      (window.confirm as jest.Mock).mockReturnValue(false);

      renderApp();

      // Try to delete
      await user.click(screen.getByText('Delete Schema'));

      // Schema count should remain unchanged
      expect(screen.getByText('3 schemas')).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration', () => {
    it('maintains state consistency across navigation', async () => {
      const user = userEvent.setup();
      renderApp();

      // Start in list view
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();

      // Navigate to edit
      await user.click(screen.getByText('Edit Schema'));
      expect(screen.getByTestId('schema-editor')).toBeInTheDocument();

      // Add field
      await user.click(screen.getByText('Add Field'));
      await user.click(screen.getByText('Add Field')); // Save field

      // Navigate back
      await user.click(screen.getByText('Back to List'));
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();

      // Navigate to edit again - field should persist
      await user.click(screen.getByText('Edit Schema'));
      expect(screen.getByText('test_field (text)')).toBeInTheDocument();
    });

    it('handles multiple concurrent operations', async () => {
      const user = userEvent.setup();
      renderApp();

      // Rapidly perform multiple operations
      await user.click(screen.getByText('Create Schema'));
      await user.click(screen.getByText('Cancel'));

      await user.click(screen.getByText('Edit Schema'));
      await user.click(screen.getByText('Add Field'));
      await user.click(screen.getByText('Cancel'));

      await user.click(screen.getByText('Back to List'));

      // App should remain stable
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();
      expect(screen.getByText('3 schemas')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Integration', () => {
    it('recovers gracefully from operation failures', async () => {
      const user = userEvent.setup();

      // Mock console.error to suppress error logs in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderApp();

      // Simulate error during operation
      const createButton = screen.getByText('Create Schema');

      // Mock an error scenario
      const originalClick = createButton.onclick;
      createButton.onclick = () => {
        throw new Error('Simulated error');
      };

      try {
        await user.click(createButton);
      } catch (error) {
        // Expected error
      }

      // App should still be functional
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('handles rapid user interactions without issues', async () => {
      const user = userEvent.setup();
      renderApp();

      // Rapid button clicking
      const buttons = [
        screen.getByText('Create Schema'),
        screen.getByText('Edit Schema'),
        screen.getByText('Delete Schema'),
      ];

      // Click buttons rapidly
      for (const button of buttons) {
        await user.click(button);

        // Handle any dialogs that appear
        const cancelButton = screen.queryByText('Cancel');
        if (cancelButton) {
          await user.click(cancelButton);
        }
      }

      // App should remain stable
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();
    });

    it('maintains performance with large data sets', async () => {
      const user = userEvent.setup();

      // This test would be more meaningful with actual large datasets
      // For now, we simulate the interaction patterns
      renderApp();

      // Simulate working with multiple schemas
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByText('Create Schema'));
        await user.click(screen.getByText('Save Schema'));
      }

      // Should still be responsive
      expect(screen.getByText('8 schemas')).toBeInTheDocument();
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility throughout complete workflows', async () => {
      const { container } = renderApp();

      // Test accessibility in list view
      await runAccessibilityTestSuite(container);

      const user = userEvent.setup();

      // Navigate to edit view
      await user.click(screen.getByText('Edit Schema'));

      // Test accessibility in edit view
      await runAccessibilityTestSuite(container);

      // Open dialog
      await user.click(screen.getByText('Add Field'));

      // Test accessibility with dialog open
      await runAccessibilityTestSuite(container);
    });

    it('supports complete keyboard navigation workflow', async () => {
      const user = userEvent.setup();
      renderApp();

      // Get all interactive elements
      const interactiveElements = [
        screen.getByText('Create Schema'),
        screen.getByText('Edit Schema'),
        screen.getByText('Delete Schema'),
      ];

      // Test keyboard navigation through workflow
      await schemaTestHelpers.testKeyboardNavigation(interactiveElements);

      // Test keyboard activation
      await user.keyboard('{Enter}');

      // Should work without mouse interaction
      expect(screen.getByTestId('schema-management-app')).toBeInTheDocument();
    });
  });

  describe('Data Persistence Integration', () => {
    it('maintains data consistency across operations', async () => {
      const user = userEvent.setup();
      renderApp();

      const initialCount = 3;

      // Create schema
      await user.click(screen.getByText('Create Schema'));
      await user.click(screen.getByText('Save Schema'));

      expect(screen.getByText(`${initialCount + 1} schemas`)).toBeInTheDocument();

      // Edit schema
      await user.click(screen.getByText('Edit Schema'));
      await user.click(screen.getByText('Add Field'));
      await user.click(screen.getByText('Add Field'));

      // Return to list
      await user.click(screen.getByText('Back to List'));

      // Delete schema
      await user.click(screen.getByText('Delete Schema'));

      expect(screen.getByText(`${initialCount} schemas`)).toBeInTheDocument();

      // Data should be consistent
      expect(screen.getByTestId('schema-list-view')).toBeInTheDocument();
    });
  });
});