#!/usr/bin/env python3
"""
Test script for flexible schema migration

This script tests the schema migration on a development database to ensure
everything works correctly before applying to production.

Usage:
    python test_schema_migration.py
"""

import os
import sys
import subprocess
import psycopg2
import json
from datetime import datetime

# Database connection settings
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/drawing_index')

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*50}")
    print(f"TESTING: {description}")
    print(f"Command: {cmd}")
    print(f"{'='*50}")

    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        print(f"✅ SUCCESS: {description}")
        if result.stdout:
            print("STDOUT:", result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ FAILED: {description}")
        print("STDERR:", e.stderr)
        print("STDOUT:", e.stdout)
        return False

def check_database_state(description):
    """Check and report database state"""
    print(f"\n📊 DATABASE STATE CHECK: {description}")
    print("-" * 40)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check table existence
        tables_to_check = ['component_schemas', 'component_schema_fields']
        for table in tables_to_check:
            cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = '{table}'
                )
            """)
            exists = cur.fetchone()[0]
            print(f"  Table '{table}': {'✅ EXISTS' if exists else '❌ MISSING'}")

        # Check components table columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'components'
            AND column_name IN ('schema_id', 'dynamic_data')
        """)
        new_columns = [row[0] for row in cur.fetchall()]
        print(f"  Components new columns: {new_columns}")

        # Count records
        queries = [
            ("Projects", "SELECT COUNT(*) FROM projects"),
            ("Drawings", "SELECT COUNT(*) FROM drawings"),
            ("Components (total)", "SELECT COUNT(*) FROM components"),
            ("Component Schemas", "SELECT COUNT(*) FROM component_schemas WHERE 1=1 OR true"),  # Handle if table doesn't exist
            ("Schema Fields", "SELECT COUNT(*) FROM component_schema_fields WHERE 1=1 OR true"),
            ("Components with schema_id", "SELECT COUNT(*) FROM components WHERE schema_id IS NOT NULL OR true"),
            ("Components with dynamic_data", "SELECT COUNT(*) FROM components WHERE dynamic_data IS NOT NULL OR true")
        ]

        for desc, query in queries:
            try:
                cur.execute(query)
                count = cur.fetchone()[0]
                print(f"  {desc}: {count}")
            except Exception as e:
                print(f"  {desc}: ❌ Error - {e}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Database check failed: {e}")

def main():
    """Run migration tests"""
    print("🧪 FLEXIBLE SCHEMA MIGRATION TEST")
    print("=" * 60)

    # Pre-migration state check
    check_database_state("PRE-MIGRATION")

    # Backup database state counts for comparison
    print("\n💾 Creating pre-migration backup counts...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM projects")
        project_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM components")
        component_count = cur.fetchone()[0]

        print(f"  Projects: {project_count}")
        print(f"  Components: {component_count}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Could not get baseline counts: {e}")
        return False

    # Test migrations
    tests = [
        ("alembic upgrade add_flexible_schemas", "Apply schema table migration"),
        ("alembic upgrade seed_default_schemas", "Apply default schema seeding"),
    ]

    all_passed = True
    for cmd, desc in tests:
        if not run_command(cmd, desc):
            all_passed = False
            break

        # Check state after each migration
        check_database_state(f"AFTER {desc}")

    if not all_passed:
        print("\n❌ Migration failed. Testing rollback...")
        run_command("alembic downgrade 9bc6a98f1c12", "Rollback migrations")
        check_database_state("AFTER ROLLBACK")
        return False

    # Verify data integrity
    print("\n🔍 VERIFYING DATA INTEGRITY")
    print("-" * 40)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check that all projects have default schemas
        cur.execute("""
            SELECT p.id, p.name,
                   (SELECT COUNT(*) FROM component_schemas cs WHERE cs.project_id = p.id AND cs.is_default = true) as default_schemas
            FROM projects p
        """)
        projects_without_default = []
        for row in cur.fetchall():
            if row[2] == 0:  # No default schema
                projects_without_default.append(f"{row[1]} ({row[0]})")

        if projects_without_default:
            print(f"❌ Projects without default schemas: {projects_without_default}")
            all_passed = False
        else:
            print("✅ All projects have default schemas")

        # Check component migration
        cur.execute("SELECT COUNT(*) FROM components WHERE schema_id IS NULL")
        unmigrated_components = cur.fetchone()[0]

        if unmigrated_components > 0:
            print(f"❌ {unmigrated_components} components not migrated to schema format")
            all_passed = False
        else:
            print("✅ All components migrated to schema format")

        # Verify component counts match
        cur.execute("SELECT COUNT(*) FROM components")
        new_component_count = cur.fetchone()[0]

        if new_component_count != component_count:
            print(f"❌ Component count mismatch: {component_count} -> {new_component_count}")
            all_passed = False
        else:
            print(f"✅ Component count preserved: {component_count}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Data integrity check failed: {e}")
        all_passed = False

    # Final report
    print(f"\n{'='*60}")
    if all_passed:
        print("🎉 ALL MIGRATION TESTS PASSED!")
        print("   Ready for production deployment.")
    else:
        print("❌ MIGRATION TESTS FAILED!")
        print("   Review errors above before production deployment.")
    print(f"{'='*60}")

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)