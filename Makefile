# Engineering Drawing Index System - Development Commands
# Cross-platform detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
	PLATFORM := linux
	OPEN_CMD := xdg-open
endif
ifeq ($(UNAME_S),Darwin)
	PLATFORM := macos
	OPEN_CMD := open
endif
ifeq ($(findstring MINGW,$(UNAME_S)),MINGW)
	PLATFORM := windows
	OPEN_CMD := start
endif
ifeq ($(findstring CYGWIN,$(UNAME_S)),CYGWIN)
	PLATFORM := windows
	OPEN_CMD := cygstart
endif

.PHONY: help dev-up dev-down dev-restart dev-clean dev-status dev-logs dev-debug dev-test dev-reset dev-open clean-nodejs clean-ports clean-docker test-cleanup status-docker status-ports status-nodejs status-health pm2-start pm2-stop pm2-restart pm2-status pm2-logs pm2-monitor pm2-clean check-deps monitoring-up monitoring-down monitoring-restart monitoring-status monitoring-logs monitoring-dashboards monitoring-clean

# Default target - show help
.DEFAULT_GOAL := help

help:
	@echo "🏗️  Engineering Drawing System - Development Commands"
	@echo "📋 Platform: $(PLATFORM) ($(UNAME_S))"
	@echo ""
	@echo "Basic Commands:"
	@echo "  dev-up      Start complete development environment"
	@echo "  dev-down    Stop all development services"
	@echo "  dev-restart Restart all services gracefully"
	@echo ""
	@echo "Enhanced Developer Commands:"
	@echo "  dev-debug   Start development environment with debug support"
	@echo "  dev-test    Run comprehensive test suites (frontend + backend)"
	@echo "  dev-reset   Complete environment rebuild (destructive)"
	@echo "  dev-open    Open application in browser (platform-aware)"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  dev-clean   Clean environment (comprehensive cleanup)"
	@echo "  dev-status  Show service status and port usage"
	@echo "  check-deps  Check for required dependencies"
	@echo ""
	@echo "Selective Cleanup Commands:"
	@echo "  clean-nodejs  Clean only Node.js processes"
	@echo "  clean-ports   Clean only port-specific processes"
	@echo "  clean-docker  Clean only Docker resources"
	@echo "  test-cleanup  Test cleanup utilities"
	@echo ""
	@echo "Status Monitoring Commands:"
	@echo "  status-docker   Show Docker services status"
	@echo "  status-ports    Show port usage"
	@echo "  status-nodejs   Show Node.js processes"
	@echo "  status-health   Show environment health"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev-logs    Stream logs from all services"
	@echo ""
	@echo "PM2 Process Management (Alternative Workflow):"
	@echo "  pm2-start   Start development environment using PM2"
	@echo "  pm2-stop    Stop PM2 managed services"
	@echo "  pm2-restart Restart all PM2 services"
	@echo "  pm2-status  Show PM2 process status"
	@echo "  pm2-logs    Stream PM2 logs"
	@echo "  pm2-monitor Open PM2 monitoring dashboard"
	@echo "  pm2-clean   Clean PM2 processes and Docker resources"
	@echo ""
	@echo "Monitoring Stack Commands:"
	@echo "  monitoring-up         Start monitoring stack (Prometheus, Grafana, Loki)"
	@echo "  monitoring-down       Stop monitoring stack"
	@echo "  monitoring-restart    Restart monitoring stack"
	@echo "  monitoring-status     Show monitoring services status"
	@echo "  monitoring-logs       Stream monitoring stack logs"
	@echo "  monitoring-dashboards Open monitoring dashboards in browser"
	@echo "  monitoring-clean      Clean monitoring data and containers"

# Start development environment
dev-up:
	@echo "🚀 Starting Engineering Drawing System..."
	@echo "✅ Starting backend services..."
	@docker-compose -f docker-compose.yml up -d
	@echo "✅ Backend services ready"
	@echo "🎯 Starting frontend..."
	@cd frontend && npm start &
	@echo "✅ System ready at http://localhost:3000"

# Stop development environment
dev-down:
	@echo "🛑 Stopping all services..."
	@docker-compose down
	@pkill -f "npm start" 2>/dev/null || true
	@echo "✅ All services stopped"

# Restart services
dev-restart: dev-down
	@sleep 2
	@$(MAKE) dev-up

# Clean environment - comprehensive cleanup using utilities
dev-clean:
	@./scripts/cleanup-utilities.sh

# Show comprehensive status using monitoring utilities
dev-status:
	@./scripts/status-monitoring.sh

# Stream logs
dev-logs:
	@echo "📋 Streaming development logs..."
	@docker-compose logs -f

# Check for required dependencies
check-deps:
	@echo "🔍 Checking required dependencies..."
	@echo "Platform: $(PLATFORM) ($(UNAME_S))"
	@echo ""
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Please install Docker."; exit 1; }
	@echo "✅ Docker: $(shell docker --version)"
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose not found. Please install Docker Compose."; exit 1; }
	@echo "✅ Docker Compose: $(shell docker-compose --version)"
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Please install Node.js."; exit 1; }
	@echo "✅ npm: $(shell npm --version)"
	@command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found. Please install Python 3."; exit 1; }
	@echo "✅ Python: $(shell python3 --version)"
	@if command -v pm2 >/dev/null 2>&1; then echo "✅ PM2: $(shell pm2 --version)"; else echo "⚠️  PM2 not found (optional for PM2 workflow)"; fi
	@echo ""
	@echo "🎯 All required dependencies are available!"

# Start development environment with debug support
dev-debug: check-deps
	@echo "🐛 Starting Engineering Drawing System in DEBUG mode..."
	@echo "✅ Starting backend services with debug logging..."
	@DEBUG=true FASTAPI_DEBUG=true docker-compose -f docker-compose.yml up -d
	@echo "✅ Backend services ready with debug logging"
	@echo "🎯 Starting frontend with debug support..."
	@cd frontend && DEBUG=true REACT_APP_DEBUG=true npm start &
	@echo "✅ Debug environment ready at http://localhost:3000"
	@echo "🔍 Debug logs available via 'make dev-logs'"

# Run comprehensive test suites (frontend + backend)
dev-test: check-deps
	@echo "🧪 Running comprehensive test suites..."
	@echo "📋 Running backend tests..."
	@cd backend && python -m pytest tests/ -v || { echo "❌ Backend tests failed"; exit 1; }
	@echo "✅ Backend tests passed"
	@echo "📋 Running frontend tests..."
	@cd frontend && npm test -- --coverage --watchAll=false || { echo "❌ Frontend tests failed"; exit 1; }
	@echo "✅ Frontend tests passed"
	@echo "🎯 All tests completed successfully!"

# Complete environment rebuild (destructive)
dev-reset:
	@echo "⚠️  WARNING: This will completely rebuild the development environment"
	@echo "⚠️  All data will be lost. Press Ctrl+C to cancel..."
	@sleep 5
	@echo "🧹 Performing complete environment reset..."
	@echo "🛑 Stopping all services..."
	@docker-compose down -v --remove-orphans 2>/dev/null || true
	@pkill -f "npm start" 2>/dev/null || true
	@pm2 stop all 2>/dev/null || true
	@pm2 delete all 2>/dev/null || true
	@echo "🗑️  Removing Docker volumes and networks..."
	@docker system prune -f
	@docker volume prune -f
	@echo "🧹 Cleaning frontend dependencies..."
	@cd frontend && rm -rf node_modules/.cache 2>/dev/null || true
	@echo "🧹 Cleaning backend cache..."
	@cd backend && find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@cd backend && find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "🚀 Rebuilding development environment..."
	@$(MAKE) dev-up
	@echo "✅ Environment reset complete!"

# Open application in browser (platform-aware)
dev-open:
	@echo "🌐 Opening application in browser..."
	@echo "Platform: $(PLATFORM)"
	@if [ "$(PLATFORM)" = "macos" ]; then \
		open http://localhost:3000; \
	elif [ "$(PLATFORM)" = "linux" ]; then \
		xdg-open http://localhost:3000; \
	elif [ "$(PLATFORM)" = "windows" ]; then \
		$(OPEN_CMD) http://localhost:3000; \
	else \
		echo "⚠️  Platform not detected. Please open http://localhost:3000 manually"; \
	fi
	@echo "✅ Browser launched for platform: $(PLATFORM)"

# Selective cleanup targets
clean-nodejs:
	@./scripts/cleanup-utilities.sh nodejs

clean-ports:
	@./scripts/cleanup-utilities.sh ports

clean-docker:
	@./scripts/cleanup-utilities.sh docker

# Test cleanup utilities across different process states
test-cleanup:
	@./scripts/cleanup-utilities.sh test

# Selective status monitoring targets
status-docker:
	@./scripts/status-monitoring.sh docker

status-ports:
	@./scripts/status-monitoring.sh ports

status-nodejs:
	@./scripts/status-monitoring.sh nodejs

status-health:
	@./scripts/status-monitoring.sh health

# PM2 Process Management Commands
pm2-start:
	@echo "🚀 Starting Engineering Drawing System with PM2..."
	@pm2 start ecosystem.config.js
	@echo "✅ PM2 environment started"

pm2-stop:
	@echo "🛑 Stopping PM2 managed services..."
	@pm2 stop all
	@echo "✅ All PM2 services stopped"

pm2-restart:
	@echo "🔄 Restarting all PM2 services..."
	@pm2 restart all
	@echo "✅ All PM2 services restarted"

pm2-status:
	@echo "📊 PM2 Process Status:"
	@pm2 status

pm2-logs:
	@echo "📋 Streaming PM2 logs..."
	@pm2 logs

pm2-monitor:
	@echo "📈 Opening PM2 monitoring dashboard..."
	@pm2 monit

pm2-clean:
	@echo "🧹 Cleaning PM2 processes and Docker resources..."
	@pm2 stop all && pm2 delete all && docker-compose down -v
	@echo "✅ PM2 and Docker cleanup complete"

# Monitoring Stack Commands
monitoring-up:
	@echo "📊 Starting monitoring stack..."
	@echo "📈 Starting Prometheus, Grafana, Loki, and Promtail..."
	@docker-compose -f docker-compose.monitoring.yml up -d
	@echo "✅ Monitoring stack ready!"
	@echo "🎯 Access points:"
	@echo "   - Prometheus: http://localhost:9090"
	@echo "   - Grafana: http://localhost:3001 (admin/admin123)"
	@echo "   - Loki: http://localhost:3100"

monitoring-down:
	@echo "🛑 Stopping monitoring stack..."
	@docker-compose -f docker-compose.monitoring.yml down
	@echo "✅ Monitoring stack stopped"

monitoring-restart: monitoring-down
	@sleep 2
	@$(MAKE) monitoring-up

monitoring-status:
	@echo "📊 Monitoring stack status:"
	@docker-compose -f docker-compose.monitoring.yml ps

monitoring-logs:
	@echo "📋 Streaming monitoring stack logs..."
	@docker-compose -f docker-compose.monitoring.yml logs -f

monitoring-dashboards:
	@echo "🌐 Opening monitoring dashboards..."
	@echo "Platform: $(PLATFORM)"
	@if [ "$(PLATFORM)" = "macos" ]; then \
		open http://localhost:9090 && \
		open http://localhost:3001; \
	elif [ "$(PLATFORM)" = "linux" ]; then \
		xdg-open http://localhost:9090 && \
		xdg-open http://localhost:3001; \
	elif [ "$(PLATFORM)" = "windows" ]; then \
		$(OPEN_CMD) http://localhost:9090 && \
		$(OPEN_CMD) http://localhost:3001; \
	else \
		echo "⚠️  Platform not detected. Please open:"; \
		echo "   - Prometheus: http://localhost:9090"; \
		echo "   - Grafana: http://localhost:3001"; \
	fi
	@echo "✅ Monitoring dashboards launched"

monitoring-clean:
	@echo "🧹 Cleaning monitoring stack and data..."
	@docker-compose -f docker-compose.monitoring.yml down -v --remove-orphans
	@docker volume prune -f --filter label=com.docker.compose.project=engineering-drawing-system-standalone
	@echo "✅ Monitoring cleanup complete"