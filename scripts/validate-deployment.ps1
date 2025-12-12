# Covenant Guardian - Deployment Validation Script (PowerShell)
# Validates deployment readiness and performs health checks
# Requirements: 10.2, 10.5

$ErrorActionPreference = "Continue"

Write-Host "🔍 Covenant Guardian - Deployment Validation" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_BASE_URL = if ($env:VITE_API_BASE_URL) { $env:VITE_API_BASE_URL } else { "https://localhost:3000" }
$TIMEOUT = 10
$RETRY_COUNT = 3

# Counters
$script:PASSED = 0
$script:FAILED = 0
$script:WARNINGS = 0

# Helper functions
function Log-Pass {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:PASSED++
}

function Log-Fail {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:FAILED++
}

function Log-Warn {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:WARNINGS++
}

function Log-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

function Test-CommandExists {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

Write-Host "1. Prerequisites Check" -ForegroundColor White
Write-Host "----------------------" -ForegroundColor White

# Check Node.js
if (Test-CommandExists "node") {
    $nodeVersion = node -v
    if ($nodeVersion -match "^v(18|20|22)\.") {
        Log-Pass "Node.js version: $nodeVersion"
    } else {
        Log-Warn "Node.js version $nodeVersion (recommended: v18+)"
    }
} else {
    Log-Fail "Node.js not installed"
}

# Check npm
if (Test-CommandExists "npm") {
    $npmVersion = npm -v
    Log-Pass "npm version: $npmVersion"
} else {
    Log-Fail "npm not installed"
}

# Check Docker (optional)
if (Test-CommandExists "docker") {
    $dockerVersion = docker -v
    Log-Pass "Docker: $dockerVersion"
} else {
    Log-Warn "Docker not installed (optional for local development)"
}

# Check Git
if (Test-CommandExists "git") {
    $gitVersion = git --version
    Log-Pass "Git: $gitVersion"
} else {
    Log-Fail "Git not installed"
}

Write-Host ""
Write-Host "2. Environment Configuration" -ForegroundColor White
Write-Host "----------------------------" -ForegroundColor White

# Check environment files
if (Test-Path ".env") {
    Log-Pass ".env file exists"
} else {
    Log-Warn ".env file not found (using defaults)"
}

if (Test-Path ".env.production") {
    Log-Pass ".env.production file exists"
} else {
    Log-Warn ".env.production file not found"
}

# Check required environment variables
function Check-EnvVar {
    param([string]$VarName)
    $value = [Environment]::GetEnvironmentVariable($VarName)
    if ($value) {
        Log-Pass "$VarName is set"
    } else {
        Log-Warn "$VarName is not set"
    }
}

Check-EnvVar "VITE_API_BASE_URL"
Check-EnvVar "VITE_ENV"

Write-Host ""
Write-Host "3. Dependencies Check" -ForegroundColor White
Write-Host "---------------------" -ForegroundColor White

# Check if node_modules exists
if (Test-Path "node_modules") {
    Log-Pass "node_modules directory exists"
    
    # Check for critical dependencies
    if (Test-Path "node_modules/react") {
        Log-Pass "React installed"
    } else {
        Log-Fail "React not installed"
    }
    
    if (Test-Path "node_modules/axios") {
        Log-Pass "Axios installed"
    } else {
        Log-Fail "Axios not installed"
    }
    
    if (Test-Path "node_modules/fast-check") {
        Log-Pass "fast-check installed (PBT)"
    } else {
        Log-Warn "fast-check not installed"
    }
} else {
    Log-Fail "node_modules not found - run 'npm install'"
}

Write-Host ""
Write-Host "4. Build Verification" -ForegroundColor White
Write-Host "---------------------" -ForegroundColor White

# Check if build directory exists
if ((Test-Path "dist") -or (Test-Path "build")) {
    Log-Pass "Build directory exists"
    
    # Check build size
    if (Test-Path "dist") {
        $buildSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Log-Info "Build size: $([math]::Round($buildSize, 2)) MB"
    } elseif (Test-Path "build") {
        $buildSize = (Get-ChildItem -Path "build" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Log-Info "Build size: $([math]::Round($buildSize, 2)) MB"
    }
} else {
    Log-Warn "Build directory not found - run 'npm run build'"
}

# Check TypeScript configuration
if (Test-Path "tsconfig.json") {
    Log-Pass "TypeScript configuration exists"
} else {
    Log-Fail "tsconfig.json not found"
}

Write-Host ""
Write-Host "5. Test Suite Verification" -ForegroundColor White
Write-Host "--------------------------" -ForegroundColor White

# Check test configuration
if ((Test-Path "jest.config.cjs") -or (Test-Path "jest.config.js")) {
    Log-Pass "Jest configuration exists"
} else {
    Log-Warn "Jest configuration not found"
}

# Check test files exist
$testFiles = Get-ChildItem -Path "src" -Recurse -Include "*.test.ts", "*.test.tsx" -ErrorAction SilentlyContinue
$testCount = ($testFiles | Measure-Object).Count
if ($testCount -gt 0) {
    Log-Pass "Found $testCount test files"
} else {
    Log-Warn "No test files found"
}

# Check property-based tests
if (Test-Path "src/test/properties") {
    $pbtFiles = Get-ChildItem -Path "src/test/properties" -Filter "*.test.ts" -ErrorAction SilentlyContinue
    $pbtCount = ($pbtFiles | Measure-Object).Count
    if ($pbtCount -gt 0) {
        Log-Pass "Found $pbtCount property-based test files"
    } else {
        Log-Warn "No property-based test files found"
    }
}

# Check integration tests
if (Test-Path "src/test/integration") {
    $integrationFiles = Get-ChildItem -Path "src/test/integration" -Filter "*.test.ts" -ErrorAction SilentlyContinue
    $integrationCount = ($integrationFiles | Measure-Object).Count
    if ($integrationCount -gt 0) {
        Log-Pass "Found $integrationCount integration test files"
    } else {
        Log-Warn "No integration test files found"
    }
}

Write-Host ""
Write-Host "6. Database Configuration" -ForegroundColor White
Write-Host "-------------------------" -ForegroundColor White

# Check schema file
if (Test-Path "schema.sql") {
    Log-Pass "Database schema file exists"
    
    # Check for multi-tenant tables
    $schemaContent = Get-Content "schema.sql" -Raw
    if ($schemaContent -match "bank_id") {
        Log-Pass "Multi-tenant columns present in schema"
    } else {
        Log-Warn "Multi-tenant columns not found in schema"
    }
} else {
    Log-Fail "schema.sql not found"
}

# Check migration scripts
if (Test-Path "scripts/init-database.sql") {
    Log-Pass "Database initialization script exists"
} else {
    Log-Warn "Database initialization script not found"
}

Write-Host ""
Write-Host "7. Docker Configuration" -ForegroundColor White
Write-Host "-----------------------" -ForegroundColor White

# Check Docker files
if (Test-Path "Dockerfile") {
    Log-Pass "Dockerfile exists"
} else {
    Log-Warn "Dockerfile not found"
}

if (Test-Path "docker-compose.yml") {
    Log-Pass "docker-compose.yml exists"
} else {
    Log-Warn "docker-compose.yml not found"
}

if (Test-Path "docker-compose.dev.yml") {
    Log-Pass "docker-compose.dev.yml exists"
} else {
    Log-Warn "docker-compose.dev.yml not found"
}

if (Test-Path ".dockerignore") {
    Log-Pass ".dockerignore exists"
} else {
    Log-Warn ".dockerignore not found"
}

Write-Host ""
Write-Host "8. Security Configuration" -ForegroundColor White
Write-Host "-------------------------" -ForegroundColor White

# Check for sensitive files in git
if (Test-Path ".gitignore") {
    Log-Pass ".gitignore exists"
    
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Log-Pass ".env files are git-ignored"
    } else {
        Log-Fail ".env files are NOT git-ignored"
    }
} else {
    Log-Fail ".gitignore not found"
}

Write-Host ""
Write-Host "9. Documentation" -ForegroundColor White
Write-Host "----------------" -ForegroundColor White

# Check documentation files
if (Test-Path "README.md") {
    Log-Pass "README.md exists"
} else {
    Log-Warn "README.md not found"
}

if (Test-Path "DEPLOYMENT.md") {
    Log-Pass "DEPLOYMENT.md exists"
} else {
    Log-Warn "DEPLOYMENT.md not found"
}

if (Test-Path "API.md") {
    Log-Pass "API.md exists"
} else {
    Log-Warn "API.md not found"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed:   $script:PASSED" -ForegroundColor Green
Write-Host "Failed:   $script:FAILED" -ForegroundColor Red
Write-Host "Warnings: $script:WARNINGS" -ForegroundColor Yellow
Write-Host ""

if ($script:FAILED -eq 0) {
    Write-Host "✓ Deployment validation PASSED" -ForegroundColor Green
    Write-Host "  System is ready for deployment" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "✗ Deployment validation FAILED" -ForegroundColor Red
    Write-Host "  Please fix the failed checks before deploying" -ForegroundColor Gray
    exit 1
}
