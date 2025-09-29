/**
 * Performance Utils Tests
 *
 * Tests for memory leak detection, caching utilities, batching,
 * throttling/debouncing, and performance measurement tools.
 */

import {
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
} from './performanceUtils';

// Mock MessageChannel for UpdateBatcher tests
global.MessageChannel = jest.fn().mockImplementation(() => ({
  port1: { onmessage: null },
  port2: { postMessage: jest.fn() },
}));

describe('PerformanceUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MemoryLeakDetector', () => {
    let detector: MemoryLeakDetector;

    beforeEach(() => {
      detector = MemoryLeakDetector.getInstance();
      detector.cleanup(); // Clean up any previous state
    });

    it('should be a singleton', () => {
      const detector1 = MemoryLeakDetector.getInstance();
      const detector2 = MemoryLeakDetector.getInstance();
      expect(detector1).toBe(detector2);
    });

    it('should register and cleanup event listeners', () => {
      const element = document.createElement('div');
      const handler = jest.fn();

      const cleanup = detector.registerEventListener(element, 'click', handler);

      expect(detector.getActiveResourceCounts().listeners).toBe(1);

      cleanup();

      expect(detector.getActiveResourceCounts().listeners).toBe(0);
    });

    it('should register and cleanup timers', () => {
      const timer = setTimeout(() => {}, 1000);

      const cleanup = detector.registerTimer(timer);

      expect(detector.getActiveResourceCounts().timers).toBe(1);

      cleanup();

      expect(detector.getActiveResourceCounts().timers).toBe(0);
    });

    it('should register and cleanup intervals', () => {
      const interval = setInterval(() => {}, 1000);

      const cleanup = detector.registerInterval(interval);

      expect(detector.getActiveResourceCounts().timers).toBe(1);

      cleanup();

      expect(detector.getActiveResourceCounts().timers).toBe(0);
    });

    it('should register and cleanup observers', () => {
      const observer = new IntersectionObserver(() => {});

      const cleanup = detector.registerObserver(observer);

      expect(detector.getActiveResourceCounts().observers).toBe(1);

      cleanup();

      expect(detector.getActiveResourceCounts().observers).toBe(0);
    });

    it('should register and cleanup abort controllers', () => {
      const controller = new AbortController();

      const cleanup = detector.registerAbortController(controller);

      expect(detector.getActiveResourceCounts().abortControllers).toBe(1);
      expect(controller.signal.aborted).toBe(false);

      cleanup();

      expect(detector.getActiveResourceCounts().abortControllers).toBe(0);
      expect(controller.signal.aborted).toBe(true);
    });

    it('should cleanup all resources at once', () => {
      const element = document.createElement('div');
      const timer = setTimeout(() => {}, 1000);
      const observer = new IntersectionObserver(() => {});
      const controller = new AbortController();

      detector.registerEventListener(element, 'click', jest.fn());
      detector.registerTimer(timer);
      detector.registerObserver(observer);
      detector.registerAbortController(controller);

      const counts = detector.getActiveResourceCounts();
      expect(counts.listeners).toBe(1);
      expect(counts.timers).toBe(1);
      expect(counts.observers).toBe(1);
      expect(counts.abortControllers).toBe(1);

      detector.cleanup();

      const cleanCounts = detector.getActiveResourceCounts();
      expect(cleanCounts.listeners).toBe(0);
      expect(cleanCounts.timers).toBe(0);
      expect(cleanCounts.observers).toBe(0);
      expect(cleanCounts.abortControllers).toBe(0);
      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('Key Generation and Equality', () => {
    describe('createStableKey', () => {
      it('should create stable keys for primitives', () => {
        expect(createStableKey(null)).toBe('null');
        expect(createStableKey(undefined)).toBe('null');
        expect(createStableKey('test')).toBe('test');
        expect(createStableKey(123)).toBe('123');
        expect(createStableKey(true)).toBe('true');
        expect(createStableKey(false)).toBe('false');
      });

      it('should create stable keys for dates', () => {
        const date = new Date('2024-01-01T00:00:00Z');
        expect(createStableKey(date)).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should create stable keys for arrays', () => {
        expect(createStableKey([1, 2, 3])).toBe('[1,2,3]');
        expect(createStableKey(['a', 'b'])).toBe('[a,b]');
        expect(createStableKey([])).toBe('[]');
      });

      it('should create stable keys for objects', () => {
        expect(createStableKey({ b: 2, a: 1 })).toBe('{a:1,b:2}');
        expect(createStableKey({})).toBe('{}');
      });

      it('should create stable keys for nested structures', () => {
        const complex = {
          arr: [1, { nested: 'value' }],
          obj: { c: 3, a: 1 },
        };
        const key = createStableKey(complex);
        expect(key).toBe('{arr:[1,{nested:value}],obj:{a:1,c:3}}');
      });
    });

    describe('shallowEqual', () => {
      it('should compare primitive values', () => {
        expect(shallowEqual(1, 1)).toBe(true);
        expect(shallowEqual('a', 'a')).toBe(true);
        expect(shallowEqual(1, 2)).toBe(false);
        expect(shallowEqual(null, null)).toBe(true);
        expect(shallowEqual(undefined, undefined)).toBe(true);
        expect(shallowEqual(null, undefined)).toBe(false);
      });

      it('should compare object properties shallowly', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 3 };

        expect(shallowEqual(obj1, obj2)).toBe(true);
        expect(shallowEqual(obj1, obj3)).toBe(false);
      });

      it('should not compare nested objects deeply', () => {
        const obj1 = { a: { nested: 1 } };
        const obj2 = { a: { nested: 1 } };

        expect(shallowEqual(obj1, obj2)).toBe(false); // Different references
      });

      it('should handle different key counts', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 1, b: 2 };

        expect(shallowEqual(obj1, obj2)).toBe(false);
      });
    });

    describe('deepEqual', () => {
      it('should compare primitive values', () => {
        expect(deepEqual(1, 1)).toBe(true);
        expect(deepEqual('a', 'a')).toBe(true);
        expect(deepEqual(1, 2)).toBe(false);
      });

      it('should compare arrays deeply', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
        expect(deepEqual([1, 2], [1, 3])).toBe(false);
        expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      });

      it('should compare objects deeply', () => {
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { a: 1, b: { c: 2 } };
        const obj3 = { a: 1, b: { c: 3 } };

        expect(deepEqual(obj1, obj2)).toBe(true);
        expect(deepEqual(obj1, obj3)).toBe(false);
      });

      it('should handle mixed types', () => {
        expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
        expect(deepEqual(null, undefined)).toBe(false);
      });
    });
  });

  describe('UpdateBatcher', () => {
    let batcher: UpdateBatcher;

    beforeEach(() => {
      batcher = new UpdateBatcher();
    });

    it('should batch updates and execute them', () => {
      const update1 = jest.fn();
      const update2 = jest.fn();

      batcher.schedule(update1);
      batcher.schedule(update2);

      expect(update1).not.toHaveBeenCalled();
      expect(update2).not.toHaveBeenCalled();

      // Trigger MessageChannel message
      const messageChannel = (global.MessageChannel as jest.Mock).mock.results[0].value;
      messageChannel.port1.onmessage();

      expect(update1).toHaveBeenCalled();
      expect(update2).toHaveBeenCalled();
    });

    it('should handle update errors gracefully', () => {
      const goodUpdate = jest.fn();
      const badUpdate = jest.fn(() => {
        throw new Error('Update error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      batcher.schedule(goodUpdate);
      batcher.schedule(badUpdate);

      const messageChannel = (global.MessageChannel as jest.Mock).mock.results[0].value;
      messageChannel.port1.onmessage();

      expect(goodUpdate).toHaveBeenCalled();
      expect(badUpdate).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error executing batched update:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should fall back to setTimeout when MessageChannel is unavailable', () => {
      const originalMessageChannel = global.MessageChannel;
      delete (global as any).MessageChannel;

      const newBatcher = new UpdateBatcher();
      const update = jest.fn();

      newBatcher.schedule(update);

      jest.advanceTimersByTime(0);

      expect(update).toHaveBeenCalled();

      global.MessageChannel = originalMessageChannel;
    });

    it('should clear pending updates', () => {
      const update = jest.fn();

      batcher.schedule(update);
      batcher.clear();

      const messageChannel = (global.MessageChannel as jest.Mock).mock.results[0].value;
      messageChannel.port1.onmessage();

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('Throttling and Debouncing', () => {
    describe('throttle', () => {
      it('should throttle function calls', () => {
        const fn = jest.fn((x: number) => x * 2);
        const throttled = throttle(fn, 100);

        const result1 = throttled(1);
        const result2 = throttled(2);
        const result3 = throttled(3);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith(1);
        expect(result1).toBe(2);
        expect(result2).toBe(2); // Returns cached result
        expect(result3).toBe(2); // Returns cached result

        jest.advanceTimersByTime(100);

        const result4 = throttled(4);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(result4).toBe(8);
      });
    });

    describe('debounce', () => {
      it('should debounce function calls', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);

        debounced('a');
        debounced('b');
        debounced('c');

        expect(fn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('c');
      });

      it('should support immediate execution', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100, true);

        const result = debounced('immediate');

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('immediate');

        // Subsequent calls should be debounced
        debounced('delayed');
        expect(fn).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1); // No additional call with immediate=true
      });

      it('should support cancellation', () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);

        debounced('test');
        debounced.cancel();

        jest.advanceTimersByTime(100);

        expect(fn).not.toHaveBeenCalled();
      });
    });
  });

  describe('LRU Cache', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBeUndefined();
    });

    it('should evict least recently used items', () => {
      const cache = new LRUCache<string, number>(2);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('should update access order on get', () => {
      const cache = new LRUCache<string, number>(2);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.get('a'); // Move 'a' to end
      cache.set('c', 3); // Should evict 'b'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });

    it('should handle updates to existing keys', () => {
      const cache = new LRUCache<string, number>(2);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('a', 10); // Update existing

      expect(cache.size()).toBe(2);
      expect(cache.get('a')).toBe(10);
    });

    it('should provide utility methods', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('c')).toBe(false);
      expect(cache.size()).toBe(2);

      expect(Array.from(cache.keys())).toEqual(['a', 'b']);
      expect(Array.from(cache.values())).toEqual([1, 2]);

      cache.delete('a');
      expect(cache.has('a')).toBe(false);
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL Cache', () => {
    beforeEach(() => {
      // Mock Date.now for TTL tests
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(3000);
    });

    it('should store and retrieve values within TTL', () => {
      const cache = new TTLCache<string, number>(1000); // 1 second TTL

      Date.now = jest.fn().mockReturnValue(1000);
      cache.set('a', 1);

      Date.now = jest.fn().mockReturnValue(1500); // 500ms later
      expect(cache.get('a')).toBe(1);
    });

    it('should expire values after TTL', () => {
      const cache = new TTLCache<string, number>(1000);

      Date.now = jest.fn().mockReturnValue(1000);
      cache.set('a', 1);

      Date.now = jest.fn().mockReturnValue(2500); // 1.5 seconds later
      expect(cache.get('a')).toBeUndefined();
    });

    it('should handle has() with TTL expiration', () => {
      const cache = new TTLCache<string, number>(1000);

      Date.now = jest.fn().mockReturnValue(1000);
      cache.set('a', 1);

      Date.now = jest.fn().mockReturnValue(1500);
      expect(cache.has('a')).toBe(true);

      Date.now = jest.fn().mockReturnValue(2500);
      expect(cache.has('a')).toBe(false);
    });

    it('should cleanup expired entries', () => {
      const cache = new TTLCache<string, number>(1000);

      Date.now = jest.fn().mockReturnValue(1000);
      cache.set('a', 1);
      cache.set('b', 2);

      Date.now = jest.fn().mockReturnValue(2500); // Expire 'a' and 'b'
      cache.cleanup();

      // Access through size() which calls cleanup internally
      expect(cache.size()).toBe(0);
    });

    it('should provide utility methods', () => {
      const cache = new TTLCache<string, number>(1000);

      Date.now = jest.fn().mockReturnValue(1000);
      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.size()).toBe(2);

      cache.delete('a');
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('PerformanceProfiler', () => {
    beforeEach(() => {
      global.performance.now = jest.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);
    });

    it('should measure execution time', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('test');
      const duration = profiler.end('test');

      expect(duration).toBe(50); // 1050 - 1000
    });

    it('should return null for invalid measurements', () => {
      const profiler = new PerformanceProfiler();

      const duration = profiler.end('nonexistent');
      expect(duration).toBeNull();
    });

    it('should calculate statistics', () => {
      const profiler = new PerformanceProfiler();

      // First measurement: 50ms
      profiler.start('test');
      profiler.end('test');

      // Second measurement: 100ms
      profiler.start('test');
      profiler.end('test');

      const stats = profiler.getStats('test');
      expect(stats).toEqual({
        count: 2,
        avg: 75, // (50 + 100) / 2
        min: 50,
        max: 100,
        median: 50, // First element in sorted array [50, 100]
      });
    });

    it('should return null stats for unknown labels', () => {
      const profiler = new PerformanceProfiler();

      const stats = profiler.getStats('unknown');
      expect(stats).toBeNull();
    });

    it('should limit measurement history', () => {
      const profiler = new PerformanceProfiler();

      // Add 105 measurements
      for (let i = 0; i < 105; i++) {
        global.performance.now = jest.fn()
          .mockReturnValueOnce(i * 10)
          .mockReturnValueOnce(i * 10 + 5);

        profiler.start('test');
        profiler.end('test');
      }

      const stats = profiler.getStats('test');
      expect(stats?.count).toBeLessThanOrEqual(100);
    });

    it('should get all statistics', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('test1');
      profiler.end('test1');

      profiler.start('test2');
      profiler.end('test2');

      const allStats = profiler.getAllStats();
      expect(allStats).toHaveProperty('test1');
      expect(allStats).toHaveProperty('test2');
    });

    it('should clear measurements', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('test');
      profiler.end('test');

      expect(profiler.getStats('test')).not.toBeNull();

      profiler.clear('test');
      expect(profiler.getStats('test')).toBeNull();
    });

    it('should clear all measurements', () => {
      const profiler = new PerformanceProfiler();

      profiler.start('test1');
      profiler.end('test1');
      profiler.start('test2');
      profiler.end('test2');

      profiler.clear(); // Clear all

      expect(profiler.getStats('test1')).toBeNull();
      expect(profiler.getStats('test2')).toBeNull();
    });
  });

  describe('Global Instances', () => {
    it('should provide global memory leak detector instance', () => {
      expect(memoryLeakDetector).toBeInstanceOf(MemoryLeakDetector);
    });

    it('should provide global update batcher instance', () => {
      expect(updateBatcher).toBeInstanceOf(UpdateBatcher);
    });

    it('should provide global performance profiler instance', () => {
      expect(performanceProfiler).toBeInstanceOf(PerformanceProfiler);
    });

    it('should maintain state across global instance access', () => {
      const element = document.createElement('div');
      const cleanup = memoryLeakDetector.registerEventListener(element, 'click', jest.fn());

      expect(memoryLeakDetector.getActiveResourceCounts().listeners).toBe(1);

      cleanup();

      expect(memoryLeakDetector.getActiveResourceCounts().listeners).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex caching scenarios', () => {
      const lruCache = new LRUCache<string, { data: any; ttl: number }>(3);
      const now = Date.now();

      // Simulate a cache with TTL-like behavior using LRU
      const setWithTTL = (key: string, value: any, ttlMs: number) => {
        lruCache.set(key, { data: value, ttl: now + ttlMs });
      };

      const getWithTTL = (key: string) => {
        const entry = lruCache.get(key);
        if (!entry || Date.now() > entry.ttl) {
          lruCache.delete(key);
          return undefined;
        }
        return entry.data;
      };

      setWithTTL('a', 'value_a', 1000);
      setWithTTL('b', 'value_b', 2000);
      setWithTTL('c', 'value_c', 500);

      expect(getWithTTL('a')).toBe('value_a');
      expect(getWithTTL('b')).toBe('value_b');
      expect(getWithTTL('c')).toBe('value_c');
    });

    it('should handle performance profiling with memory leak detection', () => {
      const detector = new MemoryLeakDetector();
      const profiler = new PerformanceProfiler();

      // Simulate a workflow that creates and cleans up resources
      const element = document.createElement('div');
      const timer = setTimeout(() => {}, 1000);

      const cleanupListener = detector.registerEventListener(element, 'click', jest.fn());
      const cleanupTimer = detector.registerTimer(timer);

      profiler.start('resource-cleanup');

      cleanupListener();
      cleanupTimer();

      const duration = profiler.end('resource-cleanup');

      expect(duration).toBeGreaterThan(0);
      expect(detector.getActiveResourceCounts().listeners).toBe(0);
      expect(detector.getActiveResourceCounts().timers).toBe(0);
    });
  });
});