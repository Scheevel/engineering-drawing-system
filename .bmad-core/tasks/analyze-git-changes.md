<!-- Powered by BMAD™ Core -->

# Analyze Git Changes Task

## Purpose

Analyze git repository changes to identify which Docker services were affected by recent development work. This enables smart deployment decisions - only rebuilding containers that actually need updates.

## Task Execution

### 1. Determine Analysis Baseline

**Find Last Deployment Tag** (if exists):
```bash
git tag -l 'deploy-*' --sort=-creatordate | head -1
```

**Options**:
- If tag exists: Use as baseline (e.g., `deploy-20251002-133015`)
- If no tag: Ask user for baseline:
  - Last commit before sprint: `HEAD~<n>`
  - Specific commit hash: `<hash>`
  - Default: `HEAD~10` (last 10 commits)

### 2. Get Changed Files

**Execute Git Diff**:
```bash
git diff <baseline>..HEAD --name-only
```

**Output**: List of all changed file paths

### 3. Categorize Changes by Service

**Frontend Changes**:
- Dependency changes (requires --no-cache rebuild):
  - `frontend/package.json`
  - `frontend/package-lock.json`
- Source code changes (standard rebuild):
  - `frontend/src/**`
  - `frontend/public/**`
  - `frontend/tsconfig.json`
  - `frontend/.env*`

**Backend Changes**:
- Dependency changes (requires --no-cache rebuild):
  - `backend/requirements.txt`
  - `backend/Dockerfile`
- Source code changes (standard rebuild):
  - `backend/app/**`
  - `backend/tests/**`
  - `backend/alembic/**`
  - `backend/.env*`

**Celery Worker**:
- Inherits backend changes (uses same image)
- Rebuild whenever backend has dependency changes

**Infrastructure** (rarely needs rebuild):
- `docker-compose.yml` - configuration change
- `docker-compose-lite.yml` - configuration change
- `.dockerignore` - build context change

### 4. Analyze Change Impact

**For Each Service**:
```
Service: Frontend
  Status: REBUILD REQUIRED
  Reason: package.json modified (new dependency: papaparse)
  Strategy: --no-cache (dependency change)
  Files Changed:
    - frontend/package.json
    - frontend/src/services/exportService.ts (NEW)
    - frontend/src/components/export/* (NEW)
```

**Rebuild Decision Logic**:
- Dependency file changed → REBUILD with --no-cache
- Source code only changed → REBUILD (cache OK)
- No changes → SKIP rebuild

### 5. Estimate Rebuild Time

**Based on Services**:
- Frontend only: ~4 minutes
- Backend only: ~6 minutes
- Backend + Celery: ~6 minutes (parallel)
- All services: ~8-10 minutes (parallel builds)

### 6. Generate Analysis Report

```
=== Change Analysis Report ===
Analysis Period: <baseline> → HEAD (<n> commits)
Analysis Date: <timestamp>

SERVICES REQUIRING REBUILD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Frontend
  Reason: Dependencies changed (package.json)
  Strategy: docker-compose build --no-cache frontend
  Files: 5 changed, 3 new, 0 deleted
  Est. Time: 4 minutes

✓ Backend
  Reason: Dependencies changed (requirements.txt)
  Strategy: docker-compose build --no-cache backend
  Files: 8 changed, 2 new, 0 deleted
  Est. Time: 6 minutes

✓ Celery Worker
  Reason: Backend dependencies changed
  Strategy: docker-compose build --no-cache celery-worker
  Files: Inherits backend changes
  Est. Time: 6 minutes (parallel with backend)

SERVICES NOT REQUIRING REBUILD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

○ Celery Flower (no changes)
○ PostgreSQL (infrastructure)
○ Redis (infrastructure)
○ Elasticsearch (infrastructure)

SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Services to Rebuild: 3
Estimated Total Time: ~8 minutes (with parallel builds)
Estimated Downtime: < 30 seconds (during restart)
Rebuild Strategy: --no-cache (dependency changes detected)
```

## Change Detection Patterns

### Frontend Patterns
```
frontend/package.json           → Dependency change (--no-cache)
frontend/package-lock.json      → Dependency change (--no-cache)
frontend/src/**/*.{ts,tsx}      → Source change (rebuild)
frontend/src/**/*.{css,scss}    → Source change (rebuild)
frontend/public/**              → Asset change (rebuild)
frontend/tsconfig.json          → Config change (rebuild)
```

### Backend Patterns
```
backend/requirements.txt        → Dependency change (--no-cache)
backend/Dockerfile              → Build change (--no-cache)
backend/app/**/*.py             → Source change (rebuild)
backend/tests/**/*.py           → Test change (rebuild)
backend/alembic/versions/**     → Migration change (rebuild)
```

### Docker Infrastructure
```
docker-compose*.yml             → Config change (restart only)
.dockerignore                   → Build context change (--no-cache)
.env                            → Environment change (restart only)
```

## Output Format

The task should output:
1. **Analysis Report** (formatted as shown above)
2. **Rebuild Commands** (ready to execute):
   ```bash
   docker-compose build --no-cache frontend backend celery-worker
   ```
3. **Service List** (for downstream tasks):
   ```json
   {
     "rebuild_required": ["frontend", "backend", "celery-worker"],
     "rebuild_strategy": "no-cache",
     "estimated_time_minutes": 8,
     "baseline": "deploy-20251002-133015"
   }
   ```

## Usage Examples

**Scenario 1: Post-Sprint Deployment**
```
User: "Analyze changes since last deploy"
Agent: Runs analysis, finds 3 services changed
Output: Full report with rebuild recommendations
```

**Scenario 2: Quick Check**
```
User: "Do I need to rebuild anything?"
Agent: Runs analysis, no dependency changes
Output: "No rebuilds required - only source changes"
```

**Scenario 3: Specific Baseline**
```
User: "Check changes since commit abc123"
Agent: Uses abc123 as baseline
Output: Report showing changes since that commit
```

## Notes

- **Performance**: Git analysis is fast (~1 second)
- **Accuracy**: Pattern matching ensures correct service detection
- **Flexibility**: Supports any git reference as baseline
- **Integration**: Output format designed for automated consumption
