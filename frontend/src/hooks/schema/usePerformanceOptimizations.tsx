/**
 * Performance Optimization Hooks for Schema Management
 *
 * Provides hooks for debouncing, memoization, virtual scrolling,
 * lazy loading, and memory leak prevention in schema editing interfaces.
 */

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

// ========================================
// DEBOUNCED STATE UPDATES
// ========================================

export interface DebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export const useDebounced = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  options: DebounceOptions = {}
): [T, { cancel: () => void; flush: () => void; pending: () => boolean }] => {
  const callbackRef = useRef(callback);
  const [isPending, setIsPending] = useState(false);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const debouncedFn = debounce(
      (...args: Parameters<T>) => {
        setIsPending(false);
        callbackRef.current(...args);
      },
      delay,
      {
        leading: options.leading ?? false,
        trailing: options.trailing ?? true,
        maxWait: options.maxWait,
      }
    );

    // Wrap to track pending state and preserve debounce methods
    const wrappedFn = (...args: Parameters<T>) => {
      setIsPending(true);
      return debouncedFn(...args);
    };

    // Preserve the cancel and flush methods from lodash debounce
    (wrappedFn as any).cancel = debouncedFn.cancel.bind(debouncedFn);
    (wrappedFn as any).flush = debouncedFn.flush.bind(debouncedFn);

    return wrappedFn as T;
  }, [delay, options.leading, options.trailing, options.maxWait]);

  const controls = useMemo(
    () => ({
      cancel: () => {
        debouncedCallback.cancel();
        setIsPending(false);
      },
      flush: () => {
        const result = debouncedCallback.flush();
        setIsPending(false);
        return result;
      },
      pending: () => isPending,
    }),
    [debouncedCallback, isPending]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return [debouncedCallback, controls];
};

// ========================================
// BATCHED STATE UPDATES
// ========================================

export const useBatchedUpdates = <T,>(
  batchSize: number = 5,
  batchDelay: number = 100
) => {
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onBatchRef = useRef<((batch: T[]) => void) | null>(null);

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0 && onBatchRef.current) {
      onBatchRef.current([...batchRef.current]);
      batchRef.current = [];
    }
    timeoutRef.current = null;
  }, []);

  const addToBatch = useCallback(
    (item: T) => {
      batchRef.current.push(item);

      if (batchRef.current.length >= batchSize) {
        // Process immediately if batch is full
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        processBatch();
      } else if (!timeoutRef.current) {
        // Schedule processing if not already scheduled
        timeoutRef.current = setTimeout(processBatch, batchDelay);
      }
    },
    [batchSize, batchDelay, processBatch]
  );

  const setBatchHandler = useCallback((handler: (batch: T[]) => void) => {
    onBatchRef.current = handler;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    processBatch();
  }, [processBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { addToBatch, setBatchHandler, flush };
};

// ========================================
// MEMOIZATION UTILITIES
// ========================================

export const useDeepMemo = <T,>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const depsRef = useRef<React.DependencyList>();
  const valueRef = useRef<T>();

  const hasChanged = useMemo(() => {
    if (!depsRef.current) return true;
    if (depsRef.current.length !== deps.length) return true;

    return deps.some((dep, index) => {
      const prevDep = depsRef.current![index];
      return !Object.is(dep, prevDep);
    });
  }, deps);

  if (hasChanged) {
    depsRef.current = deps;
    valueRef.current = factory();
  }

  return valueRef.current!;
};

export const useExpensiveComputation = <T, P extends ReadonlyArray<any>>(
  computeFn: (...args: P) => T,
  deps: P,
  options: {
    cacheSize?: number;
    ttlMs?: number;
  } = {}
): T => {
  const { cacheSize = 10, ttlMs = 5 * 60 * 1000 } = options; // 5 minutes default TTL

  const cacheRef = useRef<
    Map<
      string,
      {
        value: T;
        timestamp: number;
        accessCount: number;
      }
    >
  >(new Map());

  return useMemo(() => {
    const key = JSON.stringify(deps);
    const now = Date.now();
    const cached = cacheRef.current.get(key);

    // Check if cached value is still valid
    if (cached && now - cached.timestamp < ttlMs) {
      cached.accessCount++;
      return cached.value;
    }

    // Compute new value
    const value = computeFn(...deps);

    // Clean up expired entries and enforce cache size
    const cache = cacheRef.current;
    const expiredKeys = Array.from(cache.entries())
      .filter(([, entry]) => now - entry.timestamp >= ttlMs)
      .map(([key]) => key);

    expiredKeys.forEach(key => cache.delete(key));

    // If cache is full, remove least accessed items
    if (cache.size >= cacheSize) {
      const entries = Array.from(cache.entries()).sort(
        (a, b) => a[1].accessCount - b[1].accessCount
      );
      const toRemove = entries.slice(0, Math.max(1, cache.size - cacheSize + 1));
      toRemove.forEach(([key]) => cache.delete(key));
    }

    // Cache the new value
    cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
    });

    return value;
  }, deps);
};

// ========================================
// VIRTUAL SCROLLING
// ========================================

export interface VirtualScrollItem {
  id: string;
  height?: number;
  data?: any;
}

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  enableDynamicHeight?: boolean;
  enabled?: boolean;
}

export const useVirtualScroll = <T extends VirtualScrollItem>(
  items: T[],
  options: VirtualScrollOptions
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const { itemHeight, containerHeight, overscan = 5, enableDynamicHeight = false, enabled = true } = options;

  const itemHeights = useRef<Map<string, number>>(new Map());

  const getItemHeight = useCallback(
    (item: T, index: number): number => {
      if (enableDynamicHeight && item.height !== undefined) {
        return item.height;
      }
      if (enableDynamicHeight && itemHeights.current.has(item.id)) {
        return itemHeights.current.get(item.id)!;
      }
      return itemHeight;
    },
    [itemHeight, enableDynamicHeight]
  );

  const virtualItems = useMemo(() => {
    // If virtual scrolling is disabled, return all items
    if (!enabled) {
      return items.map((item, index) => ({
        index,
        item,
        height: getItemHeight(item, index),
        offsetTop: 0, // Not used when virtual scrolling is disabled
      }));
    }

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

    const virtualItems = [];
    let offsetTop = 0;

    // Calculate offset for items before visible range
    for (let i = 0; i < startIndex; i++) {
      offsetTop += getItemHeight(items[i], i);
    }

    // Create virtual items for visible range
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      const height = getItemHeight(item, i);

      virtualItems.push({
        index: i,
        item,
        height,
        offsetTop,
      });

      offsetTop += height;
    }

    return virtualItems;
  }, [items, scrollTop, itemHeight, containerHeight, overscan, getItemHeight, enabled]);

  const totalHeight = useMemo(() => {
    return items.reduce((total, item, index) => {
      return total + getItemHeight(item, index);
    }, 0);
  }, [items, getItemHeight]);

  const updateItemHeight = useCallback((itemId: string, height: number) => {
    if (enableDynamicHeight) {
      itemHeights.current.set(itemId, height);
    }
  }, [enableDynamicHeight]);

  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (index < 0 || index >= items.length) return;

      let offsetTop = 0;
      for (let i = 0; i < index; i++) {
        offsetTop += getItemHeight(items[i], i);
      }

      const currentItemHeight = getItemHeight(items[index], index);

      let scrollTo = offsetTop;
      if (align === 'center') {
        scrollTo = offsetTop - containerHeight / 2 + currentItemHeight / 2;
      } else if (align === 'end') {
        scrollTo = offsetTop - containerHeight + currentItemHeight;
      }

      setScrollTop(Math.max(0, Math.min(scrollTo, totalHeight - containerHeight)));
    },
    [items, getItemHeight, containerHeight, totalHeight]
  );

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    updateItemHeight,
    scrollToIndex,
  };
};

// ========================================
// LAZY LOADING
// ========================================

export const useLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current || loading) return;

    setLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(() => module.default);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setLoading(false);
    }
  }, [importFn, loading]);

  return {
    Component,
    loading,
    error,
    load,
    loaded: loadedRef.current,
    LazyWrapper: useCallback(
      (props: React.ComponentProps<T>) => {
        if (loading && fallback) {
          const Fallback = fallback;
          return <Fallback />;
        }

        if (Component) {
          return <Component {...props} />;
        }

        return null;
      },
      [Component, loading, fallback]
    ),
  };
};

export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setElement = useCallback((element: Element | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element) {
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(([entry]) => {
          setIsIntersecting(entry.isIntersecting);
          setEntry(entry);
        }, options);
      }

      observerRef.current.observe(element);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { isIntersecting, entry, setElement };
};

// ========================================
// MEMORY LEAK PREVENTION
// ========================================

export const useCleanupEffect = (
  effect: () => (() => void) | void,
  deps: React.DependencyList
) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Run cleanup from previous effect
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Run new effect and store cleanup
    const cleanup = effect();
    if (typeof cleanup === 'function') {
      cleanupRef.current = cleanup;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, deps);

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
};

export const useEventListener = <K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | Element | null = window,
  options?: AddEventListenerOptions
) => {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element || !element.addEventListener) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K]);
    };

    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
};

export const useAbortController = () => {
  const controllerRef = useRef<AbortController | null>(null);

  const getController = useCallback(() => {
    if (!controllerRef.current || controllerRef.current.signal.aborted) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current;
  }, []);

  const abort = useCallback((reason?: any) => {
    if (controllerRef.current) {
      controllerRef.current.abort(reason);
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current = new AbortController();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort('Component unmounted');
      }
    };
  }, []);

  return {
    getController,
    abort,
    reset,
    signal: controllerRef.current?.signal,
  };
};

// ========================================
// PERFORMANCE MONITORING
// ========================================

export const usePerformanceMonitor = (name: string) => {
  const startTimeRef = useRef<number | null>(null);
  const measurementsRef = useRef<number[]>([]);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTimeRef.current !== null) {
      const duration = performance.now() - startTimeRef.current;
      measurementsRef.current.push(duration);

      // Keep only last 100 measurements
      if (measurementsRef.current.length > 100) {
        measurementsRef.current.shift();
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }

      startTimeRef.current = null;
      return duration;
    }
    return null;
  }, [name]);

  const getStats = useCallback(() => {
    const measurements = measurementsRef.current;
    if (measurements.length === 0) return null;

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }, []);

  const clear = useCallback(() => {
    measurementsRef.current = [];
  }, []);

  return { start, end, getStats, clear };
};

export default {
  useDebounced,
  useBatchedUpdates,
  useDeepMemo,
  useExpensiveComputation,
  useVirtualScroll,
  useLazyComponent,
  useIntersectionObserver,
  useCleanupEffect,
  useEventListener,
  useAbortController,
  usePerformanceMonitor,
};