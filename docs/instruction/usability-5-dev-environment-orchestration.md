# Usability Guide: Epic Story #5 - Development Environment Orchestration

**Document Type:** Agent Knowledge Base
**Target Audience:** BMAD Agents (Dev, QA, SM, PO)
**Last Updated:** 2025-09-30
**Epic Scope:** Stories 5.1, 5.2, 5.3, 5.4, 5.5

## Executive Summary

Epic Story #5 delivers **unified development environment orchestration** that eliminates process sprawl, provides cross-platform consistency, and includes comprehensive monitoring. This KB enables BMAD agents to leverage these orchestration features when executing development tasks.

## Feature Catalog

### 🎯 Core Orchestration Commands (Story 5.1 + 5.4)

**WHEN TO USE:** Starting/stopping development environments, debugging environment issues, cross-platform development

**AGENT EXECUTION SYNTAX:**
```bash
# Environment Lifecycle
make dev-up          # Start complete development stack
make dev-down        # Stop all services + kill orphaned processes
make dev-restart     # Restart all development services
make dev-status      # Check service status and port usage
make dev-reset       # Nuclear reset - clean all containers/processes

# Enhanced Development Workflow
make dev-debug       # Start with DEBUG=1 environment variables
make dev-test        # Run both frontend + backend test suites
make dev-open        # Cross-platform browser launch (handles macOS/Linux/WSL)
```

**WHY USE THIS:** Prevents hybrid-mode process sprawl where Docker containers run alongside orphaned Node.js processes

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Always use `make dev-up` instead of manual docker-compose commands
- **QA Agent:** Use `make dev-status` to verify environment before testing
- **All Agents:** Use `make dev-reset` when encountering unexplained environment issues

### 🐳 Container Orchestration (Story 5.2 + 5.3)

**WHEN TO USE:** Full isolation needs, team environment consistency, CI/CD integration, after dependency changes

**AGENT EXECUTION SYNTAX:**
```bash
# Full Containerization Mode
docker-compose -f docker-compose.dev.yml up -d    # All services containerized
docker-compose -f docker-compose.yml up -d        # Production-like setup
docker-compose -f docker-compose-lite.yml up -d   # Lightweight (no Elasticsearch)

# Process Manager Alternative (Story 5.3)
make pm2-start       # Start services with PM2 process manager
make pm2-stop        # Stop PM2 managed processes
make pm2-status      # View PM2 process dashboard
make pm2-logs        # Stream aggregated logs

# Container Rebuilding (After Dependency Changes)
docker-compose build --no-cache backend    # Rebuild backend only
docker-compose build --no-cache frontend   # Rebuild frontend only
docker-compose build                       # Rebuild all services
docker-compose up --build                  # Build and start together
```

**WHY USE THIS:**
- **Full Docker:** Maximum isolation, identical to production
- **PM2 Mode:** Native performance, better for CPU-intensive development

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Default to Make commands unless specific containerization needed; rebuild containers after dependency changes
- **QA Agent:** Use full Docker mode for environment validation; rebuild before testing dependency updates
- **CI Integration:** Always use docker-compose configurations with `--build` flag for fresh images
- **All Agents:** Use `docker-compose build --no-cache` when backend/frontend requirements change

### 📊 Development Monitoring (Story 5.5)

**WHEN TO USE:** Performance debugging, resource monitoring, distributed tracing

**AGENT EXECUTION SYNTAX:**
```bash
# Monitoring Stack Lifecycle
make monitoring-up           # Start Prometheus, Grafana, Loki stack
make monitoring-down         # Stop monitoring stack
make monitoring-restart      # Restart monitoring services
make monitoring-status       # Check monitoring health
make monitoring-dashboards   # Open Grafana dashboards in browser
make monitoring-logs         # Stream monitoring stack logs
make monitoring-clean        # Reset monitoring data and containers
```

**MONITORING ENDPOINTS:**
- **Grafana:** http://localhost:3001 (admin/admin123)
- **Prometheus:** http://localhost:9090
- **Application Metrics:** http://localhost:8001/metrics

**WHY USE THIS:** Real-time observability for API performance, resource usage, correlation tracking

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Start monitoring during performance work: `make dev-up && make monitoring-up`
- **QA Agent:** Always enable monitoring for test execution verification
- **Performance Issues:** Check Grafana dashboards for resource bottlenecks

## Agent Execution Patterns

### 🤖 Dev Agent Usage

```bash
# Standard Development Session
make dev-up                    # Start environment
make monitoring-up             # Enable observability
# ... perform development work ...
make dev-test                  # Validate changes
make dev-down                  # Clean shutdown

# Debugging Session
make dev-status                # Assess current state
make dev-reset                 # Nuclear reset if issues
make dev-debug                 # Start with debug flags
make monitoring-dashboards     # Monitor in real-time
```

### 🧪 QA Agent Usage

```bash
# Test Environment Validation
make dev-status                # Verify clean state
make dev-up                    # Start test environment
make monitoring-up             # Enable test monitoring
# ... execute test suites ...
make monitoring-dashboards     # Review test metrics
make dev-down                  # Clean shutdown
```

### 📋 SM/PO Agent Usage

```bash
# Environment Health Check
make dev-status                # Check service availability
make monitoring-status         # Verify monitoring health
make pm2-status               # Alternative: PM2 process view

# Demo Environment Setup
make dev-up && make monitoring-up    # Full stack + observability
make dev-open                        # Launch browser (cross-platform)
```

## Cross-Platform Compatibility

**Platform Detection:** Makefile automatically detects macOS, Linux, Windows WSL
- **macOS:** Uses `open` command for browser launching
- **Linux:** Uses `xdg-open` for browser launching
- **Windows WSL:** Uses `explorer.exe` for browser launching

**Error Handling:** Commands provide fallback messages when tools unavailable

## Troubleshooting for Agents

### Common Issues & Resolutions

```bash
# Port conflicts (multiple npm start processes)
make dev-reset                 # Kills orphaned processes + containers

# Monitoring stack won't start
make monitoring-clean          # Reset monitoring data
docker system prune           # Clean Docker resources
make monitoring-up            # Restart fresh

# Cross-platform browser issues
make dev-open                 # Uses platform-appropriate command
# Fallback: Manual navigation to http://localhost:3000

# Dependency changes (requirements.txt, package.json updates)
docker-compose build --no-cache backend    # Rebuild backend after requirements.txt changes
docker-compose build --no-cache frontend   # Rebuild frontend after package.json changes
docker-compose build                       # Rebuild all services
docker-compose up --build                  # Build and start in one command
make dev-restart                           # Restart with new images
```

### Validation Commands

```bash
# Verify Implementation
./scripts/verify-monitoring.sh     # Comprehensive monitoring validation
make dev-status                    # Service health check
curl http://localhost:8001/health  # API health endpoint
```

## Integration Points

### Correlation ID Tracking
- **Auto-Generated:** Every API request gets unique correlation ID
- **Manual Override:** `curl -H "X-Correlation-ID: custom-id" <endpoint>`
- **Log Correlation:** Search logs by correlation ID across all services

### Monitoring Integration
- **Automatic Metrics:** FastAPI endpoints expose metrics at `/metrics`
- **Custom Metrics:** Agents can add application-specific metrics
- **Alert Rules:** Pre-configured alerts for system/application issues

## Best Practices for BMAD Agents

1. **Always verify environment state** with `make dev-status` before major operations
2. **Use monitoring during performance-sensitive work** (`make monitoring-up`)
3. **Prefer Make commands over direct Docker** for consistency
4. **Clean shutdown environments** with `make dev-down` to prevent conflicts
5. **Use `make dev-reset` as nuclear option** for unexplained issues
6. **Enable monitoring for QA activities** to validate test execution impact
7. **Rebuild containers after dependency changes** with `docker-compose build` when requirements.txt or package.json are modified

---

**Agent Consumption Ready:** This document provides executable commands and clear usage patterns for all Epic Story #5 development orchestration features.