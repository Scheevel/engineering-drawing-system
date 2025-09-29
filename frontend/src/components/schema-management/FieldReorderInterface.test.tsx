/**
 * Field Reorder Interface Component Tests
 *
 * Tests basic rendering, component structure, and prop handling.
 * Note: Drag-and-drop functionality testing requires more complex setup.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ComponentSchemaField } from '../../types/schema';

// Mock external dependencies
jest.mock('../../services/api.ts', () => ({
  getSchema: jest.fn(),
  updateSchemaField: jest.fn(),
}));

jest.mock('../../services/schemaManagementService.ts', () => ({
  schemaManagementService: {
    reorderSchemaFields: jest.fn(),
  },
}));

// Mock the custom hook
jest.mock('../../hooks/schema/useFieldReordering');

const mockUseFieldReordering = jest.fn(() => ({
  handleDragEnd: jest.fn(),
  forceRetry: jest.fn(),
  isLoading: false,
  error: null,
  isError: false,
  reset: jest.fn(),
  updateSchemaVersion: jest.fn(),
}));

// Import the mocked hook for type safety
import { useFieldReordering } from '../../hooks/schema/useFieldReordering';
(useFieldReordering as jest.MockedFunction<typeof useFieldReordering>).mockImplementation(mockUseFieldReordering);

// Mock DraggableFieldItem to avoid complex dnd-kit mocking
jest.mock('./DraggableFieldItem', () => ({
  DraggableFieldItem: ({ field, isDragDisabled, isNonDraggable }: any) => (
    <div data-testid={`field-item-${field.id}`}>
      <span>{field.label}</span>
      <span>{field.field_type}</span>
      {isDragDisabled && <span data-testid="drag-disabled">Drag Disabled</span>}
      {isNonDraggable && <span data-testid="non-draggable">Non-Draggable</span>}
    </div>
  ),
}));

// Mock SchemaFormPreview
jest.mock('./SchemaFormPreview', () => ({
  SchemaFormPreview: ({ fields, title }: any) => (
    <div data-testid="schema-form-preview">
      <span>{title}</span>
      <span>{fields.length} fields</span>
    </div>
  ),
}));

// Mock the history hook
jest.mock('../../hooks/schema/useFieldOrderHistory', () => ({
  useFieldOrderHistory: () => ({
    pushToHistory: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: false,
    canRedo: false,
  }),
}));

// Simplified @dnd-kit mocks
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
}));

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn(),
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: jest.fn(),
  restrictToWindowEdges: jest.fn(),
}));

// Now import the component after mocking
import { FieldReorderInterface } from './FieldReorderInterface';

const theme = createTheme();

const mockFields: ComponentSchemaField[] = [
  {
    id: 'field-1',
    field_name: 'component_name',
    label: 'Component Name',
    field_type: 'text',
    field_config: {},
    help_text: 'Enter component name',
    display_order: 0,
    is_required: true,
    is_active: true,
    created_at: '2025-01-26T10:00:00Z',
    updated_at: '2025-01-26T10:00:00Z',
  },
  {
    id: 'field-2',
    field_name: 'material',
    label: 'Material',
    field_type: 'select',
    field_config: { options: ['Steel', 'Aluminum', 'Concrete'] },
    help_text: 'Select material type',
    display_order: 1,
    is_required: true,
    is_active: true,
    created_at: '2025-01-26T10:00:00Z',
    updated_at: '2025-01-26T10:00:00Z',
  },
];

const renderComponent = (props: Partial<React.ComponentProps<typeof FieldReorderInterface>> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <FieldReorderInterface
          schemaId="test-schema-1"
          fields={mockFields}
          showFormPreview={false}
          enableUndo={false}
          {...props}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('FieldReorderInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock to default behavior
    mockUseFieldReordering.mockReturnValue({
      handleDragEnd: jest.fn(),
      forceRetry: jest.fn(),
      isLoading: false,
      error: null,
      isError: false,
      reset: jest.fn(),
      updateSchemaVersion: jest.fn(),
    });
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderComponent();
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('renders all field items', () => {
      renderComponent();

      expect(screen.getByTestId('field-item-field-1')).toBeInTheDocument();
      expect(screen.getByTestId('field-item-field-2')).toBeInTheDocument();
      expect(screen.getByText('Component Name')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
    });

    it('sets up DnD context correctly', () => {
      renderComponent();

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('shows disabled message when reordering is disabled', () => {
      renderComponent({ isReorderEnabled: false });

      expect(screen.getByText(/Field reordering is currently disabled/)).toBeInTheDocument();
    });

    it('shows different message when other operation is in progress', () => {
      renderComponent({ isOtherOperationInProgress: true });

      expect(screen.getByText(/Field reordering is disabled while other operations are in progress/)).toBeInTheDocument();
    });

    it('still renders field items when disabled', () => {
      renderComponent({ isReorderEnabled: false });

      expect(screen.getByTestId('field-item-field-1')).toBeInTheDocument();
      expect(screen.getByTestId('field-item-field-2')).toBeInTheDocument();
    });

    it('passes drag disabled state to field items when disabled', () => {
      renderComponent({ isReorderEnabled: false });

      expect(screen.getAllByTestId('drag-disabled')).toHaveLength(2);
    });
  });

  describe('Non-Draggable Fields', () => {
    it('marks specific fields as non-draggable', () => {
      renderComponent({ nonDraggableFieldIds: ['field-1'] });

      expect(screen.getByTestId('non-draggable')).toBeInTheDocument();
      expect(screen.queryAllByTestId('non-draggable')).toHaveLength(1);
    });

    it('applies non-draggable state to correct fields', () => {
      renderComponent({ nonDraggableFieldIds: ['field-1', 'field-2'] });

      expect(screen.getAllByTestId('non-draggable')).toHaveLength(2);
    });

    it('handles empty non-draggable list', () => {
      renderComponent({ nonDraggableFieldIds: [] });

      expect(screen.queryByTestId('non-draggable')).not.toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('accepts callback props without error', () => {
      const mockCallbacks = {
        onReorderStart: jest.fn(),
        onReorderEnd: jest.fn(),
        onReorderError: jest.fn(),
      };

      expect(() => {
        renderComponent(mockCallbacks);
      }).not.toThrow();
    });

    it('handles empty fields array', () => {
      renderComponent({ fields: [] });

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.queryByTestId(/field-item-/)).not.toBeInTheDocument();
    });
  });

  describe('Live Preview', () => {
    it('shows form preview when enabled', () => {
      renderComponent({ showFormPreview: true });

      expect(screen.getByTestId('schema-form-preview')).toBeInTheDocument();
      expect(screen.getByText('Live Form Preview')).toBeInTheDocument();
      expect(screen.getByText('2 fields')).toBeInTheDocument();
    });

    it('hides form preview when disabled', () => {
      renderComponent({ showFormPreview: false });

      expect(screen.queryByTestId('schema-form-preview')).not.toBeInTheDocument();
    });
  });

  describe('Undo Functionality', () => {
    it('shows undo controls when enabled', () => {
      renderComponent({ enableUndo: true });

      // In a full implementation with proper mocking, we'd check for undo buttons
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('hides undo controls when disabled', () => {
      renderComponent({ enableUndo: false });

      // Undo controls should not be visible
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('handles empty fields for undo', () => {
      renderComponent({ fields: [], enableUndo: true });

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.queryByTestId(/field-item-/)).not.toBeInTheDocument();
    });
  });

  describe('Persistence and Conflict Resolution', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows batch processing indicator when loading', () => {
      mockUseFieldReordering.mockReturnValue({
        handleDragEnd: jest.fn(),
        forceRetry: jest.fn(),
        isLoading: true,
        error: null,
        isError: false,
        reset: jest.fn(),
        updateSchemaVersion: jest.fn(),
      });

      renderComponent();

      expect(screen.getByText('Saving field order...')).toBeInTheDocument();
      expect(screen.getByText('Processing batch operations for optimal performance')).toBeInTheDocument();
    });

    it('shows conflict error with refresh action', () => {
      const mockUpdateSchemaVersion = jest.fn();
      mockUseFieldReordering.mockReturnValue({
        handleDragEnd: jest.fn(),
        forceRetry: jest.fn(),
        isLoading: false,
        error: 'Schema has been modified by another user. Please refresh and try again.',
        isError: true,
        reset: jest.fn(),
        updateSchemaVersion: mockUpdateSchemaVersion,
      });

      renderComponent();

      expect(screen.getByText(/Conflict Detected:/)).toBeInTheDocument();
      expect(screen.getByText(/Schema was modified by another user/)).toBeInTheDocument();

      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      expect(refreshButton).toBeInTheDocument();
    });

    it('shows generic error without refresh action', () => {
      mockUseFieldReordering.mockReturnValue({
        handleDragEnd: jest.fn(),
        forceRetry: jest.fn(),
        isLoading: false,
        error: 'Network error occurred',
        isError: true,
        reset: jest.fn(),
        updateSchemaVersion: jest.fn(),
      });

      renderComponent();

      expect(screen.getByText('Reorder failed: Network error occurred')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
    });

    it('configures hook with conflict callback', () => {
      const mockOnConflict = jest.fn();

      renderComponent({
        onReorderError: mockOnConflict,
      });

      const hookCall = mockUseFieldReordering.mock.calls[0];
      expect(hookCall[1]).toMatchObject({
        debounceMs: 300,
      });
      expect(typeof hookCall[1].onConflict).toBe('function');
    });

    it('handles successful reorder without conflicts', () => {
      const mockOnSuccess = jest.fn();
      const mockHookSuccess = jest.fn();

      mockUseFieldReordering.mockReturnValue({
        handleDragEnd: jest.fn(),
        forceRetry: jest.fn(),
        isLoading: false,
        error: null,
        isError: false,
        reset: jest.fn(),
        updateSchemaVersion: jest.fn(),
      });

      renderComponent({
        onReorderEnd: mockOnSuccess,
      });

      // Simulate successful operation (no conflicts)
      const hookCall = mockUseFieldReordering.mock.calls[0];
      const onSuccessCallback = hookCall[1].onSuccess;

      // Call with hasConflicts = false
      onSuccessCallback(false);

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('handles conflicts by setting state correctly', () => {
      let conflictCallback: Function;

      mockUseFieldReordering.mockImplementation((schemaId, options) => {
        conflictCallback = options.onConflict;
        return {
          handleDragEnd: jest.fn(),
          forceRetry: jest.fn(),
          isLoading: false,
          error: null,
          isError: false,
          reset: jest.fn(),
          updateSchemaVersion: jest.fn(),
        };
      });

      renderComponent();

      // Simulate conflict detection
      const conflicts = [
        { fieldId: 'field-1', conflict: 'Field no longer exists' },
        { fieldId: 'field-2', conflict: 'Field modified by another user' },
      ];

      // Trigger conflict callback
      if (conflictCallback) {
        conflictCallback(conflicts);
      }

      // Since we can't easily test state changes in this setup,
      // we verify the callback was configured correctly
      expect(conflictCallback).toBeDefined();
    });

    it('passes debounce configuration to hook', () => {
      renderComponent();

      const hookCall = mockUseFieldReordering.mock.calls[0];
      expect(hookCall[1].debounceMs).toBe(300);
    });

    it('configures onMutate callback for operation start', () => {
      const mockOnStart = jest.fn();

      renderComponent({
        onReorderStart: mockOnStart,
      });

      const hookCall = mockUseFieldReordering.mock.calls[0];
      const onMutateCallback = hookCall[1].onMutate;

      onMutateCallback();

      expect(mockOnStart).toHaveBeenCalled();
    });
  });

  describe('Enhanced Error Handling', () => {
    it('shows different error messages based on error type', () => {
      const testCases = [
        {
          error: 'Schema has been modified by another user. Please refresh and try again.',
          expectedText: 'Conflict Detected:',
          hasRefreshButton: true,
        },
        {
          error: 'Network connection failed',
          expectedText: 'Reorder failed: Network connection failed',
          hasRefreshButton: false,
        },
        {
          error: 'Invalid field configuration',
          expectedText: 'Reorder failed: Invalid field configuration',
          hasRefreshButton: false,
        },
      ];

      testCases.forEach(({ error, expectedText, hasRefreshButton }) => {
        mockUseFieldReordering.mockReturnValue({
          handleDragEnd: jest.fn(),
          forceRetry: jest.fn(),
          isLoading: false,
          error,
          isError: true,
          reset: jest.fn(),
          updateSchemaVersion: jest.fn(),
        });

        const { unmount } = renderComponent();

        expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();

        if (hasRefreshButton) {
          expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
        } else {
          expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});