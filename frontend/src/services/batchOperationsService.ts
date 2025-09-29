/**
 * Batch Operations Service
 *
 * Efficient batch processing for schema field operations including
 * updates, deletions, reordering, and validation.
 */

import { ComponentSchemaField, ComponentSchemaFieldUpdate, ComponentSchemaFieldCreate } from './api';
import { getCurrentConfig } from '../config/schemaConfig.ts';
import { useBatchedUpdates } from '../hooks/schema/usePerformanceOptimizations.tsx';
import { useCallback, useRef, useState } from 'react';

// ========================================
// TYPES AND INTERFACES
// ========================================

export type BatchOperationType = 'create' | 'update' | 'delete' | 'reorder';

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  fieldId?: string;
  data?: ComponentSchemaFieldUpdate | ComponentSchemaFieldCreate;
  displayOrder?: number;
  timestamp: number;
}

export interface BatchOperationResult {
  success: boolean;
  operationId: string;
  error?: string;
  field?: ComponentSchemaField;
}

export interface BatchProcessingOptions {
  batchSize?: number;
  delayMs?: number;
  validateBefore?: boolean;
  optimisticUpdates?: boolean;
  rollbackOnFailure?: boolean;
}

export interface BatchOperationQueue {
  operations: BatchOperation[];
  pendingCount: number;
  processedCount: number;
  failedCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
}

// ========================================
// BATCH OPERATIONS MANAGER
// ========================================

class BatchOperationsManager {
  private operations: Map<string, BatchOperation> = new Map();
  private processingQueue: BatchOperation[] = [];
  private isProcessing = false;
  private config = getCurrentConfig();

  private onBatchComplete?: (results: BatchOperationResult[]) => void;
  private onOperationComplete?: (result: BatchOperationResult) => void;
  private onError?: (error: Error, operation: BatchOperation) => void;

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `batch-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add operation to batch
   */
  public addOperation(
    type: BatchOperationType,
    data?: ComponentSchemaFieldUpdate | ComponentSchemaFieldCreate,
    fieldId?: string,
    displayOrder?: number
  ): string {
    const operationId = this.generateOperationId();
    const operation: BatchOperation = {
      id: operationId,
      type,
      fieldId,
      data,
      displayOrder,
      timestamp: Date.now(),
    };

    this.operations.set(operationId, operation);
    this.processingQueue.push(operation);

    return operationId;
  }

  /**
   * Remove operation from batch
   */
  public removeOperation(operationId: string): boolean {
    if (this.isProcessing) {
      return false; // Cannot remove operations while processing
    }

    const removed = this.operations.delete(operationId);
    if (removed) {
      this.processingQueue = this.processingQueue.filter(op => op.id !== operationId);
    }

    return removed;
  }

  /**
   * Get current operations queue status
   */
  public getQueueStatus(): BatchOperationQueue {
    return {
      operations: Array.from(this.operations.values()),
      pendingCount: this.processingQueue.length,
      processedCount: this.operations.size - this.processingQueue.length,
      failedCount: 0, // Will be tracked during processing
      status: this.isProcessing ? 'processing' :
               this.processingQueue.length > 0 ? 'idle' : 'completed',
    };
  }

  /**
   * Clear all operations
   */
  public clearOperations(): void {
    if (this.isProcessing) {
      throw new Error('Cannot clear operations while processing');
    }

    this.operations.clear();
    this.processingQueue = [];
  }

  /**
   * Process batch operations
   */
  public async processBatch(
    schemaId: string,
    options: BatchProcessingOptions = {}
  ): Promise<BatchOperationResult[]> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    if (this.processingQueue.length === 0) {
      return [];
    }

    this.isProcessing = true;
    const results: BatchOperationResult[] = [];
    const {
      batchSize = this.config.performance.batchSize,
      delayMs = this.config.performance.batchDelayMs,
      validateBefore = true,
      optimisticUpdates = true,
      rollbackOnFailure = true,
    } = options;

    try {
      // Group operations by type for optimal processing
      const groupedOps = this.groupOperationsByType();

      // Process each group in optimal order
      const processingOrder: BatchOperationType[] = ['delete', 'update', 'create', 'reorder'];

      for (const type of processingOrder) {
        const typeOps = groupedOps.get(type) || [];
        if (typeOps.length === 0) continue;

        // Process in chunks
        for (let i = 0; i < typeOps.length; i += batchSize) {
          const chunk = typeOps.slice(i, i + batchSize);
          const chunkResults = await this.processOperationChunk(
            schemaId,
            chunk,
            { validateBefore, optimisticUpdates }
          );

          results.push(...chunkResults);

          // Add delay between chunks if specified
          if (delayMs > 0 && i + batchSize < typeOps.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // Handle rollback if any operations failed and rollback is enabled
      if (rollbackOnFailure && results.some(r => !r.success)) {
        await this.rollbackOperations(schemaId, results.filter(r => r.success));
      }

      this.onBatchComplete?.(results);
      return results;

    } catch (error) {
      this.onError?.(error as Error, this.processingQueue[0]);
      throw error;
    } finally {
      this.isProcessing = false;
      this.clearProcessedOperations(results);
    }
  }

  /**
   * Group operations by type for optimal processing
   */
  private groupOperationsByType(): Map<BatchOperationType, BatchOperation[]> {
    const groups = new Map<BatchOperationType, BatchOperation[]>();

    for (const operation of this.processingQueue) {
      if (!groups.has(operation.type)) {
        groups.set(operation.type, []);
      }
      groups.get(operation.type)!.push(operation);
    }

    return groups;
  }

  /**
   * Process a chunk of operations
   */
  private async processOperationChunk(
    schemaId: string,
    operations: BatchOperation[],
    options: { validateBefore: boolean; optimisticUpdates: boolean }
  ): Promise<BatchOperationResult[]> {
    const results: BatchOperationResult[] = [];

    for (const operation of operations) {
      try {
        const result = await this.processIndividualOperation(schemaId, operation, options);
        results.push(result);
        this.onOperationComplete?.(result);
      } catch (error) {
        const failedResult: BatchOperationResult = {
          success: false,
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.push(failedResult);
        this.onError?.(error as Error, operation);
      }
    }

    return results;
  }

  /**
   * Process individual operation
   */
  private async processIndividualOperation(
    schemaId: string,
    operation: BatchOperation,
    options: { validateBefore: boolean; optimisticUpdates: boolean }
  ): Promise<BatchOperationResult> {
    // Simulate API calls for now - in real implementation, these would be actual API calls
    switch (operation.type) {
      case 'create':
        return this.processCreateOperation(schemaId, operation, options);
      case 'update':
        return this.processUpdateOperation(schemaId, operation, options);
      case 'delete':
        return this.processDeleteOperation(schemaId, operation, options);
      case 'reorder':
        return this.processReorderOperation(schemaId, operation, options);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processCreateOperation(
    schemaId: string,
    operation: BatchOperation,
    options: any
  ): Promise<BatchOperationResult> {
    // Simulate field creation
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      operationId: operation.id,
      field: {
        id: `field-${Date.now()}`,
        field_name: (operation.data as any)?.field_name || 'New Field',
        field_type: (operation.data as any)?.field_type || 'text',
        is_required: (operation.data as any)?.is_required || false,
        display_order: operation.displayOrder || 0,
        field_config: (operation.data as any)?.field_config || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ComponentSchemaField,
    };
  }

  private async processUpdateOperation(
    schemaId: string,
    operation: BatchOperation,
    options: any
  ): Promise<BatchOperationResult> {
    // Simulate field update
    await new Promise(resolve => setTimeout(resolve, 80));

    return {
      success: true,
      operationId: operation.id,
      field: {
        id: operation.fieldId!,
        field_name: (operation.data as any)?.field_name || 'Updated Field',
        field_type: (operation.data as any)?.field_type || 'text',
        is_required: (operation.data as any)?.is_required || false,
        display_order: operation.displayOrder || 0,
        field_config: (operation.data as any)?.field_config || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ComponentSchemaField,
    };
  }

  private async processDeleteOperation(
    schemaId: string,
    operation: BatchOperation,
    options: any
  ): Promise<BatchOperationResult> {
    // Simulate field deletion
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      operationId: operation.id,
    };
  }

  private async processReorderOperation(
    schemaId: string,
    operation: BatchOperation,
    options: any
  ): Promise<BatchOperationResult> {
    // Simulate field reordering
    await new Promise(resolve => setTimeout(resolve, 30));

    return {
      success: true,
      operationId: operation.id,
    };
  }

  /**
   * Rollback successfully processed operations
   */
  private async rollbackOperations(
    schemaId: string,
    successfulResults: BatchOperationResult[]
  ): Promise<void> {
    // Implement rollback logic
    for (const result of successfulResults.reverse()) {
      try {
        // Simulate rollback operation
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error('Rollback failed for operation:', result.operationId, error);
      }
    }
  }

  /**
   * Clear processed operations from queue
   */
  private clearProcessedOperations(results: BatchOperationResult[]): void {
    const processedIds = new Set(results.map(r => r.operationId));

    for (const operationId of processedIds) {
      this.operations.delete(operationId);
    }

    this.processingQueue = this.processingQueue.filter(
      op => !processedIds.has(op.id)
    );
  }

  /**
   * Set event handlers
   */
  public setEventHandlers(handlers: {
    onBatchComplete?: (results: BatchOperationResult[]) => void;
    onOperationComplete?: (result: BatchOperationResult) => void;
    onError?: (error: Error, operation: BatchOperation) => void;
  }): void {
    this.onBatchComplete = handlers.onBatchComplete;
    this.onOperationComplete = handlers.onOperationComplete;
    this.onError = handlers.onError;
  }
}

// ========================================
// REACT HOOK FOR BATCH OPERATIONS
// ========================================

export const useBatchOperations = (schemaId: string) => {
  const [manager] = useState(() => new BatchOperationsManager());
  const [queueStatus, setQueueStatus] = useState<BatchOperationQueue>(manager.getQueueStatus());
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchOperationResult[]>([]);

  // Set up event handlers
  useState(() => {
    manager.setEventHandlers({
      onBatchComplete: (results) => {
        setResults(results);
        setIsProcessing(false);
        setQueueStatus(manager.getQueueStatus());
      },
      onOperationComplete: (result) => {
        setResults(prev => [...prev, result]);
      },
      onError: (error, operation) => {
        console.error('Batch operation failed:', error, operation);
      },
    });
  });

  // Batch update operations using performance hooks
  const { addToBatch, setBatchHandler, flush } = useBatchedUpdates<BatchOperation>(
    manager.getQueueStatus().operations.length > 10 ? 20 : 10, // Dynamic batch size
    100 // 100ms delay
  );

  // Set batch handler
  useState(() => {
    setBatchHandler((batch: BatchOperation[]) => {
      // Auto-process when batch is full
      if (batch.length >= 10) {
        processBatch();
      }
    });
  });

  const addCreateOperation = useCallback((data: ComponentSchemaFieldCreate, displayOrder?: number) => {
    const operationId = manager.addOperation('create', data, undefined, displayOrder);
    setQueueStatus(manager.getQueueStatus());
    return operationId;
  }, [manager]);

  const addUpdateOperation = useCallback((fieldId: string, data: ComponentSchemaFieldUpdate) => {
    const operationId = manager.addOperation('update', data, fieldId);
    setQueueStatus(manager.getQueueStatus());
    return operationId;
  }, [manager]);

  const addDeleteOperation = useCallback((fieldId: string) => {
    const operationId = manager.addOperation('delete', undefined, fieldId);
    setQueueStatus(manager.getQueueStatus());
    return operationId;
  }, [manager]);

  const addReorderOperation = useCallback((fieldId: string, newDisplayOrder: number) => {
    const operationId = manager.addOperation('reorder', undefined, fieldId, newDisplayOrder);
    setQueueStatus(manager.getQueueStatus());
    return operationId;
  }, [manager]);

  const removeOperation = useCallback((operationId: string) => {
    const removed = manager.removeOperation(operationId);
    if (removed) {
      setQueueStatus(manager.getQueueStatus());
    }
    return removed;
  }, [manager]);

  const processBatch = useCallback(async (options?: BatchProcessingOptions) => {
    if (queueStatus.pendingCount === 0) {
      return [];
    }

    setIsProcessing(true);
    setResults([]);

    try {
      const batchResults = await manager.processBatch(schemaId, options);
      return batchResults;
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  }, [manager, schemaId, queueStatus.pendingCount]);

  const clearOperations = useCallback(() => {
    manager.clearOperations();
    setQueueStatus(manager.getQueueStatus());
    setResults([]);
  }, [manager]);

  const flushBatch = useCallback(() => {
    flush();
    processBatch();
  }, [flush, processBatch]);

  return {
    // Operations
    addCreateOperation,
    addUpdateOperation,
    addDeleteOperation,
    addReorderOperation,
    removeOperation,

    // Processing
    processBatch,
    flushBatch,
    clearOperations,

    // State
    queueStatus,
    isProcessing,
    results,

    // Utilities
    canProcess: queueStatus.pendingCount > 0 && !isProcessing,
    hasOperations: queueStatus.operations.length > 0,
  };
};

export default BatchOperationsManager;