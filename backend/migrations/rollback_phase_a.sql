-- Rollback Script: Phase A - Project-Drawing Many-to-Many
-- Story: 8.1a AC3 - Backend Foundation & Bug Fix
-- Created: 2025-10-03
-- Purpose: Emergency rollback of Phase A migration
--
-- USAGE:
--   psql -U user -d drawing_index -f rollback_phase_a.sql
--
-- ⚠️  WARNING:
--   - This rollback restores drawings.project_id from junction table
--   - If a drawing has MULTIPLE projects, only the FIRST one (earliest assigned_at) is restored
--   - This is data loss for many-to-many associations
--   - Use this ONLY as emergency rollback before Phase B deployment
--
-- PREREQUISITES:
--   - drawings.project_id column must still exist (Phase C hasn't run yet)
--   - Junction table drawing_project_associations must exist

-- Start transaction
BEGIN;

-- Verify prerequisites
DO $$
BEGIN
    -- Check that project_id column exists in drawings table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'drawings' AND column_name = 'project_id'
    ) THEN
        RAISE EXCEPTION 'drawings.project_id column does not exist. Cannot rollback - Phase C may have already run.';
    END IF;

    -- Check that junction table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_project_associations') THEN
        RAISE EXCEPTION 'Junction table drawing_project_associations does not exist. Nothing to rollback.';
    END IF;
END $$;

-- Report current state BEFORE rollback
DO $$
DECLARE
    drawings_with_project_before INTEGER;
    total_associations_before INTEGER;
    drawings_with_multiple_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO drawings_with_project_before FROM drawings WHERE project_id IS NOT NULL;
    SELECT COUNT(*) INTO total_associations_before FROM drawing_project_associations;
    SELECT COUNT(DISTINCT drawing_id) INTO drawings_with_multiple_projects
    FROM drawing_project_associations
    GROUP BY drawing_id
    HAVING COUNT(*) > 1;

    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Phase A Rollback - Current State';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Drawings with project_id (before):    %', drawings_with_project_before;
    RAISE NOTICE 'Total associations in junction:       %', total_associations_before;
    RAISE NOTICE 'Drawings with MULTIPLE projects:      %', drawings_with_multiple_projects;
    RAISE NOTICE '';
    IF drawings_with_multiple_projects > 0 THEN
        RAISE WARNING 'DATA LOSS: % drawings have multiple projects. Only first will be restored!', drawings_with_multiple_projects;
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Clear existing project_id values (to ensure clean state)
UPDATE drawings SET project_id = NULL WHERE project_id IS NOT NULL;

-- Restore project_id from junction table
-- For drawings with multiple projects, take the earliest association (by assigned_at)
UPDATE drawings d
SET project_id = (
    SELECT dpa.project_id
    FROM drawing_project_associations dpa
    WHERE dpa.drawing_id = d.id
    ORDER BY dpa.assigned_at ASC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM drawing_project_associations dpa
    WHERE dpa.drawing_id = d.id
);

-- Report rollback results
DO $$
DECLARE
    restored_count INTEGER;
    lost_associations INTEGER;
BEGIN
    SELECT COUNT(*) INTO restored_count FROM drawings WHERE project_id IS NOT NULL;
    SELECT COUNT(*) INTO lost_associations
    FROM drawing_project_associations dpa
    WHERE NOT EXISTS (
        SELECT 1 FROM drawings d
        WHERE d.id = dpa.drawing_id AND d.project_id = dpa.project_id
    );

    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Phase A Rollback - Results';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Restored project_id values:           %', restored_count;
    RAISE NOTICE 'Lost associations (many-to-many):     %', lost_associations;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';

    IF lost_associations > 0 THEN
        RAISE WARNING 'DATA LOSS: % associations were not restored due to one-to-many limitation', lost_associations;
    END IF;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_dpa_project_id;
DROP INDEX IF EXISTS idx_dpa_drawing_id;

-- Drop junction table
DROP TABLE IF EXISTS drawing_project_associations;

-- Commit transaction
COMMIT;

-- Verification queries (read-only)
\echo '\n--- Verification: Restored project_id values ---'
SELECT
    d.id as drawing_id,
    d.title as drawing_title,
    d.project_id,
    p.name as project_name
FROM drawings d
LEFT JOIN projects p ON d.project_id = p.id
WHERE d.project_id IS NOT NULL
ORDER BY d.upload_date DESC
LIMIT 5;

\echo '\n--- Verification: Junction table dropped ---'
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'drawing_project_associations'
) as junction_table_still_exists;
