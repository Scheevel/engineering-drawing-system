/**
 * Performance Testing Utilities for Schema Management
 *
 * Provides utilities for measuring and benchmarking schema validation,
 * field operations, and form rendering performance.
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceBenchmark {
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  iterations: number;
  metrics: PerformanceMetric[];
}

export class PerformanceTester {
  private metrics: PerformanceMetric[] = [];
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.startTimes.set(name, performance.now());
    if (metadata) {
      this.metrics.push({
        name: `${name}_start`,
        duration: 0,
        timestamp: Date.now(),
        metadata
      });
    }
  }

  /**
   * End timing and record the metric
   */
  endTiming(name: string, metadata?: Record<string, any>): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    this.startTimes.delete(name);
    return duration;
  }

  /**
   * Measure a function's execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    this.startTiming(name, metadata);
    try {
      const result = await fn();
      const duration = this.endTiming(name, metadata);
      return { result, duration };
    } catch (error) {
      this.endTiming(name, { ...metadata, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Measure a synchronous function's execution time
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): { result: T; duration: number } {
    this.startTiming(name, metadata);
    try {
      const result = fn();
      const duration = this.endTiming(name, metadata);
      return { result, duration };
    } catch (error) {
      this.endTiming(name, { ...metadata, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Run multiple iterations of a function and create benchmark
   */
  async benchmark<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 10,
    metadata?: Record<string, any>
  ): Promise<PerformanceBenchmark> {
    const results: PerformanceMetric[] = [];

    for (let i = 0; i < iterations; i++) {
      const iterationName = `${name}_iteration_${i + 1}`;
      const { duration } = await this.measureAsync(iterationName, fn, {
        ...metadata,
        iteration: i + 1,
        totalIterations: iterations
      });

      results.push({
        name: iterationName,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, iteration: i + 1 }
      });
    }

    const durations = results.map(r => r.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      totalDuration,
      averageDuration: totalDuration / iterations,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      iterations,
      metrics: results
    };
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by name pattern
   */
  getMetricsByName(namePattern: string | RegExp): PerformanceMetric[] {
    const pattern = typeof namePattern === 'string'
      ? new RegExp(namePattern)
      : namePattern;

    return this.metrics.filter(metric => pattern.test(metric.name));
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.startTimes.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<string, PerformanceBenchmark>;
    rawMetrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const groupedMetrics = this.groupMetricsByName();
    const summary: Record<string, PerformanceBenchmark> = {};
    const recommendations: string[] = [];

    for (const [name, metrics] of Object.entries(groupedMetrics)) {
      if (metrics.length > 0) {
        const durations = metrics.map(m => m.duration);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);

        summary[name] = {
          totalDuration,
          averageDuration: totalDuration / metrics.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          iterations: metrics.length,
          metrics
        };

        // Generate recommendations based on performance thresholds
        const avgDuration = summary[name].averageDuration;
        if (name.includes('validation') && avgDuration > 500) {
          recommendations.push(`Schema validation '${name}' exceeds 500ms target (${avgDuration.toFixed(2)}ms)`);
        }
        if (name.includes('field') && avgDuration > 200) {
          recommendations.push(`Field operation '${name}' exceeds 200ms target (${avgDuration.toFixed(2)}ms)`);
        }
        if (name.includes('render') && avgDuration > 100) {
          recommendations.push(`Render operation '${name}' exceeds 100ms target (${avgDuration.toFixed(2)}ms)`);
        }
      }
    }

    return {
      summary,
      rawMetrics: this.getMetrics(),
      recommendations
    };
  }

  private groupMetricsByName(): Record<string, PerformanceMetric[]> {
    const grouped: Record<string, PerformanceMetric[]> = {};

    for (const metric of this.metrics) {
      // Remove iteration suffixes for grouping
      const baseName = metric.name.replace(/_iteration_\d+$/, '');
      if (!grouped[baseName]) {
        grouped[baseName] = [];
      }
      grouped[baseName].push(metric);
    }

    return grouped;
  }
}

// Performance thresholds based on story requirements
export const PERFORMANCE_THRESHOLDS = {
  FIELD_REORDERING: 100, // ms
  COMPLEX_VALIDATION: 500, // ms for 50+ fields
  REAL_TIME_UPDATES: 200, // ms for individual field changes
  BULK_OPERATIONS: 1000, // ms for up to 20 field operations
  FORM_RENDERING: 100, // ms for initial render
  DRAG_DROP_RESPONSE: 50 // ms for drag feedback
};

// Global performance tester instance
export const performanceTester = new PerformanceTester();

// React hook for performance testing in components
export const usePerformanceTesting = () => {
  return {
    measureRender: (componentName: string, metadata?: Record<string, any>) => {
      return performanceTester.measureSync(
        `render_${componentName}`,
        () => {
          // This will be called during component render
          return performance.now();
        },
        metadata
      );
    },
    measureAsync: performanceTester.measureAsync.bind(performanceTester),
    measureSync: performanceTester.measureSync.bind(performanceTester),
    startTiming: performanceTester.startTiming.bind(performanceTester),
    endTiming: performanceTester.endTiming.bind(performanceTester),
    benchmark: performanceTester.benchmark.bind(performanceTester),
    getReport: performanceTester.generateReport.bind(performanceTester)
  };
};