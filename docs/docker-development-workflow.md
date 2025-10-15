# Docker Development Workflow

**Author**: Claude (AI-generated documentation, Epic 5 deliverable)
**Created**: September 2025

## Overview

This document provides complete instructions for developing the Engineering Drawing Index System using Docker containers. The containerized approach provides unified lifecycle management, environment isolation, and development/production parity.

## Quick Start

### Prerequisites

- Docker Desktop (macOS/Windows) or Docker CE (Linux)
- Git
- No Node.js installation required (runs in container)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd engineering-drawing-system-standalone
   ```

2. **Start development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs
   - Celery Flower (task monitoring): http://localhost:5555

## Development Commands

### Starting Services

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up

# Start in background (detached mode)
docker-compose -f docker-compose.dev.yml up -d

# Start only specific services
docker-compose -f docker-compose.dev.yml up frontend backend postgres
```

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean reset)
docker-compose -f docker-compose.dev.yml down -v
```

### Monitoring and Debugging

```bash
# View logs from all services
docker-compose -f docker-compose.dev.yml logs -f

# View logs from specific service
docker-compose -f docker-compose.dev.yml logs -f frontend

# Check service status
docker-compose -f docker-compose.dev.yml ps

# Execute commands in running containers
docker-compose -f docker-compose.dev.yml exec frontend npm test
docker-compose -f docker-compose.dev.yml exec backend python -m pytest
```

## Hot Module Replacement (HMR)

The containerized frontend supports full hot module replacement:

- **File changes** reflect in browser within 2 seconds
- **Component state** is preserved during hot reloads
- **Development experience** matches native npm start

### HMR Configuration

HMR is pre-configured with optimal settings:
- `CHOKIDAR_USEPOLLING=true` - Enables file watching in Docker
- `FAST_REFRESH=true` - React fast refresh support
- `WDS_SOCKET_HOST=localhost` - WebSocket host configuration
- `WDS_SOCKET_PORT=3000` - WebSocket port configuration

### Troubleshooting HMR

If HMR isn't working:

1. **Check file watching limits (Linux only)**
   ```bash
   ./scripts/optimize-file-watching.sh
   ```

2. **Restart the frontend service**
   ```bash
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

3. **Clear browser cache and refresh**

## File Synchronization

### Source Code Changes

- **Frontend changes**: Live-synced via volume mount (`./frontend:/app`)
- **Backend changes**: Live-synced via volume mount (`./backend:/app`)
- **Automatic reload**: Both services use development servers with auto-reload

### Node Modules Management

- **Anonymous volumes** prevent node_modules conflicts
- **Dependency changes** require container rebuild:
  ```bash
  # After changing package.json
  docker-compose -f docker-compose.dev.yml build frontend
  docker-compose -f docker-compose.dev.yml up frontend
  ```

## Performance Optimization

### Resource Limits

Services are configured with optimal resource limits:
- **Frontend**: 512MB memory, 0.5 CPU
- **Backend**: 1GB memory, 1.0 CPU
- **PostgreSQL**: 256MB memory, 0.25 CPU
- **Redis**: 128MB memory, 0.1 CPU
- **Elasticsearch**: 512MB memory, 0.5 CPU

### Build Optimization

- **Layer caching**: Dockerfile.dev optimized for fast rebuilds
- **Dependency caching**: package.json changes trigger minimal rebuilds
- **.dockerignore**: Excludes unnecessary files from build context

### File Watching Performance

For optimal file watching performance:

**Linux users:**
```bash
./scripts/optimize-file-watching.sh
```

**macOS/Windows users:**
File watching is handled automatically by Docker Desktop.

## Development Workflows

### Frontend Development

1. **Start environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Develop with live reload**
   - Edit files in `./frontend/src/`
   - Changes appear in browser automatically
   - HMR preserves component state

3. **Run tests**
   ```bash
   docker-compose -f docker-compose.dev.yml exec frontend npm test
   ```

4. **Type checking**
   ```bash
   docker-compose -f docker-compose.dev.yml exec frontend npm run type-check
   ```

### Backend Development

1. **Start environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Develop with auto-reload**
   - Edit files in `./backend/app/`
   - FastAPI automatically reloads server
   - Changes reflect immediately

3. **Run tests**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend python -m pytest
   ```

4. **Database migrations**
   ```bash
   # Create migration
   docker-compose -f docker-compose.dev.yml exec backend alembic revision --autogenerate -m "Description"

   # Apply migrations
   docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
   ```

### Database Management

```bash
# Access PostgreSQL console
docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d drawing_index

# Reset database (destructive)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up postgres -d
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :3000,8001,5432,6379,9200

# Stop conflicting services
docker-compose -f docker-compose.dev.yml down
```

#### Container Build Issues
```bash
# Clean rebuild
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

#### Volume Permission Issues (Linux)
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./frontend ./backend
```

#### Memory/Resource Issues
```bash
# Check resource usage
docker stats

# Restart with clean state
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker-compose -f docker-compose.dev.yml up
```

### Performance Issues

#### Slow File Watching
1. Run file watching optimization (Linux):
   ```bash
   ./scripts/optimize-file-watching.sh
   ```

2. Restart Docker Desktop (macOS/Windows)

3. Check available system resources

#### Slow Container Startup
1. Check Docker Desktop settings
2. Allocate more resources to Docker
3. Use SSD storage if possible

## Environment Variables

### Frontend Environment Variables

Located in `frontend/.env.development`:
```bash
# Schema Management
REACT_APP_SCHEMA_VALIDATION_DEBOUNCE_MS=500
REACT_APP_SCHEMA_AUTO_SAVE_INTERVAL_MS=30000

# Hot Module Replacement
CHOKIDAR_USEPOLLING=true
FAST_REFRESH=true
WDS_SOCKET_HOST=localhost
WDS_SOCKET_PORT=3000
```

### Backend Environment Variables

Configured in `docker-compose.dev.yml`:
```yaml
DATABASE_URL=postgresql://user:password@postgres:5432/drawing_index
REDIS_URL=redis://redis:6379
ELASTICSEARCH_URL=http://elasticsearch:9200
DEBUG=true
LOG_LEVEL=DEBUG
```

## Integration with Existing Workflows

### Hybrid Development (Transition Period)

During migration, both containerized and native development are supported:

**Containerized (Recommended):**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Native (Legacy):**
```bash
# Backend services only
docker-compose up postgres redis elasticsearch -d

# Frontend natively
cd frontend && npm start
```

### IDE Integration

**VS Code:**
- Install Docker extension
- Use Remote-Containers for in-container development
- Configure debugger to attach to containers

**JetBrains IDEs:**
- Configure Docker integration
- Set up remote interpreters for Python/Node.js containers
- Use database tools to connect to containerized PostgreSQL

## Continuous Integration

### Build Validation

```bash
# Test complete environment build
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up --abort-on-container-exit
```

### Test Execution

```bash
# Run all tests in containers
docker-compose -f docker-compose.dev.yml exec frontend npm test -- --coverage --watchAll=false
docker-compose -f docker-compose.dev.yml exec backend python -m pytest --cov=app
```

## Next Steps

1. **Complete migration**: Follow team onboarding guide
2. **Optimize performance**: Run optimization scripts
3. **Configure IDE**: Set up container-based development
4. **Learn Docker**: Understand container concepts for debugging

For migration assistance, see [Team Onboarding Guide](./team-onboarding-containerized-development.md).