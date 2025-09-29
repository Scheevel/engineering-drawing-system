/**
 * Schema Error Handling Utilities
 *
 * Provides standardized error handling patterns, user-friendly messages,
 * and graceful degradation for schema management operations.
 */

// Error Types for Schema Management Operations
export type SchemaErrorType =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'DRAG_DROP_ERROR'
  | 'FIELD_OPERATION_ERROR'
  | 'SCHEMA_SAVE_ERROR'
  | 'UNKNOWN_ERROR';

// Error Severity Levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Recoverable Error Interface
export interface SchemaError {
  id?: string;
  type: SchemaErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  field?: string;
  code?: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
  fallbackAction?: () => void;
  timestamp: string;
}

// Error Recovery Strategies
export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
  fallbackAvailable: boolean;
}

/**
 * Schema Error Handler Class
 * Centralizes error handling logic for schema management operations
 */
export class SchemaErrorHandler {
  private errorLog: SchemaError[] = [];
  private maxLogSize = 100;

  /**
   * Create a standardized schema error
   */
  createError(
    type: SchemaErrorType,
    message: string,
    options: {
      field?: string;
      code?: string;
      severity?: ErrorSeverity;
      recoverable?: boolean;
      retryAction?: () => Promise<void>;
      fallbackAction?: () => void;
    } = {}
  ): SchemaError {
    const error: SchemaError = {
      type,
      severity: options.severity || this.getDefaultSeverity(type),
      message,
      userMessage: this.generateUserFriendlyMessage(type, message, options.field),
      field: options.field,
      code: options.code,
      recoverable: options.recoverable !== false, // Default to recoverable
      retryAction: options.retryAction,
      fallbackAction: options.fallbackAction,
      timestamp: new Date().toISOString()
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle field validation errors with user-friendly messages
   */
  handleValidationError(
    field: string,
    validationError: string,
    value?: any
  ): SchemaError {
    return this.createError('VALIDATION_ERROR', validationError, {
      field,
      severity: 'medium',
      recoverable: true
    });
  }

  /**
   * Handle drag-and-drop operation failures with graceful degradation
   */
  handleDragDropError(
    operation: 'drag' | 'drop' | 'reorder',
    error: Error,
    fallbackAction?: () => void
  ): SchemaError {
    return this.createError('DRAG_DROP_ERROR', error.message, {
      severity: 'medium',
      recoverable: true,
      fallbackAction: fallbackAction || (() => {
        console.warn('Drag-and-drop failed, falling back to manual reordering');
      })
    });
  }

  /**
   * Handle network errors with retry logic
   */
  handleNetworkError(
    operation: string,
    error: Error,
    retryAction: () => Promise<void>
  ): SchemaError {
    return this.createError('NETWORK_ERROR', error.message, {
      severity: 'high',
      recoverable: true,
      retryAction
    });
  }

  /**
   * Handle schema save operations with recovery
   */
  handleSchemaSaveError(
    error: Error,
    retryAction?: () => Promise<void>
  ): SchemaError {
    return this.createError('SCHEMA_SAVE_ERROR', error.message, {
      severity: 'high',
      recoverable: !!retryAction,
      retryAction
    });
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserFriendlyMessage(
    type: SchemaErrorType,
    message: string,
    field?: string
  ): string {
    const fieldPrefix = field ? `${field}: ` : '';

    switch (type) {
      case 'VALIDATION_ERROR':
        return `${fieldPrefix}${this.formatValidationMessage(message)}`;

      case 'NETWORK_ERROR':
        return 'Connection issue - please check your internet connection and try again.';

      case 'PERMISSION_ERROR':
        return 'You don\'t have permission to perform this action. Please contact your administrator.';

      case 'DRAG_DROP_ERROR':
        return 'Drag-and-drop failed. You can manually reorder items using the arrow buttons.';

      case 'FIELD_OPERATION_ERROR':
        return `${fieldPrefix}Field operation failed. Please try again or refresh the page.`;

      case 'SCHEMA_SAVE_ERROR':
        return 'Failed to save schema changes. Your work is preserved locally - please try saving again.';

      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  /**
   * Format validation messages to be more user-friendly
   */
  private formatValidationMessage(message: string): string {
    // Convert technical validation messages to user-friendly ones
    const messageMap: Record<string, string> = {
      'required': 'This field is required',
      'min_length': 'Please enter more characters',
      'max_length': 'Please enter fewer characters',
      'invalid_type': 'Please enter a valid value',
      'invalid_option': 'Please select a valid option'
    };

    for (const [key, userMessage] of Object.entries(messageMap)) {
      if (message.toLowerCase().includes(key)) {
        return userMessage;
      }
    }

    return message;
  }

  /**
   * Get default severity for error types
   */
  private getDefaultSeverity(type: SchemaErrorType): ErrorSeverity {
    switch (type) {
      case 'VALIDATION_ERROR':
        return 'medium';
      case 'NETWORK_ERROR':
      case 'SCHEMA_SAVE_ERROR':
        return 'high';
      case 'PERMISSION_ERROR':
        return 'critical';
      case 'DRAG_DROP_ERROR':
      case 'FIELD_OPERATION_ERROR':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Log error for debugging and monitoring
   */
  private logError(error: SchemaError): void {
    console.error('Schema Error:', error);

    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Get recent errors for debugging
   */
  getErrorLog(): SchemaError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * Error Recovery Manager
 * Handles retry logic and fallback mechanisms
 */
export class ErrorRecoveryManager {
  private recoveryStrategies = new Map<string, ErrorRecoveryStrategy>();

  /**
   * Register a recovery strategy for an operation
   */
  registerStrategy(
    operationId: string,
    strategy: Partial<ErrorRecoveryStrategy>
  ): void {
    const defaultStrategy: ErrorRecoveryStrategy = {
      canRecover: true,
      retryCount: 0,
      maxRetries: 3,
      backoffMs: 1000,
      fallbackAvailable: false
    };

    this.recoveryStrategies.set(operationId, {
      ...defaultStrategy,
      ...strategy
    });
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(
    operationId: string,
    error: SchemaError
  ): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(operationId);

    if (!strategy || !strategy.canRecover || !error.recoverable) {
      return false;
    }

    // Check if we've exceeded retry limit
    if (strategy.retryCount >= strategy.maxRetries) {
      if (strategy.fallbackAvailable && error.fallbackAction) {
        error.fallbackAction();
        return true;
      }
      return false;
    }

    // Attempt retry with backoff
    if (error.retryAction) {
      try {
        await this.delay(strategy.backoffMs * (strategy.retryCount + 1));
        await error.retryAction();
        strategy.retryCount = 0; // Reset on success
        return true;
      } catch (retryError) {
        strategy.retryCount++;
        return false;
      }
    }

    return false;
  }

  /**
   * Reset recovery strategy for an operation
   */
  resetStrategy(operationId: string): void {
    const strategy = this.recoveryStrategies.get(operationId);
    if (strategy) {
      strategy.retryCount = 0;
    }
  }

  /**
   * Utility delay function for backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instances for global use
export const schemaErrorHandler = new SchemaErrorHandler();
export const errorRecoveryManager = new ErrorRecoveryManager();

/**
 * Graceful Degradation Strategies
 */
export const DragDropFallbacks = {
  /**
   * Fallback to manual reordering when drag-and-drop fails
   */
  enableManualReordering: (onReorder: (fromIndex: number, toIndex: number) => void) => {
    console.warn('Drag-and-drop unavailable, manual reordering enabled');
    // Implementation would add up/down buttons for each field
    return {
      moveUp: (index: number) => {
        if (index > 0) {
          onReorder(index, index - 1);
        }
      },
      moveDown: (index: number, maxIndex: number) => {
        if (index < maxIndex) {
          onReorder(index, index + 1);
        }
      }
    };
  },

  /**
   * Fallback to form-based field editing when drag interaction fails
   */
  enableFormBasedEditing: () => {
    console.warn('Interactive editing unavailable, form-based editing enabled');
    // Would enable text inputs for direct order specification
  }
};

/**
 * User-Friendly Error Message Templates
 */
export const ErrorMessages = {
  validation: {
    required: (fieldName: string) => `${fieldName} is required`,
    minLength: (fieldName: string, min: number) =>
      `${fieldName} must be at least ${min} characters`,
    maxLength: (fieldName: string, max: number) =>
      `${fieldName} must be less than ${max} characters`,
    invalidType: (fieldName: string, expectedType: string) =>
      `${fieldName} must be a valid ${expectedType}`,
    invalidOption: (fieldName: string, options: string[]) =>
      `${fieldName} must be one of: ${options.join(', ')}`
  },

  operations: {
    saveSchema: 'Failed to save schema. Your changes are preserved locally.',
    loadSchema: 'Failed to load schema. Please refresh and try again.',
    addField: 'Failed to add field. Please try again.',
    removeField: 'Failed to remove field. Please try again.',
    reorderField: 'Failed to reorder field. You can use the arrow buttons instead.'
  },

  network: {
    offline: 'You\'re offline. Changes will be saved when connection is restored.',
    timeout: 'Request timed out. Please check your connection and try again.',
    serverError: 'Server error. Please try again in a moment.'
  }
};