# Story 5.1: Immediate Process Management Solution

**Epic:** Development Environment Orchestration
**Story Points:** 3
**Sprint:** DevOps Enhancement Sprint
**Dependencies:** None (Critical Path)
**Priority:** Critical
**Type:** Infrastructure Fix

## Problem Statement

**Current Issue:** Hybrid development mode creating process sprawl where Docker containers and native Node.js processes operate independently, causing:
- Frontend continues running after `docker-compose down`
- Multiple concurrent `npm start` processes creating resource conflicts
- Manual process hunting required (`lsof -ti:3000 | xargs kill -9`)
- Inconsistent development environment state

## User Story

As a **software developer on the Engineering Drawing Index System**,
I want **unified commands to start and stop all development services**,
so that **I can avoid orphaned processes and inconsistent environment states**.

## Acceptance Criteria

### AC1: Unified Start Command
- **Given** I want to start the complete development environment
- **When** I run a single start command
- **Then** all services (frontend, backend, database, cache, search) start correctly
- **And** dependencies are respected in startup order

### AC2: Unified Stop Command
- **Given** I want to stop the complete development environment
- **When** I run a single stop command
- **Then** all Docker containers stop gracefully
- **And** any orphaned Node.js processes are terminated

### AC3: Environment Cleanup Command
- **Given** I have development environment issues or want to reset
- **When** I run the cleanup command
- **Then** all containers are removed with volumes
- **And** all Node.js processes on development ports are killed
- **And** the environment is reset to a clean state

### AC4: Status Monitoring Command
- **Given** I want to check the current state of my development environment
- **When** I run the status command
- **Then** I see which services are running
- **And** which ports are in use
- **And** any potential conflicts are highlighted

### AC5: Backward Compatibility
- **Given** existing development workflows are in use
- **When** the new commands are implemented
- **Then** existing `npm start` and `docker-compose` commands continue working
- **And** no breaking changes are introduced

## Technical Implementation

### Enhanced package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"docker-compose up -d\" \"npm start\"",
    "dev:stop": "docker-compose down && pkill -f 'npm start' || true",
    "dev:clean": "make dev-clean",
    "dev:status": "make dev-status"
  }
}
```

### Makefile Development Commands
```makefile
.PHONY: dev-up dev-down dev-logs dev-clean dev-status

dev-up:
	@echo "🚀 Starting Engineering Drawing System..."
	docker-compose -f docker-compose.yml up -d
	@echo "✅ Backend services ready"
	@echo "🎯 Starting frontend..."
	cd frontend && npm start &
	@echo "✅ System ready at http://localhost:3000"

dev-down:
	@echo "🛑 Stopping all services..."
	docker-compose down
	@pkill -f "npm start" || true
	@echo "✅ All services stopped"

dev-clean:
	@echo "🧹 Cleaning development environment..."
	docker-compose down -v
	docker system prune -f
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8001 | xargs kill -9 2>/dev/null || true
	@echo "✅ Environment cleaned"

dev-status:
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo "\n📊 Port Usage:"
	@lsof -i :3000,8001,5432,6379,9200 2>/dev/null || echo "No processes found"
	@echo "\n📊 Node.js Processes:"
	@ps aux | grep "npm start" | grep -v grep || echo "No npm processes found"
```

### Process Detection and Cleanup
```bash
#!/bin/bash
# dev-cleanup.sh - Comprehensive environment cleanup

echo "🧹 Development Environment Cleanup"

# Stop Docker services
echo "Stopping Docker containers..."
docker-compose down -v

# Kill Node.js development processes
echo "Terminating Node.js processes..."
pkill -f "npm start" || true
pkill -f "node.*3000" || true

# Kill processes on development ports
echo "Freeing development ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# Clean Docker resources
echo "Cleaning Docker resources..."
docker system prune -f

echo "✅ Cleanup complete"
```

## Definition of Done

- [ ] Makefile with `dev-up`, `dev-down`, `dev-clean`, `dev-status` commands implemented
- [ ] Enhanced package.json scripts for unified development workflow
- [ ] Process cleanup script handles all orphaned processes correctly
- [ ] Status command provides comprehensive environment visibility
- [ ] Documentation updated with new development workflow
- [ ] Existing workflows remain functional (backward compatibility)
- [ ] Manual testing confirms all commands work across platforms (macOS, Linux)
- [ ] Team training materials prepared for new workflow

## Verification Steps

### Manual Testing Checklist
1. **Clean Environment Test**
   - [ ] Run `make dev-clean` from dirty state
   - [ ] Verify no processes remain on ports 3000, 8001
   - [ ] Confirm Docker containers and volumes removed

2. **Startup Test**
   - [ ] Run `make dev-up` from clean state
   - [ ] Verify all services start in correct order
   - [ ] Access http://localhost:3000 successfully

3. **Shutdown Test**
   - [ ] Run `make dev-down` from running state
   - [ ] Verify all processes terminate gracefully
   - [ ] Confirm no orphaned processes remain

4. **Status Monitoring Test**
   - [ ] Run `make dev-status` in various states
   - [ ] Verify accurate reporting of service status
   - [ ] Confirm port usage information is correct

## Risk Mitigation

### Compatibility Risks
- **Risk:** New commands conflict with existing workflows
- **Mitigation:** Maintain all existing commands alongside new unified commands

### Platform Differences
- **Risk:** Shell command differences between macOS/Linux/Windows
- **Mitigation:** Use portable commands and test across platforms

### Process Management
- **Risk:** Aggressive process killing affects unrelated processes
- **Mitigation:** Use precise process matching and safe fallbacks

## Implementation Notes

This story provides immediate relief for the process sprawl issue without requiring major architectural changes. It serves as a foundation for more comprehensive solutions in subsequent stories.

**Critical Success Factor:** Zero disruption to existing development workflows while providing powerful new unified commands.

`★ Insight ─────────────────────────────────────`
This solution applies the **Command Pattern** for development operations:
- Encapsulates complex multi-step processes behind simple commands
- Provides consistent interface regardless of underlying complexity
- Enables easy extension and modification of development workflows
`─────────────────────────────────────────────────`

---

**Created:** 2025-09-29
**Assigned:** DevOps Engineer
**Labels:** devops, process-management, infrastructure, critical-fix