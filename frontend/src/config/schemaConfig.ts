/**
 * Schema Management Configuration
 *
 * Centralized configuration for schema management performance settings,
 * validation rules, and optimization parameters.
 */

import { createContext, useContext } from 'react';

// ========================================
// CONFIGURATION INTERFACES
// ========================================

export interface PerformanceConfig {
  // Debouncing
  enableDebouncing: boolean;
  debounceDelayMs: number;

  // Virtual scrolling
  enableVirtualScrolling: boolean;
  virtualScrollThreshold: number;
  virtualScrollOverscan: number;

  // Batch operations
  batchSize: number;
  batchDelayMs: number;

  // Caching
  cacheEnabled: boolean;
  cacheTTLMs: number;
  maxCacheSize: number;

  // Lazy loading
  lazyLoadingEnabled: boolean;
  preloadThreshold: number;
}

export interface ValidationConfig {
  // Real-time validation
  enableRealTimeValidation: boolean;
  validationDebounceMs: number;

  // Field limits
  maxFieldsPerSchema: number;
  maxFieldNameLength: number;
  maxDescriptionLength: number;

  // Performance thresholds
  complexValidationThresholdMs: number;
  realTimeUpdateThresholdMs: number;
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface UIConfig {
  // Animation
  enableAnimations: boolean;
  animationDuration: number;

  // Compact mode
  compactMode: boolean;

  // Field display
  defaultFieldHeight: number;
  maxVisibleFields: number;

  // Tooltips
  tooltipDelay: number;
  enableTooltips: boolean;
}

export interface SchemaConfig {
  performance: PerformanceConfig;
  validation: ValidationConfig;
  autoSave: AutoSaveConfig;
  ui: UIConfig;
}

// ========================================
// DEFAULT CONFIGURATION
// ========================================

export const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
  performance: {
    enableDebouncing: true,
    debounceDelayMs: 300,

    enableVirtualScrolling: true,
    virtualScrollThreshold: 50,
    virtualScrollOverscan: 5,

    batchSize: 10,
    batchDelayMs: 100,

    cacheEnabled: true,
    cacheTTLMs: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 100,

    lazyLoadingEnabled: true,
    preloadThreshold: 3,
  },

  validation: {
    enableRealTimeValidation: true,
    validationDebounceMs: 500,

    maxFieldsPerSchema: 100,
    maxFieldNameLength: 100,
    maxDescriptionLength: 500,

    complexValidationThresholdMs: 500,
    realTimeUpdateThresholdMs: 200,
  },

  autoSave: {
    enabled: true,
    interval: 2000, // 2 seconds
    maxRetries: 3,
    retryDelayMs: 1000,
  },

  ui: {
    enableAnimations: true,
    animationDuration: 300,

    compactMode: false,

    defaultFieldHeight: 80,
    maxVisibleFields: 20,

    tooltipDelay: 150,
    enableTooltips: true,
  },
};

// ========================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// ========================================

const getDevelopmentConfig = (): Partial<SchemaConfig> => ({
  performance: {
    ...DEFAULT_SCHEMA_CONFIG.performance,
    debounceDelayMs: 100, // Faster response in development
  },
  validation: {
    ...DEFAULT_SCHEMA_CONFIG.validation,
    validationDebounceMs: 200,
  },
});

const getProductionConfig = (): Partial<SchemaConfig> => ({
  performance: {
    ...DEFAULT_SCHEMA_CONFIG.performance,
    debounceDelayMs: 500, // More conservative in production
    cacheTTLMs: 10 * 60 * 1000, // Longer cache in production
  },
  ui: {
    ...DEFAULT_SCHEMA_CONFIG.ui,
    enableAnimations: true, // Ensure animations are enabled in production
  },
});

const getTestConfig = (): Partial<SchemaConfig> => ({
  performance: {
    ...DEFAULT_SCHEMA_CONFIG.performance,
    enableDebouncing: false, // Disable debouncing for faster tests
    debounceDelayMs: 0,
    cacheTTLMs: 1000, // Short cache for tests
  },
  validation: {
    ...DEFAULT_SCHEMA_CONFIG.validation,
    enableRealTimeValidation: false, // Disable for predictable tests
    validationDebounceMs: 0,
  },
  autoSave: {
    ...DEFAULT_SCHEMA_CONFIG.autoSave,
    enabled: false, // Disable auto-save in tests
  },
  ui: {
    ...DEFAULT_SCHEMA_CONFIG.ui,
    enableAnimations: false, // Disable animations for faster tests
    animationDuration: 0,
  },
});

// ========================================
// CONFIGURATION FACTORY
// ========================================

export const createSchemaConfig = (
  environment: 'development' | 'production' | 'test' = 'production',
  overrides: Partial<SchemaConfig> = {}
): SchemaConfig => {
  let envConfig: Partial<SchemaConfig> = {};

  switch (environment) {
    case 'development':
      envConfig = getDevelopmentConfig();
      break;
    case 'production':
      envConfig = getProductionConfig();
      break;
    case 'test':
      envConfig = getTestConfig();
      break;
  }

  return {
    performance: {
      ...DEFAULT_SCHEMA_CONFIG.performance,
      ...envConfig.performance,
      ...overrides.performance,
    },
    validation: {
      ...DEFAULT_SCHEMA_CONFIG.validation,
      ...envConfig.validation,
      ...overrides.validation,
    },
    autoSave: {
      ...DEFAULT_SCHEMA_CONFIG.autoSave,
      ...envConfig.autoSave,
      ...overrides.autoSave,
    },
    ui: {
      ...DEFAULT_SCHEMA_CONFIG.ui,
      ...envConfig.ui,
      ...overrides.ui,
    },
  };
};

// ========================================
// REACT CONTEXT
// ========================================

export const SchemaConfigContext = createContext<{
  config: SchemaConfig;
  updateConfig: (updates: Partial<SchemaConfig>) => void;
}>({
  config: DEFAULT_SCHEMA_CONFIG,
  updateConfig: () => {
    console.warn('SchemaConfigContext not provided');
  },
});

// ========================================
// CONFIGURATION HOOK
// ========================================

export const useSchemaConfig = () => {
  const context = useContext(SchemaConfigContext);

  if (!context) {
    console.warn('useSchemaConfig must be used within a SchemaConfigProvider. Using default config.');
    return {
      config: DEFAULT_SCHEMA_CONFIG,
      updateConfig: () => {},
    };
  }

  return context;
};

// ========================================
// CONFIGURATION UTILITIES
// ========================================

export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'development') return 'development';
  return 'production';
};

export const getCurrentConfig = (overrides: Partial<SchemaConfig> = {}): SchemaConfig => {
  return createSchemaConfig(getEnvironment(), overrides);
};

export const isPerformanceOptimized = (config: SchemaConfig): boolean => {
  return (
    config.performance.enableDebouncing &&
    config.performance.enableVirtualScrolling &&
    config.performance.cacheEnabled &&
    config.validation.enableRealTimeValidation
  );
};

export const getPerformanceProfile = (config: SchemaConfig): 'high' | 'medium' | 'low' => {
  let score = 0;

  if (config.performance.enableDebouncing) score += 1;
  if (config.performance.enableVirtualScrolling) score += 1;
  if (config.performance.cacheEnabled) score += 1;
  if (config.performance.lazyLoadingEnabled) score += 1;
  if (config.performance.debounceDelayMs <= 300) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
};

// ========================================
// PERFORMANCE RECOMMENDATIONS
// ========================================

export const getPerformanceRecommendations = (
  config: SchemaConfig,
  currentMetrics?: {
    fieldCount: number;
    averageRenderTime: number;
    averageValidationTime: number;
  }
): string[] => {
  const recommendations: string[] = [];

  if (currentMetrics) {
    const { fieldCount, averageRenderTime, averageValidationTime } = currentMetrics;

    // Virtual scrolling recommendation
    if (fieldCount > config.performance.virtualScrollThreshold && !config.performance.enableVirtualScrolling) {
      recommendations.push(
        `Enable virtual scrolling for ${fieldCount} fields to improve rendering performance`
      );
    }

    // Debouncing recommendation
    if (averageValidationTime > config.validation.realTimeUpdateThresholdMs && !config.performance.enableDebouncing) {
      recommendations.push(
        `Enable debouncing to reduce validation calls (current: ${averageValidationTime}ms)`
      );
    }

    // Caching recommendation
    if (averageRenderTime > 100 && !config.performance.cacheEnabled) {
      recommendations.push(
        `Enable caching to reduce re-computation (current render time: ${averageRenderTime}ms)`
      );
    }
  }

  // General recommendations
  if (config.performance.debounceDelayMs > 500) {
    recommendations.push('Consider reducing debounce delay for more responsive UI');
  }

  if (config.validation.maxFieldsPerSchema > 100) {
    recommendations.push('Consider splitting large schemas for better performance');
  }

  if (!config.performance.lazyLoadingEnabled) {
    recommendations.push('Enable lazy loading for large component configurations');
  }

  return recommendations;
};

export default {
  DEFAULT_SCHEMA_CONFIG,
  createSchemaConfig,
  getCurrentConfig,
  isPerformanceOptimized,
  getPerformanceProfile,
  getPerformanceRecommendations,
};