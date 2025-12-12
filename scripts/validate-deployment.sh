#!/bin/bash

# Covenant Guardian - Deployment Validation Script
# Validates deployment readiness and performs health checks
# Requirements: 10.2, 10.5

set -e

echo "🔍 Covenant Guardian - Deployment Validation"
echo "============================================="
echo ""

# Configuration
API_BASE_URL="${VITE_API_BASE_URL:-https://localhost:3000}"
TIMEOUT=10
RETRY_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "  $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# HTTP health check with retry
http_check() {
    local url=$1
    local description=$2
    local attempt=1
    
    while [ $attempt -le $RETRY_COUNT ]; do
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" | grep -q "200\|201\|204"; then
            log_pass "$description"
            return 0
        fi
        ((attempt++))
        sleep 2
    done
    
    log_fail "$description"
    return 1
}

echo "1. Prerequisites Check"
echo "----------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    if [[ "$NODE_VERSION" =~ ^v18\. || "$NODE_VERSION" =~ ^v20\. || "$NODE_VERSION" =~ ^v22\. ]]; then
        log_pass "Node.js version: $NODE_VERSION"
    else
        log_warn "Node.js version $NODE_VERSION (recommended: v18+)"
    fi
else
    log_fail "Node.js not installed"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    log_pass "npm version: $NPM_VERSION"
else
    log_fail "npm not installed"
fi

# Check Docker (optional)
if command_exists docker; then
    DOCKER_VERSION=$(docker -v | cut -d' ' -f3 | tr -d ',')
    log_pass "Docker version: $DOCKER_VERSION"
else
    log_warn "Docker not installed (optional for local development)"
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    log_pass "Git version: $GIT_VERSION"
else
    log_fail "Git not installed"
fi

echo ""
echo "2. Environment Configuration"
echo "----------------------------"

# Check environment files
if [ -f ".env" ]; then
    log_pass ".env file exists"
else
    log_warn ".env file not found (using defaults)"
fi

if [ -f ".env.production" ]; then
    log_pass ".env.production file exists"
else
    log_warn ".env.production file not found"
fi

# Check required environment variables
check_env_var() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -n "$var_value" ]; then
        log_pass "$var_name is set"
    else
        log_warn "$var_name is not set"
    fi
}

check_env_var "VITE_API_BASE_URL"
check_env_var "VITE_ENV"

echo ""
echo "3. Dependencies Check"
echo "---------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    log_pass "node_modules directory exists"
    
    # Check for critical dependencies
    if [ -d "node_modules/react" ]; then
        log_pass "React installed"
    else
        log_fail "React not installed"
    fi
    
    if [ -d "node_modules/axios" ]; then
        log_pass "Axios installed"
    else
        log_fail "Axios not installed"
    fi
    
    if [ -d "node_modules/fast-check" ]; then
        log_pass "fast-check installed (PBT)"
    else
        log_warn "fast-check not installed"
    fi
else
    log_fail "node_modules not found - run 'npm install'"
fi

echo ""
echo "4. Build Verification"
echo "---------------------"

# Check if build directory exists
if [ -d "dist" ] || [ -d "build" ]; then
    log_pass "Build directory exists"
    
    # Check build size
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
        log_info "Build size: $BUILD_SIZE"
    elif [ -d "build" ]; then
        BUILD_SIZE=$(du -sh build 2>/dev/null | cut -f1)
        log_info "Build size: $BUILD_SIZE"
    fi
else
    log_warn "Build directory not found - run 'npm run build'"
fi

# Check TypeScript compilation
if [ -f "tsconfig.json" ]; then
    log_pass "TypeScript configuration exists"
    
    # Try to compile without emitting
    if command_exists npx; then
        if npx tsc --noEmit 2>/dev/null; then
            log_pass "TypeScript compilation successful"
        else
            log_warn "TypeScript compilation has errors"
        fi
    fi
else
    log_fail "tsconfig.json not found"
fi

echo ""
echo "5. Test Suite Verification"
echo "--------------------------"

# Check test configuration
if [ -f "jest.config.cjs" ] || [ -f "jest.config.js" ]; then
    log_pass "Jest configuration exists"
else
    log_warn "Jest configuration not found"
fi

# Check test files exist
TEST_COUNT=$(find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)
if [ "$TEST_COUNT" -gt 0 ]; then
    log_pass "Found $TEST_COUNT test files"
else
    log_warn "No test files found"
fi

# Check property-based tests
PBT_COUNT=$(find src/test/properties -name "*.test.ts" 2>/dev/null | wc -l)
if [ "$PBT_COUNT" -gt 0 ]; then
    log_pass "Found $PBT_COUNT property-based test files"
else
    log_warn "No property-based test files found"
fi

# Check integration tests
INTEGRATION_COUNT=$(find src/test/integration -name "*.test.ts" 2>/dev/null | wc -l)
if [ "$INTEGRATION_COUNT" -gt 0 ]; then
    log_pass "Found $INTEGRATION_COUNT integration test files"
else
    log_warn "No integration test files found"
fi

echo ""
echo "6. Database Configuration"
echo "-------------------------"

# Check schema file
if [ -f "schema.sql" ]; then
    log_pass "Database schema file exists"
    
    # Check for multi-tenant tables
    if grep -q "bank_id" schema.sql; then
        log_pass "Multi-tenant columns present in schema"
    else
        log_warn "Multi-tenant columns not found in schema"
    fi
else
    log_fail "schema.sql not found"
fi

# Check migration scripts
if [ -d "scripts" ]; then
    if [ -f "scripts/init-database.sql" ]; then
        log_pass "Database initialization script exists"
    else
        log_warn "Database initialization script not found"
    fi
fi

echo ""
echo "7. Docker Configuration"
echo "-----------------------"

# Check Docker files
if [ -f "Dockerfile" ]; then
    log_pass "Dockerfile exists"
else
    log_warn "Dockerfile not found"
fi

if [ -f "docker-compose.yml" ]; then
    log_pass "docker-compose.yml exists"
else
    log_warn "docker-compose.yml not found"
fi

if [ -f "docker-compose.dev.yml" ]; then
    log_pass "docker-compose.dev.yml exists"
else
    log_warn "docker-compose.dev.yml not found"
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
    log_pass ".dockerignore exists"
else
    log_warn ".dockerignore not found"
fi

echo ""
echo "8. Security Configuration"
echo "-------------------------"

# Check for sensitive files in git
if [ -f ".gitignore" ]; then
    log_pass ".gitignore exists"
    
    # Check if .env is ignored
    if grep -q "\.env" .gitignore; then
        log_pass ".env files are git-ignored"
    else
        log_fail ".env files are NOT git-ignored"
    fi
else
    log_fail ".gitignore not found"
fi

# Check for hardcoded secrets (basic check)
if grep -rn "password\s*=" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "password_hash" | grep -v "test" | head -1; then
    log_warn "Potential hardcoded passwords found"
else
    log_pass "No obvious hardcoded passwords"
fi

echo ""
echo "9. Documentation"
echo "----------------"

# Check documentation files
if [ -f "README.md" ]; then
    log_pass "README.md exists"
else
    log_warn "README.md not found"
fi

if [ -f "DEPLOYMENT.md" ]; then
    log_pass "DEPLOYMENT.md exists"
else
    log_warn "DEPLOYMENT.md not found"
fi

if [ -f "API.md" ]; then
    log_pass "API.md exists"
else
    log_warn "API.md not found"
fi

echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment validation PASSED${NC}"
    echo "  System is ready for deployment"
    exit 0
else
    echo -e "${RED}✗ Deployment validation FAILED${NC}"
    echo "  Please fix the failed checks before deploying"
    exit 1
fi
