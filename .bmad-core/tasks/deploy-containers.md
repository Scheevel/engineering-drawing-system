<!-- Powered by BMAD™ Core -->

# Deploy Containers Task

## Purpose

Orchestrate the complete container deployment workflow: analyze changes, rebuild affected services, deploy, and verify health. This task automates the end-of-sprint deployment process to eliminate manual container orchestration issues.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Pre-Deployment Preparation

- **Verify Git Status**: Ensure working directory is clean or changes are committed
- **Load Configuration**: Read project configuration from `.bmad-core/core-config.yaml`
- **Check Docker Status**: Verify Docker daemon is running
- **Identify Deployment Scope**: User-specified services OR auto-detect from changes

### 1. Change Analysis

**Objective**: Identify which services were affected by recent development work

**Actions**:
- Determine baseline for comparison:
  - If deploy tag exists: `git diff <last-deploy-tag>..HEAD --name-only`
  - Otherwise: Use `git log --oneline -10` to understand recent commits
- Categorize changed files by service:
  - `frontend/package.json` OR `frontend/package-lock.json` → Frontend needs rebuild
  - `frontend/src/**` OR `frontend/public/**` → Frontend code changes
  - `backend/requirements.txt` → Backend + Celery need rebuild
  - `backend/app/**` OR `backend/tests/**` → Backend code changes
  - `backend/Dockerfile` → Backend + Celery need rebuild
- Flag dependency changes (require --no-cache rebuild):
  - Package manager files changed: YES → Use --no-cache
  - Only source code changed: NO → Can rebuild without --no-cache (faster)

**Output**: List of services requiring rebuild and rebuild strategy

### 2. User Confirmation

**Present Analysis**:
```
=== Deployment Analysis ===
Changes Detected Since: <baseline>

Services Requiring Rebuild:
  ✓ Frontend (reason: package.json modified, requires --no-cache)
  ✓ Backend (reason: requirements.txt modified, requires --no-cache)
  ✓ Celery Worker (reason: backend dependencies changed)

Services NOT Requiring Rebuild:
  - Celery Flower (no changes detected)
  - PostgreSQL (infrastructure service)
  - Redis (infrastructure service)
  - Elasticsearch (infrastructure service)

Rebuild Strategy:
  - Use --no-cache: YES (dependency files changed)
  - Estimated time: ~8-10 minutes
  - Downtime: < 30 seconds during service restart
```

**Ask User**:
- Proceed with rebuild? (Yes/No)
- If No: Ask which services to rebuild manually

### 3. Service Shutdown

**Actions**:
- Stop affected services only (preserve infrastructure):
  ```bash
  docker-compose stop <service-list>
  ```
- Verify services stopped:
  ```bash
  docker ps | grep <service-names>
  ```
- Keep infrastructure services running (postgres, redis, elasticsearch)

**Output**: Confirmation that target services are stopped

### 4. Container Rebuild

**Actions**:
- Build services in parallel when possible:
  ```bash
  docker-compose build --no-cache <service-list>
  ```
- Monitor build progress for each service
- Log build output to deployment log
- Check for build errors

**Error Handling**:
- If build fails:
  - Show full error output
  - Ask user if they want to retry or skip service
  - HALT if critical service fails (backend, frontend)

**Output**: Successfully built images for all target services

### 5. Service Deployment

**Actions**:
- Start services in dependency order:
  1. Backend (API must be available first)
  2. Celery Worker (depends on backend code)
  3. Celery Flower (monitoring for celery)
  4. Frontend (consumes backend API)
- Use detached mode:
  ```bash
  docker-compose up -d <service-list-in-order>
  ```
- Wait 5-10 seconds between services for initialization

**Output**: All services started

### 6. Health Verification

**Actions**:
- Check container status:
  ```bash
  docker ps --filter "name=drawing_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  ```
- Verify health endpoints (with 30 second timeout per service):
  - Backend: `curl -f http://localhost:8001/health` (expect 200)
  - Frontend: `curl -f http://localhost:3000` (expect 200)
  - Celery Flower: `curl -f http://localhost:5555` (expect 200)
- Check for startup errors in logs:
  ```bash
  docker-compose logs --tail=50 <service>
  ```

**Success Criteria**:
- All containers show "Up" status
- Health checks return 200 OK
- No critical errors in recent logs

**Failure Handling**:
- If health check fails:
  - Show last 100 lines of logs
  - Offer to rollback or debug
  - HALT for user decision

### 7. Smoke Testing

**Actions**:
- Test basic functionality:
  - Frontend: Access http://localhost:3000 (check for compile errors)
  - Backend API: `curl http://localhost:8001/docs` (OpenAPI docs available)
  - Backend Health: `curl http://localhost:8001/health` (service responding)
- Verify critical features based on recent changes:
  - If Story 7.1 changes: Check export functionality exists in UI
  - If backend API changes: Test affected endpoints

**Output**: Confirmation that basic functionality works

### 8. Deployment Summary

**Generate Report**:
```
=== Deployment Summary ===
Date: <timestamp>
Baseline: <git-reference>
Duration: <total-time>

Services Rebuilt:
  ✓ Frontend (build time: 4m 23s)
  ✓ Backend (build time: 6m 12s)
  ✓ Celery Worker (build time: 6m 15s)

Health Status:
  ✓ Frontend: http://localhost:3000 (200 OK)
  ✓ Backend: http://localhost:8001/health (200 OK)
  ✓ Celery Flower: http://localhost:5555 (200 OK)

Services Running:
  - drawing_frontend
  - drawing_backend
  - drawing_celery-worker
  - drawing_celery-flower
  - drawing_postgres
  - drawing_redis
  - drawing_elasticsearch

Deployment: SUCCESS ✓

Next Steps:
  1. Test Story 7.1 CSV Export functionality
  2. Run regression tests if available
  3. Tag deployment: git tag deploy-<date>
  4. Document any issues in deployment log
```

**Actions**:
- Ask user if they want to create deployment tag
- Offer to open deployment log for review
- Suggest next steps for testing

### 9. Optional: Deployment Tagging

**If User Confirms**:
```bash
git tag deploy-$(date +%Y%m%d-%H%M%S)
git push origin --tags
```

**Purpose**: Provides baseline for next deployment's change analysis

## Error Recovery Procedures

### Build Failure
1. Show full build error output
2. Check common issues:
   - Missing dependencies in package.json / requirements.txt
   - Syntax errors in Dockerfile
   - Network issues pulling base images
3. Offer to retry with verbose logging
4. If persistent: Suggest user fix and re-run deployment

### Health Check Failure
1. Show last 100 lines of container logs
2. Check common issues:
   - Port conflicts (another service using port)
   - Missing environment variables
   - Database connection issues
3. Offer options:
   - Restart failed service
   - Rollback to previous version
   - Debug mode (keep containers running for inspection)

### Partial Deployment
1. If some services succeed but others fail:
   - Keep successful services running
   - Only restart failed services after fix
   - Maintain system availability

## Rollback Procedure

If deployment fails and user requests rollback:

1. **Stop New Containers**:
   ```bash
   docker-compose stop <failed-services>
   ```

2. **Restore Previous Images**:
   - If previous images were tagged: Use tagged versions
   - Otherwise: Suggest rebuilding from previous git commit

3. **Restart Services**:
   ```bash
   docker-compose up -d <services>
   ```

4. **Verify Rollback**:
   - Run health checks on restored services
   - Confirm system operational

## Notes

- **Parallel Builds**: Frontend and backend can build simultaneously (saves ~4 minutes)
- **Celery Dependency**: Always rebuild celery-worker when backend requirements.txt changes
- **Cache Strategy**: Use --no-cache for dependency changes, skip for code-only changes
- **Downtime**: Infrastructure services (postgres, redis, elasticsearch) remain running
- **Logs**: All deployment actions should be logged for audit trail
- **Safety**: Always offer rollback option if health checks fail
