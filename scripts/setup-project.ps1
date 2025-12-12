# Covenant Guardian Project Setup Script (PowerShell)
# This script sets up the complete development environment

Write-Host "🏗️  Setting up Covenant Guardian development environment..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please update .env with your Xano API URL and configuration" -ForegroundColor Yellow
}

# Run tests to verify setup
Write-Host "🧪 Running tests to verify setup..." -ForegroundColor Yellow
npm test

# Check if Docker is available for local database
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
    Write-Host "🐳 Docker detected. You can run local database with:" -ForegroundColor Green
    Write-Host "   docker-compose -f docker-compose.dev.yml up postgres" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Docker not detected. Local PostgreSQL database won't be available." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Update .env with your Xano configuration:" -ForegroundColor White
Write-Host "   - VITE_API_BASE_URL=https://your-workspace.xano.io" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Start development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run tests:" -ForegroundColor White
Write-Host "   npm test" -ForegroundColor Cyan
Write-Host "   npm run test:pbt  # Property-based tests" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Optional - Start local database:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.dev.yml up postgres" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor White
Write-Host "   - README.md - Project overview and setup" -ForegroundColor Cyan
Write-Host "   - API.md - API documentation" -ForegroundColor Cyan
Write-Host "   - schema.sql - Database schema" -ForegroundColor Cyan
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green