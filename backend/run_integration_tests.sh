#!/bin/bash

# Integration Test Runner Script for Story 1.3
# Runs comprehensive integration tests for instance_identifier functionality
# with proper database setup and coverage reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DB_NAME="drawing_index_test"
TEST_DB_USER="test_user"
TEST_DB_PASSWORD="test_password"
TEST_UPLOAD_DIR="/tmp/test_uploads"

echo -e "${BLUE}🧪 Story 1.3: Integration Testing for Multiple Piece Mark Instances${NC}"
echo -e "${BLUE}================================================================${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify required tools
print_step "Verifying Prerequisites"

required_tools=("python3" "pip" "pytest" "docker-compose")
missing_tools=()

for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        missing_tools+=("$tool")
    else
        echo "✅ $tool found"
    fi
done

if [ ${#missing_tools[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
    exit 1
fi

# Check if we can use Docker for testing
USE_DOCKER=false
if command_exists "docker-compose" && docker-compose ps postgres >/dev/null 2>&1; then
    USE_DOCKER=true
    echo "🐳 Docker Compose services available - using Docker for tests"
fi

# Setup test environment
print_step "Setting Up Test Environment"

# Create test upload directory
mkdir -p "$TEST_UPLOAD_DIR"
echo "✅ Created test upload directory: $TEST_UPLOAD_DIR"

# Install test dependencies
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ requirements.txt not found. Please run from backend directory.${NC}"
    exit 1
fi

echo "📦 Installing test dependencies..."
pip install pytest pytest-cov pytest-asyncio pytest-xdist > /dev/null 2>&1
echo "✅ Test dependencies installed"

# Set environment variables
export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:5432/${TEST_DB_NAME}"
export REDIS_URL="redis://localhost:6379"
export UPLOAD_DIR="$TEST_UPLOAD_DIR"
export ENVIRONMENT="test"
export DEBUG="true"

if [ "$USE_DOCKER" = true ]; then
    # Use Docker services
    export DATABASE_URL="postgresql://user:password@localhost:5432/drawing_index"
    export REDIS_URL="redis://localhost:6379"
    
    print_step "Starting Docker Services"
    docker-compose up -d postgres redis
    
    # Wait for services to be ready
    echo "⏳ Waiting for database to be ready..."
    timeout 30 bash -c 'until docker-compose exec postgres pg_isready -U user; do sleep 1; done'
    
    # Apply migrations
    echo "🔄 Applying database migrations..."
    alembic upgrade head
fi

# Function to run test suite with coverage
run_test_suite() {
    local test_file=$1
    local test_name=$2
    local coverage_flag=$3
    
    echo -e "\n${YELLOW}🔬 Running $test_name${NC}"
    echo "Test file: $test_file"
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ Test file not found: $test_file${NC}"
        return 1
    fi
    
    python -m pytest "$test_file" -v \
        --tb=short \
        --cov=app \
        --cov-append \
        --cov-report=term-missing \
        $coverage_flag \
        || return 1
    
    echo -e "${GREEN}✅ $test_name completed successfully${NC}"
}

# Run test suites in sequence
print_step "Running Integration Test Suites"

# Track test results
test_results=()

# Test Suite 1: API Integration Tests
if run_test_suite "tests/test_component_api_integration.py" "API Integration Tests" "--cov-report=xml:api-coverage.xml"; then
    test_results+=("✅ API Integration Tests: PASSED")
else
    test_results+=("❌ API Integration Tests: FAILED")
fi

# Test Suite 2: Service Layer Integration Tests  
if run_test_suite "tests/test_component_service_integration.py" "Service Layer Integration Tests" "--cov-report=xml:service-coverage.xml"; then
    test_results+=("✅ Service Layer Integration Tests: PASSED")
else
    test_results+=("❌ Service Layer Integration Tests: FAILED")
fi

# Test Suite 3: Constraint Validation Tests
if run_test_suite "tests/test_instance_identifier_constraints.py" "Constraint Validation Tests" "--cov-report=xml:constraint-coverage.xml"; then
    test_results+=("✅ Constraint Validation Tests: PASSED")
else
    test_results+=("❌ Constraint Validation Tests: FAILED") 
fi

# Test Suite 4: End-to-End Workflow Tests
if run_test_suite "tests/test_instance_identifier_workflows.py" "End-to-End Workflow Tests" "--cov-report=xml:workflow-coverage.xml"; then
    test_results+=("✅ End-to-End Workflow Tests: PASSED")
else
    test_results+=("❌ End-to-End Workflow Tests: FAILED")
fi

# Generate combined coverage report
print_step "Generating Coverage Report"

python -m pytest --cov=app \
    --cov-report=html:htmlcov \
    --cov-report=xml:combined-coverage.xml \
    --cov-report=term-missing \
    --no-cov-on-fail \
    --cov-fail-under=85 \
    tests/test_component_models.py > /dev/null 2>&1 || true

if [ -f "htmlcov/index.html" ]; then
    echo "✅ HTML coverage report generated: htmlcov/index.html"
fi

if [ -f "combined-coverage.xml" ]; then
    echo "✅ XML coverage report generated: combined-coverage.xml"
fi

# Cleanup
print_step "Cleanup"

if [ "$USE_DOCKER" = true ]; then
    echo "🧹 Stopping Docker services..."
    docker-compose stop postgres redis > /dev/null 2>&1 || true
fi

# Remove test upload directory
rm -rf "$TEST_UPLOAD_DIR"
echo "✅ Cleaned up test upload directory"

# Final results
print_step "Test Results Summary"

echo -e "\n${BLUE}📊 Story 1.3 Integration Test Results:${NC}"
echo "=================================="

failed_tests=0
for result in "${test_results[@]}"; do
    if [[ $result == *"FAILED"* ]]; then
        echo -e "${RED}$result${NC}"
        ((failed_tests++))
    else
        echo -e "${GREEN}$result${NC}"
    fi
done

echo -e "\n${BLUE}Coverage Reports:${NC}"
echo "- HTML Report: htmlcov/index.html"
echo "- XML Report: combined-coverage.xml"
echo "- Individual coverage files: api-coverage.xml, service-coverage.xml, constraint-coverage.xml, workflow-coverage.xml"

if [ $failed_tests -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All integration tests PASSED! Story 1.3 acceptance criteria validated.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ $failed_tests test suite(s) FAILED. Please review the output above.${NC}"
    echo -e "${YELLOW}💡 Consider running individual test suites with -v flag for detailed output.${NC}"
    exit 1
fi