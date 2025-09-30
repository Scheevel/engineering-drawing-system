#!/bin/bash

# Engineering Drawing System - Status Monitoring and Diagnostics
# Addresses AC 4: Comprehensive service status and port monitoring with clear visibility

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Status indicators
ONLINE="${GREEN}●${NC}"
OFFLINE="${RED}●${NC}"
WARNING="${YELLOW}●${NC}"
UNKNOWN="${BLUE}●${NC}"

# Logging function with timestamps
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

header() {
    echo ""
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get process count for a pattern
get_process_count() {
    local pattern="$1"
    pgrep -f "$pattern" 2>/dev/null | wc -l | tr -d ' '
}

# Check if port is in use and get process info
check_port() {
    local port="$1"
    local service_name="$2"

    if command_exists lsof; then
        local process_info=$(lsof -i :$port 2>/dev/null | tail -n +2)
        if [[ -n "$process_info" ]]; then
            local pid=$(echo "$process_info" | awk '{print $2}' | head -1)
            local command=$(echo "$process_info" | awk '{print $1}' | head -1)
            echo -e "  ${ONLINE} ${BOLD}$service_name${NC} (Port $port) - PID: $pid ($command)"
            return 0
        else
            echo -e "  ${OFFLINE} ${BOLD}$service_name${NC} (Port $port) - Not running"
            return 1
        fi
    else
        echo -e "  ${WARNING} ${BOLD}$service_name${NC} (Port $port) - Cannot check (lsof not available)"
        return 2
    fi
}

# Docker service status with health indicators
check_docker_services() {
    header "🐳 Docker Services Status"

    if ! command_exists docker-compose; then
        echo -e "  ${OFFLINE} Docker Compose not available"
        return 1
    fi

    # Check if docker-compose.yml exists
    if [[ ! -f "docker-compose.yml" ]]; then
        echo -e "  ${OFFLINE} docker-compose.yml not found"
        return 1
    fi

    # Get service status
    local compose_output
    compose_output=$(docker-compose ps --format table 2>/dev/null || echo "")

    if [[ -n "$compose_output" ]]; then
        # Parse and format docker-compose ps output
        echo "$compose_output" | tail -n +2 | while IFS= read -r line; do
            if [[ -n "$line" && "$line" != *"Name"* ]]; then
                local service_name=$(echo "$line" | awk '{print $1}')
                local state=$(echo "$line" | awk '{print $2}')

                case "$state" in
                    "Up")
                        echo -e "  ${ONLINE} ${BOLD}$service_name${NC} - Running"
                        ;;
                    "Exit"*)
                        echo -e "  ${OFFLINE} ${BOLD}$service_name${NC} - $state"
                        ;;
                    *)
                        echo -e "  ${WARNING} ${BOLD}$service_name${NC} - $state"
                        ;;
                esac
            fi
        done
    else
        echo -e "  ${OFFLINE} No Docker services running"
    fi

    # Docker daemon status
    if docker info >/dev/null 2>&1; then
        echo -e "  ${ONLINE} ${BOLD}Docker Daemon${NC} - Available"
    else
        echo -e "  ${OFFLINE} ${BOLD}Docker Daemon${NC} - Not available"
    fi
}

# Port usage detection with service mapping
check_port_usage() {
    header "🌐 Development Ports Status"

    local ports_services=(
        "3000:Frontend (React)"
        "8001:Backend API (FastAPI)"
        "5432:PostgreSQL Database"
        "6379:Redis Cache"
        "9200:Elasticsearch"
        "5555:Celery Flower"
    )

    for port_service in "${ports_services[@]}"; do
        local port="${port_service%%:*}"
        local service="${port_service##*:}"
        check_port "$port" "$service"
    done
}

# Node.js process monitoring
check_nodejs_processes() {
    header "⚡ Node.js Development Processes"

    local patterns=(
        "npm start:Frontend Development Server"
        "react-scripts start:React Scripts"
        "webpack.*serve:Webpack Dev Server"
        "nodemon:Nodemon File Watcher"
    )

    local total_processes=0

    for pattern_service in "${patterns[@]}"; do
        local pattern="${pattern_service%%:*}"
        local service="${pattern_service##*:}"
        local count=$(get_process_count "$pattern")

        if [[ $count -gt 0 ]]; then
            echo -e "  ${ONLINE} ${BOLD}$service${NC} - $count process(es) running"
            total_processes=$((total_processes + count))
        else
            echo -e "  ${OFFLINE} ${BOLD}$service${NC} - Not running"
        fi
    done

    if [[ $total_processes -gt 0 ]]; then
        echo ""
        echo -e "  ${CYAN}Total Node.js processes: $total_processes${NC}"
    fi
}

# System resource monitoring (basic)
check_system_resources() {
    header "💻 System Resources"

    # CPU usage (if available)
    if command_exists top; then
        local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | cut -d'%' -f1 2>/dev/null || echo "N/A")
        echo -e "  CPU Usage: ${CYAN}$cpu_usage%${NC}"
    fi

    # Memory usage (macOS specific)
    if command_exists vm_stat; then
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | cut -d'.' -f1)
        local pages_total=$(vm_stat | grep -E "(Pages free|Pages active|Pages inactive|Pages speculative|Pages throttled|Pages wired down|Pages occupied by compressor)" | awk '{sum += $3} END {print sum}')
        if [[ -n "$pages_free" && -n "$pages_total" && $pages_total -gt 0 ]]; then
            local memory_usage=$(( (pages_total - pages_free) * 100 / pages_total ))
            echo -e "  Memory Usage: ${CYAN}$memory_usage%${NC}"
        fi
    fi

    # Disk usage for current directory
    if command_exists df; then
        local disk_usage=$(df . | tail -1 | awk '{print $5}' | cut -d'%' -f1)
        echo -e "  Disk Usage (current): ${CYAN}$disk_usage%${NC}"
    fi
}

# Environment health summary
show_health_summary() {
    header "🏥 Environment Health Summary"

    local issues=0
    local warnings=0

    # Check for common issues
    if ! command_exists docker; then
        echo -e "  ${OFFLINE} Docker not installed"
        ((issues++))
    fi

    if ! command_exists docker-compose; then
        echo -e "  ${OFFLINE} Docker Compose not installed"
        ((issues++))
    fi

    if ! command_exists lsof; then
        echo -e "  ${WARNING} lsof not available - limited port monitoring"
        ((warnings++))
    fi

    # Check for port conflicts
    local frontend_running=$(lsof -i :3000 2>/dev/null | wc -l | tr -d ' ')
    local backend_running=$(lsof -i :8001 2>/dev/null | wc -l | tr -d ' ')

    if [[ $frontend_running -gt 1 ]]; then
        echo -e "  ${WARNING} Multiple processes on port 3000 detected"
        ((warnings++))
    fi

    if [[ $backend_running -gt 1 ]]; then
        echo -e "  ${WARNING} Multiple processes on port 8001 detected"
        ((warnings++))
    fi

    # Summary
    if [[ $issues -eq 0 && $warnings -eq 0 ]]; then
        echo -e "  ${ONLINE} ${BOLD}Environment Status: HEALTHY${NC}"
    elif [[ $issues -eq 0 ]]; then
        echo -e "  ${WARNING} ${BOLD}Environment Status: OK ($warnings warnings)${NC}"
    else
        echo -e "  ${OFFLINE} ${BOLD}Environment Status: ISSUES ($issues errors, $warnings warnings)${NC}"
    fi
}

# Quick status check for use in other scripts
quick_status() {
    local frontend=$(lsof -i :3000 2>/dev/null | wc -l | tr -d ' ')
    local backend=$(lsof -i :8001 2>/dev/null | wc -l | tr -d ' ')
    local database=$(lsof -i :5432 2>/dev/null | wc -l | tr -d ' ')

    echo "Frontend:$frontend Backend:$backend Database:$database"
}

# Main status monitoring function
main_status() {
    echo -e "${BOLD}${CYAN}📊 Engineering Drawing System - Development Environment Status${NC}"
    echo -e "${CYAN}Generated at: $(date)${NC}"

    check_docker_services
    check_port_usage
    check_nodejs_processes
    check_system_resources
    show_health_summary

    echo ""
    echo -e "${CYAN}Use 'make help' for available commands${NC}"
}

# Parse command line arguments
case "${1:-}" in
    "quick")
        quick_status
        ;;
    "docker")
        check_docker_services
        ;;
    "ports")
        check_port_usage
        ;;
    "nodejs")
        check_nodejs_processes
        ;;
    "resources")
        check_system_resources
        ;;
    "health")
        show_health_summary
        ;;
    "")
        main_status
        ;;
    *)
        echo "Usage: $0 [quick|docker|ports|nodejs|resources|health]"
        echo "  quick     - Quick status summary"
        echo "  docker    - Docker services only"
        echo "  ports     - Port usage only"
        echo "  nodejs    - Node.js processes only"
        echo "  resources - System resources only"
        echo "  health    - Health summary only"
        echo "  (no arg)  - Complete status report"
        exit 1
        ;;
esac