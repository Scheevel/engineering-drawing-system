<!-- Powered by BMAD™ Core -->

# Verify Deployment Task

## Purpose

Comprehensively verify that deployed services are healthy, running correctly, and responding to requests. This task provides multi-level health checking from container status to application endpoints.

## Verification Levels

### Level 1: Container Status (Docker)
### Level 2: Network Connectivity (Port checks)
### Level 3: Application Health (HTTP endpoints)
### Level 4: Functional Smoke Tests (Basic operations)

## Task Execution

### 1. Check Container Status

**Command**:
```bash
docker ps --filter "name=drawing_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected Output**:
```
NAMES                                     STATUS              PORTS
drawing_frontend                          Up 2 minutes        0.0.0.0:3000->3000/tcp
drawing_backend                           Up 2 minutes        0.0.0.0:8001->8000/tcp
drawing_celery-worker                     Up 2 minutes
drawing_celery-flower                     Up 2 minutes        0.0.0.0:5555->5555/tcp
drawing_postgres                          Up 5 hours          0.0.0.0:5432->5432/tcp
drawing_redis                             Up 5 hours          0.0.0.0:6379->6379/tcp
drawing_elasticsearch                     Up 5 hours          0.0.0.0:9200->9200/tcp
```

**Validation**:
- All expected containers show "Up" status
- No containers in "Restarting" or "Exited" state
- Correct port mappings present

**If Failed**:
- Identify which container(s) are down
- Check logs: `docker logs <container-name> --tail=100`
- Report error to user

### 2. Check Container Health Status

**Command**:
```bash
docker ps --filter "name=drawing_" --format "{{.Names}}: {{.Status}}"
```

**For Containers with Health Checks**:
- Status should show "(healthy)" indicator
- Wait up to 30 seconds for health check to pass

**If Health Check Fails**:
- Show container logs
- Explain likely causes based on service type

### 3. Test Network Connectivity

**Port Reachability Tests**:
```bash
# Frontend
nc -zv localhost 3000

# Backend
nc -zv localhost 8001

# Celery Flower
nc -zv localhost 5555

# Infrastructure
nc -zv localhost 5432  # PostgreSQL
nc -zv localhost 6379  # Redis
nc -zv localhost 9200  # Elasticsearch
```

**Expected**: All ports should be reachable (exit code 0)

### 4. Test HTTP Endpoints

**Backend Health Check**:
```bash
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:8001/health
```
**Expected**: `200`

**Backend API Docs**:
```bash
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:8001/docs
```
**Expected**: `200`

**Frontend**:
```bash
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
**Expected**: `200`

**Celery Flower**:
```bash
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:5555
```
**Expected**: `200`

**Timeout**: 30 seconds per endpoint (services may need startup time)

### 5. Check for Startup Errors

**Review Recent Logs** (last 50 lines):
```bash
docker-compose logs --tail=50 backend frontend celery-worker
```

**Error Patterns to Flag**:
- Python: `ModuleNotFoundError`, `ImportError`, `SyntaxError`
- Node: `Module not found`, `Cannot find module`, `SyntaxError`
- Database: `Connection refused`, `authentication failed`
- Port conflicts: `Address already in use`

**If Errors Found**:
- Categorize error severity (Critical / Warning / Info)
- Report to user with context
- Suggest remediation steps

### 6. Test Basic API Functionality

**Backend Database Connection**:
```bash
curl -s http://localhost:8001/health | jq .
```
**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-02T17:45:00Z"
}
```

**Backend API List Drawings** (verify backend operational):
```bash
curl -s http://localhost:8001/api/v1/drawings?limit=1 | jq .
```
**Expected**: Valid JSON response (may be empty list)

### 7. Frontend Compilation Check

**Check for Webpack Errors**:
```bash
docker logs drawing_frontend --tail=100 | grep -i "compiled\|error\|failed"
```

**Expected**:
```
Compiled successfully!
```

**Not Expected**:
```
Failed to compile
Module not found
```

### 8. Celery Worker Status

**Check Celery Flower Dashboard**:
```bash
curl -s http://localhost:5555/api/workers | jq .
```

**Expected**: At least one worker active

### 9. Generate Verification Report

```
=== Deployment Verification Report ===
Date: <timestamp>
Duration: <verification-time>

CONTAINER STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Frontend        Up 3 minutes    Port 3000
✓ Backend         Up 3 minutes    Port 8001
✓ Celery Worker   Up 3 minutes    (no ports)
✓ Celery Flower   Up 3 minutes    Port 5555
✓ PostgreSQL      Up 5 hours      Port 5432
✓ Redis           Up 5 hours      Port 6379
✓ Elasticsearch   Up 5 hours      Port 9200

HEALTH CHECKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Frontend        http://localhost:3000        200 OK
✓ Backend Health  http://localhost:8001/health 200 OK
✓ Backend API     http://localhost:8001/docs   200 OK
✓ Celery Flower   http://localhost:5555        200 OK

COMPILATION STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Frontend        Compiled successfully

DATABASE CONNECTIVITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Backend → PostgreSQL    Connected
✓ Backend → Redis         Connected
✓ Backend → Elasticsearch Connected

CELERY WORKERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Worker 1 (celery@worker1)  Active

ERROR SCAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No critical errors detected in recent logs

VERIFICATION: SUCCESS ✓

All services are healthy and operational.
System ready for testing.
```

## Failure Scenarios and Actions

### Scenario 1: Container Not Running
```
Error: drawing_backend - Status: Exited (1) 2 minutes ago
Action: Check logs, identify startup error, suggest fix
```

### Scenario 2: Health Endpoint Fails
```
Error: Backend health check returned 503 Service Unavailable
Cause: Database connection failure
Action: Check postgres container, verify connection string
```

### Scenario 3: Frontend Compilation Error
```
Error: Module not found: Error: Can't resolve 'papaparse'
Cause: Dependencies not installed in container
Action: Rebuild frontend with --no-cache
```

### Scenario 4: Port Conflict
```
Error: Cannot start service backend: Bind for 0.0.0.0:8001 failed: port is already allocated
Action: Identify process using port, suggest cleanup
```

## Quick Verification Command

For rapid checks during development:
```bash
# One-liner to check all critical services
curl -s http://localhost:8001/health && \
curl -s http://localhost:3000 -o /dev/null && \
curl -s http://localhost:5555 -o /dev/null && \
echo "✓ All services responding"
```

## Notes

- **Timing**: Health checks may take 10-30 seconds after container start
- **Retries**: Implement 3 retries with 5-second delays for endpoint checks
- **Logging**: Log all verification steps for troubleshooting
- **Exit Codes**: Return 0 for success, 1 for failures
- **Progressive**: Check containers first (fast), then endpoints (slower)
- **User Feedback**: Show progress during verification (e.g., "Checking backend health...")
