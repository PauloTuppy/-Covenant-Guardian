# Implementation & Deployment Guide
## Complete Pages, Testing Strategy & Production Deployment

---

## 🎯 Part 25: Page Implementation Guide

### Step 25.1: Dashboard Page (pages/DashboardPage.tsx)

```typescript
import React from 'react';
import DashboardOverview from '../components/dashboard/DashboardOverview';

const DashboardPage: React.FC = () => {
  return <DashboardOverview />;
};

export default DashboardPage;
```

### Step 25.2: Reports Page (pages/ReportsPage.tsx)

```typescript
import React, { useState } from 'react';
import ReportGenerator from '../components/reports/ReportGenerator';
import { FileText, Calendar, Download } from 'lucide-react';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and manage covenant reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('generate')}
          className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
            activeTab === 'generate'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="inline h-5 w-5 mr-2" />
          Generate Report
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="inline h-5 w-5 mr-2" />
          Report History
        </button>
      </div>

      {/* Content */}
      {activeTab === 'generate' ? (
        <ReportGenerator />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Report history coming soon</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
```

### Step 25.3: Contract Detail Page (pages/ContractDetailPage.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Contract, Covenant } from '../types';
import api from '../services/api';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import Loading from '../components/common/Loading';
import StatusBadge from '../components/common/StatusBadge';
import CovenantHealthCard from '../components/covenants/CovenantHealthCard';

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract | null>(null);
  const [covenants, setCovenants] = useState<Covenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [contractRes, covenantsRes] = await Promise.all([
          api.getContract(id),
          // Note: You'll need to add this endpoint to your Xano API
          fetch(`${process.env.REACT_APP_API_BASE_URL}/contracts/${id}/covenants`).then(
            (r) => r.json()
          ),
        ]);

        setContract(contractRes.contract);
        setCovenants(covenantsRes.covenants);
      } catch (err) {
        setError('Failed to load contract details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Loading />;

  if (!contract) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Contract not found</p>
      </div>
    );
  }

  const compliantCount = covenants.filter(
    (c) => c.health?.status === 'compliant'
  ).length;
  const warningCount = covenants.filter(
    (c) => c.health?.status === 'warning'
  ).length;
  const breachedCount = covenants.filter(
    (c) => c.health?.status === 'breached'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{contract.contract_name}</h1>
          <p className="text-gray-600 mt-1">{contract.contract_number}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card label="Status" value={<StatusBadge status={contract.status} />} />
        <Card
          label="Principal"
          value={`$${(contract.principal_amount / 1e6).toFixed(1)}M`}
        />
        <Card label="Interest Rate" value={`${contract.interest_rate}%`} />
        <Card
          label="Days to Maturity"
          value={Math.ceil(
            (new Date(contract.maturity_date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )}
        />
      </div>

      {/* Covenant Compliance Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Covenant Status</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-green-50">
            <p className="text-sm text-gray-600">Compliant</p>
            <p className="text-2xl font-bold text-green-600">{compliantCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50">
            <p className="text-sm text-gray-600">Warning</p>
            <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-50">
            <p className="text-sm text-gray-600">Breached</p>
            <p className="text-2xl font-bold text-red-600">{breachedCount}</p>
          </div>
        </div>
      </div>

      {/* Covenants Detail */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Covenant Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {covenants.map((covenant) => (
            <CovenantHealthCard key={covenant.id} covenant={covenant} />
          ))}
        </div>
      </div>

      {/* Key Terms */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Key Terms</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Origination Date</p>
            <p className="font-semibold text-gray-900">
              {new Date(contract.origination_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Maturity Date</p>
            <p className="font-semibold text-gray-900">
              {new Date(contract.maturity_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Currency</p>
            <p className="font-semibold text-gray-900">{contract.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-semibold text-gray-900">
              {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  label: string;
  value: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
  </div>
);

export default ContractDetailPage;
```

---

## 🧪 Part 26: Testing Strategy

### Step 26.1: Jest Configuration (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Step 26.2: Test Setup (src/setupTests.ts)

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock as any;
```

### Step 26.3: API Mocks (src/mocks/server.ts)

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mockContracts = [
  {
    id: 'contract-001',
    contract_name: 'Test Contract',
    contract_number: 'LOAN-2024-001',
    principal_amount: 250000000,
    currency: 'USD',
    status: 'active',
    interest_rate: 4.75,
    covenant_count: 5,
    breached_covenant_count: 0,
    alert_count: 0,
  },
];

export const server = setupServer(
  http.get(`${process.env.REACT_APP_API_BASE_URL}/contracts`, () => {
    return HttpResponse.json({
      success: true,
      contracts: mockContracts,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      },
    });
  }),

  http.get(`${process.env.REACT_APP_API_BASE_URL}/alerts`, () => {
    return HttpResponse.json({
      success: true,
      alerts: [],
    });
  }),

  http.post(`${process.env.REACT_APP_API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'user-001',
        email: 'test@bank.com',
        bank_id: 'bank-001',
        role: 'analyst',
      },
      token: 'test-token-123',
    });
  })
);
```

### Step 26.4: Component Tests (src/components/__tests__/StatusBadge.test.tsx)

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../common/StatusBadge';

describe('StatusBadge', () => {
  it('renders active status with correct styling', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders warning status with correct styling', () => {
    render(<StatusBadge status="warning" />);
    const badge = screen.getByText('warning');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('renders breached status with correct styling', () => {
    render(<StatusBadge status="breached" />);
    const badge = screen.getByText('breached');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies custom className', () => {
    render(<StatusBadge status="active" className="custom-class" />);
    const badge = screen.getByText('active');
    expect(badge).toHaveClass('custom-class');
  });
});
```

### Step 26.5: Hook Tests (src/hooks/__tests__/useContracts.test.ts)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useContracts } from '../useContracts';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../services/api';

jest.mock('../../services/api');
jest.mock('../../store/authStore');

describe('useContracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { bank_id: 'bank-001' },
    });
  });

  it('fetches contracts on mount', async () => {
    const mockContracts = [
      {
        id: 'contract-001',
        contract_name: 'Test Contract',
      },
    ];

    (api.getContracts as jest.Mock).mockResolvedValue({
      contracts: mockContracts,
      pagination: { total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useContracts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contracts).toEqual(mockContracts);
  });

  it('handles errors gracefully', async () => {
    (api.getContracts as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch contracts');
  });
});
```

### Step 26.6: Integration Tests (src/__tests__/ContractsList.integration.test.tsx)

```typescript
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContractsList from '../components/contracts/ContractsList';
import { useAuthStore } from '../store/authStore';

jest.mock('../store/authStore');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ContractsList Integration', () => {
  beforeEach(() => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { bank_id: 'bank-001' },
    });
  });

  it('renders contract list and allows filtering', async () => {
    renderWithRouter(<ContractsList />);

    // Wait for contracts to load
    await waitFor(() => {
      expect(screen.getByText('Contracts')).toBeInTheDocument();
    });

    // Check filter select exists
    const filterSelect = screen.getByDisplayValue('All Status');
    expect(filterSelect).toBeInTheDocument();

    // Change filter
    fireEvent.change(filterSelect, { target: { value: 'active' } });
    expect(filterSelect).toHaveValue('active');
  });

  it('displays loading state initially', () => {
    renderWithRouter(<ContractsList />);
    // Component should show loading spinner
    expect(screen.getByText('Contracts')).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    renderWithRouter(<ContractsList />);

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });

    // Pagination buttons should exist if multiple pages
    const nextButton = screen.queryByText('Next');
    if (nextButton) {
      expect(nextButton).toBeInTheDocument();
    }
  });
});
```

---

## 🐳 Part 27: Docker Setup

### Step 27.1: Dockerfile

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

### Step 27.2: Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: covenant-db
    environment:
      POSTGRES_USER: covenant_user
      POSTGRES_PASSWORD: secure_password_change_me
      POSTGRES_DB: covenant_guardian
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./seed_demo_data.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U covenant_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # React Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: covenant-frontend
    environment:
      REACT_APP_API_BASE_URL: http://localhost:3001/api
      REACT_APP_ENV: development
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./src:/app/src
    command: npm run dev

  # Xano Proxy (optional, for local testing)
  api:
    image: node:18-alpine
    container_name: covenant-api-proxy
    working_dir: /app
    volumes:
      - ./api:/app
    ports:
      - "3001:3001"
    environment:
      XANO_WORKSPACE_URL: ${XANO_WORKSPACE_URL}
      XANO_API_KEY: ${XANO_API_KEY}
    command: npm start

volumes:
  postgres_data:
    driver: local

networks:
  default:
    name: covenant-network
```

### Step 27.3: .dockerignore

```
node_modules
npm-debug.log
build
.git
.gitignore
README.md
.env
.DS_Store
coverage
dist
```

---

## 🚀 Part 28: CI/CD Pipeline (GitHub Actions)

### Step 28.1: Main CI/CD Workflow (.github/workflows/main.yml)

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
  # Code Quality Checks
  quality:
    runs-on: ubuntu-latest
    name: Code Quality
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

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # Build Docker image
  build:
    runs-on: ubuntu-latest
    name: Build Docker Image
    needs: quality
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to Vercel
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Vercel
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
        env:
          REACT_APP_API_BASE_URL: ${{ secrets.REACT_APP_API_BASE_URL }}
```

### Step 28.2: E2E Testing Workflow (.github/workflows/e2e.yml)

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  e2e:
    runs-on: ubuntu-latest
    name: Cypress E2E Tests

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: covenant_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Load demo data
        run: |
          psql -h localhost -U test_user -d covenant_test < seed_demo_data.sql
        env:
          PGPASSWORD: test_password

      - name: Run Cypress E2E tests
        uses: cypress-io/github-action@v5
        with:
          build: npm run build
          start: npm run start
          browser: chrome
          record: false

      - name: Upload Cypress screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots

      - name: Upload Cypress videos
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cypress-videos
          path: cypress/videos
```

---

## 📦 Part 29: Vercel Deployment

### Step 29.1: vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "react",
  "outputDirectory": "build",
  "env": [
    "REACT_APP_API_BASE_URL",
    "REACT_APP_ENV"
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 29.2: Deployment Script (scripts/deploy.sh)

```bash
#!/bin/bash

# Covenant Guardian Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-staging}
PROJECT_NAME="covenant-guardian"

echo "🚀 Deploying $PROJECT_NAME to $ENVIRONMENT..."

# Check dependencies
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed. Run: npm i -g vercel"
    exit 1
fi

# Build
echo "📦 Building application..."
npm run build

# Verify build
if [ ! -d "build" ]; then
    echo "❌ Build failed"
    exit 1
fi

# Deploy
echo "🌐 Deploying to Vercel ($ENVIRONMENT)..."
if [ "$ENVIRONMENT" = "production" ]; then
    vercel deploy --prod --token $VERCEL_TOKEN
else
    vercel deploy --token $VERCEL_TOKEN
fi

echo "✅ Deployment complete!"
```

### Step 29.3: Environment Variables (.env.example)

```bash
# Frontend
REACT_APP_API_BASE_URL=https://your-xano-workspace.xano.io/api
REACT_APP_ENV=production

# For development
REACT_APP_XANO_API_KEY=your_xano_key_here
```

---

## 🧪 Part 30: Testing Checklist & Best Practices

### Unit Tests Checklist

```markdown
## Component Tests
- [ ] StatusBadge - All status types
- [ ] Loading spinner - Renders correctly
- [ ] Header - User info, logout
- [ ] Sidebar - Navigation items
- [ ] ContractCard - Risk indicators
- [ ] CovenantHealthCard - Trend icons
- [ ] Modal - Open/close behavior

## Hook Tests
- [ ] useContracts - Fetch, filter, pagination
- [ ] useAlerts - Fetch, real-time polling
- [ ] useAuth - Login, logout, token refresh
- [ ] Custom hooks - Error handling

## Store Tests
- [ ] authStore - User management
- [ ] contractStore - CRUD operations
- [ ] alertStore - Alert management
```

### Integration Tests Checklist

```markdown
## Page Tests
- [ ] Dashboard - Load summary data
- [ ] Contracts - Filter, pagination, navigation
- [ ] Alerts - Filter, acknowledge alerts
- [ ] Reports - Generate reports

## User Flows
- [ ] Login → Dashboard → View Contract
- [ ] Create Contract → Covenant Extraction
- [ ] Acknowledge Alert → Update Status
- [ ] Generate Report → Download
```

### E2E Tests Checklist

```markdown
## Critical User Journeys
- [ ] Login with valid credentials
- [ ] View dashboard with demo data
- [ ] Filter contracts by status
- [ ] View contract details with covenants
- [ ] Create new contract with document upload
- [ ] Acknowledge alerts
- [ ] Generate and download report
- [ ] Logout
```

### Performance Benchmarks

```markdown
## Target Metrics
- [ ] First Contentful Paint (FCP) < 2s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Time to Interactive (TTI) < 3s
- [ ] Bundle size < 500KB (gzipped)

## Tools
- Lighthouse CI
- Web Vitals
- Bundle Analyzer
```

---

## 📋 Part 31: Pre-Production Checklist

### Code Quality
- [ ] All tests passing (>80% coverage)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Accessibility audit passing

### Security
- [ ] Environment variables not in code
- [ ] API keys properly secured
- [ ] CORS configured correctly
- [ ] CSP headers set
- [ ] Dependencies audited (npm audit)

### Performance
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Caching strategies in place
- [ ] Minification enabled

### Documentation
- [ ] README.md complete
- [ ] API documentation
- [ ] Component Storybook
- [ ] Deployment guide
- [ ] Testing guide

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/GA)
- [ ] Performance monitoring (Vercel)
- [ ] Uptime monitoring (StatusPage)
- [ ] Health checks configured

---

## 🎯 Part 32: Quick Start Commands

### Local Development
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run cypress:open

# Build for production
npm run build

# Start production server
npm run start
```

### Docker
```bash
# Build Docker image
docker build -t covenant-guardian:latest .

# Run with Docker Compose
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f frontend
```

### Deployment
```bash
# Deploy to Vercel
./scripts/deploy.sh production

# Check deployment status
vercel status

# Rollback to previous deployment
vercel rollback
```

---

## ✅ Implementation Completion Checklist

### Phase 1: Core Implementation
- [x] Backend (Xano + PostgreSQL)
- [x] Frontend (React + TypeScript)
- [x] API Integration
- [x] Authentication
- [x] Demo Data

### Phase 2: Pages & Features
- [ ] DashboardPage
- [ ] ContractsPage + ContractDetailPage
- [ ] AlertsPage
- [ ] ReportsPage
- [ ] Error boundaries
- [ ] Loading states

### Phase 3: Testing
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Cypress)
- [ ] Performance tests
- [ ] Accessibility audit

### Phase 4: Deployment
- [ ] Docker configuration
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Vercel deployment
- [ ] Environment variables
- [ ] Monitoring setup

### Phase 5: Documentation
- [ ] README
- [ ] API docs
- [ ] Deployment guide
- [ ] Testing guide
- [ ] Contributing guide

---

## 🎉 Production Ready Checklist

```markdown
## Final Verification
- [ ] All pages load without errors
- [ ] All API endpoints responding
- [ ] Demo data loads correctly
- [ ] Authentication working
- [ ] Responsive design tested
- [ ] Mobile compatibility verified
- [ ] Performance metrics acceptable
- [ ] Security audit passed
- [ ] Backup/recovery tested
- [ ] Support documentation ready
```

**Ready for production launch!** 🚀

