/**
 * Schema Event Bus
 *
 * Centralized event system for schema change notifications across components.
 * Provides real-time updates when schemas are created, modified, or deleted.
 */

export interface SchemaChangeEvent {
  type: 'schema_created' | 'schema_updated' | 'schema_deleted' | 'schema_activated' | 'schema_deactivated';
  schemaId: string;
  projectId?: string;
  data?: any;
  timestamp: number;
}

type EventCallback = (event: SchemaChangeEvent) => void;

interface EventSubscription {
  id: string;
  callback: EventCallback;
  types?: SchemaChangeEvent['type'][];
  schemaId?: string;
  projectId?: string;
}

class SchemaEventBusImpl {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: SchemaChangeEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to schema change events
   */
  subscribe(
    callback: EventCallback,
    options?: {
      types?: SchemaChangeEvent['type'][];
      schemaId?: string;
      projectId?: string;
    }
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      callback,
      types: options?.types,
      schemaId: options?.schemaId,
      projectId: options?.projectId,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from schema change events
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Emit a schema change event
   */
  emit(event: Omit<SchemaChangeEvent, 'timestamp'>): void {
    const fullEvent: SchemaChangeEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify subscribers
    this.subscriptions.forEach((subscription) => {
      if (this.shouldNotifySubscription(subscription, fullEvent)) {
        try {
          subscription.callback(fullEvent);
        } catch (error) {
          console.error('Error in schema event callback:', error);
        }
      }
    });
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit?: number): SchemaChangeEvent[] {
    const events = this.eventHistory.slice();
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Clear all subscriptions (useful for cleanup)
   */
  clear(): void {
    this.subscriptions.clear();
  }

  /**
   * Get subscription count (useful for debugging)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if a subscription should be notified for an event
   */
  private shouldNotifySubscription(
    subscription: EventSubscription,
    event: SchemaChangeEvent
  ): boolean {
    // Check event type filter
    if (subscription.types && !subscription.types.includes(event.type)) {
      return false;
    }

    // Check schema ID filter
    if (subscription.schemaId && subscription.schemaId !== event.schemaId) {
      return false;
    }

    // Check project ID filter
    if (subscription.projectId && subscription.projectId !== event.projectId) {
      return false;
    }

    return true;
  }

  /**
   * Helper methods for common schema events
   */

  emitSchemaCreated(schemaId: string, projectId?: string, data?: any): void {
    this.emit({
      type: 'schema_created',
      schemaId,
      projectId,
      data,
    });
  }

  emitSchemaUpdated(schemaId: string, projectId?: string, data?: any): void {
    this.emit({
      type: 'schema_updated',
      schemaId,
      projectId,
      data,
    });
  }

  emitSchemaDeleted(schemaId: string, projectId?: string, data?: any): void {
    this.emit({
      type: 'schema_deleted',
      schemaId,
      projectId,
      data,
    });
  }

  emitSchemaActivated(schemaId: string, projectId?: string, data?: any): void {
    this.emit({
      type: 'schema_activated',
      schemaId,
      projectId,
      data,
    });
  }

  emitSchemaDeactivated(schemaId: string, projectId?: string, data?: any): void {
    this.emit({
      type: 'schema_deactivated',
      schemaId,
      projectId,
      data,
    });
  }
}

// Create and export singleton instance
export const SchemaEventBus = new SchemaEventBusImpl();

// Export types
export type { EventCallback, EventSubscription };

// Helper function for React component cleanup
export const createSchemaEventCleanup = (...subscriptionIds: string[]) => {
  return () => {
    subscriptionIds.forEach(id => SchemaEventBus.unsubscribe(id));
  };
};

export default SchemaEventBus;