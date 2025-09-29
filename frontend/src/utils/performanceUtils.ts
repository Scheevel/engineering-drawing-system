/**
 * Performance Utilities
 *
 * Collection of utility functions for performance optimization,
 * memory management, and efficient rendering in React applications.
 */

import { useRef, useEffect, useCallback } from 'react';

// ========================================
// MEMORY MANAGEMENT UTILITIES
// ========================================

export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private listeners: Set<any> = new Set();
  private timers: Set<any> = new Set();
  private observers: Set<any> = new Set();
  private abortControllers: Set<AbortController> = new Set();

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  registerEventListener(
    element: Element | Window | Document,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    element.addEventListener(event, handler, options);

    const cleanup = () => {
      element.removeEventListener(event, handler, options);
      this.listeners.delete(cleanup);
    };

    this.listeners.add(cleanup);
    return cleanup;
  }

  registerTimer(timer: NodeJS.Timeout): () => void {
    const cleanup = () => {
      clearTimeout(timer);
      this.timers.delete(cleanup);
    };

    this.timers.add(cleanup);
    return cleanup;
  }

  registerInterval(interval: NodeJS.Timeout): () => void {
    const cleanup = () => {
      clearInterval(interval);
      this.timers.delete(cleanup);
    };

    this.timers.add(cleanup);
    return cleanup;
  }

  registerObserver(observer: IntersectionObserver | MutationObserver | ResizeObserver): () => void {
    const cleanup = () => {
      observer.disconnect();
      this.observers.delete(cleanup);
    };

    this.observers.add(cleanup);
    return cleanup;
  }

  registerAbortController(controller: AbortController): () => void {
    const cleanup = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
      this.abortControllers.delete(controller);
    };

    this.abortControllers.add(controller);
    return cleanup;
  }

  cleanup(): void {
    // Cleanup all registered resources
    this.listeners.forEach(cleanup => cleanup());
    this.timers.forEach(cleanup => cleanup());
    this.observers.forEach(cleanup => cleanup());
    this.abortControllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });

    this.listeners.clear();
    this.timers.clear();
    this.observers.clear();
    this.abortControllers.clear();
  }

  getActiveResourceCounts(): {
    listeners: number;
    timers: number;
    observers: number;
    abortControllers: number;
  } {
    return {
      listeners: this.listeners.size,
      timers: this.timers.size,
      observers: this.observers.size,
      abortControllers: this.abortControllers.size,
    };
  }
}

// ========================================
// RENDERING OPTIMIZATION UTILITIES
// ========================================

export const createStableKey = (obj: any): string => {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (obj instanceof Date) return obj.toISOString();

  if (Array.isArray(obj)) {
    return `[${obj.map(createStableKey).join(',')}]`;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `${key}:${createStableKey(obj[key])}`);
    return `{${pairs.join(',')}}`;
  }

  return String(obj);
};

export const shallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
};

export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key =>
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }

  return false;
};

// ========================================
// BATCHING UTILITIES
// ========================================

export class UpdateBatcher {
  private queue: Array<() => void> = [];
  private isScheduled = false;

  schedule(update: () => void): void {
    this.queue.push(update);

    if (!this.isScheduled) {
      this.isScheduled = true;

      // Use MessageChannel for better scheduling than setTimeout
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          this.flush();
        };
        channel.port2.postMessage(null);
      } else {
        setTimeout(() => this.flush(), 0);
      }
    }
  }

  private flush(): void {
    const updates = this.queue.splice(0);
    this.isScheduled = false;

    // Execute all batched updates
    for (const update of updates) {
      try {
        update();
      } catch (error) {
        console.error('Error executing batched update:', error);
      }
    }
  }

  clear(): void {
    this.queue.length = 0;
    this.isScheduled = false;
  }
}

// ========================================
// THROTTLING AND DEBOUNCING
// ========================================

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle = false;
  let lastResult: ReturnType<T>;

  return ((...args: Parameters<T>): ReturnType<T> => {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  }) as T;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false
): T & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>): ReturnType<T> | undefined => {
    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) func(...args);
    }, delay);

    if (callNow) return func(...args);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
};

// ========================================
// CACHING UTILITIES
// ========================================

export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V> = new Map();

  constructor(capacity: number = 100) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expiry: number }> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

// ========================================
// PERFORMANCE MEASUREMENT
// ========================================

export class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();
  private activeTimers: Map<string, number> = new Map();

  start(label: string): void {
    this.activeTimers.set(label, performance.now());
  }

  end(label: string): number | null {
    const startTime = this.activeTimers.get(label);
    if (startTime === undefined) return null;

    const duration = performance.now() - startTime;
    this.activeTimers.delete(label);

    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }

    const measurements = this.measurements.get(label)!;
    measurements.push(duration);

    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    return duration;
  }

  getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  getAllStats(): Record<string, ReturnType<PerformanceProfiler['getStats']>> {
    const result: Record<string, any> = {};
    for (const label of this.measurements.keys()) {
      result[label] = this.getStats(label);
    }
    return result;
  }

  clear(label?: string): void {
    if (label) {
      this.measurements.delete(label);
      this.activeTimers.delete(label);
    } else {
      this.measurements.clear();
      this.activeTimers.clear();
    }
  }
}

// ========================================
// EXPORTS
// ========================================

export const memoryLeakDetector = MemoryLeakDetector.getInstance();
export const updateBatcher = new UpdateBatcher();
export const performanceProfiler = new PerformanceProfiler();

export default {
  MemoryLeakDetector,
  createStableKey,
  shallowEqual,
  deepEqual,
  UpdateBatcher,
  throttle,
  debounce,
  LRUCache,
  TTLCache,
  PerformanceProfiler,
  memoryLeakDetector,
  updateBatcher,
  performanceProfiler,
};