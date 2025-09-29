/**
 * Schema Cache Service
 *
 * Client-side caching implementation for schema data with TTL,
 * invalidation strategies, and performance optimization.
 */

import { ComponentSchema, ComponentSchemaField } from './api';
import { getCurrentConfig } from '../config/schemaConfig.ts';
import { useCallback, useEffect, useState } from 'react';

// ========================================
// TYPES AND INTERFACES
// ========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  totalSize: number;
  hitRate: number;
}

type CacheKey = string;
type SchemaCache = Map<CacheKey, CacheEntry<any>>;

// ========================================
// CACHE IMPLEMENTATION
// ========================================

class SchemaCacheManager {
  private cache: SchemaCache = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    totalSize: 0,
    hitRate: 0,
  };

  private readonly config = getCurrentConfig();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(prefix: string, ...params: (string | number | boolean)[]): CacheKey {
    return `${prefix}:${params.join(':')}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get item from cache
   */
  private get<T>(key: CacheKey): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.entries--;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set item in cache
   */
  private set<T>(key: CacheKey, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.performance.cacheTTLMs;

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.entries--;
    }

    // Check cache size limit
    if (this.cache.size >= this.config.performance.maxCacheSize) {
      this.evictLeastUsed();
    }

    // Add new entry
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now,
    });

    this.stats.entries++;
    this.updateStats();
  }

  /**
   * Remove least recently used entries
   */
  private evictLeastUsed(): void {
    if (this.cache.size === 0) return;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      // Sort by access count first, then by last accessed time
      if (a[1].accessCount !== b[1].accessCount) {
        return a[1].accessCount - b[1].accessCount;
      }
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    // Remove oldest 25% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.25));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.stats.entries--;
    }
  }

  /**
   * Update cache statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateStats(): void {
    this.stats.totalSize = this.cache.size;
    this.updateHitRate();
  }

  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    const cleanupInterval = Math.max(60000, this.config.performance.cacheTTLMs / 4); // Every 25% of TTL or 1 minute

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: CacheKey[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.stats.entries--;
    });

    this.updateStats();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Schema Cache] Cleanup: Removed ${expiredKeys.length} expired entries`);
    }
  }

  // ========================================
  // PUBLIC CACHE METHODS
  // ========================================

  /**
   * Cache schemas list
   */
  public cacheSchemas(schemas: ComponentSchema[], filters?: Record<string, any>): void {
    const key = this.generateKey('schemas', JSON.stringify(filters || {}));
    this.set(key, schemas);
  }

  /**
   * Get cached schemas list
   */
  public getCachedSchemas(filters?: Record<string, any>): ComponentSchema[] | null {
    const key = this.generateKey('schemas', JSON.stringify(filters || {}));
    return this.get<ComponentSchema[]>(key);
  }

  /**
   * Cache individual schema
   */
  public cacheSchema(schema: ComponentSchema): void {
    const key = this.generateKey('schema', schema.id);
    this.set(key, schema);
  }

  /**
   * Get cached schema
   */
  public getCachedSchema(schemaId: string): ComponentSchema | null {
    const key = this.generateKey('schema', schemaId);
    return this.get<ComponentSchema>(key);
  }

  /**
   * Cache schema fields
   */
  public cacheSchemaFields(schemaId: string, fields: ComponentSchemaField[]): void {
    const key = this.generateKey('schema-fields', schemaId);
    this.set(key, fields);
  }

  /**
   * Get cached schema fields
   */
  public getCachedSchemaFields(schemaId: string): ComponentSchemaField[] | null {
    const key = this.generateKey('schema-fields', schemaId);
    return this.get<ComponentSchemaField[]>(key);
  }

  /**
   * Cache field templates or presets
   */
  public cacheFieldTemplates(templates: any[]): void {
    const key = this.generateKey('field-templates');
    this.set(key, templates);
  }

  /**
   * Get cached field templates
   */
  public getCachedFieldTemplates(): any[] | null {
    const key = this.generateKey('field-templates');
    return this.get<any[]>(key);
  }

  /**
   * Cache validation results
   */
  public cacheValidationResult(schemaId: string, fieldData: any, result: any): void {
    const dataHash = JSON.stringify(fieldData);
    const key = this.generateKey('validation', schemaId, dataHash);
    // Shorter TTL for validation results
    this.set(key, result, Math.min(30000, this.config.performance.cacheTTLMs)); // 30 seconds max
  }

  /**
   * Get cached validation result
   */
  public getCachedValidationResult(schemaId: string, fieldData: any): any | null {
    const dataHash = JSON.stringify(fieldData);
    const key = this.generateKey('validation', schemaId, dataHash);
    return this.get<any>(key);
  }

  // ========================================
  // CACHE MANAGEMENT
  // ========================================

  /**
   * Invalidate schema cache
   */
  public invalidateSchema(schemaId: string): void {
    const keysToRemove: CacheKey[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(`schema:${schemaId}`) ||
          key.includes(`schema-fields:${schemaId}`) ||
          key.includes(`validation:${schemaId}`) ||
          key.startsWith('schemas:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.stats.entries--;
    });

    this.updateStats();
  }

  /**
   * Invalidate all schemas cache
   */
  public invalidateAllSchemas(): void {
    const keysToRemove: CacheKey[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith('schema') || key.startsWith('validation')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.stats.entries--;
    });

    this.updateStats();
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      totalSize: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size information
   */
  public getCacheInfo(): {
    entries: number;
    maxSize: number;
    utilizationPercent: number;
    avgAccessCount: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);

    return {
      entries: this.cache.size,
      maxSize: this.config.performance.maxCacheSize,
      utilizationPercent: (this.cache.size / this.config.performance.maxCacheSize) * 100,
      avgAccessCount: entries.length > 0 ? totalAccess / entries.length : 0,
    };
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

const schemaCacheManager = new SchemaCacheManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    schemaCacheManager.destroy();
  });
}

export default schemaCacheManager;

// ========================================
// REACT HOOK FOR CACHE USAGE
// ========================================

export const useSchemaCache = () => {
  const [stats, setStats] = useState(schemaCacheManager.getStats());

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(schemaCacheManager.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const cacheOperations = {
    // Schema operations
    cacheSchemas: schemaCacheManager.cacheSchemas.bind(schemaCacheManager),
    getCachedSchemas: schemaCacheManager.getCachedSchemas.bind(schemaCacheManager),
    cacheSchema: schemaCacheManager.cacheSchema.bind(schemaCacheManager),
    getCachedSchema: schemaCacheManager.getCachedSchema.bind(schemaCacheManager),

    // Field operations
    cacheSchemaFields: schemaCacheManager.cacheSchemaFields.bind(schemaCacheManager),
    getCachedSchemaFields: schemaCacheManager.getCachedSchemaFields.bind(schemaCacheManager),
    cacheFieldTemplates: schemaCacheManager.cacheFieldTemplates.bind(schemaCacheManager),
    getCachedFieldTemplates: schemaCacheManager.getCachedFieldTemplates.bind(schemaCacheManager),

    // Validation operations
    cacheValidationResult: schemaCacheManager.cacheValidationResult.bind(schemaCacheManager),
    getCachedValidationResult: schemaCacheManager.getCachedValidationResult.bind(schemaCacheManager),

    // Cache management
    invalidateSchema: schemaCacheManager.invalidateSchema.bind(schemaCacheManager),
    invalidateAllSchemas: schemaCacheManager.invalidateAllSchemas.bind(schemaCacheManager),
    clear: schemaCacheManager.clear.bind(schemaCacheManager),
  };

  const getCacheInfo = useCallback(() => {
    return schemaCacheManager.getCacheInfo();
  }, []);

  return {
    ...cacheOperations,
    stats,
    getCacheInfo,
  };
};

export { schemaCacheManager };