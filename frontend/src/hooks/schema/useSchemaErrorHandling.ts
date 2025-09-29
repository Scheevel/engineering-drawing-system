/**
 * Schema Error Handling React Hook
 *
 * Provides React integration for schema error handling patterns,
 * including state management and user feedback.
 */

import { useState, useCallback, useRef } from 'react';
import {
  SchemaError,
  SchemaErrorType,
  schemaErrorHandler,
  errorRecoveryManager,
  DragDropFallbacks
} from '../../utils/schemaErrorHandling';

export interface UseSchemaErrorHandlingOptions {
  /**
   * Maximum number of errors to display at once
   */
  maxErrors?: number;

  /**
   * Auto-dismiss errors after specified milliseconds
   */
  autoDismissMs?: number;

  /**
   * Enable automatic retry for recoverable errors
   */
  enableAutoRetry?: boolean;

  /**
   * Callback for when errors are updated
   */
  onErrorsChange?: (errors: SchemaError[]) => void;
}

export interface SchemaErrorHandlingReturn {
  /**
   * Current active errors
   */
  errors: SchemaError[];

  /**
   * Handle a validation error
   */
  handleValidationError: (field: string, message: string, value?: any) => void;

  /**
   * Handle a drag-and-drop error with graceful degradation
   */
  handleDragDropError: (
    operation: 'drag' | 'drop' | 'reorder',
    error: Error,
    fallbackAction?: () => void
  ) => void;

  /**
   * Handle a network error with retry capability
   */
  handleNetworkError: (
    operation: string,
    error: Error,
    retryAction: () => Promise<void>
  ) => void;

  /**
   * Handle a schema save error
   */
  handleSchemaSaveError: (error: Error, retryAction?: () => Promise<void>) => void;

  /**
   * Dismiss a specific error
   */
  dismissError: (errorId: string) => void;

  /**
   * Clear all errors
   */
  clearErrors: () => void;

  /**
   * Retry a recoverable error
   */
  retryError: (error: SchemaError) => Promise<boolean>;

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors: boolean;

  /**
   * Get drag-and-drop fallback functions
   */
  getDragDropFallbacks: (onReorder: (fromIndex: number, toIndex: number) => void) => {
    moveUp: (index: number) => void;
    moveDown: (index: number, maxIndex: number) => void;
  };
}

/**
 * Hook for managing schema-related errors with React state
 */
export function useSchemaErrorHandling(
  options: UseSchemaErrorHandlingOptions = {}
): SchemaErrorHandlingReturn {
  const {
    maxErrors = 5,
    autoDismissMs,
    enableAutoRetry = true,
    onErrorsChange
  } = options;

  const [errors, setErrors] = useState<SchemaError[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Add an error to the state
   */
  const addError = useCallback((error: SchemaError) => {
    const errorId = `${error.type}-${error.timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const errorWithId = { ...error, id: errorId };

    setErrors(prevErrors => {
      const newErrors = [errorWithId, ...prevErrors].slice(0, maxErrors);
      onErrorsChange?.(newErrors);
      return newErrors;
    });

    // Auto-dismiss if configured
    if (autoDismissMs && error.severity !== 'critical') {
      const timeoutId = setTimeout(() => {
        dismissError(errorId);
      }, autoDismissMs);

      timeoutRefs.current.set(errorId, timeoutId);
    }

    // Auto-retry if enabled and error is recoverable
    if (enableAutoRetry && error.recoverable && error.retryAction) {
      setTimeout(() => {
        retryError(errorWithId);
      }, 2000); // Wait 2 seconds before auto-retry
    }
  }, [maxErrors, autoDismissMs, enableAutoRetry, onErrorsChange]);

  /**
   * Handle validation errors
   */
  const handleValidationError = useCallback((
    field: string,
    message: string,
    value?: any
  ) => {
    const error = schemaErrorHandler.handleValidationError(field, message, value);
    addError(error);
  }, [addError]);

  /**
   * Handle drag-and-drop errors with graceful degradation
   */
  const handleDragDropError = useCallback((
    operation: 'drag' | 'drop' | 'reorder',
    error: Error,
    fallbackAction?: () => void
  ) => {
    const schemaError = schemaErrorHandler.handleDragDropError(
      operation,
      error,
      fallbackAction
    );
    addError(schemaError);

    // Immediately trigger fallback if available
    if (fallbackAction) {
      fallbackAction();
    }
  }, [addError]);

  /**
   * Handle network errors with retry
   */
  const handleNetworkError = useCallback((
    operation: string,
    error: Error,
    retryAction: () => Promise<void>
  ) => {
    const schemaError = schemaErrorHandler.handleNetworkError(
      operation,
      error,
      retryAction
    );
    addError(schemaError);
  }, [addError]);

  /**
   * Handle schema save errors
   */
  const handleSchemaSaveError = useCallback((
    error: Error,
    retryAction?: () => Promise<void>
  ) => {
    const schemaError = schemaErrorHandler.handleSchemaSaveError(error, retryAction);
    addError(schemaError);
  }, [addError]);

  /**
   * Dismiss a specific error
   */
  const dismissError = useCallback((errorId: string) => {
    // Clear any auto-dismiss timeout
    const timeoutId = timeoutRefs.current.get(errorId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(errorId);
    }

    setErrors(prevErrors => {
      const newErrors = prevErrors.filter(error => error.id !== errorId);
      onErrorsChange?.(newErrors);
      return newErrors;
    });
  }, [onErrorsChange]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();

    setErrors([]);
    onErrorsChange?.([]);
  }, [onErrorsChange]);

  /**
   * Retry a recoverable error
   */
  const retryError = useCallback(async (error: SchemaError): Promise<boolean> => {
    if (!error.recoverable || !error.retryAction) {
      return false;
    }

    try {
      await error.retryAction();
      // Remove error on successful retry
      if (error.id) {
        dismissError(error.id);
      }
      return true;
    } catch (retryError) {
      // Error persists, possibly update error message
      console.error('Retry failed:', retryError);
      return false;
    }
  }, [dismissError]);

  /**
   * Check if there are critical errors
   */
  const hasCriticalErrors = errors.some(error => error.severity === 'critical');

  /**
   * Get drag-and-drop fallback functions
   */
  const getDragDropFallbacks = useCallback((
    onReorder: (fromIndex: number, toIndex: number) => void
  ) => {
    return DragDropFallbacks.enableManualReordering(onReorder);
  }, []);

  return {
    errors,
    handleValidationError,
    handleDragDropError,
    handleNetworkError,
    handleSchemaSaveError,
    dismissError,
    clearErrors,
    retryError,
    hasCriticalErrors,
    getDragDropFallbacks
  };
}