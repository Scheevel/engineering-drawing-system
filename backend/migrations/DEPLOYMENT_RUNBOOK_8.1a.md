# Deployment Runbook: Story 8.1a - Many-to-Many Project-Drawing Associations

**Story**: 8.1a - Backend Foundation & Bug Fix
**Estimated Total Time**: 45-60 minutes (Phase A only)
**Severity**: **MAJOR** - Database schema change with data migration
**Rollback**: Yes (if Phase B not deployed)

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Phase A: Database Migration](#phase-a-database-migration)
3. [Verification Steps](#verification-steps)
4. [Rollback Procedure](#rollback-procedure)
5. [Post-Deployment Monitoring](#post-deployment-monitoring)
6. [Phase B Preparation](#phase-b-preparation)

---

## Pre-Deployment Checklist

### 1. Environment Validation (5 min)

**Check Docker services running:**
```bash
docker-compose ps

# Expected output:
# backend         running  0.0.0.0:8001->8000/tcp
# postgres        running  5432/tcp
# redis           running  6379/tcp
# celery-worker   running
```

**Verify database connectivity:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index -c "SELECT version();"

# Expected: PostgreSQL 14.x output
```

**Check Alembic status:**
```bash
cd backend
docker exec drawing_backend python3 -m alembic current

# Expected: Shows current migration revision (0ab370a9afb6 or later)
```

---

### 2. Backup Database (10 min) ⚠️ CRITICAL

**Create backup directory:**
```bash
mkdir -p backend/migrations/backups
```

**Dump database:**
```bash
docker exec drawing_postgres pg_dump -U user -d drawing_index \
    -F c -b -v \
    -f /tmp/backup_before_8.1a_$(date +%Y%m%d_%H%M%S).dump

# Copy backup from container to host
docker cp drawing_postgres:/tmp/backup_before_8.1a_*.dump \
    backend/migrations/backups/
```

**Verify backup created:**
```bash
ls -lh backend/migrations/backups/
```

**Document backup location:**
```bash
BACKUP_FILE=$(ls -t backend/migrations/backups/ | head -1)
echo "Backup created: backend/migrations/backups/$BACKUP_FILE"
```

---

### 3. Pre-Migration Database State (5 min)

**Capture current state:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
\echo '=== Current Database State ==='
\echo ''

\echo 'Total drawings:'
SELECT COUNT(*) as total_drawings FROM drawings;

\echo ''
\echo 'Drawings with project_id:'
SELECT COUNT(*) as drawings_with_project FROM drawings WHERE project_id IS NOT NULL;

\echo ''
\echo 'Sample drawing-project associations (current one-to-many):'
SELECT
    d.id as drawing_id,
    d.title,
    d.project_id,
    p.name as project_name
FROM drawings d
LEFT JOIN projects p ON d.project_id = p.id
LIMIT 5;

\echo ''
\echo 'Total projects:'
SELECT COUNT(*) as total_projects FROM projects;
EOF
```

**Save output to file:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF' \
    > backend/migrations/backups/pre_migration_state_$(date +%Y%m%d_%H%M%S).txt

# (Repeat the SQL queries above)
EOF
```

---

### 4. Staging Environment Test (Optional but Recommended)

If you have a staging environment:

```bash
# On staging server
cd /path/to/engineering-drawing-system-standalone/backend

# Run Phase A migration
docker exec drawing_backend python3 -m alembic upgrade head

# Verify no errors in logs
docker-compose logs backend | tail -100

# Test API still responds
curl http://staging-host:8001/api/v1/drawings | jq '.[0]'

# Rollback staging
docker exec drawing_backend python3 -m alembic downgrade -1
```

---

## Phase A: Database Migration

### Expected Duration: 5-10 minutes
### Risk Level: **LOW** (Non-breaking for existing code)

---

### Step 1: Copy Migration Files to Container (1 min)

**Verify migration file exists:**
```bash
ls -lh backend/migrations/versions/f4c8a2b5e1d9_create_drawing_project_associations_junction_table.py

# Should show the migration file
```

**If using Docker, files should already be mounted via volume. Verify:**
```bash
docker exec drawing_backend ls -l /app/migrations/versions/f4c8a2b5e1d9*

# Expected: File should be visible inside container
```

---

### Step 2: Run Alembic Migration (2-5 min)

**Dry run (optional - check SQL):**
```bash
docker exec drawing_backend python3 -m alembic upgrade head --sql

# Review the SQL that will be executed
```

**Execute migration:**
```bash
echo "Starting Phase A migration at $(date)"

docker exec drawing_backend python3 -m alembic upgrade head 2>&1 | tee backend/migrations/backups/migration_log_$(date +%Y%m%d_%H%M%S).log

echo "Migration completed at $(date)"
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 0ab370a9afb6 -> f4c8a2b5e1d9, Create drawing_project_associations junction table (Phase A)
✓ Phase A Complete: Migrated X drawing-project associations
```

---

### Step 3: Verify Migration Applied (2 min)

**Check Alembic history:**
```bash
docker exec drawing_backend python3 -m alembic current

# Expected output:
# f4c8a2b5e1d9 (head)
```

**Verify junction table created:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index -c "\d drawing_project_associations"

# Expected: Table structure with columns id, drawing_id, project_id, assigned_at, assigned_by
```

**Verify indexes created:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'drawing_project_associations';
EOF

# Expected:
# idx_dpa_drawing_id
# idx_dpa_project_id
# uq_drawing_project_association (unique constraint)
```

---

## Verification Steps

### 1. Data Migration Verification (5 min)

**Check data migrated correctly:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
\echo '=== Phase A Migration Verification ==='
\echo ''

\echo '1. Association count matches source data:'
SELECT
    (SELECT COUNT(*) FROM drawings WHERE project_id IS NOT NULL) as drawings_with_project_id,
    (SELECT COUNT(*) FROM drawing_project_associations) as associations_in_junction;

\echo ''
\echo '2. Sample migrated associations:'
SELECT
    d.id as drawing_id,
    d.title as drawing_title,
    d.project_id as old_project_id,
    dpa.project_id as junction_project_id,
    dpa.assigned_at,
    dpa.assigned_by,
    p.name as project_name
FROM drawings d
JOIN drawing_project_associations dpa ON d.id = dpa.drawing_id
JOIN projects p ON dpa.project_id = p.id
LIMIT 5;

\echo ''
\echo '3. Data integrity check - any mismatches?'
SELECT COUNT(*) as mismatched_associations
FROM drawings d
WHERE d.project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM drawing_project_associations dpa
      WHERE dpa.drawing_id = d.id
        AND dpa.project_id = d.project_id
  );
-- Expected: 0 (no mismatches)

\echo ''
\echo '4. Orphaned associations check:'
SELECT
    'Orphaned (drawing not found)' as issue,
    COUNT(*) as count
FROM drawing_project_associations dpa
LEFT JOIN drawings d ON dpa.drawing_id = d.id
WHERE d.id IS NULL
UNION ALL
SELECT
    'Orphaned (project not found)' as issue,
    COUNT(*) as count
FROM drawing_project_associations dpa
LEFT JOIN projects p ON dpa.project_id = p.id
WHERE p.id IS NULL;
-- Expected: Both counts should be 0
EOF
```

---

### 2. Cascade Behavior Verification (3 min)

**Test CASCADE on delete (in transaction, will rollback):**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
BEGIN;

-- Create test project and drawing
INSERT INTO projects (id, name, code, description, created_at, updated_at)
VALUES (gen_random_uuid(), 'TEST_PROJECT', 'TEST', 'Test cascade', NOW(), NOW())
RETURNING id AS test_project_id \gset

INSERT INTO drawings (id, title, file_path, processing_status, upload_date, project_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'TEST_DRAWING', '/test/path.pdf', 'completed', NOW(), :'test_project_id', NOW(), NOW())
RETURNING id AS test_drawing_id \gset

-- Create association
INSERT INTO drawing_project_associations (drawing_id, project_id, assigned_by)
VALUES (:'test_drawing_id', :'test_project_id', 'test_cascade');

-- Verify association exists
\echo 'Association created:'
SELECT COUNT(*) FROM drawing_project_associations WHERE drawing_id = :'test_drawing_id';

-- Delete project (should CASCADE to junction table)
DELETE FROM projects WHERE id = :'test_project_id';

-- Verify association removed
\echo 'After project deletion, association count:'
SELECT COUNT(*) FROM drawing_project_associations WHERE drawing_id = :'test_drawing_id';
-- Expected: 0 (CASCADE worked)

\echo 'Drawing still exists:'
SELECT COUNT(*) FROM drawings WHERE id = :'test_drawing_id';
-- Expected: 1 (drawing NOT deleted, only association removed)

ROLLBACK;
\echo 'Test transaction rolled back'
EOF
```

---

### 3. API Endpoint Verification (Phase A) (2 min)

**Phase A should NOT break existing API:**

```bash
# Test GET /api/v1/drawings (should still work)
curl -s http://localhost:8001/api/v1/drawings | jq '. | length'

# Verify response structure unchanged
curl -s http://localhost:8001/api/v1/drawings | jq '.[0] | keys'
# Expected: Should include "project_id" and "project" (old fields still work)

# Test GET /api/v1/projects (should still work)
curl -s http://localhost:8001/api/v1/projects | jq '. | length'
```

**Expected**: All existing endpoints return 200 OK with unchanged response structures

---

### 4. Performance Check (2 min)

**Verify index performance:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
EXPLAIN ANALYZE
SELECT d.*, p.name as project_name
FROM drawings d
JOIN drawing_project_associations dpa ON d.id = dpa.drawing_id
JOIN projects p ON dpa.project_id = p.id
WHERE dpa.project_id = (SELECT id FROM projects LIMIT 1);
EOF

# Look for "Index Scan using idx_dpa_project_id" in output
```

---

## Rollback Procedure

### When to Rollback

Rollback is safe **ONLY IF**:
- ✅ Phase B code NOT deployed yet
- ✅ `drawings.project_id` column still exists
- ✅ No production traffic using new `projects[]` field

**DO NOT ROLLBACK IF**:
- ❌ Phase B deployed (clients using `projects[]` array)
- ❌ `drawings.project_id` column dropped (Phase C ran)
- ❌ Production data has multiple projects per drawing

---

### Rollback Steps (10 min)

**Option 1: Alembic Downgrade (Recommended)**
```bash
echo "Starting rollback at $(date)"

# Downgrade one revision
docker exec drawing_backend python3 -m alembic downgrade -1 2>&1 | tee backend/migrations/backups/rollback_log_$(date +%Y%m%d_%H%M%S).log

echo "Rollback completed at $(date)"

# Verify rollback
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_project_associations'
) as junction_table_exists;
-- Expected: f (false) - table dropped
EOF
```

**Option 2: Manual SQL Rollback**
```bash
docker exec drawing_postgres psql -U user -d drawing_index -f /app/migrations/rollback_phase_a.sql
```

**Post-Rollback Verification:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
-- Verify junction table dropped
SELECT tablename FROM pg_tables WHERE tablename = 'drawing_project_associations';
-- Expected: No rows

-- Verify project_id restored
SELECT COUNT(*) FROM drawings WHERE project_id IS NOT NULL;
-- Expected: Same count as before migration

-- Test existing API
\! curl -s http://localhost:8001/api/v1/drawings | jq '.[0].project_id'
-- Expected: UUID or null (old behavior restored)
EOF
```

---

### Full Database Restore (If Rollback Fails)

**Last resort only:**
```bash
# Stop services
docker-compose down

# Restore from backup
BACKUP_FILE=$(ls -t backend/migrations/backups/backup_before_8.1a_*.dump | head -1)
docker-compose up -d postgres
sleep 5

docker exec drawing_postgres pg_restore -U user -d drawing_index \
    --clean --if-exists \
    /tmp/$(basename $BACKUP_FILE)

# Restart services
docker-compose up -d
```

---

## Post-Deployment Monitoring

### 1. Immediate Checks (First 15 minutes)

**Monitor backend logs:**
```bash
docker-compose logs -f backend | grep -i error
```

**Monitor Celery workers:**
```bash
docker-compose logs -f celery-worker | grep -i error
```

**Check API response times:**
```bash
for i in {1..10}; do
    curl -o /dev/null -s -w "Response time: %{time_total}s\n" http://localhost:8001/api/v1/drawings
    sleep 2
done
```

**Monitor database connections:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
```

---

### 2. Extended Monitoring (First 24 hours)

**Check junction table growth:**
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
SELECT
    COUNT(*) as total_associations,
    COUNT(DISTINCT drawing_id) as unique_drawings,
    COUNT(DISTINCT project_id) as unique_projects,
    MAX(assigned_at) as latest_assignment
FROM drawing_project_associations;
EOF
```

**Monitor for errors:**
```bash
# Check backend error logs
docker-compose logs backend | grep -i "error\|exception" | tail -50

# Check database logs
docker-compose logs postgres | grep -i "error\|fatal" | tail -50
```

---

## Phase B Preparation

### When to Proceed to Phase B

Phase B can proceed when:
- ✅ Phase A migration stable for 48+ hours
- ✅ No errors in logs related to junction table
- ✅ Database performance normal
- ✅ Backup retention confirmed

### Phase B Deployment (Future)

Phase B includes:
- Task 1.2: Update SQLAlchemy models (Drawing.projects, Project.drawings)
- Task 1.3: Update Pydantic schemas (add `projects[]` array, `components_extracted` field)
- Task 1.4: Implement new Drawing API endpoints (8 endpoints)
- Task 1.5: Implement new Project API endpoints (3 endpoints)
- Task 1.6: Query enhancements (filters, eager loading, bug fix)
- Task 1.7: Backend testing (unit + integration tests)

**Estimated Phase B duration**: 6-8 hours

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause**: Junction table already exists from previous run

**Solution**:
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
DROP TABLE IF EXISTS drawing_project_associations CASCADE;
EOF

# Retry migration
docker exec drawing_backend python3 -m alembic upgrade head
```

---

### Issue: Data migration count mismatch

**Symptoms**: `drawing_project_associations` count ≠ `drawings.project_id IS NOT NULL` count

**Diagnosis**:
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
-- Find drawings with project_id but no association
SELECT d.id, d.title, d.project_id
FROM drawings d
WHERE d.project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM drawing_project_associations dpa
      WHERE dpa.drawing_id = d.id AND dpa.project_id = d.project_id
  );
EOF
```

**Solution**: Run manual data migration script
```bash
docker exec drawing_postgres psql -U user -d drawing_index -f /app/migrations/data_migration_phase_a.sql
```

---

### Issue: Cascade deletion not working

**Symptoms**: Deleting project doesn't remove association

**Diagnosis**:
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
-- Check foreign key constraints
SELECT
    conname,
    contype,
    confdeltype
FROM pg_constraint
WHERE conrelid = 'drawing_project_associations'::regclass;
-- confdeltype should be 'c' (CASCADE)
EOF
```

**Solution**: Recreation of constraints (if misconfigured)
```bash
docker exec drawing_postgres psql -U user -d drawing_index << 'EOF'
ALTER TABLE drawing_project_associations
    DROP CONSTRAINT IF EXISTS drawing_project_associations_project_id_fkey,
    ADD CONSTRAINT drawing_project_associations_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
EOF
```

---

## Success Criteria

Phase A deployment is successful when:
- ✅ Junction table `drawing_project_associations` created
- ✅ All data migrated (count matches `drawings.project_id IS NOT NULL`)
- ✅ Indexes created (`idx_dpa_drawing_id`, `idx_dpa_project_id`)
- ✅ No orphaned associations (referential integrity intact)
- ✅ CASCADE behavior works (deleting project removes association)
- ✅ Existing API endpoints return 200 OK
- ✅ No errors in backend/celery logs
- ✅ Database backup created and verified

---

## Checklist Summary

### Pre-Deployment
- [ ] Docker services running
- [ ] Database connectivity verified
- [ ] Alembic status checked
- [ ] Database backup created and saved
- [ ] Pre-migration state documented
- [ ] Staging environment tested (if available)

### Phase A Execution
- [ ] Migration file copied to container
- [ ] Alembic migration executed successfully
- [ ] Junction table created
- [ ] Indexes created
- [ ] Data migrated (count verified)

### Verification
- [ ] Alembic current shows `f4c8a2b5e1d9`
- [ ] Data migration count matches
- [ ] No orphaned associations
- [ ] CASCADE behavior tested
- [ ] Existing API endpoints work
- [ ] Performance check passed

### Monitoring
- [ ] No errors in backend logs (15 min)
- [ ] No errors in database logs (15 min)
- [ ] API response times normal
- [ ] Junction table growth monitored (24 hours)

### Documentation
- [ ] Migration log saved
- [ ] Pre/post-migration state documented
- [ ] Deployment notes recorded
- [ ] Team notified of Phase A completion

---

**Runbook Version**: 1.0
**Last Updated**: 2025-10-03
**Story**: 8.1a - Backend Foundation & Bug Fix
**Next Phase**: Phase B (Tasks 1.2-1.7, 6-8 hours)
