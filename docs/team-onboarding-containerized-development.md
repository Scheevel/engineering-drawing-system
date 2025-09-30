# Team Onboarding Guide: Containerized Development

## Welcome to Containerized Development!

This guide helps team members transition from the hybrid Docker/native Node.js development environment to a fully containerized development workflow.

## Migration Overview

### Why We're Migrating

**Problems with Hybrid Development:**
- Frontend continues running after `docker-compose down`
- Multiple concurrent `npm start` processes creating conflicts
- Manual process hunting required (`lsof -ti:3000 | xargs kill -9`)
- Inconsistent development environment states
- "Works on my machine" problems

**Benefits of Full Containerization:**
- ✅ Unified lifecycle management (`docker-compose up/down`)
- ✅ Complete environment isolation and reproducibility
- ✅ Consistent development experience across team members
- ✅ No port conflicts or process sprawl
- ✅ Simple onboarding (`git clone && docker-compose up`)

## Migration Phases

### Phase 1: Preparation (Individual)
**Duration:** 1-2 days per developer
**Goal:** Prepare for containerized development

#### Step 1: Update Docker Desktop
```bash
# Ensure Docker Desktop is updated to latest version
docker --version  # Should be 20.10+ or later
docker-compose --version  # Should be 3.8+ or later
```

#### Step 2: Allocate Docker Resources
**Recommended Docker Desktop Settings:**
- **Memory:** 6GB minimum (8GB preferred)
- **CPUs:** 4 cores minimum
- **Disk:** 20GB available space

**Configure in Docker Desktop → Settings → Resources**

#### Step 3: Pull Latest Code
```bash
git pull origin main
```

#### Step 4: Test Containerized Environment
```bash
# Stop any running services
docker-compose down
pkill -f "npm start" || true

# Test new containerized environment
docker-compose -f docker-compose.dev.yml up

# Verify in browser: http://localhost:3000
# Should see frontend with HMR working
```

#### Step 5: File Watching Optimization (Linux Only)
```bash
./scripts/optimize-file-watching.sh
```

### Phase 2: Integration (Team Coordination)
**Duration:** 1 week
**Goal:** Team-wide adoption and issue resolution

#### Week 1: Gradual Adoption
**Monday-Tuesday:** Early adopters test containerized workflow
**Wednesday-Thursday:** Mid-team adoption with peer support
**Friday:** Final team members migrate with full team support

#### Daily Standups Include:
- Containerization status updates
- Issue sharing and resolution
- Performance feedback
- Hybrid workflow coordination

### Phase 3: Full Migration (Complete Transition)
**Duration:** 1-2 weeks
**Goal:** Complete team migration and documentation updates

#### Week 1: Full Team Containerized
- All team members using docker-compose.dev.yml
- Legacy npm start workflows deprecated
- Team performance monitoring

#### Week 2: Optimization and Documentation
- Performance optimization based on team feedback
- Documentation updates and knowledge sharing
- Legacy workflow removal

## Individual Developer Migration

### Pre-Migration Checklist

- [ ] Docker Desktop updated and configured
- [ ] Latest code pulled from main branch
- [ ] Current work committed/stashed
- [ ] Understanding of new workflow from docs

### Migration Steps

#### Step 1: Stop Current Development Environment
```bash
# Stop Docker services
docker-compose down

# Stop any Node.js processes
pkill -f "npm start" || true

# Verify no processes on development ports
lsof -i :3000,8001 || echo "All clear!"
```

#### Step 2: Start Containerized Environment
```bash
# Start new containerized development environment
docker-compose -f docker-compose.dev.yml up

# Wait for all services to start (about 30 seconds)
# Watch logs for "System ready" messages
```

#### Step 3: Verify Development Experience
```bash
# Test frontend hot reload
# 1. Edit any file in frontend/src/
# 2. Verify changes appear in browser within 2 seconds
# 3. Verify React component state is preserved

# Test backend auto-reload
# 1. Edit any file in backend/app/
# 2. Verify FastAPI automatically reloads
# 3. Check API endpoint responds correctly
```

#### Step 4: Update Development Habits
**OLD Workflow:**
```bash
docker-compose up -d          # Backend services only
cd frontend && npm start      # Frontend natively
```

**NEW Workflow:**
```bash
docker-compose -f docker-compose.dev.yml up  # Everything containerized
```

### Common Migration Issues

#### Issue 1: Port Conflicts
**Symptoms:** Services fail to start, port binding errors
**Solution:**
```bash
# Find and stop conflicting processes
lsof -i :3000,8001,5432,6379,9200
kill <process-id>

# Or use the unified cleanup commands
make dev-clean  # If using Makefile from Story 5.1
```

#### Issue 2: Slow File Watching (Linux)
**Symptoms:** HMR not triggering, slow response to file changes
**Solution:**
```bash
./scripts/optimize-file-watching.sh
docker-compose -f docker-compose.dev.yml restart frontend
```

#### Issue 3: Memory/Resource Issues
**Symptoms:** Slow performance, container crashes
**Solution:**
1. Increase Docker Desktop memory allocation
2. Close unnecessary applications
3. Restart Docker Desktop

#### Issue 4: Build Cache Issues
**Symptoms:** Changes not reflected, stale dependencies
**Solution:**
```bash
# Clean rebuild
docker-compose -f docker-compose.dev.yml build --no-cache frontend
docker-compose -f docker-compose.dev.yml up
```

## Team Communication During Migration

### Slack Channels
- **#containerization-migration** - Migration coordination
- **#tech-support** - Technical issues and solutions
- **#dev-environment** - Environment configuration help

### Daily Check-ins
**Morning Standup Additions:**
- Migration status (Phase 1/2/3)
- Blockers or performance issues
- Help needed or success stories

### Knowledge Sharing Sessions
**Week 1:** "Docker Development Best Practices" (30 min)
**Week 2:** "Troubleshooting Containerized Development" (30 min)
**Week 3:** "Performance Optimization Tips" (30 min)

## Success Metrics

### Individual Success Criteria
- [ ] Complete environment starts in <30 seconds
- [ ] File changes reflect in browser within 2 seconds
- [ ] No manual process management required
- [ ] All tests pass in containerized environment
- [ ] Development workflow feels natural

### Team Success Criteria
- [ ] 100% team adoption of containerized development
- [ ] Zero "works on my machine" issues
- [ ] Reduced environment setup time for new team members
- [ ] Improved development experience satisfaction scores

## Rollback Procedures

### Individual Rollback
If containerized development doesn't work for a team member:

1. **Immediate fallback to hybrid mode:**
   ```bash
   # Stop containerized environment
   docker-compose -f docker-compose.dev.yml down

   # Start backend services only
   docker-compose up postgres redis elasticsearch -d

   # Start frontend natively
   cd frontend && npm start
   ```

2. **Report issues in #tech-support**
3. **Continue with hybrid workflow while issues are resolved**

### Team Rollback
If major issues affect team productivity:

1. **Team lead announces rollback**
2. **All team members revert to hybrid workflow**
3. **Document issues for future resolution**
4. **Schedule follow-up migration attempt**

## Ongoing Support

### Self-Service Resources
- [Docker Development Workflow Guide](./docker-development-workflow.md)
- [Troubleshooting Guide](./docker-development-workflow.md#troubleshooting)
- [Performance Optimization Scripts](../scripts/optimize-file-watching.sh)

### Team Support
- **Buddy System:** Pair experienced Docker users with newcomers
- **Office Hours:** Weekly "Docker Development" support sessions
- **Documentation:** Continuously updated based on team feedback

### Escalation Path
1. **Level 1:** Self-service documentation and scripts
2. **Level 2:** Team buddy or #tech-support channel
3. **Level 3:** Team lead or infrastructure team
4. **Level 4:** External Docker support or training

## Advanced Tips

### IDE Integration
**VS Code:**
```bash
# Install recommended extensions
code --install-extension ms-vscode-remote.remote-containers
```

**WebStorm/IntelliJ:**
- Configure Docker integration
- Set up remote Node.js interpreter
- Connect database tools to containerized PostgreSQL

### Performance Optimization
```bash
# Regular maintenance
docker system prune -f  # Weekly cleanup
./scripts/optimize-file-watching.sh  # After OS updates (Linux)

# Resource monitoring
docker stats  # Check container resource usage
```

### Custom Workflows
```bash
# Create personal aliases
alias dc-dev='docker-compose -f docker-compose.dev.yml'
alias dc-logs='docker-compose -f docker-compose.dev.yml logs -f'
alias dc-restart='docker-compose -f docker-compose.dev.yml restart'
```

## Success Stories

> "The containerized environment eliminated all the process management headaches I was having. Now I just run one command and everything works!" - Sarah, Frontend Developer

> "No more 'it works on my machine' issues during code reviews. Everyone has exactly the same environment now." - Mike, Full Stack Developer

> "Onboarding new team members is so much faster. They're productive on day one instead of day three." - Lisa, Team Lead

## Questions and Feedback

### Frequently Asked Questions

**Q: Will this slow down my development workflow?**
A: No, with proper configuration, the containerized environment performs identically to native development.

**Q: What if I need to install additional packages?**
A: Package changes require a container rebuild: `docker-compose -f docker-compose.dev.yml build frontend`

**Q: Can I still use my existing debugging tools?**
A: Yes, all debugging tools work with containerized development. See IDE integration section.

### Feedback Collection
- **Weekly surveys** during migration period
- **Continuous feedback** in #containerization-migration
- **Retrospective sessions** after full migration

---

**Welcome to the future of consistent, predictable development! 🚀**