# Covenant Guardian - Complete Documentation

## Overview

Covenant Guardian is an AI-powered loan covenant monitoring and compliance system built for financial institutions. It provides real-time tracking of loan covenants, automated breach detection, and intelligent risk assessment using Xano backend and Gemini AI.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │Contracts │ │ Alerts   │ │ Reports  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │  API Layer  │                              │
│                    │ (apiService)│                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┼─────────────────────────────────────┐
│                     XANO BACKEND                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   REST API      │  │   AI Agent      │  │   Database      │ │
│  │ /api:WV7ozm8p   │  │ Covenant        │  │ PostgreSQL      │ │
│  │                 │  │ Analysis        │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           └────────────────────┴────────────────────┘           │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │   Gemini AI       │                        │
│                    │ (Free Credits)    │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State Management | Zustand |
| Backend | Xano (No-code backend) |
| Database | PostgreSQL (Xano managed) |
| AI | Google Gemini (via Xano Test Model) |
| Authentication | JWT (Xano Auth) |

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Xano account (free tier works)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd covenant-guardian

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Xano API URL

# Start development server
npm run dev
```

### Environment Variables

```env
# Xano Configuration
VITE_API_BASE_URL=https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p
VITE_XANO_WORKSPACE_ID=1
VITE_ENV=development

# Feature Flags
VITE_ENABLE_PBT=true
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_MULTI_TENANT=true
```

## API Endpoints

### Xano REST API

Base URL: `https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/contracts` | GET | List all contracts |
| `/contracts` | POST | Create new contract |
| `/contracts/{id}` | GET | Get contract by ID |
| `/contracts/{id}` | PATCH | Update contract |
| `/contracts/{id}` | DELETE | Delete contract |
| `/covenants` | GET | List all covenants |
| `/covenants/{id}` | PATCH | Update covenant |
| `/banks` | GET | List all banks |
| `/banks/{id}` | PATCH | Update bank |
| `/alerts` | GET | List alerts |
| `/covenant_health` | GET | Get covenant health metrics |
| `/portfolio_summary` | GET | Get portfolio summary |

### AI Agent Endpoints

| Endpoint | Description |
|----------|-------------|
| `/agent/covenant-analysis-agent/run` | Run AI covenant analysis |
| `/get_covenant_data?contract_id={id}` | Get covenant data for AI |

## Database Schema

### Tables

#### banks
```sql
CREATE TABLE banks (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  name VARCHAR(255),
  country VARCHAR(100),
  subscription_tier VARCHAR(50)
);
```

#### contracts
```sql
CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  bank_id INTEGER REFERENCES banks(id),
  borrower_id INTEGER,
  contract_name VARCHAR(255),
  principal_amount DECIMAL(15,2),
  interest_rate DECIMAL(5,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) -- 'active', 'watch', 'default', 'closed'
);
```

#### covenants
```sql
CREATE TABLE covenants (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  contract_id INTEGER REFERENCES contracts(id),
  bank_id INTEGER REFERENCES banks(id),
  covenant_name VARCHAR(255),
  operator VARCHAR(10), -- '<=', '>=', '<', '>', '='
  threshold_value DECIMAL(15,4),
  current_value DECIMAL(15,4),
  status VARCHAR(50) -- 'compliant', 'warning', 'breached'
);
```

## Current Demo Data

### Contracts (3)
| ID | Name | Status | Principal |
|----|------|--------|-----------|
| 1 | Term Loan Facility - Acme Corp | active | $5,000,000 |
| 2 | Revolving Credit - Tech Innovations | watch | $2,500,000 |
| 3 | Equipment Finance - Global Manufacturing | active | $8,000,000 |

### Covenants (9)
| Covenant | Status | Current | Threshold |
|----------|--------|---------|-----------|
| Debt/EBITDA Ratio | ✅ compliant | 2.8 | ≤ 3.5 |
| Current Ratio | 🔴 breached | 0.95 | ≥ 1.25 |
| Interest Coverage | ✅ compliant | 3.2 | ≥ 2.5 |
| Minimum EBITDA | ✅ compliant | $2.45M | ≥ $2M |
| Maximum Leverage | ⚠️ warning | 3.85 | ≤ 4.0 |
| Debt Service Coverage | ⚠️ warning | 1.05 | ≥ 1.2 |
| Quick Ratio | 🔴 breached | 0.85 | ≥ 1.0 |
| Fixed Charge Coverage | ✅ compliant | 2.1 | ≥ 1.5 |
| Net Worth Minimum | ✅ compliant | $15.5M | ≥ $10M |

### Banks (3)
| ID | Name | Country | Tier |
|----|------|---------|------|
| 1 | Global Finance Corp | United States | Premium |
| 2 | European Banking Group | Germany | Standard |
| 3 | Asia-Pacific Bank | Singapore | Premium |

## Project Structure

```
covenant-guardian/
├── src/
│   ├── components/
│   │   ├── alerts/          # Alert management UI
│   │   ├── auth/            # Authentication components
│   │   ├── borrowers/       # Borrower management
│   │   ├── common/          # Shared UI components
│   │   ├── contracts/       # Contract management
│   │   ├── covenants/       # Covenant monitoring
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── reports/         # Report generation
│   │   └── settings/        # User settings
│   ├── config/
│   │   ├── api.ts           # API configuration
│   │   └── env.ts           # Environment config
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/
│   │   ├── api.ts           # Core API service
│   │   ├── gemini.ts        # Gemini AI integration
│   │   ├── xanoIntegration.ts # Xano-specific logic
│   │   └── ...              # Domain services
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── scripts/                 # Setup & deployment scripts
├── .env                     # Environment variables
├── package.json
└── vite.config.ts
```

## Key Features

### 1. Dashboard
- Portfolio overview with key metrics
- Risk heatmap visualization
- Real-time covenant health status
- Critical alerts summary

### 2. Contract Management
- CRUD operations for loan contracts
- Document upload capability
- Contract status tracking (active/watch/default)
- Linked covenant monitoring

### 3. Covenant Monitoring
- Real-time compliance tracking
- Automated breach detection
- Warning thresholds (10% buffer)
- Trend analysis

### 4. AI-Powered Analysis
- Gemini AI integration via Xano
- Automated risk assessment
- Covenant extraction from documents
- Intelligent recommendations

### 5. Alert System
- Severity levels: Critical, High, Medium, Low
- Status tracking: New, Acknowledged, Resolved, Escalated
- Email notifications (configurable)
- In-app notifications

### 6. Reports
- Portfolio risk assessment
- Compliance summaries
- Breach analysis reports
- Export capabilities

## AI Agent Configuration

The Covenant Analysis Agent is configured in Xano with:

| Setting | Value |
|---------|-------|
| Model Host | Xano Test Model (Free Gemini Credits) |
| Temperature | 0.2 (deterministic) |
| Max Steps | 5 |
| Connected Tools | get_covenant_data |

### Using the AI Agent

```typescript
// Frontend call to AI agent
const response = await xanoIntegration.runCovenantAnalysisAgent(contractId);

// Response includes:
// - Compliance status for each covenant
// - Risk assessment
// - Recommended actions
// - Breach predictions
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Testing API Endpoints

```powershell
# Test contracts endpoint
Invoke-RestMethod -Uri "https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p/contracts" -Method GET

# Test covenants endpoint
Invoke-RestMethod -Uri "https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p/covenants" -Method GET

# Update a covenant
$body = @{covenant_name="Test"; status="compliant"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p/covenants/1" -Method PATCH -Headers @{"Content-Type"="application/json"} -Body $body
```

## Troubleshooting

### Common Issues

1. **API returns 404**
   - Check endpoint path matches Xano configuration
   - Verify API group ID in URL (`api:WV7ozm8p`)

2. **Empty data in dashboard**
   - Verify Xano database has seeded data
   - Check browser console for API errors
   - Ensure CORS is configured in Xano

3. **AI Agent not responding**
   - Verify agent is published (not DRAFT)
   - Check Xano Test Model is selected
   - Ensure tools are connected to agent

4. **"Cannot read properties of undefined"**
   - Components have defensive checks for undefined data
   - Check API response format matches expected structure

### Debug Mode

Enable verbose logging:
```typescript
// In browser console
localStorage.setItem('debug', 'true');
```

## Security

- JWT-based authentication
- Multi-tenant data isolation via `bank_id`
- Rate limiting on API requests
- Input validation on all forms
- XSS protection via React

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## License

Proprietary - All rights reserved.

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Maintainer:** Development Team
