<!-- Powered by BMAD™ Core -->

# Docker Orchestration Helpers

## Purpose

Reference guide for common Docker Compose orchestration commands and patterns used in deployment workflows. This utility provides copy-paste commands and troubleshooting patterns.

## Container Management Commands

### Build Commands

**Build Single Service**:
```bash
docker-compose build <service-name>
```

**Build with No Cache** (for dependency changes):
```bash
docker-compose build --no-cache <service-name>
```

**Build Multiple Services**:
```bash
docker-compose build frontend backend celery-worker
```

**Build Multiple Services in Parallel with No Cache**:
```bash
docker-compose build --no-cache --parallel frontend backend celery-worker
```

**Check Build Progress**:
```bash
docker-compose ps
docker images | grep drawing
```

### Service Control

**Start All Services**:
```bash
docker-compose up -d
```

**Start Specific Services**:
```bash
docker-compose up -d frontend backend
```

**Stop Specific Services** (graceful shutdown):
```bash
docker-compose stop frontend backend celery-worker
```

**Stop All Services**:
```bash
docker-compose down
```

**Restart Service** (after rebuild):
```bash
docker-compose restart <service-name>
```

**Force Recreate Container**:
```bash
docker-compose up -d --force-recreate <service-name>
```

### Status and Monitoring

**Show Running Containers**:
```bash
docker-compose ps
```

**Detailed Container Status**:
```bash
docker ps --filter "name=drawing_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**View Logs** (last 100 lines):
```bash
docker-compose logs --tail=100 <service-name>
```

**Follow Logs** (real-time):
```bash
docker-compose logs -f <service-name>
```

**View Logs Since Timestamp**:
```bash
docker-compose logs --since 5m <service-name>
```

## Health Checking Patterns

### HTTP Health Checks

**Check Backend Health**:
```bash
curl -f http://localhost:8001/health || echo "Backend unhealthy"
```

**Check Frontend**:
```bash
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

**Check Celery Flower**:
```bash
curl -f http://localhost:5555/api/workers | jq .
```

### Port Connectivity Checks

**Test Port Reachability**:
```bash
nc -zv localhost 3000  # Frontend
nc -zv localhost 8001  # Backend
nc -zv localhost 5555  # Celery Flower
```

**Wait for Port to Open** (with timeout):
```bash
timeout 30 bash -c 'until nc -z localhost 8001; do sleep 1; done'
```

### Container Health Status

**Check Specific Container**:
```bash
docker inspect --format='{{.State.Health.Status}}' drawing_backend
```

**Show All Container Health**:
```bash
docker ps --format "{{.Names}}: {{.Status}}"
```

## Troubleshooting Commands

### Finding Errors

**Search Logs for Errors**:
```bash
docker-compose logs <service> | grep -i "error\|exception\|failed"
```

**Check Last Error**:
```bash
docker-compose logs --tail=100 <service> | grep -A 5 -i "error"
```

**Identify Failed Container**:
```bash
docker ps -a --filter "status=exited" --filter "name=drawing_"
```

### Debugging Issues

**Execute Shell in Running Container**:
```bash
docker exec -it drawing_backend /bin/bash
```

**Check Container Environment Variables**:
```bash
docker exec drawing_backend env | sort
```

**Inspect Container Configuration**:
```bash
docker inspect drawing_backend | jq .
```

**Check Container Resource Usage**:
```bash
docker stats --no-stream drawing_backend drawing_frontend
```

### Port Conflicts

**Find Process Using Port**:
```bash
lsof -i :8001  # Backend port
lsof -i :3000  # Frontend port
```

**Kill Process on Port** (macOS):
```bash
lsof -ti :8001 | xargs kill -9
```

### Network Issues

**List Docker Networks**:
```bash
docker network ls
```

**Inspect Project Network**:
```bash
docker network inspect engineering-drawing-system-standalone_default
```

**Test Container-to-Container Connectivity**:
```bash
docker exec drawing_backend ping -c 3 drawing_postgres
```

## Cleanup Commands

### Remove Stopped Containers

```bash
docker-compose down
```

### Remove Containers and Volumes

```bash
docker-compose down -v
```

### Prune Unused Resources

```bash
# Remove dangling images
docker image prune -f

# Remove all unused resources
docker system prune -f

# Aggressive cleanup (includes volumes)
docker system prune -a --volumes -f
```

### Remove Specific Image

```bash
docker rmi engineering-drawing-system-standalone_backend
```

## Service Dependency Order

When starting services manually, follow this order:

1. **Infrastructure** (can start in parallel):
   ```bash
   docker-compose up -d postgres redis elasticsearch
   ```

2. **Backend Services**:
   ```bash
   docker-compose up -d backend
   ```

3. **Background Workers**:
   ```bash
   docker-compose up -d celery-worker celery-flower
   ```

4. **Frontend**:
   ```bash
   docker-compose up -d frontend
   ```

**Wait Times**:
- PostgreSQL: ~3 seconds
- Redis: ~1 second
- Elasticsearch: ~10 seconds
- Backend: ~5 seconds
- Frontend: ~5 seconds

## Quick Command Reference

### Pre-Deployment Checks

```bash
# Check current containers
docker-compose ps

# Check disk space
docker system df

# Check Docker daemon
docker info
```

### Standard Rebuild Workflow

```bash
# Stop affected services
docker-compose stop frontend backend celery-worker

# Rebuild with no cache
docker-compose build --no-cache frontend backend celery-worker

# Start services
docker-compose up -d frontend backend celery-worker

# Verify health
curl http://localhost:8001/health
curl http://localhost:3000
```

### Emergency Rollback

```bash
# Stop all services
docker-compose down

# Clear current state
docker system prune -f

# Rebuild from clean state
docker-compose build --no-cache

# Start all services
docker-compose up -d

# Verify
docker-compose ps
```

## Environment-Specific Commands

### Development Mode (without Docker)

```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm start

# Celery
cd backend && celery -A app.core.celery_app worker --loglevel=info
```

### Docker Lite Mode (no Elasticsearch)

```bash
docker-compose -f docker-compose-lite.yml up -d
```

## Container Naming Convention

All containers follow the pattern: `drawing_<service>`

- `drawing_frontend` - React frontend
- `drawing_backend` - FastAPI backend
- `drawing_celery-worker` - Background task processor
- `drawing_celery-flower` - Celery monitoring
- `drawing_postgres` - PostgreSQL database
- `drawing_redis` - Redis cache/broker
- `drawing_elasticsearch` - Search engine

## Port Mapping Reference

| Service       | Container Port | Host Port | Protocol |
|---------------|----------------|-----------|----------|
| Frontend      | 3000           | 3000      | HTTP     |
| Backend       | 8000           | 8001      | HTTP     |
| Celery Flower | 5555           | 5555      | HTTP     |
| PostgreSQL    | 5432           | 5432      | TCP      |
| Redis         | 6379           | 6379      | TCP      |
| Elasticsearch | 9200           | 9200      | HTTP     |

## Performance Tips

- **Parallel Builds**: Use `--parallel` flag for faster multi-service builds
- **Layer Caching**: Avoid `--no-cache` unless dependencies changed
- **Resource Limits**: Set in docker-compose.yml to prevent resource exhaustion
- **Log Rotation**: Configure to prevent disk space issues
- **Volume Mounts**: Use for development, not production

## Security Notes

- Never commit `.env` files with secrets
- Use Docker secrets for production credentials
- Keep base images updated for security patches
- Limit container capabilities in production
- Use non-root users in containers
