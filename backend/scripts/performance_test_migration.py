#!/usr/bin/env python3
"""
Performance testing script for instance_identifier migration.

This script measures query performance before and after migration to ensure
no significant regression in component query times.

Usage:
    python performance_test_migration.py --baseline    # Run before migration
    python performance_test_migration.py --after       # Run after migration
    python performance_test_migration.py --compare     # Compare results
"""

import argparse
import json
import os
import sys
import time
import statistics
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import Component, Drawing, Project


class PerformanceTester:
    def __init__(self, database_url=None):
        if database_url is None:
            database_url = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/drawing_index')
        
        self.engine = create_engine(database_url, echo=False)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        self.results = {}
    
    def run_baseline_tests(self):
        """Run performance tests before migration."""
        print("🚀 Running baseline performance tests...")
        print("=" * 60)
        
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'phase': 'baseline',
            'database_stats': self._get_database_stats(),
            'tests': {}
        }
        
        # Test 1: Simple component queries
        self.results['tests']['simple_queries'] = self._test_simple_queries()
        
        # Test 2: Component search by piece mark
        self.results['tests']['piece_mark_search'] = self._test_piece_mark_search()
        
        # Test 3: Complex joins with drawings
        self.results['tests']['complex_joins'] = self._test_complex_joins()
        
        # Test 4: Aggregation queries
        self.results['tests']['aggregations'] = self._test_aggregations()
        
        # Test 5: Index usage analysis
        self.results['tests']['index_usage'] = self._test_index_usage()
        
        # Save results
        self._save_results('baseline')
        
        print(f"\n✅ Baseline tests completed. Results saved to performance_baseline.json")
        return self.results
    
    def run_post_migration_tests(self):
        """Run performance tests after migration.""" 
        print("🚀 Running post-migration performance tests...")
        print("=" * 60)
        
        self.results = {
            'timestamp': datetime.now().isoformat(), 
            'phase': 'post_migration',
            'database_stats': self._get_database_stats(),
            'tests': {}
        }
        
        # Same tests as baseline
        self.results['tests']['simple_queries'] = self._test_simple_queries()
        self.results['tests']['piece_mark_search'] = self._test_piece_mark_search()
        self.results['tests']['complex_joins'] = self._test_complex_joins()
        self.results['tests']['aggregations'] = self._test_aggregations()
        self.results['tests']['index_usage'] = self._test_index_usage()
        
        # Additional migration-specific tests
        self.results['tests']['instance_identifier_queries'] = self._test_instance_identifier_queries()
        
        # Save results
        self._save_results('post_migration')
        
        print(f"\n✅ Post-migration tests completed. Results saved to performance_post_migration.json")
        return self.results
    
    def compare_results(self):
        """Compare baseline and post-migration results."""
        print("📊 Comparing performance results...")
        print("=" * 60)
        
        try:
            with open('performance_baseline.json', 'r') as f:
                baseline = json.load(f)
        except FileNotFoundError:
            print("❌ Baseline results not found. Run --baseline first.")
            return False
        
        try:
            with open('performance_post_migration.json', 'r') as f:
                post_migration = json.load(f)
        except FileNotFoundError:
            print("❌ Post-migration results not found. Run --after first.")
            return False
        
        # Compare test results
        comparison = {
            'timestamp': datetime.now().isoformat(),
            'baseline_date': baseline['timestamp'],
            'post_migration_date': post_migration['timestamp'],
            'test_comparisons': {},
            'overall_assessment': 'PASS'
        }
        
        regression_threshold = 0.10  # 10% regression threshold
        
        print(f"📈 Performance Comparison Results:")
        print(f"   Baseline: {baseline['timestamp']}")
        print(f"   Post-migration: {post_migration['timestamp']}")
        print(f"   Regression threshold: {regression_threshold * 100}%")
        print()
        
        for test_name in baseline['tests']:
            if test_name not in post_migration['tests']:
                continue
            
            baseline_time = baseline['tests'][test_name].get('avg_time_ms', 0)
            post_time = post_migration['tests'][test_name].get('avg_time_ms', 0)
            
            if baseline_time > 0:
                change_percent = (post_time - baseline_time) / baseline_time
                
                comparison['test_comparisons'][test_name] = {
                    'baseline_ms': baseline_time,
                    'post_migration_ms': post_time,
                    'change_percent': change_percent,
                    'change_ms': post_time - baseline_time,
                    'status': 'PASS' if change_percent <= regression_threshold else 'REGRESSION'
                }
                
                status_emoji = "✅" if change_percent <= regression_threshold else "⚠️"
                change_str = f"{change_percent:+.1%}" if change_percent != 0 else "0.0%"
                
                print(f"{status_emoji} {test_name}:")
                print(f"     Before: {baseline_time:.1f}ms")
                print(f"     After:  {post_time:.1f}ms")
                print(f"     Change: {change_str} ({post_time - baseline_time:+.1f}ms)")
                
                if change_percent > regression_threshold:
                    comparison['overall_assessment'] = 'REGRESSION_DETECTED'
                    print(f"     ❌ REGRESSION: Exceeds {regression_threshold:.0%} threshold")
                
                print()
        
        # Save comparison results
        with open('performance_comparison.json', 'w') as f:
            json.dump(comparison, f, indent=2)
        
        # Overall assessment
        if comparison['overall_assessment'] == 'PASS':
            print(f"🎉 Overall Assessment: PASS")
            print(f"   No significant performance regressions detected.")
        else:
            print(f"⚠️  Overall Assessment: REGRESSION DETECTED")
            print(f"   Some queries show performance regression above threshold.")
            print(f"   Consider index optimization or query tuning.")
        
        return comparison['overall_assessment'] == 'PASS'
    
    def _get_database_stats(self):
        """Get database statistics for context."""
        stats_query = text("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates, 
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples
            FROM pg_stat_user_tables 
            WHERE tablename IN ('components', 'drawings', 'projects')
            ORDER BY tablename
        """)
        
        results = self.session.execute(stats_query).fetchall()
        
        stats = {}
        for row in results:
            stats[row.tablename] = {
                'live_tuples': row.live_tuples,
                'dead_tuples': row.dead_tuples,
                'inserts': row.inserts,
                'updates': row.updates,
                'deletes': row.deletes
            }
        
        return stats
    
    def _run_timed_query(self, query, params=None, runs=5):
        """Run a query multiple times and return timing statistics."""
        times = []
        
        for _ in range(runs):
            start_time = time.perf_counter()
            
            if params:
                result = self.session.execute(query, params)
            else:
                result = self.session.execute(query)
            
            # Fetch all results to ensure full query execution
            rows = result.fetchall()
            
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds
        
        return {
            'times_ms': times,
            'avg_time_ms': statistics.mean(times),
            'median_time_ms': statistics.median(times),
            'min_time_ms': min(times),
            'max_time_ms': max(times),
            'std_dev_ms': statistics.stdev(times) if len(times) > 1 else 0,
            'row_count': len(rows)
        }
    
    def _test_simple_queries(self):
        """Test basic component queries."""
        print("🔍 Testing simple component queries...")
        
        # Test 1: Get all components
        query1 = text("SELECT * FROM components LIMIT 1000")
        result1 = self._run_timed_query(query1)
        
        # Test 2: Get components by drawing
        query2 = text("""
            SELECT * FROM components 
            WHERE drawing_id = (SELECT id FROM drawings LIMIT 1)
        """)
        result2 = self._run_timed_query(query2)
        
        # Test 3: Get components by piece mark pattern
        query3 = text("SELECT * FROM components WHERE piece_mark LIKE 'G%' LIMIT 100")
        result3 = self._run_timed_query(query3)
        
        avg_time = statistics.mean([
            result1['avg_time_ms'],
            result2['avg_time_ms'], 
            result3['avg_time_ms']
        ])
        
        print(f"   Average time: {avg_time:.1f}ms")
        
        return {
            'avg_time_ms': avg_time,
            'all_components': result1,
            'by_drawing': result2,
            'by_pattern': result3
        }
    
    def _test_piece_mark_search(self):
        """Test piece mark search performance."""
        print("🔍 Testing piece mark search queries...")
        
        # Get some real piece marks for testing
        sample_query = text("SELECT DISTINCT piece_mark FROM components LIMIT 10")
        sample_marks = [row[0] for row in self.session.execute(sample_query).fetchall()]
        
        if not sample_marks:
            return {'avg_time_ms': 0, 'note': 'No data available for testing'}
        
        # Test exact match search
        search_times = []
        for piece_mark in sample_marks[:5]:  # Test first 5
            query = text("SELECT * FROM components WHERE piece_mark = :piece_mark")
            result = self._run_timed_query(query, {'piece_mark': piece_mark}, runs=3)
            search_times.append(result['avg_time_ms'])
        
        avg_time = statistics.mean(search_times) if search_times else 0
        print(f"   Average time: {avg_time:.1f}ms")
        
        return {
            'avg_time_ms': avg_time,
            'individual_searches': search_times,
            'test_piece_marks': sample_marks[:5]
        }
    
    def _test_complex_joins(self):
        """Test complex queries with joins."""
        print("🔍 Testing complex join queries...")
        
        query = text("""
            SELECT 
                p.name as project_name,
                d.file_name,
                c.piece_mark,
                c.component_type,
                COUNT(*) OVER (PARTITION BY p.id) as project_component_count
            FROM components c
            JOIN drawings d ON c.drawing_id = d.id
            JOIN projects p ON d.project_id = p.id
            WHERE c.confidence_score > 0.5
            ORDER BY p.name, d.file_name, c.piece_mark
            LIMIT 1000
        """)
        
        result = self._run_timed_query(query)
        print(f"   Average time: {result['avg_time_ms']:.1f}ms")
        
        return result
    
    def _test_aggregations(self):
        """Test aggregation queries."""
        print("🔍 Testing aggregation queries...")
        
        # Test component counts by type
        query1 = text("""
            SELECT component_type, COUNT(*) as count
            FROM components 
            GROUP BY component_type
            ORDER BY count DESC
        """)
        result1 = self._run_timed_query(query1)
        
        # Test components per drawing
        query2 = text("""
            SELECT drawing_id, COUNT(*) as component_count
            FROM components
            GROUP BY drawing_id
            HAVING COUNT(*) > 1
            ORDER BY component_count DESC
            LIMIT 100
        """)
        result2 = self._run_timed_query(query2)
        
        avg_time = statistics.mean([result1['avg_time_ms'], result2['avg_time_ms']])
        print(f"   Average time: {avg_time:.1f}ms")
        
        return {
            'avg_time_ms': avg_time,
            'by_type': result1,
            'per_drawing': result2
        }
    
    def _test_index_usage(self):
        """Analyze index usage for component queries."""
        print("🔍 Analyzing index usage...")
        
        # Check if piece_mark index is being used
        explain_query = text("""
            EXPLAIN (ANALYZE, BUFFERS) 
            SELECT * FROM components 
            WHERE piece_mark = 'G1'
        """)
        
        try:
            explain_result = self.session.execute(explain_query).fetchall()
            explain_text = '\n'.join([row[0] for row in explain_result])
            
            # Simple analysis of index usage
            uses_index = 'Index Scan' in explain_text
            uses_bitmap = 'Bitmap' in explain_text
            uses_seq_scan = 'Seq Scan' in explain_text
            
            return {
                'avg_time_ms': 0,  # This is analysis, not timing
                'uses_index_scan': uses_index,
                'uses_bitmap_scan': uses_bitmap,
                'uses_sequential_scan': uses_seq_scan,
                'explain_plan': explain_text
            }
        
        except Exception as e:
            return {
                'avg_time_ms': 0,
                'error': str(e),
                'note': 'Could not analyze index usage'
            }
    
    def _test_instance_identifier_queries(self):
        """Test queries specific to instance_identifier (post-migration only)."""
        print("🔍 Testing instance_identifier queries...")
        
        # Test 1: Find components with specific instance
        query1 = text("""
            SELECT * FROM components 
            WHERE piece_mark = 'G1' AND instance_identifier = 'A'
        """)
        result1 = self._run_timed_query(query1)
        
        # Test 2: Find all instances of a piece mark
        query2 = text("""
            SELECT piece_mark, instance_identifier, COUNT(*) as count
            FROM components 
            WHERE piece_mark IN (
                SELECT piece_mark FROM components 
                GROUP BY piece_mark 
                HAVING COUNT(*) > 1 
                LIMIT 5
            )
            GROUP BY piece_mark, instance_identifier
            ORDER BY piece_mark, instance_identifier
        """)
        result2 = self._run_timed_query(query2)
        
        # Test 3: Unique constraint validation query
        query3 = text("""
            SELECT drawing_id, piece_mark, instance_identifier, COUNT(*) as count
            FROM components
            GROUP BY drawing_id, piece_mark, instance_identifier
            HAVING COUNT(*) > 1
        """)
        result3 = self._run_timed_query(query3)
        
        avg_time = statistics.mean([
            result1['avg_time_ms'],
            result2['avg_time_ms'],
            result3['avg_time_ms']
        ])
        
        print(f"   Average time: {avg_time:.1f}ms")
        
        return {
            'avg_time_ms': avg_time,
            'specific_instance': result1,
            'all_instances': result2, 
            'constraint_validation': result3
        }
    
    def _save_results(self, phase):
        """Save test results to JSON file."""
        filename = f"performance_{phase}.json"
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
    
    def suggest_optimizations(self):
        """Suggest index optimizations if performance issues detected."""
        print("💡 Performance Optimization Suggestions")
        print("=" * 60)
        
        # Check if comparison results exist
        if not os.path.exists('performance_comparison.json'):
            print("Run --compare first to get optimization suggestions.")
            return
        
        with open('performance_comparison.json', 'r') as f:
            comparison = json.load(f)
        
        regressions = []
        for test_name, test_data in comparison['test_comparisons'].items():
            if test_data['status'] == 'REGRESSION':
                regressions.append((test_name, test_data['change_percent']))
        
        if not regressions:
            print("✅ No performance regressions detected. No optimizations needed.")
            return
        
        print(f"⚠️  Found {len(regressions)} performance regressions:")
        for test_name, regression_percent in regressions:
            print(f"   - {test_name}: {regression_percent:+.1%}")
        
        print("\n💡 Recommended Optimizations:")
        
        # Suggest specific index optimizations
        print("\n1. **Composite Index on (drawing_id, piece_mark, instance_identifier)**")
        print("   Since the new unique constraint creates a composite index, ensure it's optimal:")
        print("   ```sql")
        print("   -- The migration should have created this, but verify it exists:")
        print("   CREATE UNIQUE INDEX CONCURRENTLY unique_piece_mark_instance_per_drawing")
        print("   ON components (drawing_id, piece_mark, instance_identifier);")
        print("   ```")
        
        print("\n2. **Partial Index for NULL instance_identifier**")
        print("   Many existing components will have NULL instance_identifier:")
        print("   ```sql")
        print("   CREATE INDEX CONCURRENTLY components_piece_mark_null_instance")
        print("   ON components (drawing_id, piece_mark)")
        print("   WHERE instance_identifier IS NULL;")
        print("   ```")
        
        print("\n3. **Index on instance_identifier alone**")
        print("   For queries that filter by instance_identifier:")
        print("   ```sql")
        print("   CREATE INDEX CONCURRENTLY components_instance_identifier")
        print("   ON components (instance_identifier)")
        print("   WHERE instance_identifier IS NOT NULL;")
        print("   ```")
        
        print("\n4. **Update Statistics**")
        print("   Ensure PostgreSQL has current statistics for query planning:")
        print("   ```sql")
        print("   ANALYZE components;")
        print("   ```")
        
        print("\n5. **Consider VACUUM**")
        print("   If the migration added significant data:")
        print("   ```sql") 
        print("   VACUUM ANALYZE components;")
        print("   ```")


def main():
    parser = argparse.ArgumentParser(description='Performance testing for migration')
    parser.add_argument('--baseline', action='store_true', help='Run baseline tests')
    parser.add_argument('--after', action='store_true', help='Run post-migration tests')
    parser.add_argument('--compare', action='store_true', help='Compare results')
    parser.add_argument('--optimize', action='store_true', help='Show optimization suggestions')
    parser.add_argument('--db-url', help='Database URL override')
    
    args = parser.parse_args()
    
    if not any([args.baseline, args.after, args.compare, args.optimize]):
        print("Please specify one of: --baseline, --after, --compare, --optimize")
        sys.exit(1)
    
    tester = PerformanceTester(args.db_url)
    
    try:
        if args.baseline:
            tester.run_baseline_tests()
        
        if args.after:
            tester.run_post_migration_tests()
        
        if args.compare:
            success = tester.compare_results()
            if not success:
                print("\n⚠️  Performance regression detected!")
                print("   Run with --optimize for suggestions.")
                sys.exit(1)
        
        if args.optimize:
            tester.suggest_optimizations()
    
    except Exception as e:
        print(f"❌ Performance testing failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        tester.session.close()


if __name__ == "__main__":
    main()