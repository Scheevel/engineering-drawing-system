/**
 * Tests for Schema Change Listener Hook
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
  useSchemaChangeListener,
  useSpecificSchemaListener,
  useProjectSchemaListener,
  useSchemaChangeIntegration,
} from './useSchemaChangeListener.ts';
import { SchemaEventBus, SchemaChangeEvent } from '../../utils/schemaEventBus.ts';

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSchemaChangeListener', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Clear all subscriptions before each test
    SchemaEventBus.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    // Clean up after each test
    SchemaEventBus.clear();
  });

  describe('Basic Functionality', () => {
    it('should subscribe to schema events on mount', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      renderHook(
        () => useSchemaChangeListener({ onSchemaChange }),
        { wrapper }
      );

      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);

      // Emit an event and verify callback is called
      act(() => {
        SchemaEventBus.emit({
          type: 'schema_created',
          schemaId: 'test-schema',
        });
      });

      expect(onSchemaChange).toHaveBeenCalledTimes(1);
      expect(onSchemaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_created',
          schemaId: 'test-schema',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should unsubscribe on unmount', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      const { unmount } = renderHook(
        () => useSchemaChangeListener({ onSchemaChange }),
        { wrapper }
      );

      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);

      unmount();

      expect(SchemaEventBus.getSubscriptionCount()).toBe(0);
    });

    it('should not subscribe when disabled', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      renderHook(
        () => useSchemaChangeListener({ onSchemaChange, enabled: false }),
        { wrapper }
      );

      expect(SchemaEventBus.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      renderHook(
        () => useSchemaChangeListener({
          types: ['schema_created'],
          onSchemaChange,
        }),
        { wrapper }
      );

      act(() => {
        SchemaEventBus.emit({ type: 'schema_created', schemaId: 'test-1' });
        SchemaEventBus.emit({ type: 'schema_updated', schemaId: 'test-2' });
      });

      expect(onSchemaChange).toHaveBeenCalledTimes(1);
      expect(onSchemaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_created',
          schemaId: 'test-1',
        })
      );
    });

    it('should filter events by schema ID', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      renderHook(
        () => useSchemaChangeListener({
          schemaId: 'target-schema',
          onSchemaChange,
        }),
        { wrapper }
      );

      act(() => {
        SchemaEventBus.emit({ type: 'schema_created', schemaId: 'target-schema' });
        SchemaEventBus.emit({ type: 'schema_created', schemaId: 'other-schema' });
      });

      expect(onSchemaChange).toHaveBeenCalledTimes(1);
      expect(onSchemaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          schemaId: 'target-schema',
        })
      );
    });

    it('should filter events by project ID', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      renderHook(
        () => useSchemaChangeListener({
          projectId: 'target-project',
          onSchemaChange,
        }),
        { wrapper }
      );

      act(() => {
        SchemaEventBus.emit({
          type: 'schema_created',
          schemaId: 'schema-1',
          projectId: 'target-project',
        });
        SchemaEventBus.emit({
          type: 'schema_created',
          schemaId: 'schema-2',
          projectId: 'other-project',
        });
      });

      expect(onSchemaChange).toHaveBeenCalledTimes(1);
      expect(onSchemaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'target-project',
        })
      );
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate React Query cache by default', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => wrapper, {});
      const queryClient = result.current.props.children.props.client;

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { } = renderHook(
        () => useSchemaChangeListener({
          autoInvalidateCache: true,
        }),
        { wrapper }
      );

      act(() => {
        SchemaEventBus.emit({
          type: 'schema_updated',
          schemaId: 'test-schema',
          projectId: 'test-project',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['project-schemas', 'test-project']);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['schema', 'test-schema']);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['component-schemas']);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['flexible-components', 'test-project']);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['schemas']);

      invalidateQueriesSpy.mockRestore();
    });

    it('should not invalidate cache when disabled', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => wrapper, {});
      const queryClient = result.current.props.children.props.client;

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderHook(
        () => useSchemaChangeListener({
          autoInvalidateCache: false,
        }),
        { wrapper }
      );

      act(() => {
        SchemaEventBus.emit({
          type: 'schema_updated',
          schemaId: 'test-schema',
          projectId: 'test-project',
        });
      });

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();

      invalidateQueriesSpy.mockRestore();
    });
  });

  describe('Dependency Changes', () => {
    it('should resubscribe when options change', () => {
      const onSchemaChange = jest.fn();
      const wrapper = createWrapper();

      const { rerender } = renderHook(
        ({ schemaId }: { schemaId?: string }) =>
          useSchemaChangeListener({ schemaId, onSchemaChange }),
        {
          wrapper,
          initialProps: { schemaId: 'schema-1' }
        }
      );

      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);

      // Change schema ID
      rerender({ schemaId: 'schema-2' });

      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);

      // Verify new subscription filters correctly
      act(() => {
        SchemaEventBus.emit({ type: 'schema_created', schemaId: 'schema-1' });
        SchemaEventBus.emit({ type: 'schema_created', schemaId: 'schema-2' });
      });

      // Should only receive event for schema-2
      expect(onSchemaChange).toHaveBeenCalledTimes(1);
      expect(onSchemaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          schemaId: 'schema-2',
        })
      );
    });
  });
});

describe('useSpecificSchemaListener', () => {
  beforeEach(() => {
    SchemaEventBus.clear();
  });

  afterEach(() => {
    SchemaEventBus.clear();
  });

  it('should listen to specific schema events', () => {
    const onSchemaChange = jest.fn();
    const wrapper = createWrapper();

    renderHook(
      () => useSpecificSchemaListener('target-schema', onSchemaChange, 'test-project'),
      { wrapper }
    );

    act(() => {
      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'target-schema',
        projectId: 'test-project',
      });
      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'other-schema',
        projectId: 'test-project',
      });
    });

    expect(onSchemaChange).toHaveBeenCalledTimes(1);
    expect(onSchemaChange).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaId: 'target-schema',
      })
    );
  });
});

describe('useProjectSchemaListener', () => {
  beforeEach(() => {
    SchemaEventBus.clear();
  });

  afterEach(() => {
    SchemaEventBus.clear();
  });

  it('should listen to project schema events', () => {
    const onSchemaChange = jest.fn();
    const wrapper = createWrapper();

    renderHook(
      () => useProjectSchemaListener('target-project', onSchemaChange),
      { wrapper }
    );

    act(() => {
      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'schema-1',
        projectId: 'target-project',
      });
      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'schema-2',
        projectId: 'other-project',
      });
    });

    expect(onSchemaChange).toHaveBeenCalledTimes(1);
    expect(onSchemaChange).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'target-project',
      })
    );
  });
});

describe('useSchemaChangeIntegration', () => {
  beforeEach(() => {
    SchemaEventBus.clear();
  });

  afterEach(() => {
    SchemaEventBus.clear();
  });

  it('should provide helper functions for emitting events', () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () => useSchemaChangeIntegration({ projectId: 'test-project' }),
      { wrapper }
    );

    expect(result.current.emitSchemaCreated).toBeInstanceOf(Function);
    expect(result.current.emitSchemaUpdated).toBeInstanceOf(Function);
    expect(result.current.emitSchemaDeleted).toBeInstanceOf(Function);
  });

  it('should handle schema events by type', () => {
    const onSchemaCreated = jest.fn();
    const onSchemaUpdated = jest.fn();
    const onSchemaDeleted = jest.fn();
    const wrapper = createWrapper();

    renderHook(
      () => useSchemaChangeIntegration({
        projectId: 'test-project',
        onSchemaCreated,
        onSchemaUpdated,
        onSchemaDeleted,
      }),
      { wrapper }
    );

    act(() => {
      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'schema-1',
        projectId: 'test-project',
      });
      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'schema-2',
        projectId: 'test-project',
      });
      SchemaEventBus.emit({
        type: 'schema_deleted',
        schemaId: 'schema-3',
        projectId: 'test-project',
      });
    });

    expect(onSchemaCreated).toHaveBeenCalledTimes(1);
    expect(onSchemaUpdated).toHaveBeenCalledTimes(1);
    expect(onSchemaDeleted).toHaveBeenCalledTimes(1);

    expect(onSchemaCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'schema_created',
        schemaId: 'schema-1',
      })
    );
  });

  it('should emit events using helper functions', () => {
    const wrapper = createWrapper();
    const callback = jest.fn();

    // Set up listener
    SchemaEventBus.subscribe(callback);

    const { result } = renderHook(
      () => useSchemaChangeIntegration({ projectId: 'test-project' }),
      { wrapper }
    );

    act(() => {
      result.current.emitSchemaCreated('new-schema', { name: 'Test Schema' });
      result.current.emitSchemaUpdated('updated-schema', { name: 'Updated Schema' });
      result.current.emitSchemaDeleted('deleted-schema');
    });

    expect(callback).toHaveBeenCalledTimes(3);

    expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: 'schema_created',
      schemaId: 'new-schema',
      projectId: 'test-project',
      data: { name: 'Test Schema' },
    }));

    expect(callback).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: 'schema_updated',
      schemaId: 'updated-schema',
      projectId: 'test-project',
      data: { name: 'Updated Schema' },
    }));

    expect(callback).toHaveBeenNthCalledWith(3, expect.objectContaining({
      type: 'schema_deleted',
      schemaId: 'deleted-schema',
      projectId: 'test-project',
    }));
  });
});