/**
 * Schema Cache Service Tests
 *
 * Comprehensive tests for client-side caching functionality including
 * TTL management, LRU eviction, and performance validation.
 */

import { schemaCacheManager, useSchemaCache } from './schemaCacheService';
import { ComponentSchema, ComponentSchemaField } from './api';
import { getCurrentConfig } from '../config/schemaConfig';
import { renderHook, act } from '@testing-library/react';

// Mock the configuration
jest.mock('../config/schemaConfig', () => ({
  getCurrentConfig: jest.fn(() => ({
    performance: {
      cacheTTLMs: 5000, // 5 seconds for testing
      maxCacheSize: 5,
      enableVirtualScrolling: true,
      virtualScrollThreshold: 10,
      debounceDelayMs: 100,
    },
  })),
}));

describe('SchemaCacheManager', () => {
  beforeEach(() => {
    schemaCacheManager.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    schemaCacheManager.clear();
  });

  describe('Basic Caching Operations', () => {
    it('should cache and retrieve schemas', () => {
      const mockSchema: ComponentSchema = {
        id: 'test-schema-1',
        name: 'Test Schema',
        description: 'A test schema',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema);
      const retrieved = schemaCacheManager.getCachedSchema('test-schema-1');

      expect(retrieved).toEqual(mockSchema);
    });

    it('should cache and retrieve schema lists with filters', () => {
      const mockSchemas: ComponentSchema[] = [
        {
          id: 'schema-1',
          name: 'Schema 1',
          description: 'First schema',
          fields: [],
          is_active: true,
          is_default: false,
          project_id: 'project-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'schema-2',
          name: 'Schema 2',
          description: 'Second schema',
          fields: [],
          is_active: true,
          is_default: true,
          project_id: 'project-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const filters = { projectId: 'project-1', includeGlobal: true };
      schemaCacheManager.cacheSchemas(mockSchemas, filters);
      const retrieved = schemaCacheManager.getCachedSchemas(filters);

      expect(retrieved).toEqual(mockSchemas);
      expect(retrieved).toHaveLength(2);
    });

    it('should cache and retrieve schema fields', () => {
      const mockFields: ComponentSchemaField[] = [
        {
          id: 'field-1',
          field_name: 'Test Field',
          field_type: 'text',
          is_required: true,
          display_order: 1,
          field_config: { placeholder: 'Enter text' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      schemaCacheManager.cacheSchemaFields('schema-1', mockFields);
      const retrieved = schemaCacheManager.getCachedSchemaFields('schema-1');

      expect(retrieved).toEqual(mockFields);
    });

    it('should return null for non-existent cache entries', () => {
      const result = schemaCacheManager.getCachedSchema('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire cache entries after TTL', async () => {
      const mockSchema: ComponentSchema = {
        id: 'test-schema-ttl',
        name: 'TTL Test Schema',
        description: 'Schema for TTL testing',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema);

      // Verify it's cached
      expect(schemaCacheManager.getCachedSchema('test-schema-ttl')).toEqual(mockSchema);

      // Wait for TTL to expire (5 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Should return null after expiration
      expect(schemaCacheManager.getCachedSchema('test-schema-ttl')).toBeNull();
    });

    it('should update access statistics on cache hits', () => {
      const mockSchema: ComponentSchema = {
        id: 'access-test',
        name: 'Access Test Schema',
        description: 'Schema for access testing',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema);

      // Multiple accesses
      schemaCacheManager.getCachedSchema('access-test');
      schemaCacheManager.getCachedSchema('access-test');
      schemaCacheManager.getCachedSchema('access-test');

      const stats = schemaCacheManager.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      // Fill cache to capacity (5 entries)
      for (let i = 1; i <= 6; i++) {
        const mockSchema: ComponentSchema = {
          id: `schema-${i}`,
          name: `Schema ${i}`,
          description: `Schema ${i} description`,
          fields: [],
          is_active: true,
          is_default: false,
          project_id: 'project-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        schemaCacheManager.cacheSchema(mockSchema);
      }

      // First schema should be evicted (LRU)
      expect(schemaCacheManager.getCachedSchema('schema-1')).toBeNull();

      // Most recent schemas should still be cached
      expect(schemaCacheManager.getCachedSchema('schema-6')).toBeTruthy();
      expect(schemaCacheManager.getCachedSchema('schema-5')).toBeTruthy();

      const info = schemaCacheManager.getCacheInfo();
      expect(info.entries).toBeLessThanOrEqual(5); // Within max cache size
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific schema cache', () => {
      const mockSchema: ComponentSchema = {
        id: 'invalidate-test',
        name: 'Invalidate Test Schema',
        description: 'Schema for invalidation testing',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema);
      schemaCacheManager.cacheSchemaFields('invalidate-test', []);

      // Verify cache is populated
      expect(schemaCacheManager.getCachedSchema('invalidate-test')).toBeTruthy();
      expect(schemaCacheManager.getCachedSchemaFields('invalidate-test')).toBeTruthy();

      // Invalidate schema
      schemaCacheManager.invalidateSchema('invalidate-test');

      // Verify cache is cleared
      expect(schemaCacheManager.getCachedSchema('invalidate-test')).toBeNull();
      expect(schemaCacheManager.getCachedSchemaFields('invalidate-test')).toBeNull();
    });

    it('should invalidate all schema caches', () => {
      const mockSchema1: ComponentSchema = {
        id: 'schema-all-1',
        name: 'Schema All 1',
        description: 'First schema for all invalidation',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSchema2: ComponentSchema = {
        id: 'schema-all-2',
        name: 'Schema All 2',
        description: 'Second schema for all invalidation',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema1);
      schemaCacheManager.cacheSchema(mockSchema2);

      // Verify caches are populated
      expect(schemaCacheManager.getCachedSchema('schema-all-1')).toBeTruthy();
      expect(schemaCacheManager.getCachedSchema('schema-all-2')).toBeTruthy();

      // Invalidate all
      schemaCacheManager.invalidateAllSchemas();

      // Verify all caches are cleared
      expect(schemaCacheManager.getCachedSchema('schema-all-1')).toBeNull();
      expect(schemaCacheManager.getCachedSchema('schema-all-2')).toBeNull();
    });
  });

  describe('Validation Result Caching', () => {
    it('should cache and retrieve validation results with short TTL', () => {
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const testData = { field1: 'value1', field2: 42 };

      schemaCacheManager.cacheValidationResult('schema-1', testData, mockValidationResult);
      const retrieved = schemaCacheManager.getCachedValidationResult('schema-1', testData);

      expect(retrieved).toEqual(mockValidationResult);
    });

    it('should use different cache keys for different field data', () => {
      const mockValidationResult1 = { isValid: true, errors: [] };
      const mockValidationResult2 = { isValid: false, errors: ['Required field missing'] };

      const testData1 = { field1: 'value1' };
      const testData2 = { field1: 'value2' };

      schemaCacheManager.cacheValidationResult('schema-1', testData1, mockValidationResult1);
      schemaCacheManager.cacheValidationResult('schema-1', testData2, mockValidationResult2);

      expect(schemaCacheManager.getCachedValidationResult('schema-1', testData1)).toEqual(mockValidationResult1);
      expect(schemaCacheManager.getCachedValidationResult('schema-1', testData2)).toEqual(mockValidationResult2);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics accurately', () => {
      const initialStats = schemaCacheManager.getStats();
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);

      // Cache miss
      schemaCacheManager.getCachedSchema('non-existent');

      // Cache hit
      const mockSchema: ComponentSchema = {
        id: 'stats-test',
        name: 'Stats Test Schema',
        description: 'Schema for stats testing',
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      schemaCacheManager.cacheSchema(mockSchema);
      schemaCacheManager.getCachedSchema('stats-test');

      const finalStats = schemaCacheManager.getStats();
      expect(finalStats.misses).toBe(1);
      expect(finalStats.hits).toBe(1);
      expect(finalStats.hitRate).toBe(0.5);
    });

    it('should provide cache info', () => {
      const info = schemaCacheManager.getCacheInfo();

      expect(info).toHaveProperty('entries');
      expect(info).toHaveProperty('maxSize');
      expect(info).toHaveProperty('utilizationPercent');
      expect(info).toHaveProperty('avgAccessCount');

      expect(info.maxSize).toBe(5); // From mock config
      expect(info.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(info.utilizationPercent).toBeLessThanOrEqual(100);
    });
  });
});

describe('useSchemaCache Hook', () => {
  beforeEach(() => {
    schemaCacheManager.clear();
  });

  it('should provide cache operations', () => {
    const { result } = renderHook(() => useSchemaCache());

    expect(result.current.cacheSchema).toBeDefined();
    expect(result.current.getCachedSchema).toBeDefined();
    expect(result.current.cacheSchemas).toBeDefined();
    expect(result.current.getCachedSchemas).toBeDefined();
    expect(result.current.invalidateSchema).toBeDefined();
    expect(result.current.clear).toBeDefined();
  });

  it('should provide cache statistics', () => {
    const { result } = renderHook(() => useSchemaCache());

    expect(result.current.stats).toBeDefined();
    expect(result.current.getCacheInfo).toBeDefined();

    const info = result.current.getCacheInfo();
    expect(info).toHaveProperty('entries');
    expect(info).toHaveProperty('maxSize');
  });

  it('should work with cache operations through hook', () => {
    const { result } = renderHook(() => useSchemaCache());

    const mockSchema: ComponentSchema = {
      id: 'hook-test',
      name: 'Hook Test Schema',
      description: 'Schema for hook testing',
      fields: [],
      is_active: true,
      is_default: false,
      project_id: 'project-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.cacheSchema(mockSchema);
    });

    const retrieved = result.current.getCachedSchema('hook-test');
    expect(retrieved).toEqual(mockSchema);
  });
});

describe('Performance Tests', () => {
  beforeEach(() => {
    schemaCacheManager.clear();
  });

  it('should handle large cache operations efficiently', () => {
    const startTime = performance.now();

    // Cache 100 schemas
    for (let i = 0; i < 100; i++) {
      const mockSchema: ComponentSchema = {
        id: `perf-schema-${i}`,
        name: `Performance Schema ${i}`,
        description: `Performance test schema ${i}`,
        fields: [],
        is_active: true,
        is_default: false,
        project_id: 'project-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      schemaCacheManager.cacheSchema(mockSchema);
    }

    const cacheTime = performance.now() - startTime;
    expect(cacheTime).toBeLessThan(1000); // Should complete within 1 second

    // Test retrieval performance
    const retrievalStart = performance.now();
    for (let i = 0; i < 50; i++) {
      schemaCacheManager.getCachedSchema(`perf-schema-${i}`);
    }
    const retrievalTime = performance.now() - retrievalStart;
    expect(retrievalTime).toBeLessThan(100); // Should complete within 100ms
  });

  it('should maintain performance under cache pressure', () => {
    // Fill cache beyond capacity multiple times
    for (let batch = 0; batch < 10; batch++) {
      for (let i = 0; i < 20; i++) {
        const mockSchema: ComponentSchema = {
          id: `pressure-schema-${batch}-${i}`,
          name: `Pressure Schema ${batch}-${i}`,
          description: `Pressure test schema ${batch}-${i}`,
          fields: [],
          is_active: true,
          is_default: false,
          project_id: 'project-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        schemaCacheManager.cacheSchema(mockSchema);
      }
    }

    const info = schemaCacheManager.getCacheInfo();
    expect(info.entries).toBeLessThanOrEqual(info.maxSize);
    expect(info.utilizationPercent).toBeLessThanOrEqual(100);
  });
});