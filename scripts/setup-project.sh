#!/bin/bash

# Covenant Guardian Project Setup Script
# This script sets up the complete development environment

set -e

echo "🏗️  Setting up Covenant Guardian development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your Xano API URL and configuration"
fi

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
npm test

# Check if Docker is available for local database
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detected. You can run local database with:"
    echo "   docker-compose -f docker-compose.dev.yml up postgres"
else
    echo "⚠️  Docker not detected. Local PostgreSQL database won't be available."
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Update .env with your Xano configuration:"
echo "   - VITE_API_BASE_URL=https://your-workspace.xano.io"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Run tests:"
echo "   npm test"
echo "   npm run test:pbt  # Property-based tests"
echo ""
echo "4. Optional - Start local database:"
echo "   docker-compose -f docker-compose.dev.yml up postgres"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Project overview and setup"
echo "   - API.md - API documentation"
echo "   - schema.sql - Database schema"
echo ""
echo "Happy coding! 🚀"