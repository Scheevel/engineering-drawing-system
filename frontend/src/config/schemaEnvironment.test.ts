/**
 * Tests for Schema Environment Configuration
 */

import { schemaEnvironmentService, SchemaEnvironmentConfig } from './schemaEnvironment';

// Store original environment
const originalEnv = process.env;

describe('SchemaEnvironmentService', () => {
  beforeEach(() => {
    // Reset environment for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Loading', () => {
    it('should load default configuration when no environment variables are set', () => {
      // Clear schema-related env vars
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('REACT_APP_SCHEMA_')) {
          delete process.env[key];
        }
      });

      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const config = newService.getConfig();

      expect(config).toEqual({
        validation: {
          debounceMs: 500,
          enableMockValidation: false,
        },
        autoSave: {
          intervalMs: 30000,
        },
        performance: {
          maxFieldsWarning: 50,
          enableMonitoring: false,
        },
        features: {
          enableRealTimePreview: true,
          enableAdvancedFeatures: true,
          debugMode: false,
        },
      });
    });

    it('should load custom configuration from environment variables', () => {
      process.env.REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS = '1000';
      process.env.REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS = '60000';
      process.env.REACT_APP_SCHEMA_MAX_FIELDS_WARNING = '100';
      process.env.REACT_APP_SCHEMA_ENABLE_MOCK_VALIDATION = 'true';
      process.env.REACT_APP_SCHEMA_DEBUG_MODE = 'true';

      // Re-require the module to pick up new env vars
      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const config = newService.getConfig();

      expect(config.validation.debounceMs).toBe(1000);
      expect(config.autoSave.intervalMs).toBe(60000);
      expect(config.performance.maxFieldsWarning).toBe(100);
      expect(config.validation.enableMockValidation).toBe(true);
      expect(config.features.debugMode).toBe(true);
    });

    it('should handle invalid number values gracefully', () => {
      process.env.REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS = 'invalid';
      process.env.REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS = 'not-a-number';

      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const config = newService.getConfig();

      // Should fall back to defaults for invalid values
      expect(config.validation.debounceMs).toBe(500);
      expect(config.autoSave.intervalMs).toBe(30000);
    });

    it('should handle boolean values correctly', () => {
      // Test various boolean representations
      process.env.REACT_APP_SCHEMA_ENABLE_MOCK_VALIDATION = 'TRUE';
      process.env.REACT_APP_SCHEMA_DEBUG_MODE = 'True';
      process.env.REACT_APP_SCHEMA_ENABLE_REAL_TIME_PREVIEW = 'false';

      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const config = newService.getConfig();

      expect(config.validation.enableMockValidation).toBe(true);
      expect(config.features.debugMode).toBe(true);
      expect(config.features.enableRealTimePreview).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate successfully with valid configuration', () => {
      process.env.REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS = '500';
      process.env.REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS = '30000';
      process.env.REACT_APP_SCHEMA_MAX_FIELDS_WARNING = '50';

      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const validation = newService.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid debounce time', () => {
      process.env.REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS = '50'; // Too low

      jest.resetModules();

      // Should throw on invalid configuration during module load
      expect(() => {
        require('./schemaEnvironment');
      }).toThrow();
    });

    it('should detect invalid auto-save interval', () => {
      process.env.REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS = '1000'; // Too low

      jest.resetModules();

      expect(() => {
        require('./schemaEnvironment');
      }).toThrow();
    });

    it('should detect invalid max fields warning', () => {
      process.env.REACT_APP_SCHEMA_MAX_FIELDS_WARNING = '5'; // Too low

      jest.resetModules();

      expect(() => {
        require('./schemaEnvironment');
      }).toThrow();
    });

    it('should generate warnings for suboptimal configuration', () => {
      process.env.REACT_APP_SCHEMA_MAX_FIELDS_WARNING = '150'; // Very high
      process.env.REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS = '150'; // Very low

      jest.resetModules();
      const { schemaEnvironmentService: newService } = require('./schemaEnvironment');
      const validation = newService.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('max fields warning threshold'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('debounce time is very low'))).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should provide correct TypeScript types', () => {
      const config: SchemaEnvironmentConfig = schemaEnvironmentService.getConfig();

      // These should compile without TypeScript errors
      expect(typeof config.validation.debounceMs).toBe('number');
      expect(typeof config.validation.enableMockValidation).toBe('boolean');
      expect(typeof config.autoSave.intervalMs).toBe('number');
      expect(typeof config.performance.maxFieldsWarning).toBe('number');
      expect(typeof config.performance.enableMonitoring).toBe('boolean');
      expect(typeof config.features.enableRealTimePreview).toBe('boolean');
      expect(typeof config.features.enableAdvancedFeatures).toBe('boolean');
      expect(typeof config.features.debugMode).toBe('boolean');
    });
  });
});