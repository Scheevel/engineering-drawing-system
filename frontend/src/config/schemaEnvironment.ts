/**
 * Schema Management Environment Configuration
 *
 * Provides typed configuration interface for schema management features
 * with environment validation and default values.
 */

export interface SchemaEnvironmentConfig {
  validation: {
    debounceMs: number;
    enableMockValidation: boolean;
  };
  autoSave: {
    intervalMs: number;
  };
  performance: {
    maxFieldsWarning: number;
    enableMonitoring: boolean;
  };
  features: {
    enableRealTimePreview: boolean;
    enableAdvancedFeatures: boolean;
    debugMode: boolean;
  };
}

interface EnvironmentVariable {
  name: string;
  defaultValue: string | number | boolean;
  required: boolean;
  validator?: (value: any) => boolean;
}

const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  {
    name: 'REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS',
    defaultValue: 500,
    required: false,
    validator: (value: number) => value >= 100 && value <= 2000
  },
  {
    name: 'REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS',
    defaultValue: 30000,
    required: false,
    validator: (value: number) => value >= 5000 && value <= 300000
  },
  {
    name: 'REACT_APP_SCHEMA_MAX_FIELDS_WARNING',
    defaultValue: 50,
    required: false,
    validator: (value: number) => value >= 10 && value <= 200
  },
  {
    name: 'REACT_APP_SCHEMA_ENABLE_MOCK_VALIDATION',
    defaultValue: false,
    required: false
  },
  {
    name: 'REACT_APP_SCHEMA_ENABLE_REAL_TIME_PREVIEW',
    defaultValue: true,
    required: false
  },
  {
    name: 'REACT_APP_SCHEMA_ENABLE_ADVANCED_FEATURES',
    defaultValue: true,
    required: false
  },
  {
    name: 'REACT_APP_SCHEMA_DEBUG_MODE',
    defaultValue: false,
    required: false
  },
  {
    name: 'REACT_APP_SCHEMA_PERFORMANCE_MONITORING',
    defaultValue: false,
    required: false
  }
];

class SchemaEnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    ENVIRONMENT_VARIABLES.forEach(envVar => {
      const value = this.getEnvironmentValue(envVar);

      if (envVar.required && value === null) {
        this.errors.push(`Required environment variable ${envVar.name} is missing`);
        return;
      }

      if (value !== null && envVar.validator && !envVar.validator(value)) {
        this.errors.push(`Environment variable ${envVar.name} has invalid value: ${value}`);
      }
    });

    // Performance warnings
    const maxFields = this.getEnvironmentValue(ENVIRONMENT_VARIABLES.find(v =>
      v.name === 'REACT_APP_SCHEMA_MAX_FIELDS_WARNING'
    )!);

    if (maxFields && maxFields > 100) {
      this.warnings.push('Schema max fields warning threshold is very high, may impact performance');
    }

    const debounceMs = this.getEnvironmentValue(ENVIRONMENT_VARIABLES.find(v =>
      v.name === 'REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS'
    )!);

    if (debounceMs && debounceMs < 200) {
      this.warnings.push('Validation debounce time is very low, may cause excessive API calls');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private getEnvironmentValue(envVar: EnvironmentVariable): any {
    const rawValue = process.env[envVar.name];

    if (rawValue === undefined) {
      return envVar.required ? null : envVar.defaultValue;
    }

    // Type conversion based on default value type
    if (typeof envVar.defaultValue === 'number') {
      const numValue = parseInt(rawValue, 10);
      return isNaN(numValue) ? envVar.defaultValue : numValue;
    }

    if (typeof envVar.defaultValue === 'boolean') {
      return rawValue.toLowerCase() === 'true';
    }

    return rawValue;
  }
}

class SchemaEnvironmentService {
  private config: SchemaEnvironmentConfig;
  private validator: SchemaEnvironmentValidator;

  constructor() {
    this.validator = new SchemaEnvironmentValidator();
    this.config = this.loadConfiguration();
  }

  getConfig(): SchemaEnvironmentConfig {
    return this.config;
  }

  validateConfiguration(): { isValid: boolean; errors: string[]; warnings: string[] } {
    return this.validator.validate();
  }

  private loadConfiguration(): SchemaEnvironmentConfig {
    const getEnvValue = (name: string, defaultValue: any): any => {
      const envVar = ENVIRONMENT_VARIABLES.find(v => v.name === name);
      if (!envVar) return defaultValue;

      const rawValue = process.env[name];
      if (rawValue === undefined) return defaultValue;

      if (typeof defaultValue === 'number') {
        const numValue = parseInt(rawValue, 10);
        return isNaN(numValue) ? defaultValue : numValue;
      }

      if (typeof defaultValue === 'boolean') {
        return rawValue.toLowerCase() === 'true';
      }

      return rawValue;
    };

    return {
      validation: {
        debounceMs: getEnvValue('REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS', 500),
        enableMockValidation: getEnvValue('REACT_APP_SCHEMA_ENABLE_MOCK_VALIDATION', false),
      },
      autoSave: {
        intervalMs: getEnvValue('REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS', 30000),
      },
      performance: {
        maxFieldsWarning: getEnvValue('REACT_APP_SCHEMA_MAX_FIELDS_WARNING', 50),
        enableMonitoring: getEnvValue('REACT_APP_SCHEMA_PERFORMANCE_MONITORING', false),
      },
      features: {
        enableRealTimePreview: getEnvValue('REACT_APP_SCHEMA_ENABLE_REAL_TIME_PREVIEW', true),
        enableAdvancedFeatures: getEnvValue('REACT_APP_SCHEMA_ENABLE_ADVANCED_FEATURES', true),
        debugMode: getEnvValue('REACT_APP_SCHEMA_DEBUG_MODE', false),
      },
    };
  }
}

// Singleton instance
const schemaEnvironmentService = new SchemaEnvironmentService();

export { schemaEnvironmentService };
export default schemaEnvironmentService;

// Validate configuration on module load
const validation = schemaEnvironmentService.validateConfiguration();

if (!validation.isValid) {
  console.error('Schema Environment Configuration Errors:', validation.errors);
  throw new Error(`Invalid schema environment configuration: ${validation.errors.join(', ')}`);
}

if (validation.warnings.length > 0) {
  console.warn('Schema Environment Configuration Warnings:', validation.warnings);
}

// Log configuration in debug mode
const config = schemaEnvironmentService.getConfig();
if (config.features.debugMode) {
  console.log('Schema Environment Configuration:', config);
}