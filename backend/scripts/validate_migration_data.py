#!/usr/bin/env python3
"""
Data validation script for instance_identifier migration.

This script can be run before and after the migration to ensure data integrity.

Usage:
    python validate_migration_data.py --before  # Run before migration
    python validate_migration_data.py --after   # Run after migration
"""

import argparse
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the backend directory to Python path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import Component, Drawing, Project


class MigrationValidator:
    def __init__(self, database_url=None):
        if database_url is None:
            database_url = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/drawing_index')
        
        self.engine = create_engine(database_url)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def validate_before_migration(self):
        """Validate data state before migration."""
        print(f"🔍 Pre-migration validation at {datetime.now()}")
        print("=" * 60)
        
        # Count existing data
        project_count = self.session.query(Project).count()
        drawing_count = self.session.query(Drawing).count()
        component_count = self.session.query(Component).count()
        
        print(f"📊 Current data counts:")
        print(f"   Projects: {project_count}")
        print(f"   Drawings: {drawing_count}")
        print(f"   Components: {component_count}")
        
        # Check for potential constraint violations
        print(f"\n🔍 Checking for potential duplicate piece marks...")
        
        # Find components with same drawing_id and piece_mark
        duplicates_query = text("""
            SELECT drawing_id, piece_mark, COUNT(*) as count
            FROM components 
            GROUP BY drawing_id, piece_mark 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        duplicates = self.session.execute(duplicates_query).fetchall()
        
        if duplicates:
            print(f"⚠️  Found {len(duplicates)} potential duplicate piece mark groups:")
            for dup in duplicates[:10]:  # Show first 10
                print(f"   Drawing {dup.drawing_id[:8]}... Piece Mark '{dup.piece_mark}': {dup.count} instances")
            
            if len(duplicates) > 10:
                print(f"   ... and {len(duplicates) - 10} more")
            
            print(f"\n✅ These duplicates will be supported after migration with instance_identifier")
        else:
            print(f"✅ No duplicate piece marks found - migration will be straightforward")
        
        # Create validation snapshot
        self._create_validation_snapshot('before')
        
        print(f"\n✅ Pre-migration validation complete")
        return {
            'projects': project_count,
            'drawings': drawing_count, 
            'components': component_count,
            'duplicates': len(duplicates)
        }
    
    def validate_after_migration(self):
        """Validate data state after migration."""
        print(f"🔍 Post-migration validation at {datetime.now()}")
        print("=" * 60)
        
        # Count data after migration
        project_count = self.session.query(Project).count()
        drawing_count = self.session.query(Drawing).count()  
        component_count = self.session.query(Component).count()
        
        print(f"📊 Post-migration data counts:")
        print(f"   Projects: {project_count}")
        print(f"   Drawings: {drawing_count}")
        print(f"   Components: {component_count}")
        
        # Check that instance_identifier field exists
        print(f"\n🔍 Checking schema changes...")
        
        try:
            schema_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'components' AND column_name = 'instance_identifier'
            """)
            
            result = self.session.execute(schema_query).fetchone()
            if result:
                print(f"✅ instance_identifier column added successfully:")
                print(f"   Type: {result.data_type}")
                print(f"   Nullable: {result.is_nullable}")
            else:
                print(f"❌ instance_identifier column not found!")
                return False
        except Exception as e:
            print(f"❌ Error checking schema: {e}")
            return False
        
        # Check unique constraint
        print(f"\n🔍 Checking unique constraints...")
        
        constraint_query = text("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'components' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%piece_mark%'
        """)
        
        constraints = self.session.execute(constraint_query).fetchall()
        
        found_new_constraint = False
        for constraint in constraints:
            if 'instance' in constraint.constraint_name:
                print(f"✅ New unique constraint found: {constraint.constraint_name}")
                found_new_constraint = True
        
        if not found_new_constraint:
            print(f"⚠️  Expected unique constraint with 'instance' in name not found")
        
        # Test multiple instance functionality
        print(f"\n🔍 Testing multiple instance functionality...")
        
        self._test_multiple_instances()
        
        # Compare with pre-migration snapshot
        self._compare_with_snapshot('after')
        
        print(f"\n✅ Post-migration validation complete")
        return True
    
    def _test_multiple_instances(self):
        """Test that multiple instances of same piece mark can be created."""
        try:
            # Find existing drawing or create test one
            test_drawing = self.session.query(Drawing).first()
            
            if not test_drawing:
                print("⚠️  No drawings found to test with")
                return
            
            # Test creating multiple instances (in a transaction we'll rollback)
            from sqlalchemy import text
            
            test_query = text("""
                WITH test_insert AS (
                    INSERT INTO components (id, drawing_id, piece_mark, instance_identifier, component_type, created_at)
                    VALUES 
                        (gen_random_uuid(), :drawing_id, 'TEST_MULTI', 'A', 'test', NOW()),
                        (gen_random_uuid(), :drawing_id, 'TEST_MULTI', 'B', 'test', NOW())
                    RETURNING piece_mark, instance_identifier
                )
                SELECT COUNT(*) as inserted_count FROM test_insert;
            """)
            
            # This is just a test - we'll rollback
            try:
                result = self.session.execute(test_query, {'drawing_id': test_drawing.id})
                count = result.fetchone().inserted_count
                
                if count == 2:
                    print(f"✅ Multiple instance test successful - created {count} components")
                else:
                    print(f"⚠️  Multiple instance test partial - created {count}/2 components")
                
                # Rollback the test data
                self.session.rollback()
                
            except Exception as e:
                print(f"❌ Multiple instance test failed: {e}")
                self.session.rollback()
                
        except Exception as e:
            print(f"❌ Error in multiple instance test: {e}")
    
    def _create_validation_snapshot(self, phase):
        """Create a validation snapshot for comparison."""
        snapshot_query = text("""
            SELECT 
                d.id as drawing_id,
                d.file_name,
                c.id as component_id, 
                c.piece_mark,
                c.component_type,
                c.quantity,
                c.material_type,
                c.confidence_score,
                c.created_at
            FROM components c
            JOIN drawings d ON c.drawing_id = d.id
            ORDER BY d.file_name, c.piece_mark
        """)
        
        results = self.session.execute(snapshot_query).fetchall()
        
        snapshot_file = f"migration_snapshot_{phase}.txt"
        
        with open(snapshot_file, 'w') as f:
            f.write(f"Migration validation snapshot - {phase} migration\n")
            f.write(f"Generated at: {datetime.now()}\n")
            f.write(f"Total components: {len(results)}\n\n")
            
            for row in results:
                f.write(f"{row.drawing_id},{row.file_name},{row.component_id},"
                       f"{row.piece_mark},{row.component_type},{row.quantity},"
                       f"{row.material_type},{row.confidence_score},{row.created_at}\n")
        
        print(f"📄 Validation snapshot saved to: {snapshot_file}")
    
    def _compare_with_snapshot(self, phase):
        """Compare current data with pre-migration snapshot."""
        before_file = "migration_snapshot_before.txt"
        
        if not os.path.exists(before_file):
            print(f"⚠️  No before-migration snapshot found for comparison")
            return
        
        # Read before snapshot
        before_components = set()
        with open(before_file, 'r') as f:
            lines = f.readlines()
            for line in lines[3:]:  # Skip header
                if line.strip():
                    parts = line.strip().split(',')
                    if len(parts) >= 4:
                        # Compare by drawing_id, piece_mark, component_type 
                        key = (parts[0], parts[3], parts[4])
                        before_components.add(key)
        
        # Get current components
        current_components = set()
        snapshot_query = text("""
            SELECT d.id, c.piece_mark, c.component_type
            FROM components c
            JOIN drawings d ON c.drawing_id = d.id
        """)
        
        results = self.session.execute(snapshot_query).fetchall()
        for row in results:
            key = (str(row[0]), row[1], row[2])
            current_components.add(key)
        
        # Compare
        missing = before_components - current_components
        extra = current_components - before_components
        
        print(f"\n📊 Data preservation check:")
        print(f"   Before migration: {len(before_components)} unique components")
        print(f"   After migration:  {len(current_components)} unique components")
        
        if missing:
            print(f"❌ Missing components: {len(missing)}")
            for comp in list(missing)[:5]:
                print(f"   - Drawing {comp[0][:8]}... Piece '{comp[1]}' Type '{comp[2]}'")
        
        if extra:
            print(f"ℹ️  Extra components: {len(extra)} (may include test data)")
        
        if not missing and len(before_components) == len(current_components):
            print(f"✅ All data preserved successfully!")


def main():
    parser = argparse.ArgumentParser(description='Validate migration data integrity')
    parser.add_argument('--before', action='store_true', help='Run before migration')
    parser.add_argument('--after', action='store_true', help='Run after migration')  
    parser.add_argument('--db-url', help='Database URL override')
    
    args = parser.parse_args()
    
    if not (args.before or args.after):
        print("Please specify --before or --after")
        sys.exit(1)
    
    validator = MigrationValidator(args.db_url)
    
    try:
        if args.before:
            validator.validate_before_migration()
        
        if args.after:
            validator.validate_after_migration()
            
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        sys.exit(1)
    
    finally:
        validator.session.close()


if __name__ == "__main__":
    main()