/**
 * Mock implementation for schemaQueries.ts
 *
 * Provides properly structured React Query mocks for all schema-related hooks
 * to prevent test infrastructure failures.
 */

const mockSchemaUsageStats = [
  {
    schema_id: 'schema-1',
    schema_name: 'Test Schema',
    component_count: 5,
    last_used: '2025-01-28T10:00:00Z',
    created_at: '2025-01-01T10:00:00Z',
    is_active: true,
    is_default: false,
  },
  {
    schema_id: 'schema-2',
    schema_name: 'Default Schema',
    component_count: 12,
    last_used: '2025-01-27T15:30:00Z',
    created_at: '2024-12-01T10:00:00Z',
    is_active: true,
    is_default: true,
  },
];

const mockSchema = {
  id: 'schema-1',
  name: 'Test Schema',
  description: 'A test schema for unit testing',
  version: '1.0.0',
  is_active: true,
  is_default: false,
  project_id: 'test-project-123',
  fields: [
    { id: 'field-1', name: 'Field 1', type: 'text', required: true },
    { id: 'field-2', name: 'Field 2', type: 'number', required: false },
  ],
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
};

const mockSchemaMetrics = {
  total_schemas: 3,
  active_schemas: 2,
  default_schemas: 1,
  total_components: 17,
  schemas_with_components: 2,
  avg_components_per_schema: 8.5,
};

// Create default React Query return structure
const createQueryResult = (data: any, options: any = {}) => ({
  data,
  isLoading: options.isLoading || false,
  isError: options.isError || false,
  error: options.error || null,
  refetch: jest.fn(),
  ...options,
});

const createMutationResult = (options: any = {}) => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  isLoading: options.isLoading || false,
  isError: options.isError || false,
  error: options.error || null,
  reset: jest.fn(),
  ...options,
});

export const useProjectSchemas = jest.fn(() =>
  createQueryResult({
    schemas: [mockSchema],
    total: 1,
    page: 1,
    per_page: 10,
  })
);

export const useSchema = jest.fn(() => createQueryResult(mockSchema));

export const useProjectDefaultSchema = jest.fn(() => createQueryResult(mockSchema));

export const useGlobalDefaultSchema = jest.fn(() => createQueryResult(null));

export const useSchemaUsageStats = jest.fn(() => createQueryResult(mockSchemaUsageStats));

export const useSchemaMetrics = jest.fn(() => createQueryResult(mockSchemaMetrics));

export const useComponentsBySchema = jest.fn(() => createQueryResult([]));

export const useCreateSchema = jest.fn(() => createMutationResult());

export const useUpdateSchema = jest.fn(() => createMutationResult());

export const useDeactivateSchema = jest.fn(() => createMutationResult());

export const useSetDefaultSchema = jest.fn(() => createMutationResult());

export const useUnsetDefaultSchema = jest.fn(() => createMutationResult());

export const useAddSchemaField = jest.fn(() => createMutationResult());

export const useUpdateSchemaField = jest.fn(() => createMutationResult());

export const useRemoveSchemaField = jest.fn(() => createMutationResult());

export const useValidateDataAgainstSchema = jest.fn(() => createMutationResult());

export const useValidateComponentAgainstSchema = jest.fn(() => createMutationResult());

// Query key factory (needed for cache invalidation in tests)
export const schemaQueryKeys = {
  all: ['schemas'] as const,
  lists: () => ['schemas', 'list'] as const,
  list: (projectId: string, includeGlobal?: boolean) =>
    ['schemas', 'list', { projectId, includeGlobal }] as const,
  details: () => ['schemas', 'detail'] as const,
  detail: (id: string) => ['schemas', 'detail', id] as const,
  defaults: () => ['schemas', 'defaults'] as const,
  projectDefault: (projectId: string) => ['schemas', 'defaults', 'project', projectId] as const,
  globalDefault: () => ['schemas', 'defaults', 'global'] as const,
  usage: () => ['schemas', 'usage'] as const,
  usageStats: (projectId: string) => ['schemas', 'usage', 'stats', projectId] as const,
  metrics: (projectId?: string) => ['schemas', 'usage', 'metrics', projectId] as const,
  components: () => ['schemas', 'components'] as const,
  componentsBySchema: (schemaId: string) => ['schemas', 'components', 'by-schema', schemaId] as const,
  validation: () => ['schemas', 'validation'] as const,
  validationResult: (schemaId: string, data: Record<string, any>) =>
    ['schemas', 'validation', 'result', schemaId, data] as const,
};

// Utility functions for tests
export const resetAllMocks = () => {
  Object.values(module.exports).forEach((mockFn) => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockClear();
    }
  });
};

export const setMockData = {
  schemaUsageStats: (data: any) => {
    useSchemaUsageStats.mockReturnValue(createQueryResult(data));
  },
  schema: (data: any) => {
    useSchema.mockReturnValue(createQueryResult(data));
  },
  projectSchemas: (data: any) => {
    useProjectSchemas.mockReturnValue(createQueryResult(data));
  },
  loading: (hookName: string) => {
    const hooks = {
      useSchemaUsageStats,
      useSchema,
      useProjectSchemas,
      useSchemaMetrics,
    };
    const hook = hooks[hookName as keyof typeof hooks];
    if (hook) {
      hook.mockReturnValue(createQueryResult(null, { isLoading: true }));
    }
  },
  error: (hookName: string, error: any) => {
    const hooks = {
      useSchemaUsageStats,
      useSchema,
      useProjectSchemas,
      useSchemaMetrics,
    };
    const hook = hooks[hookName as keyof typeof hooks];
    if (hook) {
      hook.mockReturnValue(createQueryResult(null, { isError: true, error }));
    }
  },
};