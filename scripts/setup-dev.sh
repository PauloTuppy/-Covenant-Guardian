#!/bin/bash

# Setup para desenvolvimento local

set -e

echo "🚀 Covenant Guardian - Setup Local"
echo "===================================="

# 1. Verificar dependências
echo "✓ Checking dependencies..."
command -v docker &> /dev/null || { echo "Docker not found"; exit 1; }
command -v git &> /dev/null || { echo "Git not found"; exit 1; }

# 2. Criar .env se não existe
if [ ! -f ".env" ]; then
    echo "📝 Creating .env..."
    cp .env.example .env
    
    echo ""
    echo "⚠️  Atualize .env com:"
    echo "   - XANO_WORKSPACE_ID (encontre em xano.com settings)"
    echo "   - XANO_API_KEY (opcional)"
    echo ""
    exit 1
fi

# 3. Verificar XANO_WORKSPACE_ID
if ! grep -q "XANO_WORKSPACE_ID=" .env; then
    echo "❌ XANO_WORKSPACE_ID não configurado em .env"
    exit 1
fi

# 4. Build Docker
echo "🐳 Building Docker image..."
docker-compose build

# 5. Instalar npm dependencies (fora do Docker)
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Próximos passos:"
echo "1. npm test          # Rodar testes"
echo "2. docker-compose up # Iniciar frontend"
echo "3. http://localhost:3000"
echo ""
echo "Frontend vai conectar em:"
WORKSPACE_ID=$(grep XANO_WORKSPACE_ID .env | cut -d '=' -f2)
echo "https://${WORKSPACE_ID}-staging.xano.io/api"
