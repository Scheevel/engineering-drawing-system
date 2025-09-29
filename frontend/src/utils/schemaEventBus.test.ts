/**
 * Tests for Schema Event Bus
 */

import { SchemaEventBus, SchemaChangeEvent, createSchemaEventCleanup } from './schemaEventBus';

describe('SchemaEventBus', () => {
  beforeEach(() => {
    // Clear all subscriptions and history before each test
    SchemaEventBus.clear();
    // Clear event history by accessing the private property safely
    (SchemaEventBus as any).eventHistory = [];
  });

  afterEach(() => {
    // Clean up after each test
    SchemaEventBus.clear();
    (SchemaEventBus as any).eventHistory = [];
  });

  describe('Subscription Management', () => {
    it('should create subscriptions and return subscription IDs', () => {
      const callback = jest.fn();
      const subscriptionId = SchemaEventBus.subscribe(callback);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
      expect(subscriptionId).toMatch(/^sub_\d+_[a-z0-9]+$/);
      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);
    });

    it('should unsubscribe and remove subscriptions', () => {
      const callback = jest.fn();
      const subscriptionId = SchemaEventBus.subscribe(callback);

      expect(SchemaEventBus.getSubscriptionCount()).toBe(1);

      const removed = SchemaEventBus.unsubscribe(subscriptionId);
      expect(removed).toBe(true);
      expect(SchemaEventBus.getSubscriptionCount()).toBe(0);
    });

    it('should return false when unsubscribing non-existent subscription', () => {
      const removed = SchemaEventBus.unsubscribe('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should clear all subscriptions', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      SchemaEventBus.subscribe(callback1);
      SchemaEventBus.subscribe(callback2);

      expect(SchemaEventBus.getSubscriptionCount()).toBe(2);

      SchemaEventBus.clear();
      expect(SchemaEventBus.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Event Emission and Notification', () => {
    it('should notify all subscribed callbacks when event is emitted', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      SchemaEventBus.subscribe(callback1);
      SchemaEventBus.subscribe(callback2);

      const event = {
        type: 'schema_created' as const,
        schemaId: 'test-schema-1',
        projectId: 'test-project-1',
        data: { name: 'Test Schema' },
      };

      SchemaEventBus.emit(event);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      const emittedEvent = callback1.mock.calls[0][0];
      expect(emittedEvent).toMatchObject(event);
      expect(emittedEvent.timestamp).toBeDefined();
      expect(typeof emittedEvent.timestamp).toBe('number');
    });

    it('should filter events by type when specified in subscription', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      SchemaEventBus.subscribe(callback1, { types: ['schema_created'] });
      SchemaEventBus.subscribe(callback2, { types: ['schema_updated'] });

      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'test-schema-1',
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'test-schema-1',
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should filter events by schema ID when specified in subscription', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      SchemaEventBus.subscribe(callback1, { schemaId: 'schema-1' });
      SchemaEventBus.subscribe(callback2, { schemaId: 'schema-2' });

      SchemaEventBus.emit({
        type: 'schema_updated',
        schemaId: 'schema-1',
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
    });

    it('should filter events by project ID when specified in subscription', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      SchemaEventBus.subscribe(callback1, { projectId: 'project-1' });
      SchemaEventBus.subscribe(callback2, { projectId: 'project-2' });

      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'schema-1',
        projectId: 'project-1',
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      SchemaEventBus.subscribe(errorCallback);
      SchemaEventBus.subscribe(normalCallback);

      SchemaEventBus.emit({
        type: 'schema_created',
        schemaId: 'test-schema',
      });

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error in schema event callback:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Event History', () => {
    it('should maintain event history', () => {
      const event1 = {
        type: 'schema_created' as const,
        schemaId: 'schema-1',
      };

      const event2 = {
        type: 'schema_updated' as const,
        schemaId: 'schema-2',
      };

      SchemaEventBus.emit(event1);
      SchemaEventBus.emit(event2);

      const history = SchemaEventBus.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject(event1);
      expect(history[1]).toMatchObject(event2);
    });

    it('should limit event history and return recent events', () => {
      const history = SchemaEventBus.getEventHistory(2);
      expect(history).toHaveLength(0);

      // Emit multiple events
      for (let i = 0; i < 5; i++) {
        SchemaEventBus.emit({
          type: 'schema_created',
          schemaId: `schema-${i}`,
        });
      }

      const limitedHistory = SchemaEventBus.getEventHistory(3);
      expect(limitedHistory).toHaveLength(3);
      expect(limitedHistory[2].schemaId).toBe('schema-4'); // Most recent
    });
  });

  describe('Helper Methods', () => {
    it('should emit schema created events with helper method', () => {
      const callback = jest.fn();
      SchemaEventBus.subscribe(callback);

      SchemaEventBus.emitSchemaCreated('schema-1', 'project-1', { name: 'Test' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_created',
          schemaId: 'schema-1',
          projectId: 'project-1',
          data: { name: 'Test' },
        })
      );
    });

    it('should emit schema updated events with helper method', () => {
      const callback = jest.fn();
      SchemaEventBus.subscribe(callback);

      SchemaEventBus.emitSchemaUpdated('schema-1', 'project-1', { name: 'Updated' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_updated',
          schemaId: 'schema-1',
          projectId: 'project-1',
          data: { name: 'Updated' },
        })
      );
    });

    it('should emit schema deleted events with helper method', () => {
      const callback = jest.fn();
      SchemaEventBus.subscribe(callback);

      SchemaEventBus.emitSchemaDeleted('schema-1', 'project-1');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_deleted',
          schemaId: 'schema-1',
          projectId: 'project-1',
        })
      );
    });

    it('should emit schema activated events with helper method', () => {
      const callback = jest.fn();
      SchemaEventBus.subscribe(callback);

      SchemaEventBus.emitSchemaActivated('schema-1', 'project-1');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_activated',
          schemaId: 'schema-1',
          projectId: 'project-1',
        })
      );
    });

    it('should emit schema deactivated events with helper method', () => {
      const callback = jest.fn();
      SchemaEventBus.subscribe(callback);

      SchemaEventBus.emitSchemaDeactivated('schema-1', 'project-1');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_deactivated',
          schemaId: 'schema-1',
          projectId: 'project-1',
        })
      );
    });
  });

  describe('Cleanup Helper', () => {
    it('should create cleanup function that unsubscribes multiple subscriptions', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const id1 = SchemaEventBus.subscribe(callback1);
      const id2 = SchemaEventBus.subscribe(callback2);

      expect(SchemaEventBus.getSubscriptionCount()).toBe(2);

      const cleanup = createSchemaEventCleanup(id1, id2);
      cleanup();

      expect(SchemaEventBus.getSubscriptionCount()).toBe(0);
    });
  });
});