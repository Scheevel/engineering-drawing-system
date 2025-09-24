# Flexible Schema Migration Rollback Procedures

## Overview

This document provides step-by-step procedures for rolling back the flexible schema migration if issues are discovered in production.

## Migration Chain

```
9bc6a98f1c12 (Previous) → add_flexible_schemas → seed_default_schemas (Current)
```

## Quick Rollback Commands

### Complete Rollback (back to previous state)
```bash
# Rollback both migrations
alembic downgrade 9bc6a98f1c12
```

### Partial Rollback (remove seeding only)
```bash
# Rollback just the seed data, keep schema tables
alembic downgrade add_flexible_schemas
```

## Detailed Rollback Procedures

### 1. Pre-Rollback Assessment

**Before rolling back, assess the situation:**

```bash
# Check current migration status
alembic current

# Check database state
python migrations/test_schema_migration.py

# Backup current state (CRITICAL)
pg_dump $DATABASE_URL > backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Rollback Scenarios

#### Scenario A: Schema Tables Created but Seeding Failed

**Symptoms:**
- `component_schemas` and `component_schema_fields` tables exist
- No default schemas created
- Components still have NULL `schema_id`

**Solution:**
```bash
# Re-run just the seeding migration
alembic upgrade seed_default_schemas

# If that fails, check the specific error and fix data manually
```

#### Scenario B: Data Migration Issues

**Symptoms:**
- Some components have corrupted `dynamic_data`
- Components missing `schema_id` assignments
- Data integrity issues

**Solution:**
```bash
# Full rollback to restore original data
alembic downgrade 9bc6a98f1c12

# Verify original data restored
SELECT COUNT(*) FROM components WHERE component_type IS NOT NULL;
```

#### Scenario C: Performance Issues

**Symptoms:**
- Slow queries on schema-related tables
- Index problems
- Memory issues with JSONB operations

**Solution:**
```bash
# Check index status first
\d+ component_schemas
\d+ component_schema_fields
\d+ components

# If indexes missing, recreate them manually:
CREATE INDEX CONCURRENTLY idx_components_schema_id ON components(schema_id);
CREATE INDEX CONCURRENTLY idx_components_dynamic_data_gin ON components USING gin(dynamic_data);

# If still problematic, rollback
alembic downgrade 9bc6a98f1c12
```

### 3. Manual Data Recovery

If automatic rollback fails, use these manual recovery steps:

#### Restore Original Component Data
```sql
-- If dynamic_data exists but migration failed
UPDATE components
SET
    component_type = dynamic_data->>'component_type',
    description = dynamic_data->>'description',
    material_type = dynamic_data->>'material_type',
    quantity = (dynamic_data->>'quantity')::integer
WHERE dynamic_data IS NOT NULL;

-- Clear schema-related columns
UPDATE components SET schema_id = NULL, dynamic_data = NULL;
```

#### Remove Schema Tables Manually
```sql
-- Drop in correct order (foreign keys)
DROP TABLE IF EXISTS component_schema_fields CASCADE;
DROP TABLE IF EXISTS component_schemas CASCADE;

-- Remove columns from components table
ALTER TABLE components DROP COLUMN IF EXISTS dynamic_data;
ALTER TABLE components DROP COLUMN IF EXISTS schema_id;
```

### 4. Rollback Verification Checklist

After rollback, verify:

- [ ] **Database Structure**
  ```sql
  -- Verify tables are gone
  SELECT tablename FROM pg_tables WHERE tablename LIKE '%schema%';
  -- Should return no results

  -- Verify components table restored
  \d components
  -- Should NOT have schema_id or dynamic_data columns
  ```

- [ ] **Data Integrity**
  ```sql
  -- Check component counts
  SELECT COUNT(*) FROM components;

  -- Verify original data restored
  SELECT COUNT(*) FROM components WHERE component_type IS NOT NULL;
  SELECT COUNT(*) FROM components WHERE description IS NOT NULL;
  ```

- [ ] **Application Functionality**
  - [ ] Component detail modal opens correctly
  - [ ] Component editing works
  - [ ] Search functionality operational
  - [ ] API endpoints responding correctly

### 5. Post-Rollback Actions

1. **Update Alembic History**
   ```bash
   # Verify rollback successful
   alembic current
   # Should show: 9bc6a98f1c12 (add_instance_identifier...)
   ```

2. **Restart Application Services**
   ```bash
   # Docker environment
   docker-compose restart backend
   docker-compose restart celery-worker

   # Or if using direct deployment
   systemctl restart drawing-api
   systemctl restart drawing-worker
   ```

3. **Notify Development Team**
   - Document the rollback reason
   - Share any error messages encountered
   - Plan for migration fix and re-deployment

### 6. Emergency Contact Information

**Database Issues:**
- Primary DBA: [Contact Information]
- Backup DBA: [Contact Information]

**Application Issues:**
- Lead Developer: [Contact Information]
- DevOps Lead: [Contact Information]

**Business Impact:**
- Product Manager: [Contact Information]
- Engineering Manager: [Contact Information]

## Prevention for Next Attempt

Before re-attempting migration:

1. **Test on Production-Sized Dataset**
   ```bash
   # Create production clone for testing
   pg_dump production_db | psql test_db
   python migrations/test_schema_migration.py
   ```

2. **Performance Testing**
   ```bash
   # Test with realistic data volumes
   EXPLAIN ANALYZE SELECT * FROM components
   JOIN component_schemas ON components.schema_id = component_schemas.id
   LIMIT 1000;
   ```

3. **Monitoring Setup**
   - Database query performance monitoring
   - Application error tracking
   - User experience monitoring

4. **Rollback Testing**
   ```bash
   # Test rollback procedure on clone
   alembic upgrade head  # Apply migration
   alembic downgrade 9bc6a98f1c12  # Test rollback
   # Verify data integrity after rollback
   ```

## Success Criteria for Retry

Migration should only be re-attempted when:

- [ ] Root cause identified and fixed
- [ ] Migration tested successfully on production clone
- [ ] Rollback procedures tested and verified
- [ ] Monitoring and alerting in place
- [ ] Business stakeholders informed of maintenance window
- [ ] Development team on standby for support

---

**Remember:** When in doubt, rollback first and investigate later. Data integrity is more important than feature delivery.