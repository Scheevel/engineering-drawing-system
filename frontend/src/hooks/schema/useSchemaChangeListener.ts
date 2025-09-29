/**
 * Schema Change Listener Hook
 *
 * React hook for listening to schema change events from the SchemaEventBus.
 * Provides automatic subscription management and cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { SchemaEventBus, SchemaChangeEvent, EventCallback } from '../../utils/schemaEventBus.ts';

export interface UseSchemaChangeListenerOptions {
  /**
   * Event types to listen for. If not provided, listens to all events.
   */
  types?: SchemaChangeEvent['type'][];

  /**
   * Specific schema ID to listen for. If not provided, listens to all schemas.
   */
  schemaId?: string;

  /**
   * Specific project ID to listen for. If not provided, listens to all projects.
   */
  projectId?: string;

  /**
   * Whether to automatically invalidate React Query caches on schema changes.
   * Default: true
   */
  autoInvalidateCache?: boolean;

  /**
   * Custom event handler. Called in addition to automatic cache invalidation.
   */
  onSchemaChange?: (event: SchemaChangeEvent) => void;

  /**
   * Whether the listener is enabled. Default: true
   */
  enabled?: boolean;
}

/**
 * Hook for listening to schema change events
 */
export const useSchemaChangeListener = (options: UseSchemaChangeListenerOptions = {}) => {
  const {
    types,
    schemaId,
    projectId,
    autoInvalidateCache = true,
    onSchemaChange,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const subscriptionIdRef = useRef<string | null>(null);

  // Create event handler
  const handleSchemaChange = useCallback((event: SchemaChangeEvent) => {
    // Call custom handler first
    onSchemaChange?.(event);

    // Auto-invalidate cache if enabled
    if (autoInvalidateCache) {
      // Invalidate schema-related queries
      queryClient.invalidateQueries(['project-schemas', event.projectId]);
      queryClient.invalidateQueries(['schema', event.schemaId]);
      queryClient.invalidateQueries(['component-schemas']);

      // For component-specific invalidations
      if (event.projectId) {
        queryClient.invalidateQueries(['flexible-components', event.projectId]);
      }

      // Invalidate global schema queries
      queryClient.invalidateQueries(['schemas']);
    }
  }, [queryClient, onSchemaChange, autoInvalidateCache]);

  // Set up subscription
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscriptionId = SchemaEventBus.subscribe(handleSchemaChange, {
      types,
      schemaId,
      projectId,
    });

    subscriptionIdRef.current = subscriptionId;

    // Cleanup on unmount or dependency change
    return () => {
      if (subscriptionIdRef.current) {
        SchemaEventBus.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [enabled, types, schemaId, projectId, handleSchemaChange]);

  // Note: Cleanup is handled in the first useEffect above - this redundant useEffect has been removed
};

/**
 * Hook for listening to specific schema events
 */
export const useSpecificSchemaListener = (
  schemaId: string,
  onSchemaChange: (event: SchemaChangeEvent) => void,
  projectId?: string
) => {
  useSchemaChangeListener({
    schemaId,
    projectId,
    onSchemaChange,
    autoInvalidateCache: true,
  });
};

/**
 * Hook for listening to project schema events
 */
export const useProjectSchemaListener = (
  projectId: string,
  onSchemaChange: (event: SchemaChangeEvent) => void
) => {
  useSchemaChangeListener({
    projectId,
    onSchemaChange,
    autoInvalidateCache: true,
  });
};

/**
 * Hook for component integration - listens to schema changes and provides helpers
 */
export const useSchemaChangeIntegration = (options: {
  projectId?: string;
  onSchemaCreated?: (event: SchemaChangeEvent) => void;
  onSchemaUpdated?: (event: SchemaChangeEvent) => void;
  onSchemaDeleted?: (event: SchemaChangeEvent) => void;
}) => {
  const { projectId, onSchemaCreated, onSchemaUpdated, onSchemaDeleted } = options;

  const handleSchemaChange = useCallback((event: SchemaChangeEvent) => {
    switch (event.type) {
      case 'schema_created':
        onSchemaCreated?.(event);
        break;
      case 'schema_updated':
        onSchemaUpdated?.(event);
        break;
      case 'schema_deleted':
        onSchemaDeleted?.(event);
        break;
    }
  }, [onSchemaCreated, onSchemaUpdated, onSchemaDeleted]);

  useSchemaChangeListener({
    projectId,
    types: ['schema_created', 'schema_updated', 'schema_deleted'],
    onSchemaChange: handleSchemaChange,
    autoInvalidateCache: true,
  });

  // Return helper functions for emitting events
  return {
    emitSchemaCreated: (schemaId: string, data?: any) =>
      SchemaEventBus.emitSchemaCreated(schemaId, projectId, data),
    emitSchemaUpdated: (schemaId: string, data?: any) =>
      SchemaEventBus.emitSchemaUpdated(schemaId, projectId, data),
    emitSchemaDeleted: (schemaId: string, data?: any) =>
      SchemaEventBus.emitSchemaDeleted(schemaId, projectId, data),
  };
};

export default useSchemaChangeListener;