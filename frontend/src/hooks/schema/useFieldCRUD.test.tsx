/**
 * Test: useFieldCRUD Hook
 *
 * Tests field CRUD operations with React Query integration, optimistic updates, and error handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactNode } from 'react';
import '@testing-library/jest-dom';
import { useFieldCRUD, FieldUsageInfo } from './useFieldCRUD';
import { ComponentSchemaField, ComponentSchemaFieldCreate, ComponentSchemaFieldUpdate } from '../../services/api';
import * as api from '../../services/api';

// Mock the API module
jest.mock('../../services/api', () => ({
  addSchemaField: jest.fn(),
  updateSchemaField: jest.fn(),
  removeSchemaField: jest.fn(),
  toggleFieldActive: jest.fn(),
}));

// Mock the validation hook
jest.mock('./useFieldValidation', () => ({
  useFieldValidation: () => ({
    validateField: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    validateFieldDeletion: jest.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  }),
}));

const mockAddSchemaField = api.addSchemaField as jest.MockedFunction<typeof api.addSchemaField>;
const mockUpdateSchemaField = api.updateSchemaField as jest.MockedFunction<typeof api.updateSchemaField>;
const mockRemoveSchemaField = api.removeSchemaField as jest.MockedFunction<typeof api.removeSchemaField>;
const mockToggleFieldActive = api.toggleFieldActive as jest.MockedFunction<typeof api.toggleFieldActive>;

const mockExistingFields: ComponentSchemaField[] = [
  {
    id: 'field1',
    field_name: 'Existing Field',
    field_type: 'text',
    field_config: { placeholder: 'Enter text', maxLength: 255 },
    help_text: 'This field exists',
    display_order: 1,
    is_required: true,
    is_active: true,
  },
  {
    id: 'field2',
    field_name: 'Another Field',
    field_type: 'number',
    field_config: { min: 0, max: 100 },
    help_text: 'Number field',
    display_order: 2,
    is_required: false,
    is_active: true,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Pre-populate query client with test data
  queryClient.setQueryData(['schemaFields', 'schema1'], mockExistingFields);

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFieldCRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createField', () => {
    test('creates field successfully', async () => {
      const mockCreatedField: ComponentSchemaField = {
        id: 'field3',
        field_name: 'New Field',
        field_type: 'text',
        field_config: { placeholder: 'Enter text' },
        help_text: 'New field',
        display_order: 3,
        is_required: false,
        is_active: true,
      };

      mockAddSchemaField.mockResolvedValue(mockCreatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: 'New Field',
        field_type: 'text',
        field_config: { placeholder: 'Enter text' },
        help_text: 'New field',
        is_required: false,
      };

      const onSuccess = jest.fn();

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
        options: { onSuccess },
      });

      await waitFor(() => {
        expect(result.current.createField.isSuccess).toBe(true);
      });

      expect(mockAddSchemaField).toHaveBeenCalledWith('schema1', fieldData);
      expect(onSuccess).toHaveBeenCalledWith(mockCreatedField);
    });

    test('handles validation errors during creation', async () => {
      // Mock the validation hook to return validation errors
      jest.doMock('./useFieldValidation', () => ({
        useFieldValidation: () => ({
          validateField: jest.fn(() => ({
            isValid: false,
            errors: [{ field: 'field_name', message: 'Name is required', code: 'REQUIRED' }],
            warnings: [],
          })),
          validateFieldDeletion: jest.fn(),
        }),
      }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: '',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      const onError = jest.fn();

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
        options: { onError },
      });

      await waitFor(() => {
        expect(result.current.createField.isError).toBe(true);
      });

      expect(mockAddSchemaField).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    test('performs optimistic updates during creation', async () => {
      const mockCreatedField: ComponentSchemaField = {
        id: 'field3',
        field_name: 'New Field',
        field_type: 'text',
        field_config: {},
        help_text: '',
        display_order: 3,
        is_required: false,
        is_active: true,
      };

      mockAddSchemaField.mockResolvedValue(mockCreatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: 'New Field',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
        options: { optimisticUpdate: true },
      });

      // Optimistic update should happen immediately
      expect(result.current.createField.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.createField.isSuccess).toBe(true);
      });
    });

    test('skips validation when requested', async () => {
      const mockCreatedField: ComponentSchemaField = {
        id: 'field3',
        field_name: 'New Field',
        field_type: 'text',
        field_config: {},
        help_text: '',
        display_order: 3,
        is_required: false,
        is_active: true,
      };

      mockAddSchemaField.mockResolvedValue(mockCreatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: '',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
        options: { skipValidation: true },
      });

      await waitFor(() => {
        expect(result.current.createField.isSuccess).toBe(true);
      });

      expect(mockAddSchemaField).toHaveBeenCalled();
    });
  });

  describe('updateField', () => {
    test('updates field successfully', async () => {
      const mockUpdatedField: ComponentSchemaField = {
        ...mockExistingFields[0],
        field_name: 'Updated Field Name',
      };

      mockUpdateSchemaField.mockResolvedValue(mockUpdatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const updates: ComponentSchemaFieldUpdate = {
        field_name: 'Updated Field Name',
      };

      const onSuccess = jest.fn();

      result.current.updateField.mutate({
        fieldId: 'field1',
        updates,
        existingFields: mockExistingFields,
        options: { onSuccess },
      });

      await waitFor(() => {
        expect(result.current.updateField.isSuccess).toBe(true);
      });

      expect(mockUpdateSchemaField).toHaveBeenCalledWith('field1', updates);
      expect(onSuccess).toHaveBeenCalledWith(mockUpdatedField);
    });

    test('handles field not found error during update', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const updates: ComponentSchemaFieldUpdate = {
        field_name: 'Updated Name',
      };

      const onError = jest.fn();

      result.current.updateField.mutate({
        fieldId: 'nonexistent',
        updates,
        existingFields: mockExistingFields,
        options: { onError },
      });

      await waitFor(() => {
        expect(result.current.updateField.isError).toBe(true);
      });

      expect(mockUpdateSchemaField).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    test('performs optimistic updates during field update', async () => {
      const mockUpdatedField: ComponentSchemaField = {
        ...mockExistingFields[0],
        field_name: 'Updated Field Name',
      };

      mockUpdateSchemaField.mockResolvedValue(mockUpdatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const updates: ComponentSchemaFieldUpdate = {
        field_name: 'Updated Field Name',
      };

      result.current.updateField.mutate({
        fieldId: 'field1',
        updates,
        existingFields: mockExistingFields,
        options: { optimisticUpdate: true },
      });

      expect(result.current.updateField.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.updateField.isSuccess).toBe(true);
      });
    });
  });

  describe('deleteField', () => {
    test('performs soft delete successfully', async () => {
      const mockDeactivatedField: ComponentSchemaField = {
        ...mockExistingFields[0],
        is_active: false,
      };

      mockToggleFieldActive.mockResolvedValue(mockDeactivatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const usageInfo: FieldUsageInfo = {
        componentCount: 2,
        componentNames: ['Component A', 'Component B'],
        hasRequiredUsage: false,
        canSafelyDelete: true,
        warnings: [],
      };

      const onSuccess = jest.fn();

      result.current.deleteField.mutate({
        fieldId: 'field1',
        deleteType: 'soft',
        usageInfo,
        options: { onSuccess },
      });

      await waitFor(() => {
        expect(result.current.deleteField.isSuccess).toBe(true);
      });

      expect(mockToggleFieldActive).toHaveBeenCalledWith('field1', false);
      expect(onSuccess).toHaveBeenCalled();
    });

    test('performs hard delete successfully', async () => {
      mockRemoveSchemaField.mockResolvedValue();

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const usageInfo: FieldUsageInfo = {
        componentCount: 0,
        componentNames: [],
        hasRequiredUsage: false,
        canSafelyDelete: true,
        warnings: [],
      };

      const onSuccess = jest.fn();

      result.current.deleteField.mutate({
        fieldId: 'field1',
        deleteType: 'hard',
        usageInfo,
        options: { onSuccess },
      });

      await waitFor(() => {
        expect(result.current.deleteField.isSuccess).toBe(true);
      });

      expect(mockRemoveSchemaField).toHaveBeenCalledWith('field1');
      expect(onSuccess).toHaveBeenCalled();
    });

    test('prevents hard delete of required fields', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const usageInfo: FieldUsageInfo = {
        componentCount: 3,
        componentNames: ['Component A', 'Component B', 'Component C'],
        hasRequiredUsage: true,
        canSafelyDelete: false,
        warnings: [],
      };

      const onError = jest.fn();

      result.current.deleteField.mutate({
        fieldId: 'field1',
        deleteType: 'hard',
        usageInfo,
        options: { onError },
      });

      await waitFor(() => {
        expect(result.current.deleteField.isError).toBe(true);
      });

      expect(mockRemoveSchemaField).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    test('allows hard delete with skipValidation', async () => {
      mockRemoveSchemaField.mockResolvedValue();

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const usageInfo: FieldUsageInfo = {
        componentCount: 3,
        componentNames: ['Component A', 'Component B', 'Component C'],
        hasRequiredUsage: true,
        canSafelyDelete: false,
        warnings: [],
      };

      result.current.deleteField.mutate({
        fieldId: 'field1',
        deleteType: 'hard',
        usageInfo,
        options: { skipValidation: true },
      });

      await waitFor(() => {
        expect(result.current.deleteField.isSuccess).toBe(true);
      });

      expect(mockRemoveSchemaField).toHaveBeenCalledWith('field1');
    });
  });

  describe('toggleFieldActive', () => {
    test('toggles field active status successfully', async () => {
      const mockToggledField: ComponentSchemaField = {
        ...mockExistingFields[0],
        is_active: false,
      };

      mockToggleFieldActive.mockResolvedValue(mockToggledField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const onSuccess = jest.fn();

      result.current.toggleFieldActive.mutate({
        fieldId: 'field1',
        isActive: false,
        options: { onSuccess },
      });

      await waitFor(() => {
        expect(result.current.toggleFieldActive.isSuccess).toBe(true);
      });

      expect(mockToggleFieldActive).toHaveBeenCalledWith('field1', false);
      expect(onSuccess).toHaveBeenCalledWith(mockToggledField);
    });

    test('handles API errors during toggle', async () => {
      mockToggleFieldActive.mockRejectedValue(new Error('API Error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const onError = jest.fn();

      result.current.toggleFieldActive.mutate({
        fieldId: 'field1',
        isActive: false,
        options: { onError },
      });

      await waitFor(() => {
        expect(result.current.toggleFieldActive.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalled();
    });

    test('performs optimistic updates during toggle', async () => {
      const mockToggledField: ComponentSchemaField = {
        ...mockExistingFields[0],
        is_active: false,
      };

      mockToggleFieldActive.mockResolvedValue(mockToggledField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      result.current.toggleFieldActive.mutate({
        fieldId: 'field1',
        isActive: false,
        options: { optimisticUpdate: true },
      });

      expect(result.current.toggleFieldActive.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.toggleFieldActive.isSuccess).toBe(true);
      });
    });
  });

  describe('validateFieldForOperation', () => {
    test('validates field for operation', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const field: Partial<ComponentSchemaField> = {
        field_name: 'Test Field',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      const validation = result.current.validateFieldForOperation(field, mockExistingFields);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('validates field with exclude options', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const field: Partial<ComponentSchemaField> = {
        field_name: 'Existing Field',
        field_type: 'text',
      };

      const validation = result.current.validateFieldForOperation(field, mockExistingFields, {
        excludeFieldId: 'field1',
      });

      expect(validation.isValid).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    test('handles network errors gracefully', async () => {
      mockAddSchemaField.mockRejectedValue(new Error('Network Error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: 'New Field',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      const onError = jest.fn();

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
        options: { onError },
      });

      await waitFor(() => {
        expect(result.current.createField.isError).toBe(true);
      });

      expect(result.current.createField.error?.message).toBe('Network Error');
      expect(onError).toHaveBeenCalled();
    });

    test('handles malformed API responses', async () => {
      // @ts-ignore - testing malformed response
      mockAddSchemaField.mockResolvedValue(null);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: 'New Field',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: mockExistingFields,
      });

      await waitFor(() => {
        expect(result.current.createField.isSuccess).toBe(true);
      });

      // Should not crash even with malformed response
      expect(result.current.createField.data).toBeNull();
    });

    test('handles empty existing fields array', async () => {
      const mockCreatedField: ComponentSchemaField = {
        id: 'field1',
        field_name: 'First Field',
        field_type: 'text',
        field_config: {},
        help_text: '',
        display_order: 1,
        is_required: false,
        is_active: true,
      };

      mockAddSchemaField.mockResolvedValue(mockCreatedField);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useFieldCRUD(), { wrapper });

      const fieldData: ComponentSchemaFieldCreate = {
        field_name: 'First Field',
        field_type: 'text',
        field_config: {},
        is_required: false,
      };

      result.current.createField.mutate({
        schemaId: 'schema1',
        fieldData,
        existingFields: [],
      });

      await waitFor(() => {
        expect(result.current.createField.isSuccess).toBe(true);
      });

      expect(mockAddSchemaField).toHaveBeenCalled();
    });
  });
});