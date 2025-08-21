# Migration Rollback Procedures

## Story 1.1: Instance Identifier Migration Rollback

This document provides detailed procedures for rolling back the instance_identifier migration if issues arise.

### Migration Details
- **Migration ID**: `9bc6a98f1c12`
- **Description**: Add instance_identifier to support multiple piece mark instances
- **Changes Made**:
  - Added `instance_identifier` VARCHAR(10) column to `components` table
  - Removed unique constraint on `(drawing_id, piece_mark)` (if it existed)
  - Added composite unique constraint on `(drawing_id, piece_mark, instance_identifier)`

### Pre-Rollback Checklist

Before performing a rollback, ensure you:

1. **Have a database backup** from before the migration
2. **Stop all application services** to prevent data corruption
3. **Validate current data state** using the validation script
4. **Document the reason for rollback** for future reference

### Rollback Commands

#### Option 1: Alembic Rollback (Recommended)

```bash
# Navigate to backend directory
cd backend

# Check current migration state
alembic current

# Rollback to previous migration
alembic downgrade add_saved_searches_table

# Verify rollback completed
alembic current
```

#### Option 2: Manual SQL Rollback (If Alembic Fails)

If the Alembic rollback fails, use these manual SQL commands:

```sql
-- Connect to your database
psql -U user -d drawing_index

-- Begin transaction for safety
BEGIN;

-- 1. Drop the new composite unique constraint
ALTER TABLE components DROP CONSTRAINT IF EXISTS unique_piece_mark_instance_per_drawing;

-- 2. Remove the instance_identifier column
ALTER TABLE components DROP COLUMN IF EXISTS instance_identifier;

-- 3. Recreate original unique constraint (only if it existed before)
-- Note: Check if this constraint actually existed in your schema
-- ALTER TABLE components ADD CONSTRAINT unique_piece_mark_per_drawing 
--     UNIQUE (drawing_id, piece_mark);

-- Verify changes
\d components

-- If everything looks correct, commit
COMMIT;
-- If there are issues, rollback with:
-- ROLLBACK;
```

### Post-Rollback Validation

After rollback, run these validation steps:

#### 1. Schema Validation

```sql
-- Verify instance_identifier column was removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'components' AND column_name = 'instance_identifier';
-- Should return no rows

-- Check current constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'components' AND constraint_type = 'UNIQUE';
```

#### 2. Data Integrity Check

```bash
# Run the validation script
python backend/scripts/validate_migration_data.py --before
```

#### 3. Application Testing

1. **Restart all services**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Test core functionality**:
   - Component creation
   - Component search  
   - Drawing upload and processing
   - Component editing

3. **Check application logs** for any errors

### Data Recovery Scenarios

#### Scenario 1: Data Loss During Rollback

If data is lost during rollback:

1. **Stop all services immediately**
2. **Restore from pre-migration backup**:
   ```bash
   # Example restore command (adjust for your backup system)
   pg_restore -U user -d drawing_index /path/to/backup/before_migration.dump
   ```
3. **Verify data integrity**
4. **Restart services**

#### Scenario 2: Constraint Violations After Rollback

If there are constraint violations (multiple components with same piece_mark):

1. **Identify duplicate data**:
   ```sql
   SELECT drawing_id, piece_mark, COUNT(*) 
   FROM components 
   GROUP BY drawing_id, piece_mark 
   HAVING COUNT(*) > 1;
   ```

2. **Choose resolution strategy**:
   - **Option A**: Delete duplicate records (data loss)
   - **Option B**: Modify piece_marks to make them unique
   - **Option C**: Re-apply migration and handle duplicates properly

#### Scenario 3: Application Compatibility Issues

If the application has compatibility issues after rollback:

1. **Check for code changes** that depend on `instance_identifier`
2. **Revert any TypeScript interface changes**:
   ```typescript
   // Remove this line from Component interface
   // instance_identifier?: string;
   ```
3. **Update database model** to remove the field
4. **Test thoroughly**

### Prevention Measures

To avoid rollback scenarios in future migrations:

1. **Always test migrations on staging first**
2. **Use database backups before every migration**
3. **Run data validation scripts before and after**
4. **Have rollback procedures documented before migration**
5. **Test rollback procedures on staging environment**

### Troubleshooting Common Issues

#### Issue: Alembic Rollback Fails

```
Error: Can't locate revision identified by 'add_saved_searches_table'
```

**Solution**: Check available revisions and use the correct revision ID:
```bash
alembic history
alembic downgrade -1  # Go back one migration
```

#### Issue: Foreign Key Constraint Errors

```
ERROR: cannot drop column instance_identifier because other objects depend on it
```

**Solution**: Check for dependent objects and drop them first:
```sql
-- Find dependent objects
SELECT * FROM information_schema.constraint_column_usage 
WHERE column_name = 'instance_identifier';

-- Drop dependent constraints first, then retry column drop
```

#### Issue: Data Consistency Problems

If you encounter data inconsistencies:

1. **Document all inconsistencies found**
2. **Consider partial rollback** (keep beneficial changes, revert problematic ones)
3. **Contact development team** for guidance
4. **Consider re-applying migration** with fixes

### Emergency Contacts

In case of critical issues during rollback:

- **Database Administrator**: [Contact Info]
- **DevOps Team**: [Contact Info] 
- **Development Team Lead**: [Contact Info]

### Rollback History Log

Document all rollbacks performed:

| Date | Time | Performed By | Reason | Method Used | Outcome |
|------|------|--------------|---------|-------------|---------|
|      |      |              |         |             |         |

---

**Note**: This document should be updated whenever the migration or rollback procedures change. Always test rollback procedures in a staging environment before performing them in production.