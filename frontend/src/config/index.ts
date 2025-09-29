/**
 * Configuration Module Exports
 *
 * Centralized exports for all configuration modules including
 * schema configuration, query client setup, and feature flags.
 */

// Schema configuration
export {
  default as schemaConfigManager,
  useSchemaConfig,
  defaultSchemaConfig,
  type SchemaFeatureConfig,
} from './schemaConfig';

// React Query configuration
export {
  default as createSchemaQueryClient,
  BackgroundRefetchManager,
  NetworkOptimizer,
  defaultSchemaConfig as defaultQueryConfig,
  type SchemaQueryConfig,
} from './schemaQueryClient';