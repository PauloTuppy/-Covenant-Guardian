#!/bin/bash

# Deploy para Produção
# Pré-requisitos:
# - Xano project com branch "main" (production)
# - GitHub conta conectada a Vercel
# - Secrets configurados em GitHub

set -e

echo "🚀 Covenant Guardian - Production Deployment"
echo "============================================"

# 1. Verificar git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Você deve estar em 'main' branch"
    echo "Current branch: $BRANCH"
    exit 1
fi

# 2. Verificar se há mudanças não commitadas
if ! git diff-index --quiet HEAD --; then
    echo "❌ Há mudanças não commitadas. Commit primeiro."
    exit 1
fi

echo "✓ Branch: main"
echo "✓ Git status: clean"

# 3. Rodar testes
echo ""
echo "🧪 Running tests..."
npm run test:ci || { echo "❌ Tests failed"; exit 1; }

echo ""
echo "✅ All tests passed"

# 4. Build app
echo ""
echo "📦 Building application..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✓ Build successful"

# 5. Alertar sobre Xano deployment
echo ""
echo "⚠️  IMPORTANTE - Xano Deployment:"
echo ""
echo "Antes de fazer push:"
echo ""
echo "1. No Xano:"
echo "   ├─ Fazer merge: staging → main"
echo "   ├─ Publish no Main/Production"
echo "   └─ Verificar: [workspace].xano.io/api"
echo ""
echo "2. No GitHub:"
echo "   ├─ Push será automático"
echo "   └─ Vercel fará deploy via GitHub Actions"
echo ""
read -p "Confirma que Xano staging → main já foi feito? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abortado. Faça o merge no Xano primeiro."
    exit 1
fi

# 6. Push para Git
echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Push successful!"
echo ""
echo "GitHub Actions foi acionado:"
echo "├─ Testes rodarão"
echo "├─ Docker image será buildado"
echo "└─ Vercel fará deploy automático"
echo ""
echo "Acompanhe em:"
echo "├─ GitHub: https://github.com/[seu-repo]/actions"
echo "└─ Vercel: https://vercel.com/dashboard"
echo ""
echo "🎉 Production deployment iniciado!"
