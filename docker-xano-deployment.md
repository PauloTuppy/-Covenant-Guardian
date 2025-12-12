# Docker & Deployment Architecture Corrigida
## Integração Correta com Xano + Frontend Deploy

---

## ⚠️ PROBLEMA COM SETUP ANTERIOR

O setup anterior tinha problemas críticos:

```
❌ ERRADO - Docker compose anterior:
├─ Tentava rodar API em Node.js localmente (porta 3001)
├─ PostgreSQL rodando em localhost (descentralizado)
├─ Frontend tentando conectar em localhost:3001
└─ Nenhuma integração real com Xano

❌ Resultado:
└─ Funciona em dev local, mas quebra em produção
└─ Não usa recursos do Xano (workflows, AI, etc)
└─ Duplicação de banco de dados
└─ Sem escalabilidade
```

---

## ✅ ARQUITETURA CORRETA

### Cenários de Deployment

#### **1. DESENVOLVIMENTO LOCAL (Com Docker)**

```
┌─────────────────────────────────────────────┐
│         Seu Computador (Docker)             │
├─────────────────────────────────────────────┤
│                                             │
│  Frontend (React)                           │
│  ├─ Docker: http://localhost:3000          │
│  ├─ HMR habilitado                         │
│  └─ Conecta em → Xano Staging              │
│                                             │
│  Xano Local Preview (Opcional)              │
│  └─ Você edita visualmente no Xano         │
│                                             │
└─────────────────────────────────────────────┘
         ↓ (API calls)
┌─────────────────────────────────────────────┐
│  Xano Staging Workspace (Cloud)             │
├─────────────────────────────────────────────┤
│  ├─ API endpoints: [workspace]-staging.xano │
│  ├─ PostgreSQL gerenciado                  │
│  ├─ Workflows + Triggers                   │
│  └─ AI Functions (Gemini)                  │
└─────────────────────────────────────────────┘
```

**docker-compose.yml (CORRIGIDO):**

```yaml
version: '3.8'

services:
  # Frontend React APENAS
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: covenant-frontend
    environment:
      # Aponta para Xano Staging
      REACT_APP_API_BASE_URL: https://${XANO_WORKSPACE_ID}-staging.xano.io/api
      REACT_APP_ENV: development
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - /app/node_modules
    command: npm run dev

volumes:
  node_modules_cache:

networks:
  default:
    name: covenant-dev
```

---

#### **2. STAGING (Xano Staging Branch)**

```
┌─────────────────────────────────────────────┐
│    Xano Staging Branch (Testing)            │
├─────────────────────────────────────────────┤
│  ├─ API: [workspace]-staging.xano.io/api   │
│  ├─ Database: Copy of Production            │
│  ├─ All Workflows Active                    │
│  └─ Safe to test without affecting Prod    │
│                                             │
│  Frontend (Vercel Preview Deploy)           │
│  └─ Connects to this Xano staging           │
└─────────────────────────────────────────────┘
```

**Workflow de Staging:**

1. Editar APIs/Workflows no Xano (branch staging)
2. Testar com Xano Preview (built-in)
3. Publish no Xano Staging quando pronto
4. Frontend em Vercel Preview conecta aqui
5. Rodar E2E tests contra staging
6. Se OK → fazer merge no Xano main

---

#### **3. PRODUÇÃO (Xano Main + Vercel)**

```
┌──────────────────────────────────────────────┐
│         Xano Main (Production)               │
├──────────────────────────────────────────────┤
│  ├─ API: [workspace].xano.io/api            │
│  ├─ Database: Production PostgreSQL         │
│  ├─ All Workflows Monitored                 │
│  └─ Backups enabled                         │
└──────────────────────────────────────────────┘
         ↑ (API calls)
┌──────────────────────────────────────────────┐
│    Vercel (React Frontend - CDN)             │
├──────────────────────────────────────────────┤
│  ├─ URL: covenant-guardian.vercel.app       │
│  ├─ Edge Functions                          │
│  ├─ Serverless Functions (se needed)        │
│  └─ Built-in CI/CD from GitHub              │
└──────────────────────────────────────────────┘
```

---

## 📋 DOCKER SETUP CORRIGIDO

### Dockerfile (Sem mudanças - já está bom)

```dockerfile
# Multi-stage build for React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run app
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["serve", "-s", "build", "-l", "3000"]
```

### Docker Compose CORRIGIDO

```yaml
version: '3.8'

services:
  # ============================================
  # FRONTEND REACT (ÚNICO serviço local)
  # ============================================
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: covenant-frontend
    
    # Environment variables
    environment:
      # ⚠️ CRÍTICO: Aponta para Xano (não localhost!)
      REACT_APP_API_BASE_URL: https://${XANO_WORKSPACE_ID}-staging.xano.io/api
      REACT_APP_ENV: development
      # Opcional: Xano API Key para workflows específicos
      REACT_APP_XANO_API_KEY: ${XANO_API_KEY}
    
    ports:
      - "3000:3000"
    
    volumes:
      # Hot reload para desenvolvimento
      - ./src:/app/src
      - ./public:/app/public
      - /app/node_modules  # Não sincroniza node_modules
    
    # Development mode com HMR
    command: npm run dev
    
    networks:
      - covenant-network

# ============================================
# NÃO HÁ MAIS SERVIÇOS DOCKER AQUI!
# ============================================
# PostgreSQL está em: Xano (gerenciado)
# API está em: Xano (serverless)
# Workflows estão em: Xano (visual builder)
# AI Functions estão em: Xano (Gemini integrado)

volumes:
  # Não precisamos de volumes de banco local

networks:
  covenant-network:
    driver: bridge
```

### .env.example CORRIGIDO

```bash
# ============================================
# XANO CONFIGURATION
# ============================================

# ID do seu workspace no Xano (encontre em Settings)
XANO_WORKSPACE_ID=seu_workspace_id_aqui

# Chave API do Xano (se precisar de autenticação programática)
XANO_API_KEY=seu_xano_api_key_aqui

# ============================================
# FRONTEND ENVIRONMENT
# ============================================

# Ambiente: development, staging, production
REACT_APP_ENV=development

# Xano Staging API (para desenvolvimento)
# Será substituído por production em prod
REACT_APP_API_BASE_URL=https://seu_workspace_id-staging.xano.io/api

# ============================================
# VERCEL DEPLOYMENT (production only)
# ============================================

# Esses são configurados via Vercel Dashboard
# VERCEL_ORG_ID=xxx
# VERCEL_PROJECT_ID=xxx
# VERCEL_TOKEN=xxx
```

### .dockerignore

```
node_modules
npm-debug.log
build
.git
.gitignore
README.md
.env
.env.local
.DS_Store
coverage
dist
.next
out
cypress
.github
.vscode
```

---

## 🚀 FLUXO DE DEPLOYMENT CORRETO

### FASE 1: Desenvolvimento Local

```bash
# 1. Clonar repositório
git clone <repo>
cd covenant-guardian

# 2. Configurar environment
cp .env.example .env
# Editar .env com seu XANO_WORKSPACE_ID

# 3. Rodar Docker (Frontend apenas)
docker-compose up

# Frontend rodando em: http://localhost:3000
# Conectado a: Xano Staging API

# 4. Editar código React
# HMR será acionado automaticamente

# 5. Para testes
npm test
npm run cypress:open
```

### FASE 2: Staging no Xano

```
1. EM XANO:
   ├─ Criar branch "staging" (se não existe)
   ├─ Editar APIs/Workflows/Triggers
   ├─ Usar Xano Preview para testar
   ├─ Publicar no Staging branch
   └─ Verificar endpoints em: [workspace]-staging.xano.io/api

2. EM GITHUB:
   ├─ Push de código frontend para branch develop
   ├─ GitHub Actions roda testes
   ├─ Vercel cria Preview Deploy
   └─ Preview Deploy conecta a Xano Staging

3. TESTES:
   ├─ E2E tests contra staging
   ├─ Verificar covariants, alertas, etc
   └─ Simular cenários de produção

4. SE OK:
   └─ Fazer merge develop → main no Git
```

### FASE 3: Produção

```
1. EM XANO:
   ├─ Merge staging → main branch
   ├─ Publish no Main/Production
   ├─ Verificar endpoints em: [workspace].xano.io/api
   └─ Verificar database, backups, monitoring

2. EM GITHUB:
   ├─ Push para main branch
   ├─ GitHub Actions roda:
   │  ├─ Testes
   │  ├─ Build Docker
   │  └─ Deploy para Vercel (automático)
   └─ Vercel builda React e faz deploy em CDN

3. VERIFICAÇÃO:
   ├─ Frontend em: covenant-guardian.vercel.app
   ├─ Conectado a: [workspace].xano.io/api
   ├─ Database: Production PostgreSQL no Xano
   └─ Monitoramento: Xano logs + Vercel metrics
```

---

## 📝 SCRIPTS CORRIGIDOS

### scripts/setup-dev.sh (Novo)

```bash
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
```

### scripts/deploy-production.sh (CORRIGIDO)

```bash
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
```

---

## 🔄 CI/CD GITHUB ACTIONS (CORRIGIDO)

### .github/workflows/main.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # 1. CODE QUALITY
  # ============================================
  quality:
    runs-on: ubuntu-latest
    name: Code Quality & Tests
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ============================================
  # 2. BUILD (só em main/develop)
  # ============================================
  build:
    runs-on: ubuntu-latest
    name: Build Application
    needs: quality
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build

      - name: Verify build
        run: test -d build || (echo "Build failed"; exit 1)

      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: build/

  # ============================================
  # 3. DEPLOY TO VERCEL (só em main)
  # ============================================
  deploy-vercel:
    runs-on: ubuntu-latest
    name: Deploy to Vercel
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Vercel (Production)
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
        env:
          # Aponta para Xano Production
          REACT_APP_API_BASE_URL: https://${{ secrets.XANO_WORKSPACE_ID }}.xano.io/api
          REACT_APP_ENV: production

  # ============================================
  # 4. DEPLOY PREVIEW (em develop/PRs)
  # ============================================
  deploy-preview:
    runs-on: ubuntu-latest
    name: Deploy Preview to Vercel
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Vercel (Preview)
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        env:
          # Aponta para Xano Staging
          REACT_APP_API_BASE_URL: https://${{ secrets.XANO_WORKSPACE_ID }}-staging.xano.io/api
          REACT_APP_ENV: staging

  # ============================================
  # 5. E2E TESTS (contra staging)
  # ============================================
  e2e-tests:
    runs-on: ubuntu-latest
    name: E2E Tests (Staging)
    needs: deploy-preview
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress E2E tests
        uses: cypress-io/github-action@v5
        with:
          # Espera Preview Deploy estar pronto
          start: sleep 5
          browser: chrome
          record: false
        env:
          CYPRESS_BASE_URL: ${{ secrets.VERCEL_PREVIEW_URL }}
          XANO_WORKSPACE_ID: ${{ secrets.XANO_WORKSPACE_ID }}
          XANO_API_KEY: ${{ secrets.XANO_API_KEY }}

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cypress-results
          path: |
            cypress/screenshots
            cypress/videos
```

---

## 🔐 GITHUB SECRETS NECESSÁRIOS

Configure em: **GitHub → Settings → Secrets and variables → Actions**

```
VERCEL_TOKEN              # Token de acesso Vercel
VERCEL_ORG_ID             # ID da organização Vercel
VERCEL_PROJECT_ID         # ID do projeto Vercel
XANO_WORKSPACE_ID         # ID do seu workspace Xano
XANO_API_KEY              # Chave API Xano (opcional)
VERCEL_PREVIEW_URL        # URL do preview (auto-gerada)
```

---

## 📊 ARQUITETURA FINAL

```
┌────────────────────────────────────────────────────────────┐
│                   YOUR APPLICATION                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🖥️  LOCAL DEVELOPMENT                                    │
│  ├─ Docker: Frontend React (3000)                         │
│  ├─ Conecta: Xano Staging API                            │
│  └─ Edita: Código React + Xano workflows                 │
│                                                            │
│  🌍 STAGING (develop branch)                              │
│  ├─ Vercel Preview Deploy                                │
│  ├─ Conecta: Xano Staging API (-staging.xano.io)         │
│  ├─ E2E Tests automáticos                                │
│  └─ Aprovação manual antes de prod                       │
│                                                            │
│  🚀 PRODUCTION (main branch)                              │
│  ├─ Vercel Production Deploy (CDN)                       │
│  ├─ Conecta: Xano Production API (.xano.io)             │
│  ├─ Monitoring + Alertas                                │
│  └─ Backups automáticos no Xano                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│                   XANO INFRASTRUCTURE                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✓ Staging Branch:                                        │
│    ├─ API Endpoints (-staging.xano.io/api)              │
│    ├─ Database (Copy of production)                      │
│    ├─ All Workflows & Triggers                           │
│    └─ AI Functions (Gemini)                              │
│                                                            │
│  ✓ Main/Production Branch:                               │
│    ├─ API Endpoints (.xano.io/api)                      │
│    ├─ Database (Production PostgreSQL)                   │
│    ├─ All Workflows & Triggers                           │
│    ├─ AI Functions (Gemini)                              │
│    ├─ Real-time Backups                                  │
│    └─ Performance Monitoring                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ DEPLOYMENT CHECKLIST

### Antes de ir para Staging:

```markdown
- [ ] Testes locais passando (npm test)
- [ ] Código lintado (npm run lint)
- [ ] Build sem erros (npm run build)
- [ ] Xano APIs testadas via Xano Preview
- [ ] Variáveis de ambiente configuradas
```

### Antes de ir para Produção:

```markdown
- [ ] Staging tests passaram
- [ ] E2E tests passaram contra staging
- [ ] Xano staging → main merge feito
- [ ] Xano Production APIs testadas
- [ ] Database backups ativados
- [ ] Monitoramento configurado
- [ ] Plano de rollback estabelecido
```

---

## 🎯 RESUMO

| Aspecto | Antes (❌) | Depois (✅) |
|--------|-----------|-----------|
| **Docker compose** | Rodava API Node localmente | Roda apenas Frontend |
| **API Backend** | Localhost:3001 | Xano cloud (serverless) |
| **Database** | Container PostgreSQL local | Xano managed PostgreSQL |
| **Workflows** | Não usava | Xano visual workflows |
| **AI Functions** | Não integrado | Gemini via Xano |
| **Deployment** | Manual + complexo | Git → Vercel automático |
| **Staging** | Não havia | Xano branch staging |
| **Escalabilidade** | Limitada | Ilimitada (serverless) |

---

**🎉 Agora está tudo alinhado com a arquitetura real do Xano!**

---

## 🤖 AI COVENANT ANALYSIS AGENT

### Agent Configuration (Xano)

The Covenant Analysis Agent is configured in Xano with:

| Setting | Value |
|---------|-------|
| Name | Covenant Analysis Agent |
| Model Host | Xano Test Model (Free Gemini Credits) |
| Max Steps | 5 |
| Temperature | 0.2 |
| Tools | `get_covenant_data`, `detect_covenant_breaches` |

### Testing the Agent

#### Step 1: Publish Tools in Xano

1. Go to **Xano Dashboard** → **AI Agents** → **Tools**
2. Find `get_covenant_data` → Change from **DRAFT** to **Published**
3. Find `detect_covenant_breaches` → Change from **DRAFT** to **Published**

#### Step 2: Test via API

```powershell
# Test the get_covenant_data tool directly
Invoke-RestMethod -Uri "https://xue3-u0pk-dusa.n7e.xano.io/api/v1/get_covenant_data?contract_id=1" -Method GET

# Run the Covenant Analysis Agent
Invoke-RestMethod -Uri "https://xue3-u0pk-dusa.n7e.xano.io/api/v1/agent/covenant-analysis-agent/run" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"contract_id": 1, "prompt": "Analyze covenants for contract 1"}'
```

#### Step 3: Frontend Integration

The frontend includes:

- **`useCovenantAnalysisAgent`** hook - React hook for agent interaction
- **`CovenantAgentAnalysis`** component - UI for running and displaying analysis
- **`xanoIntegrationService`** - Service methods for agent API calls

The `CovenantAgentAnalysis` component is integrated into the `ContractDetailPage` and provides:

- One-click covenant analysis
- Real-time loading states
- Risk level visualization
- AI-generated recommendations

### Agent Response Format

```typescript
interface AgentAnalysisResult {
  analysis: string;                    // AI-generated analysis text
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_status: string;           // Overall compliance summary
  recommendations: string[];           // Action items
  covenants_analyzed: number;          // Count of covenants processed
}
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 Error on endpoints | Publish API endpoints in Xano |
| Agent not responding | Ensure tools are published (not DRAFT) |
| No covenant data | Seed demo data in Xano database |
| CORS errors | Configure CORS in Xano API settings |

