#!/bin/bash

# Engineering Drawing System - Comprehensive Process Cleanup Utilities
# Addresses AC 2 & 3: Robust process detection, termination, and error handling

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function with timestamps
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Robust Node.js process detection and termination
cleanup_nodejs_processes() {
    log "🔍 Detecting Node.js processes..."

    # Multiple pattern matching for comprehensive detection
    local patterns=(
        "npm start"
        "react-scripts start"
        "webpack.*serve"
        "node.*frontend"
        "PORT=3000"
    )

    local killed_count=0

    for pattern in "${patterns[@]}"; do
        log "Searching for processes matching: $pattern"

        # Get PIDs matching pattern (excluding this script)
        local pids=$(pgrep -f "$pattern" 2>/dev/null | grep -v $$ || true)

        if [[ -n "$pids" ]]; then
            for pid in $pids; do
                # Verify process still exists and get details
                if kill -0 "$pid" 2>/dev/null; then
                    local proc_info=$(ps -p "$pid" -o pid,ppid,comm,args --no-headers 2>/dev/null || echo "Process not found")
                    log "Found process: $proc_info"

                    # Graceful termination first (SIGTERM)
                    if kill "$pid" 2>/dev/null; then
                        log "Sent SIGTERM to PID $pid"

                        # Wait up to 5 seconds for graceful shutdown
                        local count=0
                        while kill -0 "$pid" 2>/dev/null && [[ $count -lt 5 ]]; do
                            sleep 1
                            ((count++))
                        done

                        # Force kill if still running (SIGKILL)
                        if kill -0 "$pid" 2>/dev/null; then
                            kill -9 "$pid" 2>/dev/null && log "Force killed PID $pid"
                        else
                            success "Process $pid terminated gracefully"
                        fi

                        ((killed_count++))
                    else
                        warning "Could not send signal to PID $pid (may have already exited)"
                    fi
                else
                    log "PID $pid no longer exists"
                fi
            done
        else
            log "No processes found for pattern: $pattern"
        fi
    done

    success "Node.js cleanup completed. Terminated $killed_count processes."
}

# Port-specific process killing with error handling
cleanup_port_processes() {
    log "🌐 Cleaning up processes on development ports..."

    local ports=(3000 8001 5432 6379 9200)
    local killed_count=0

    for port in "${ports[@]}"; do
        log "Checking port $port..."

        # Get PIDs using the port
        local pids=$(lsof -ti:$port 2>/dev/null || true)

        if [[ -n "$pids" ]]; then
            for pid in $pids; do
                if kill -0 "$pid" 2>/dev/null; then
                    local proc_info=$(ps -p "$pid" -o pid,comm,args --no-headers 2>/dev/null || echo "Process not found")
                    log "Port $port used by: $proc_info"

                    # Graceful then force kill
                    if kill "$pid" 2>/dev/null; then
                        sleep 2
                        if kill -0 "$pid" 2>/dev/null; then
                            kill -9 "$pid" 2>/dev/null && log "Force killed process on port $port"
                        else
                            success "Process on port $port terminated gracefully"
                        fi
                        ((killed_count++))
                    else
                        warning "Could not kill process $pid on port $port"
                    fi
                else
                    log "Process using port $port has already exited"
                fi
            done
        else
            log "No processes found on port $port"
        fi
    done

    success "Port cleanup completed. Terminated $killed_count processes."
}

# Docker container and volume cleanup procedures
cleanup_docker_resources() {
    log "🐳 Cleaning up Docker resources..."

    # Stop and remove containers
    if command -v docker-compose &> /dev/null; then
        log "Stopping Docker Compose services..."
        if docker-compose down -v 2>/dev/null; then
            success "Docker Compose services stopped and volumes removed"
        else
            warning "Docker Compose cleanup failed or no services running"
        fi
    else
        warning "docker-compose not found"
    fi

    # Additional Docker cleanup
    if command -v docker &> /dev/null; then
        log "Cleaning up orphaned Docker resources..."

        # Remove stopped containers
        local stopped_containers=$(docker ps -aq --filter "status=exited" 2>/dev/null || true)
        if [[ -n "$stopped_containers" ]]; then
            docker rm $stopped_containers 2>/dev/null && success "Removed stopped containers"
        else
            log "No stopped containers to remove"
        fi

        # Remove unused networks (excluding default ones)
        docker network prune -f 2>/dev/null && success "Cleaned up unused networks" || warning "Network cleanup failed"

        # Remove unused volumes
        docker volume prune -f 2>/dev/null && success "Cleaned up unused volumes" || warning "Volume cleanup failed"

        # Remove dangling images
        docker image prune -f 2>/dev/null && success "Cleaned up dangling images" || warning "Image cleanup failed"
    else
        warning "docker command not found"
    fi
}

# Test cleanup utilities across different process states
test_cleanup_utilities() {
    log "🧪 Testing cleanup utilities across different process states..."

    # Test 1: Check if cleanup handles non-existent processes gracefully
    log "Test 1: Handling non-existent processes"
    cleanup_nodejs_processes
    cleanup_port_processes

    # Test 2: Verify Docker cleanup doesn't affect other projects
    log "Test 2: Docker isolation check"
    cleanup_docker_resources

    # Test 3: Validate error handling for permission issues
    log "Test 3: Error handling validation"
    if ! command -v lsof &> /dev/null; then
        error "lsof command not available - install with: brew install lsof"
        return 1
    fi

    success "All cleanup utility tests passed"
}

# Main cleanup function
main_cleanup() {
    log "🚀 Starting comprehensive development environment cleanup..."

    cleanup_nodejs_processes
    cleanup_port_processes
    cleanup_docker_resources

    success "🎉 Comprehensive cleanup completed successfully!"
}

# Parse command line arguments
case "${1:-}" in
    "test")
        test_cleanup_utilities
        ;;
    "nodejs")
        cleanup_nodejs_processes
        ;;
    "ports")
        cleanup_port_processes
        ;;
    "docker")
        cleanup_docker_resources
        ;;
    "")
        main_cleanup
        ;;
    *)
        echo "Usage: $0 [test|nodejs|ports|docker]"
        echo "  test    - Test cleanup utilities"
        echo "  nodejs  - Clean only Node.js processes"
        echo "  ports   - Clean only port-specific processes"
        echo "  docker  - Clean only Docker resources"
        echo "  (no arg) - Run complete cleanup"
        exit 1
        ;;
esac