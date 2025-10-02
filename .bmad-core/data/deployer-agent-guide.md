<!-- Powered by BMAD™ Core -->

# Deployer Agent - Quick Start Guide

## What Is the Deployer Agent?

The **Deployer Agent** is a BMad specialist agent designed to automate the end-of-sprint container orchestration workflow. It solves the recurring problem of manually rebuilding and redeploying Docker containers after invasive development cycles.

## When to Use

**Use the Deployer Agent when**:
- ✓ Finishing a sprint and need to rebuild/redeploy containers
- ✓ After adding new npm or pip dependencies
- ✓ When frontend shows "Module not found" errors in Docker
- ✓ When backend shows "ModuleNotFoundError" for new packages
- ✓ After making Dockerfile changes
- ✓ When you want to verify all services are healthy

**Don't use for**:
- Local development (use `npm start`, `uvicorn`, etc.)
- Production deployments (use CI/CD pipelines)
- Quick code changes (Docker volumes sync automatically)

## How to Activate

```bash
/BMad:agents:deployer
```

The agent will:
1. Greet you as the Deployment Specialist
2. Auto-run `*help` to show available commands
3. Wait for your commands

## Common Workflows

### Workflow 1: Smart Deploy (Recommended)

**Use Case**: End of sprint, auto-detect what needs rebuilding

```
You: *smart-deploy
Agent: Analyzes git changes since last deploy
Agent: Identifies affected services (frontend, backend, celery)
Agent: Shows rebuild plan and asks for confirmation
You: yes
Agent: Rebuilds affected containers with --no-cache
Agent: Deploys services in correct order
Agent: Verifies health checks
Agent: Shows deployment summary
```

**Time**: ~8-10 minutes for full rebuild

### Workflow 2: Manual Rebuild

**Use Case**: You know exactly which service needs rebuilding

```
You: *rebuild frontend
Agent: Rebuilds frontend container with --no-cache
You: *deploy
Agent: Restarts frontend service
You: *verify
Agent: Confirms frontend is healthy
```

**Time**: ~4 minutes for single service

### Workflow 3: Quick Health Check

**Use Case**: Verify everything is running correctly

```
You: *status
Agent: Shows all container status
You: *verify
Agent: Tests all health endpoints
Agent: Reports any issues found
```

**Time**: ~10 seconds

### Workflow 4: Troubleshooting

**Use Case**: Something isn't working after deployment

```
You: *status
Agent: Shows container status (one is "Exited")
Agent: Identifies drawing_backend failed
You: *verify
Agent: Shows health check failures
Agent: Displays last 100 lines of backend logs
Agent: Identifies ModuleNotFoundError
You: *rebuild backend
Agent: Rebuilds backend with --no-cache
You: *deploy
Agent: Restarts backend
You: *verify
Agent: Confirms backend now healthy
```

## Available Commands

| Command | Purpose | Time |
|---------|---------|------|
| `*smart-deploy` | Full workflow: analyze → rebuild → deploy → verify | 8-10 min |
| `*analyze` | Show which services need rebuilding | 5 sec |
| `*rebuild [service]` | Rebuild specific service(s) | 4-6 min |
| `*full-rebuild` | Rebuild all services from scratch | 10 min |
| `*deploy` | Deploy rebuilt services | 30 sec |
| `*verify` | Check health of all services | 10 sec |
| `*status` | Show container status | 2 sec |
| `*check-deps` | Check for dependency file changes | 3 sec |
| `*cleanup` | Prune old images and free disk space | 30 sec |
| `*rollback` | Revert to previous deployment | 2 min |

## Real-World Example: Story 7.1 Deployment

**Scenario**: Just completed Story 7.1 (CSV Export), added papaparse to frontend and prometheus to backend.

**Problem**: Frontend shows "Module not found: Error: Can't resolve 'papaparse'"

**Solution with Deployer Agent**:

```
1. Activate Agent:
   /BMad:agents:deployer

2. Run Smart Deploy:
   *smart-deploy

3. Agent Analysis:
   === Deployment Analysis ===
   Changes Since: Story 7.1 implementation

   Services Requiring Rebuild:
   ✓ Frontend (package.json changed - added papaparse)
   ✓ Backend (requirements.txt changed - added prometheus)
   ✓ Celery Worker (backend dependencies changed)

   Strategy: --no-cache (dependency changes)
   Estimated Time: 8 minutes

4. Agent Confirms:
   Proceed with rebuild? (yes/no)

5. Agent Executes:
   [Building frontend...] ████████████████████ 100% (4m 23s)
   [Building backend...] ████████████████████ 100% (6m 12s)
   [Building celery...] ████████████████████ 100% (6m 15s)

6. Agent Deploys:
   Starting backend... ✓
   Starting celery-worker... ✓
   Starting frontend... ✓

7. Agent Verifies:
   ✓ Frontend: http://localhost:3000 (200 OK)
   ✓ Backend: http://localhost:8001/health (200 OK)
   ✓ Celery Worker: Active

   Deployment: SUCCESS ✓

8. Result:
   CSV Export feature now available with papaparse installed
```

**Time Saved**: 30 minutes of manual troubleshooting → 10 minutes automated deployment

## Architecture: How It Works

### Detection Phase
```
Git Analysis → Changed Files → Service Mapping → Rebuild Strategy
```

**Service Detection Rules**:
- `frontend/package.json` changed → Frontend rebuild (--no-cache)
- `backend/requirements.txt` changed → Backend + Celery rebuild (--no-cache)
- Only `frontend/src/*` changed → Frontend rebuild (cache OK)
- Only `backend/app/*` changed → Backend rebuild (cache OK)

### Rebuild Phase
```
Stop Services → Build Containers → Verify Build Success
```

**Parallel Building**:
- Frontend and Backend build simultaneously (saves ~4 minutes)
- Celery builds with Backend (shares Dockerfile)

### Deployment Phase
```
Start Backend → Wait 5s → Start Celery → Wait 5s → Start Frontend
```

**Dependency Order**:
1. Backend API (others depend on it)
2. Celery Worker (uses backend code)
3. Frontend (consumes backend API)

### Verification Phase
```
Container Status → Port Checks → HTTP Health → Log Scan → Summary
```

**Multi-Level Verification**:
- Level 1: Docker container status ("Up" vs "Exited")
- Level 2: Port connectivity (is port responding?)
- Level 3: HTTP health endpoints (200 OK?)
- Level 4: Log error scan (any startup issues?)

## Integration with BMad Workflow

The Deployer Agent fits into the BMad development workflow:

```
1. PO writes story
2. Dev implements story (*develop-story)
3. Dev runs tests (*run-tests)
4. Dev commits changes (git commit)
5. *** Deploy with Deployer Agent (*smart-deploy) ***
6. QA tests deployed feature
7. Story marked "Ready for Review"
```

**Key Insight**: The agent bridges the gap between development completion and deployed verification.

## Troubleshooting Guide

### Issue: "Module not found" in Docker

**Symptom**: Frontend or backend can't find newly added package

**Cause**: Docker container built before dependency was added

**Solution**:
```
*rebuild frontend --no-cache
*deploy
*verify
```

### Issue: Container exits immediately

**Symptom**: `docker ps` shows service not running

**Cause**: Startup error (check logs)

**Solution**:
```
*status                    # Identify failed container
*verify                    # See health check failure details
Check logs shown by agent
Fix underlying issue
*rebuild [service]
*deploy
```

### Issue: Port conflict

**Symptom**: "Bind for 0.0.0.0:8001 failed: port is already allocated"

**Cause**: Another process using the port

**Solution**:
```
*cleanup                   # Prune old containers
Or manually: lsof -ti :8001 | xargs kill -9
*deploy
```

### Issue: Slow rebuild

**Symptom**: Rebuild taking > 15 minutes

**Cause**: Docker cache issues or network slow

**Solution**:
```
*cleanup                   # Free disk space
docker system prune -a -f  # Aggressive cleanup
*full-rebuild              # Start fresh
```

## Files Created

The Deployer Agent consists of:

**Agent Configuration**:
- `.bmad-core/agents/deployer.md` - Agent persona and commands

**Task Workflows**:
- `.bmad-core/tasks/deploy-containers.md` - Main deployment workflow
- `.bmad-core/tasks/analyze-git-changes.md` - Change detection logic
- `.bmad-core/tasks/verify-deployment.md` - Health verification steps

**Utilities**:
- `.bmad-core/utils/docker-orchestration-helpers.md` - Docker command reference

**Documentation**:
- `.bmad-core/data/deployer-agent-guide.md` - This guide

## Advanced Usage

### Custom Baseline for Analysis

```
*analyze <git-ref>
```
Example:
```
*analyze HEAD~20          # Check last 20 commits
*analyze abc123           # Check since specific commit
*analyze deploy-20251001  # Check since last deploy tag
```

### Selective Rebuild

```
*rebuild frontend backend     # Only these two services
```

### Deployment Tagging

After successful deployment:
```bash
git tag deploy-$(date +%Y%m%d-%H%M%S)
git push origin --tags
```

This provides baseline for next deployment's change analysis.

### Rollback

If deployment fails:
```
*rollback
```

Agent will:
1. Stop failed services
2. Restore previous container images
3. Restart services
4. Verify health

## Performance Characteristics

| Operation | Time | Parallelizable |
|-----------|------|----------------|
| Git analysis | ~1 sec | N/A |
| Frontend rebuild (no-cache) | ~4 min | Yes |
| Backend rebuild (no-cache) | ~6 min | Yes |
| Celery rebuild (no-cache) | ~6 min | Yes (with backend) |
| Service start | ~30 sec | No (sequential) |
| Health verification | ~10 sec | Yes |
| **Total (smart-deploy)** | **~8-10 min** | Mixed |

**Optimization**: Frontend + Backend build in parallel saves ~4 minutes vs sequential.

## Best Practices

1. **Always use `*smart-deploy`** for end-of-sprint deployments (safest)
2. **Tag deployments** after success (enables baseline tracking)
3. **Check `*status`** before starting work (verify clean state)
4. **Use `*verify`** after manual changes (catch issues early)
5. **Run `*cleanup`** weekly (free disk space)

## Common Mistakes to Avoid

❌ **Don't**: Rebuild without `--no-cache` when dependencies changed
✓ **Do**: Use `*smart-deploy` which auto-detects dependency changes

❌ **Don't**: Manually run `docker-compose up` after rebuild
✓ **Do**: Use `*deploy` which handles correct startup order

❌ **Don't**: Assume services are healthy just because containers are "Up"
✓ **Do**: Always run `*verify` to check health endpoints

❌ **Don't**: Rebuild all services for every small change
✓ **Do**: Use `*analyze` to identify only affected services

## Future Enhancements

Potential improvements for the agent:

- **Parallel Verification**: Health checks could run concurrently
- **Auto-Rollback**: Detect failed deployment and auto-revert
- **Performance Metrics**: Track rebuild times over sprints
- **Slack Integration**: Post deployment status to team channel
- **Blue-Green Deployment**: Zero-downtime deployment strategy
- **Database Migration Check**: Verify migrations before deployment

## Summary

The Deployer Agent transforms a 30-minute manual troubleshooting session into a 10-minute automated workflow. It:

- ✓ Analyzes git changes to detect affected services
- ✓ Rebuilds only what's needed with correct strategy
- ✓ Deploys in correct dependency order
- ✓ Verifies health at multiple levels
- ✓ Provides clear status reporting
- ✓ Offers rollback if issues occur

**Activation**: `/BMad:agents:deployer`

**Most Common Command**: `*smart-deploy`

**Time Saved**: ~20-30 minutes per deployment

**Success Rate**: Eliminates "works on my machine" issues in Docker environments
