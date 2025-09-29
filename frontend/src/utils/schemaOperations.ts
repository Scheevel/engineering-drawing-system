/**
 * Schema Operation Utilities
 *
 * Utility functions for creating and managing schema editing operations.
 * This module is separate from the context to avoid circular dependencies.
 */

import { EditOperation } from '../contexts/SchemaEditingContext';

/**
 * Creates a new edit operation with a unique ID and timestamp
 */
export const createEditOperation = (
  type: EditOperation['type'],
  data: any,
  undoData: any,
  description: string
): EditOperation => ({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  timestamp: Date.now(),
  data,
  undoData,
  description,
});

/**
 * Generates a unique field ID
 */
export const generateFieldId = (): string => {
  return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates an edit operation structure
 */
export const validateEditOperation = (operation: EditOperation): boolean => {
  return !!(
    operation.id &&
    operation.type &&
    operation.timestamp &&
    operation.description &&
    operation.data !== undefined &&
    operation.undoData !== undefined
  );
};

/**
 * Creates a grouped operation from multiple individual operations
 */
export const createGroupedOperation = (
  operations: Array<Omit<EditOperation, 'id' | 'timestamp'>>,
  description: string
): EditOperation => {
  return createEditOperation(
    'grouped_operation' as any,
    { operations },
    { operations: operations.map(op => ({ ...op, undoData: op.data, data: op.undoData })) },
    description
  );
};