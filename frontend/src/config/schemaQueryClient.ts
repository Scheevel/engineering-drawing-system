/**
 * Enhanced Query Client Configuration for Schema Management
 *
 * Provides optimized React Query configuration with intelligent caching,
 * error recovery, background refetching, and performance optimizations
 * specifically designed for schema management operations.
 */

import { QueryClient, QueryCache, MutationCache } from 'react-query';

// ========================================
// CONFIGURATION INTERFACES
// ========================================

export interface SchemaQueryConfig {
  // Cache timing
  staleTime: number;
  cacheTime: number;

  // Refetch behavior
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  refetchInterval: number | false;

  // Error handling
  retryAttempts: number;
  retryDelay: (attemptIndex: number) => number;

  // Background updates
  backgroundRefetchInterval: number;
  networkOptimizations: boolean;

  // Performance
  maxCacheSize: number;
  enableDevtools: boolean;
}

// ========================================
// DEFAULT CONFIGURATION
// ========================================

const defaultSchemaConfig: SchemaQueryConfig = {
  // Cache timing - optimized for schema editing workflows
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes

  // Refetch behavior
  refetchOnWindowFocus: false, // Prevent excessive refetches during editing
  refetchOnReconnect: true,
  refetchInterval: false, // Use background refetch instead

  // Error handling with exponential backoff
  retryAttempts: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

  // Background updates
  backgroundRefetchInterval: 30000, // 30 seconds
  networkOptimizations: true,

  // Performance
  maxCacheSize: 100, // Max cached queries
  enableDevtools: process.env.NODE_ENV === 'development',
};

// ========================================
// INTELLIGENT CACHE INVALIDATION
// ========================================

class SchemaQueryCache extends QueryCache {
  constructor() {
    super({
      onError: (error, query) => {
        console.error(`Query ${query.queryHash} failed:`, error);

        // Automatic error recovery for network errors
        if (this.isNetworkError(error)) {
          this.scheduleRecoveryRefetch(query.queryKey, 5000);
        }
      },

      onSuccess: (data, query) => {
        // Intelligent cache invalidation based on data relationships
        this.invalidateRelatedQueries(query.queryKey, data);
      },
    });
  }

  private isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' ||
           error?.message?.includes('fetch') ||
           error?.status >= 500;
  }

  private scheduleRecoveryRefetch(queryKey: any[], delay: number) {
    setTimeout(() => {
      this.invalidateQueries(queryKey);
    }, delay);
  }

  private invalidateRelatedQueries(queryKey: any[], data: any) {
    const [resource, identifier] = queryKey;

    switch (resource) {
      case 'schema':
        // When a schema changes, invalidate:
        // - Schema lists
        // - Related component queries
        // - Field-specific queries
        this.invalidateQueries(['schemas']);
        this.invalidateQueries(['schema-usage']);

        if (identifier && data) {
          // Invalidate component queries for this schema
          this.invalidateQueries(['components', 'bySchema', identifier]);

          // Invalidate field queries
          this.invalidateQueries(['schema-fields', identifier]);
        }
        break;

      case 'schemas':
        // When schema list changes, preserve individual schema caches
        // but invalidate aggregated data
        this.invalidateQueries(['schema-metrics']);
        this.invalidateQueries(['schema-usage']);
        break;

      case 'schema-field':
        // When a field changes, invalidate parent schema
        if (queryKey[1]) {
          this.invalidateQueries(['schema', queryKey[1]]);
          this.invalidateQueries(['schema-fields', queryKey[1]]);
        }
        break;

      case 'components':
        // When components change, potentially invalidate schema usage stats
        this.invalidateQueries(['schema-usage']);
        break;
    }
  }
}

// ========================================
// INTELLIGENT MUTATION CACHE
// ========================================

class SchemaMutationCache extends MutationCache {
  constructor() {
    super({
      onError: (error, variables, context, mutation) => {
        console.error(`Mutation ${mutation.options.mutationKey} failed:`, error);

        // Automatic retry for certain types of failures
        if (this.shouldRetryMutation(error, mutation)) {
          this.retryMutation(mutation, 2000);
        }
      },

      onSuccess: (data, variables, context, mutation) => {
        // Trigger related query invalidations
        this.handleMutationSuccess(mutation, data);
      },
    });
  }

  private shouldRetryMutation(error: any, mutation: any): boolean {
    // Retry network errors and 5xx errors, but not 4xx errors
    return (error?.status >= 500 || this.isNetworkError(error)) &&
           mutation.state.failureCount < 2;
  }

  private isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' ||
           error?.message?.includes('fetch');
  }

  private retryMutation(mutation: any, delay: number) {
    setTimeout(() => {
      mutation.continue();
    }, delay);
  }

  private handleMutationSuccess(mutation: any, data: any) {
    const mutationKey = mutation.options.mutationKey;

    if (Array.isArray(mutationKey)) {
      const [operation, resource] = mutationKey;

      switch (operation) {
        case 'create':
        case 'update':
        case 'delete':
          // Invalidate list queries for the resource
          this.getQueryCache().invalidateQueries([resource + 's']);

          // Invalidate specific resource if it exists
          if (data?.id) {
            this.getQueryCache().invalidateQueries([resource, data.id]);
          }
          break;
      }
    }
  }

  private getQueryCache() {
    // Access to query cache for invalidation
    return this.getDefaultOptions().queryCache || new QueryCache();
  }
}

// ========================================
// NETWORK-AWARE OPTIMIZATIONS
// ========================================

class NetworkOptimizer {
  private connection: any;
  private isSlowConnection: boolean = false;

  constructor() {
    // Use Network Information API if available
    this.connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

    if (this.connection) {
      this.updateConnectionStatus();
      this.connection.addEventListener('change', this.updateConnectionStatus.bind(this));
    }
  }

  private updateConnectionStatus() {
    if (!this.connection) return;

    const { effectiveType, downlink } = this.connection;

    // Consider slow connection: 2G, slow 3G, or low bandwidth
    this.isSlowConnection = effectiveType === '2g' ||
                           effectiveType === 'slow-2g' ||
                           (downlink && downlink < 1.5);
  }

  getOptimizedConfig(): Partial<SchemaQueryConfig> {
    if (this.isSlowConnection) {
      return {
        staleTime: 10 * 60 * 1000, // 10 minutes - longer cache on slow connections
        refetchInterval: false, // Disable automatic refetching
        backgroundRefetchInterval: 60000, // 1 minute - less frequent background updates
        retryAttempts: 2, // Fewer retries
      };
    }

    return {
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefetchInterval: 30000, // 30 seconds
      retryAttempts: 3,
    };
  }

  isSlowNetwork(): boolean {
    return this.isSlowConnection;
  }
}

// ========================================
// ENHANCED QUERY CLIENT FACTORY
// ========================================

export const createSchemaQueryClient = (customConfig?: Partial<SchemaQueryConfig>): QueryClient => {
  const config = { ...defaultSchemaConfig, ...customConfig };
  const networkOptimizer = new NetworkOptimizer();

  // Apply network optimizations if enabled
  const finalConfig = config.networkOptimizations
    ? { ...config, ...networkOptimizer.getOptimizedConfig() }
    : config;

  const queryCache = new SchemaQueryCache();
  const mutationCache = new SchemaMutationCache();

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: finalConfig.staleTime,
        cacheTime: finalConfig.cacheTime,
        refetchOnWindowFocus: finalConfig.refetchOnWindowFocus,
        refetchOnReconnect: finalConfig.refetchOnReconnect,
        refetchInterval: finalConfig.refetchInterval,
        retry: (failureCount, error: any) => {
          // Custom retry logic
          if (error?.status >= 400 && error?.status < 500) {
            // Don't retry 4xx errors
            return false;
          }

          return failureCount < finalConfig.retryAttempts;
        },
        retryDelay: finalConfig.retryDelay,

        // Performance optimizations
        keepPreviousData: true, // Keep previous data while fetching new data
        notifyOnChangeProps: 'tracked', // Only re-render when tracked props change
      },

      mutations: {
        retry: false, // Don't retry mutations by default (handle in optimistic updates)
        onError: (error) => {
          console.error('Schema mutation failed:', error);

          // Global error handling for mutations
          if (error instanceof Error) {
            // You could integrate with a toast notification system here
            console.error('Mutation error:', error.message);
          }
        },
      },
    },
  });
};

// ========================================
// BACKGROUND REFETCH MANAGER
// ========================================

export class BackgroundRefetchManager {
  private queryClient: QueryClient;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isDocumentVisible: boolean = true;
  private networkOptimizer: NetworkOptimizer;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.networkOptimizer = new NetworkOptimizer();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleVisibilityChange() {
    this.isDocumentVisible = document.visibilityState === 'visible';

    if (this.isDocumentVisible) {
      // Resume background refetching when document becomes visible
      this.resumeBackgroundRefetch();
    } else {
      // Pause background refetching when document is hidden
      this.pauseBackgroundRefetch();
    }
  }

  startBackgroundRefetch(queryKey: string[], intervalMs: number) {
    const key = JSON.stringify(queryKey);

    // Clear existing interval
    this.stopBackgroundRefetch(queryKey);

    // Adjust interval based on network conditions
    const adjustedInterval = this.networkOptimizer.isSlowNetwork()
      ? intervalMs * 2
      : intervalMs;

    const interval = setInterval(() => {
      if (this.isDocumentVisible) {
        // Check if data is stale before refetching
        const query = this.queryClient.getQueryCache().find(queryKey);
        if (query && query.isStale()) {
          this.queryClient.invalidateQueries(queryKey);
        }
      }
    }, adjustedInterval);

    this.intervals.set(key, interval);
  }

  stopBackgroundRefetch(queryKey: string[]) {
    const key = JSON.stringify(queryKey);
    const interval = this.intervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }
  }

  private pauseBackgroundRefetch() {
    // Pause all intervals without clearing them
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
  }

  private resumeBackgroundRefetch() {
    // Resume all intervals
    this.intervals.forEach((_, key) => {
      const queryKey = JSON.parse(key);
      // Restart the interval (this is a simplified implementation)
      this.startBackgroundRefetch(queryKey, 30000); // Default interval
    });
  }

  destroy() {
    // Clean up all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}

// ========================================
// EXPORTS
// ========================================

export default createSchemaQueryClient;
export { defaultSchemaConfig, NetworkOptimizer };
export type { SchemaQueryConfig };