// Mock axios before importing the api module
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  return {
    create: jest.fn(() => mockInstance),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };
});

import { getProjectSchemas, DEFAULT_SCHEMA } from '../api';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Schema Fallback Logic', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock instance created by axios.create
    mockAxiosInstance = (mockedAxios.create as jest.Mock)();
  });

  // Test ID: 3.12-INT-001 - Schema service returns default on empty
  it('should return default schema when no user schemas exist', async () => {
    // Mock API response with empty schemas
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        schemas: [],
        total: 0,
        project_id: 'test-project'
      }
    });

    const result = await getProjectSchemas('test-project');

    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0]).toEqual(DEFAULT_SCHEMA);
    expect(result.total).toBe(1);
    expect(result.project_id).toBe('test-project');
  });

  // Test ID: 3.12-UNIT-004 - Schema service prioritizes custom schemas
  it('should return custom schemas when they exist (custom takes precedence)', async () => {
    const customSchema = {
      id: 'custom-1',
      name: 'Custom Schema',
      description: 'User-created schema',
      version: 1,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: []
    };

    // Mock API response with custom schemas
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        schemas: [customSchema],
        total: 1,
        project_id: 'test-project'
      }
    });

    const result = await getProjectSchemas('test-project');

    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0]).toEqual(customSchema);
    expect(result.schemas[0].is_default).toBe(false);
    expect(result.total).toBe(1);
  });

  // Test ID: 3.12-INT-005 - Default disappears when custom created
  it('should transition from default to custom schema when custom is created', async () => {
    const customSchema = {
      id: 'custom-1',
      name: 'New Custom Schema',
      description: 'Newly created schema',
      version: 1,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fields: []
    };

    // First call - no schemas (should return default)
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        schemas: [],
        total: 0,
        project_id: 'test-project'
      }
    });

    const emptyResult = await getProjectSchemas('test-project');
    expect(emptyResult.schemas[0]).toEqual(DEFAULT_SCHEMA);

    // Second call - custom schema exists (should return custom, no default)
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        schemas: [customSchema],
        total: 1,
        project_id: 'test-project'
      }
    });

    const customResult = await getProjectSchemas('test-project');
    expect(customResult.schemas).toHaveLength(1);
    expect(customResult.schemas[0]).toEqual(customSchema);
    expect(customResult.schemas[0].is_default).toBe(false);
  });

  // Test for API failure fallback
  it('should return default schema when API fails (backend unavailable)', async () => {
    // Mock API failure
    mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

    // Mock console.warn to verify fallback behavior
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await getProjectSchemas('test-project');

    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0]).toEqual(DEFAULT_SCHEMA);
    expect(result.total).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Schema API unavailable, using default schema:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should include project_id in fallback response', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        schemas: [],
        total: 0,
        project_id: 'test-project'
      }
    });

    const result = await getProjectSchemas('test-project-123');
    expect(result.project_id).toBe('test-project-123');
  });

  it('should pass includeGlobal parameter to API', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        schemas: [],
        total: 0,
        project_id: 'test-project'
      }
    });

    await getProjectSchemas('test-project', false);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/schemas/projects/test-project?include_global=false');
  });
});