-- Data Migration Script: Phase A - Project-Drawing Many-to-Many
-- Story: 8.1a AC3 - Backend Foundation & Bug Fix
-- Created: 2025-10-03
-- Purpose: Migrate existing project_id values from drawings to junction table
--
-- USAGE:
--   psql -U user -d drawing_index -f data_migration_phase_a.sql
--
-- PREREQUISITES:
--   - Junction table drawing_project_associations must exist (Alembic migration f4c8a2b5e1d9)
--   - This script is IDEMPOTENT - safe to run multiple times
--
-- NOTES:
--   - Existing code continues using drawings.project_id (Phase B updates code)
--   - drawings.project_id column remains (Phase C drops it)
--   - assigned_by='migration_manual' distinguishes manual runs from auto migration

-- Start transaction
BEGIN;

-- Verify junction table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_project_associations') THEN
        RAISE EXCEPTION 'Junction table drawing_project_associations does not exist. Run Alembic migration first.';
    END IF;
END $$;

-- Migrate data from drawings.project_id to junction table
-- UPSERT pattern: Insert only if association doesn't already exist
INSERT INTO drawing_project_associations (id, drawing_id, project_id, assigned_at, assigned_by)
SELECT
    gen_random_uuid() as id,
    d.id as drawing_id,
    d.project_id,
    COALESCE(d.upload_date, NOW()) as assigned_at,
    'migration_manual' as assigned_by
FROM drawings d
WHERE d.project_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM drawing_project_associations dpa
      WHERE dpa.drawing_id = d.id
        AND dpa.project_id = d.project_id
  );

-- Report migration results
DO $$
DECLARE
    total_drawings_with_project INTEGER;
    total_associations INTEGER;
    migrated_this_run INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_drawings_with_project FROM drawings WHERE project_id IS NOT NULL;
    SELECT COUNT(*) INTO total_associations FROM drawing_project_associations;
    SELECT COUNT(*) INTO migrated_this_run FROM drawing_project_associations WHERE assigned_by = 'migration_manual';

    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Phase A Data Migration Complete';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Drawings with project_id:          %', total_drawings_with_project;
    RAISE NOTICE 'Total associations in junction:    %', total_associations;
    RAISE NOTICE 'Migrated this run:                 %', migrated_this_run;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Commit transaction
COMMIT;

-- Verification queries (read-only)
\echo '\n--- Verification: Sample associations ---'
SELECT
    d.id as drawing_id,
    d.title as drawing_title,
    p.id as project_id,
    p.name as project_name,
    dpa.assigned_at,
    dpa.assigned_by
FROM drawing_project_associations dpa
JOIN drawings d ON dpa.drawing_id = d.id
JOIN projects p ON dpa.project_id = p.id
ORDER BY dpa.assigned_at DESC
LIMIT 5;

\echo '\n--- Verification: Data integrity check ---'
SELECT
    'Drawings with project_id' as metric,
    COUNT(*) as count
FROM drawings
WHERE project_id IS NOT NULL
UNION ALL
SELECT
    'Associations in junction' as metric,
    COUNT(*) as count
FROM drawing_project_associations
UNION ALL
SELECT
    'Orphaned associations (drawing not found)' as metric,
    COUNT(*) as count
FROM drawing_project_associations dpa
LEFT JOIN drawings d ON dpa.drawing_id = d.id
WHERE d.id IS NULL
UNION ALL
SELECT
    'Orphaned associations (project not found)' as metric,
    COUNT(*) as count
FROM drawing_project_associations dpa
LEFT JOIN projects p ON dpa.project_id = p.id
WHERE p.id IS NULL;
