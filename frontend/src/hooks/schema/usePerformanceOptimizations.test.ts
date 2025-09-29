/**
 * Performance Optimizations Hook Tests
 *
 * Tests for debouncing, memoization, virtual scrolling, lazy loading,
 * and memory leak prevention utilities.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
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
  type DebounceOptions,
  type VirtualScrollOptions,
  type VirtualScrollItem,
} from './usePerformanceOptimizations';

// Mock lodash debounce
jest.mock('lodash', () => ({
  debounce: jest.fn((fn, delay, options) => {
    const debouncedFn = jest.fn((...args) => fn(...args));
    debouncedFn.cancel = jest.fn();
    debouncedFn.flush = jest.fn(() => fn());
    return debouncedFn;
  }),
}));

describe('usePerformanceOptimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useDebounced', () => {
    it('should debounce function calls', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebounced(mockCallback, 300)
      );

      const [debouncedFn] = result.current;

      act(() => {
        debouncedFn('test1');
        debouncedFn('test2');
        debouncedFn('test3');
      });

      // Should only call once after debounce delay
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should update pending state correctly', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebounced(mockCallback, 300)
      );

      const [debouncedFn, controls] = result.current;

      act(() => {
        debouncedFn('test');
      });

      expect(controls.pending()).toBe(true);

      act(() => {
        controls.flush();
      });

      expect(controls.pending()).toBe(false);
    });

    it('should handle cancel operation', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebounced(mockCallback, 300)
      );

      const [debouncedFn, controls] = result.current;

      act(() => {
        debouncedFn('test');
        controls.cancel();
      });

      expect(controls.pending()).toBe(false);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should apply debounce options', () => {
      const mockCallback = jest.fn();
      const options: DebounceOptions = {
        leading: true,
        trailing: false,
        maxWait: 1000,
      };

      renderHook(() => useDebounced(mockCallback, 300, options));

      const { debounce } = require('lodash');
      expect(debounce).toHaveBeenCalledWith(
        expect.any(Function),
        300,
        expect.objectContaining({
          leading: true,
          trailing: false,
          maxWait: 1000,
        })
      );
    });

    it('should cleanup on unmount', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() =>
        useDebounced(mockCallback, 300)
      );

      const [debouncedFn, controls] = result.current;

      act(() => {
        debouncedFn('test');
      });

      unmount();

      expect(controls.pending()).toBe(false);
    });
  });

  describe('useBatchedUpdates', () => {
    it('should batch updates by size', () => {
      const { result } = renderHook(() => useBatchedUpdates(3, 100));

      const mockBatchHandler = jest.fn();

      act(() => {
        result.current.setBatchHandler(mockBatchHandler);
        result.current.addToBatch('item1');
        result.current.addToBatch('item2');
        result.current.addToBatch('item3'); // Should trigger batch
      });

      expect(mockBatchHandler).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
    });

    it('should batch updates by delay', () => {
      const { result } = renderHook(() => useBatchedUpdates(5, 100));

      const mockBatchHandler = jest.fn();

      act(() => {
        result.current.setBatchHandler(mockBatchHandler);
        result.current.addToBatch('item1');
        result.current.addToBatch('item2');
      });

      expect(mockBatchHandler).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockBatchHandler).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should flush batch manually', () => {
      const { result } = renderHook(() => useBatchedUpdates(5, 1000));

      const mockBatchHandler = jest.fn();

      act(() => {
        result.current.setBatchHandler(mockBatchHandler);
        result.current.addToBatch('item1');
        result.current.addToBatch('item2');
        result.current.flush();
      });

      expect(mockBatchHandler).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should cleanup timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useBatchedUpdates(5, 100));

      const mockBatchHandler = jest.fn();

      act(() => {
        result.current.setBatchHandler(mockBatchHandler);
        result.current.addToBatch('item1');
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockBatchHandler).not.toHaveBeenCalled();
    });
  });

  describe('useDeepMemo', () => {
    it('should memoize values with deep dependency comparison', () => {
      const factory = jest.fn(() => ({ result: 'computed' }));
      const deps = [{ a: 1, b: 2 }, 'string', 123];

      const { result, rerender } = renderHook(
        ({ dependencies }) => useDeepMemo(factory, dependencies),
        { initialProps: { dependencies: deps } }
      );

      const firstResult = result.current;
      expect(factory).toHaveBeenCalledTimes(1);

      // Same dependencies - should not recompute
      rerender({ dependencies: deps });
      expect(result.current).toBe(firstResult);
      expect(factory).toHaveBeenCalledTimes(1);

      // Different dependencies - should recompute
      const newDeps = [{ a: 1, b: 3 }, 'string', 123];
      rerender({ dependencies: newDeps });
      expect(result.current).not.toBe(firstResult);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should handle empty dependencies', () => {
      const factory = jest.fn(() => 'result');

      const { result } = renderHook(() => useDeepMemo(factory, []));

      expect(result.current).toBe('result');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('useExpensiveComputation', () => {
    it('should cache computation results', () => {
      const computeFn = jest.fn((a: number, b: number) => a + b);

      const { result, rerender } = renderHook(
        ({ args }) => useExpensiveComputation(computeFn, args),
        { initialProps: { args: [1, 2] as const } }
      );

      expect(result.current).toBe(3);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Same args - should use cache
      rerender({ args: [1, 2] as const });
      expect(result.current).toBe(3);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Different args - should recompute
      rerender({ args: [2, 3] as const });
      expect(result.current).toBe(5);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it('should respect cache size limit', () => {
      const computeFn = jest.fn((x: number) => x * 2);
      const options = { cacheSize: 2 };

      const { rerender } = renderHook(
        ({ args }) => useExpensiveComputation(computeFn, args, options),
        { initialProps: { args: [1] as const } }
      );

      // Fill cache
      rerender({ args: [2] as const });
      rerender({ args: [3] as const }); // Should evict first entry

      // First entry should be recomputed
      rerender({ args: [1] as const });
      expect(computeFn).toHaveBeenCalledTimes(4); // 1,2,3,1
    });

    it('should respect TTL expiration', () => {
      const computeFn = jest.fn((x: number) => x * 2);
      const options = { ttlMs: 100 };

      const { rerender } = renderHook(
        ({ args }) => useExpensiveComputation(computeFn, args, options),
        { initialProps: { args: [1] as const } }
      );

      expect(computeFn).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Same args but cache expired - should recompute
      rerender({ args: [1] as const });
      expect(computeFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('useVirtualScroll', () => {
    const mockItems: VirtualScrollItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      height: 50,
      data: { name: `Item ${i}` },
    }));

    const options: VirtualScrollOptions = {
      itemHeight: 50,
      containerHeight: 400,
      overscan: 5,
    };

    it('should calculate visible items correctly', () => {
      const { result } = renderHook(() =>
        useVirtualScroll(mockItems, options)
      );

      expect(result.current.virtualItems).toHaveLength(18); // 8 visible + 10 overscan
      expect(result.current.totalHeight).toBe(5000); // 100 * 50
    });

    it('should update virtual items when scrolled', () => {
      const { result } = renderHook(() =>
        useVirtualScroll(mockItems, options)
      );

      act(() => {
        result.current.setScrollTop(1000); // Scroll down
      });

      const firstItem = result.current.virtualItems[0];
      expect(firstItem.index).toBeGreaterThan(10); // Should be deeper in list
    });

    it('should handle dynamic item heights', () => {
      const dynamicOptions = { ...options, enableDynamicHeight: true };

      const { result } = renderHook(() =>
        useVirtualScroll(mockItems, dynamicOptions)
      );

      act(() => {
        result.current.updateItemHeight('item-0', 100);
      });

      // Total height should be updated
      expect(result.current.totalHeight).toBe(5050); // 99*50 + 100
    });

    it('should scroll to specific index', () => {
      const { result } = renderHook(() =>
        useVirtualScroll(mockItems, options)
      );

      act(() => {
        result.current.scrollToIndex(50, 'center');
      });

      const expectedPosition = 50 * 50 - 400 / 2 + 50 / 2; // Item position - half container + half item
      expect(result.current.scrollTop).toBe(expectedPosition);
    });

    it('should handle scroll to index with different alignments', () => {
      const { result } = renderHook(() =>
        useVirtualScroll(mockItems, options)
      );

      // Test 'start' alignment
      act(() => {
        result.current.scrollToIndex(10, 'start');
      });
      expect(result.current.scrollTop).toBe(500);

      // Test 'end' alignment
      act(() => {
        result.current.scrollToIndex(10, 'end');
      });
      expect(result.current.scrollTop).toBe(150); // 500 - 400 + 50
    });
  });

  describe('useLazyComponent', () => {
    const MockComponent = () => React.createElement('div', null, 'Loaded');

    it('should load component lazily', async () => {
      const importFn = jest.fn(() =>
        Promise.resolve({ default: MockComponent })
      );

      const { result } = renderHook(() =>
        useLazyComponent(importFn)
      );

      expect(result.current.Component).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.loaded).toBe(false);

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.Component).toBe(MockComponent);
      expect(result.current.loading).toBe(false);
      expect(result.current.loaded).toBe(true);
      expect(importFn).toHaveBeenCalledTimes(1);
    });

    it('should handle loading errors', async () => {
      const importFn = jest.fn(() =>
        Promise.reject(new Error('Import failed'))
      );

      const { result } = renderHook(() =>
        useLazyComponent(importFn)
      );

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.Component).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error?.message).toBe('Import failed');
    });

    it('should not load multiple times', async () => {
      const importFn = jest.fn(() =>
        Promise.resolve({ default: MockComponent })
      );

      const { result } = renderHook(() =>
        useLazyComponent(importFn)
      );

      await act(async () => {
        // Trigger multiple loads
        await Promise.all([
          result.current.load(),
          result.current.load(),
          result.current.load(),
        ]);
      });

      expect(importFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('useIntersectionObserver', () => {
    const mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };

    beforeEach(() => {
      global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
        mockObserver.callback = callback;
        return mockObserver;
      });
    });

    it('should create intersection observer', () => {
      const options = { threshold: 0.5 };
      const { result } = renderHook(() =>
        useIntersectionObserver(options)
      );

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );

      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeNull();
    });

    it('should observe element when set', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      const mockElement = document.createElement('div');

      act(() => {
        result.current.setElement(mockElement);
      });

      expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
    });

    it('should handle intersection changes', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      const mockElement = document.createElement('div');

      act(() => {
        result.current.setElement(mockElement);
      });

      const mockEntry = {
        isIntersecting: true,
        target: mockElement,
      };

      act(() => {
        mockObserver.callback([mockEntry]);
      });

      expect(result.current.isIntersecting).toBe(true);
      expect(result.current.entry).toBe(mockEntry);
    });

    it('should unobserve previous element when new one is set', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      act(() => {
        result.current.setElement(element1);
      });

      act(() => {
        result.current.setElement(element2);
      });

      expect(mockObserver.unobserve).toHaveBeenCalledWith(element1);
      expect(mockObserver.observe).toHaveBeenCalledWith(element2);
    });

    it('should disconnect observer on unmount', () => {
      const { result, unmount } = renderHook(() => useIntersectionObserver());

      const mockElement = document.createElement('div');

      act(() => {
        result.current.setElement(mockElement);
      });

      unmount();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('useCleanupEffect', () => {
    it('should run effect and cleanup', () => {
      const cleanup = jest.fn();
      const effect = jest.fn(() => cleanup);

      const { rerender, unmount } = renderHook(
        ({ deps }) => useCleanupEffect(effect, deps),
        { initialProps: { deps: [1] } }
      );

      expect(effect).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      // Change dependencies - should run cleanup and new effect
      rerender({ deps: [2] });

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledTimes(2);

      // Unmount - should run final cleanup
      unmount();

      expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it('should handle effects without cleanup', () => {
      const effect = jest.fn();

      const { unmount } = renderHook(() =>
        useCleanupEffect(effect, [])
      );

      expect(effect).toHaveBeenCalledTimes(1);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('useEventListener', () => {
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();

    beforeEach(() => {
      global.window.addEventListener = mockAddEventListener;
      global.window.removeEventListener = mockRemoveEventListener;
    });

    it('should add event listener', () => {
      const handler = jest.fn();

      renderHook(() =>
        useEventListener('click', handler)
      );

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );
    });

    it('should remove event listener on unmount', () => {
      const handler = jest.fn();

      const { unmount } = renderHook(() =>
        useEventListener('click', handler)
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );
    });

    it('should handle custom element', () => {
      const handler = jest.fn();
      const element = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as any;

      const { unmount } = renderHook(() =>
        useEventListener('click', handler, element)
      );

      expect(element.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );

      unmount();

      expect(element.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );
    });
  });

  describe('useAbortController', () => {
    it('should create abort controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getController();
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
    });

    it('should abort controller', () => {
      const { result } = renderHook(() => useAbortController());

      const controller = result.current.getController();

      act(() => {
        result.current.abort('Test reason');
      });

      expect(controller.signal.aborted).toBe(true);
    });

    it('should reset controller', () => {
      const { result } = renderHook(() => useAbortController());

      const firstController = result.current.getController();

      act(() => {
        result.current.abort();
      });

      act(() => {
        result.current.reset();
      });

      const secondController = result.current.getController();
      expect(secondController).not.toBe(firstController);
      expect(secondController.signal.aborted).toBe(false);
    });

    it('should abort on unmount', () => {
      const { result, unmount } = renderHook(() => useAbortController());

      const controller = result.current.getController();

      unmount();

      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('usePerformanceMonitor', () => {
    beforeEach(() => {
      global.performance.now = jest.fn()
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150)
        .mockReturnValueOnce(200);
    });

    it('should measure performance', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitor('test-operation')
      );

      act(() => {
        result.current.start();
      });

      const duration = act(() => {
        return result.current.end();
      });

      expect(duration).toBe(50); // 150 - 100
    });

    it('should provide performance statistics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitor('test-operation')
      );

      // Add some measurements
      act(() => {
        result.current.start();
        result.current.end();
      });

      global.performance.now = jest.fn()
        .mockReturnValueOnce(300)
        .mockReturnValueOnce(400);

      act(() => {
        result.current.start();
        result.current.end();
      });

      const stats = result.current.getStats();
      expect(stats).toEqual({
        avg: 75, // (50 + 100) / 2
        min: 50,
        max: 100,
        count: 2,
      });
    });

    it('should clear measurements', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitor('test-operation')
      );

      act(() => {
        result.current.start();
        result.current.end();
      });

      act(() => {
        result.current.clear();
      });

      const stats = result.current.getStats();
      expect(stats).toBeNull();
    });

    it('should handle end without start', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitor('test-operation')
      );

      const duration = act(() => {
        return result.current.end();
      });

      expect(duration).toBeNull();
    });

    it('should limit measurement history', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitor('test-operation')
      );

      // Add more than 100 measurements
      for (let i = 0; i < 105; i++) {
        global.performance.now = jest.fn()
          .mockReturnValueOnce(i * 10)
          .mockReturnValueOnce(i * 10 + 5);

        act(() => {
          result.current.start();
          result.current.end();
        });
      }

      const stats = result.current.getStats();
      expect(stats?.count).toBeLessThanOrEqual(100);
    });
  });
});