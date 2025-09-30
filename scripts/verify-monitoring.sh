#!/bin/bash

# Engineering Drawing System - Monitoring Stack Verification Script
# This script verifies that the monitoring stack is properly configured and functional

set -e

echo "🔍 Engineering Drawing System - Monitoring Stack Verification"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
    else
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    if command_exists lsof; then
        lsof -i ":$1" >/dev/null 2>&1
    elif command_exists netstat; then
        netstat -tln | grep ":$1 " >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local service=$2

    if command_exists curl; then
        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            print_status "PASS" "$service is accessible at $url"
            return 0
        else
            print_status "FAIL" "$service is not accessible at $url"
            return 1
        fi
    else
        print_status "WARN" "curl not available, cannot test $service endpoint"
        return 1
    fi
}

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        print_status "PASS" "$description exists: $file"
        return 0
    else
        print_status "FAIL" "$description missing: $file"
        return 1
    fi
}

# Function to check directory structure
check_directory() {
    local dir=$1
    local description=$2

    if [ -d "$dir" ]; then
        print_status "PASS" "$description exists: $dir"
        return 0
    else
        print_status "FAIL" "$description missing: $dir"
        return 1
    fi
}

# Initialize counters
total_checks=0
passed_checks=0

# Test function
run_test() {
    local test_name=$1
    shift

    echo ""
    echo -e "${BLUE}Testing: $test_name${NC}"
    echo "----------------------------------------"

    if "$@"; then
        passed_checks=$((passed_checks + 1))
    fi
    total_checks=$((total_checks + 1))
}

# Test 1: Check required dependencies
test_dependencies() {
    local deps_ok=true

    if command_exists docker; then
        print_status "PASS" "Docker is installed: $(docker --version | head -1)"
    else
        print_status "FAIL" "Docker is not installed"
        deps_ok=false
    fi

    if command_exists docker-compose; then
        print_status "PASS" "Docker Compose is installed: $(docker-compose --version | head -1)"
    else
        print_status "FAIL" "Docker Compose is not installed"
        deps_ok=false
    fi

    if command_exists make; then
        print_status "PASS" "Make is installed: $(make --version | head -1)"
    else
        print_status "FAIL" "Make is not installed"
        deps_ok=false
    fi

    if [ "$deps_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Test 2: Check monitoring configuration files
test_configuration_files() {
    local config_ok=true

    # Check main docker-compose file
    if ! check_file "docker-compose.monitoring.yml" "Monitoring Docker Compose file"; then
        config_ok=false
    fi

    # Check monitoring directory structure
    if ! check_directory "monitoring" "Monitoring configuration directory"; then
        config_ok=false
    fi

    # Check Prometheus configuration
    if ! check_file "monitoring/prometheus/prometheus.yml" "Prometheus configuration"; then
        config_ok=false
    fi

    # Check Grafana provisioning
    if ! check_directory "monitoring/grafana/provisioning" "Grafana provisioning directory"; then
        config_ok=false
    fi

    # Check Loki configuration
    if ! check_file "monitoring/loki/loki-config.yml" "Loki configuration"; then
        config_ok=false
    fi

    # Check Promtail configuration
    if ! check_file "monitoring/promtail/promtail-config.yml" "Promtail configuration"; then
        config_ok=false
    fi

    # Check alert rules
    if ! check_file "monitoring/prometheus/alert-rules.yml" "Prometheus alert rules"; then
        config_ok=false
    fi

    # Check dashboards
    if ! check_file "monitoring/grafana/dashboards/service-health-overview.json" "Service health dashboard"; then
        config_ok=false
    fi

    if ! check_file "monitoring/grafana/dashboards/resource-usage-overview.json" "Resource usage dashboard"; then
        config_ok=false
    fi

    if ! check_file "monitoring/grafana/dashboards/application-metrics.json" "Application metrics dashboard"; then
        config_ok=false
    fi

    if ! check_file "monitoring/grafana/dashboards/logs-overview.json" "Logs overview dashboard"; then
        config_ok=false
    fi

    return $config_ok
}

# Test 3: Check Makefile monitoring commands
test_makefile_commands() {
    local makefile_ok=true

    if ! check_file "Makefile" "Makefile"; then
        return false
    fi

    # Check if monitoring commands are present in Makefile
    if grep -q "monitoring-up:" Makefile; then
        print_status "PASS" "monitoring-up command found in Makefile"
    else
        print_status "FAIL" "monitoring-up command missing from Makefile"
        makefile_ok=false
    fi

    if grep -q "monitoring-down:" Makefile; then
        print_status "PASS" "monitoring-down command found in Makefile"
    else
        print_status "FAIL" "monitoring-down command missing from Makefile"
        makefile_ok=false
    fi

    if grep -q "monitoring-dashboards:" Makefile; then
        print_status "PASS" "monitoring-dashboards command found in Makefile"
    else
        print_status "FAIL" "monitoring-dashboards command missing from Makefile"
        makefile_ok=false
    fi

    return $makefile_ok
}

# Test 4: Check backend monitoring integration
test_backend_integration() {
    local backend_ok=true

    # Check correlation middleware
    if ! check_file "backend/app/middleware/correlation.py" "Correlation ID middleware"; then
        backend_ok=false
    fi

    # Check main.py for monitoring imports
    if [ -f "backend/app/main.py" ]; then
        if grep -q "prometheus_fastapi_instrumentator" backend/app/main.py; then
            print_status "PASS" "Prometheus instrumentator found in main.py"
        else
            print_status "FAIL" "Prometheus instrumentator missing from main.py"
            backend_ok=false
        fi

        if grep -q "CorrelationIDMiddleware" backend/app/main.py; then
            print_status "PASS" "Correlation middleware found in main.py"
        else
            print_status "FAIL" "Correlation middleware missing from main.py"
            backend_ok=false
        fi
    else
        print_status "FAIL" "backend/app/main.py not found"
        backend_ok=false
    fi

    # Check requirements.txt for monitoring dependencies
    if [ -f "backend/requirements.txt" ]; then
        if grep -q "prometheus-fastapi-instrumentator" backend/requirements.txt; then
            print_status "PASS" "Prometheus FastAPI instrumentator in requirements.txt"
        else
            print_status "FAIL" "Prometheus FastAPI instrumentator missing from requirements.txt"
            backend_ok=false
        fi
    else
        print_status "FAIL" "backend/requirements.txt not found"
        backend_ok=false
    fi

    return $backend_ok
}

# Test 5: Check port availability
test_port_availability() {
    local ports_ok=true

    # List of ports used by monitoring stack
    local monitoring_ports=(9090 3001 3100 9080 9100 8080)

    for port in "${monitoring_ports[@]}"; do
        if port_in_use "$port"; then
            print_status "WARN" "Port $port is in use (may conflict with monitoring)"
        else
            print_status "PASS" "Port $port is available"
        fi
    done

    return $ports_ok
}

# Test 6: Test monitoring stack startup (if requested)
test_monitoring_stack() {
    local stack_ok=true

    echo -e "${YELLOW}⚠️  Starting monitoring stack for testing...${NC}"

    # Start monitoring stack
    if make monitoring-up >/dev/null 2>&1; then
        print_status "PASS" "Monitoring stack started successfully"

        # Wait a moment for services to come up
        echo "Waiting 10 seconds for services to initialize..."
        sleep 10

        # Test endpoints
        if ! check_endpoint "http://localhost:9090/-/healthy" "Prometheus"; then
            stack_ok=false
        fi

        if ! check_endpoint "http://localhost:3001/api/health" "Grafana"; then
            stack_ok=false
        fi

        if ! check_endpoint "http://localhost:3100/ready" "Loki"; then
            stack_ok=false
        fi

        # Stop monitoring stack
        echo "Stopping monitoring stack..."
        if make monitoring-down >/dev/null 2>&1; then
            print_status "PASS" "Monitoring stack stopped successfully"
        else
            print_status "WARN" "Issue stopping monitoring stack"
        fi

    else
        print_status "FAIL" "Failed to start monitoring stack"
        stack_ok=false
    fi

    return $stack_ok
}

# Main execution
echo "Starting monitoring stack verification..."
echo ""

# Run tests
run_test "Dependencies Check" test_dependencies
run_test "Configuration Files Check" test_configuration_files
run_test "Makefile Commands Check" test_makefile_commands
run_test "Backend Integration Check" test_backend_integration
run_test "Port Availability Check" test_port_availability

# Ask user if they want to test the actual stack
echo ""
echo -e "${BLUE}Do you want to test the actual monitoring stack startup/shutdown? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    run_test "Monitoring Stack Test" test_monitoring_stack
else
    print_status "INFO" "Skipping monitoring stack startup test"
fi

# Summary
echo ""
echo "============================================================"
echo -e "${BLUE}Verification Summary${NC}"
echo "============================================================"
echo "Total tests: $total_checks"
echo "Passed tests: $passed_checks"
echo "Failed tests: $((total_checks - passed_checks))"

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}🎉 All tests passed! Monitoring stack is ready for use.${NC}"
    exit 0
elif [ $passed_checks -gt $((total_checks / 2)) ]; then
    echo -e "${YELLOW}⚠️  Most tests passed. Review failures above.${NC}"
    exit 1
else
    echo -e "${RED}❌ Multiple test failures. Please fix configuration issues.${NC}"
    exit 2
fi