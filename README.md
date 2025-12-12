# 🛡️ Covenant Guardian

> AI-Powered Loan Covenant Monitoring & Compliance System

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Xano](https://img.shields.io/badge/Backend-Xano-00D4AA)](https://xano.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google)](https://ai.google.dev/)

![Covenant Guardian Screenshot](https://via.placeholder.com/800x400/1f2937/ffffff?text=Covenant+Guardian)

## 🎯 Overview

Covenant Guardian automates loan covenant monitoring for financial institutions. It extracts covenant terms from contracts using AI, monitors compliance in real-time, and alerts users before breaches occur.

**Built for the LMA Edge Hackathon 2024**

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Extraction** | Gemini AI extracts covenant terms from PDF contracts |
| 📊 **Real-time Monitoring** | Live tracking of covenant compliance status |
| ⚠️ **Smart Alerts** | Automated warnings before covenant breaches |
| 📈 **Risk Analytics** | Portfolio-wide risk assessment and heatmaps |
| 🔒 **Multi-tenant** | Bank-grade data isolation and security |
| 📋 **Reports** | Automated compliance reports and exports |

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/covenant-guardian.git
cd covenant-guardian

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  React 18 + TypeScript + Vite + TailwindCSS             │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │Dashboard │Contracts │ Alerts   │ Reports  │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API
┌─────────────────────────┴───────────────────────────────┐
│                    XANO BACKEND                          │
│  ┌─────────────┬─────────────┬─────────────────────┐   │
│  │  REST API   │  AI Agent   │  PostgreSQL         │   │
│  │  Endpoints  │  (Gemini)   │  Database           │   │
│  └─────────────┴─────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 📡 API Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p` |
| Auth | JWT Bearer Token |
| Format | JSON |

### Key Endpoints

```
GET  /contracts          # List all contracts
POST /contracts          # Create contract
GET  /covenants          # List all covenants
GET  /covenant_health    # Covenant health metrics
GET  /alerts             # List alerts
GET  /portfolio_summary  # Portfolio overview
```

## 📊 Demo Data

The system comes pre-seeded with realistic demo data:

### Contracts
| Contract | Status | Principal |
|----------|--------|-----------|
| Term Loan Facility - Acme Corp | ✅ Active | $5,000,000 |
| Revolving Credit - Tech Innovations | ⚠️ Watch | $2,500,000 |
| Equipment Finance - Global Manufacturing | ✅ Active | $8,000,000 |

### Covenants
| Covenant | Status | Current | Threshold |
|----------|--------|---------|-----------|
| Debt/EBITDA Ratio | ✅ Compliant | 2.8 | ≤ 3.5 |
| Current Ratio | 🔴 Breached | 0.95 | ≥ 1.25 |
| Interest Coverage | ✅ Compliant | 3.2 | ≥ 2.5 |
| Maximum Leverage | ⚠️ Warning | 3.85 | ≤ 4.0 |
| Quick Ratio | 🔴 Breached | 0.85 | ≥ 1.0 |

## 🤖 AI Agent

The Covenant Analysis Agent uses Google Gemini (via Xano's free credits):

| Setting | Value |
|---------|-------|
| Model | Xano Test Model (Free Gemini) |
| Temperature | 0.2 (deterministic) |
| Max Steps | 5 |
| Tools | `get_covenant_data` |

**Capabilities:**
- Automated covenant compliance analysis
- Breach detection and risk scoring
- Intelligent recommendations
- Contract document extraction

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS |
| State | Zustand |
| Backend | Xano (No-code) |
| Database | PostgreSQL |
| AI | Google Gemini |

## 📁 Project Structure

```
covenant-guardian/
├── src/
│   ├── components/       # React components
│   │   ├── alerts/       # Alert management
│   │   ├── contracts/    # Contract CRUD
│   │   ├── covenants/    # Covenant monitoring
│   │   ├── dashboard/    # Dashboard widgets
│   │   └── common/       # Shared UI
│   ├── pages/            # Route pages
│   ├── services/         # API services
│   ├── hooks/            # Custom hooks
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript types
│   └── config/           # Configuration
├── scripts/              # Setup scripts
├── .env.example          # Environment template
└── package.json
```

## 🔧 Environment Variables

```env
# Xano API
VITE_API_BASE_URL=https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p
VITE_XANO_WORKSPACE_ID=1
VITE_ENV=development

# Features
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_MULTI_TENANT=true
```

## 📜 Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview build
npm run lint      # Run ESLint
npm run test      # Run tests
```

## 🔐 Security

- JWT-based authentication
- Multi-tenant data isolation via `bank_id`
- Rate limiting on API requests
- Input validation on all forms
- XSS protection via React

## 📖 Documentation

- **In-App Docs**: Click "Read Documentation" on the home page
- **Full Docs**: See [DOCUMENTATION.md](./DOCUMENTATION.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Setup**: See [API.md](./API.md)

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| API 404 errors | Check endpoint paths match Xano config |
| Empty dashboard | Verify Xano has seeded data |
| AI not working | Ensure agent is published (not DRAFT) |

## 👥 Team

Built with ❤️ for the LMA Edge Hackathon 2024

## 📄 License

Proprietary - All rights reserved.

---

**Version:** 1.0.0 | **Last Updated:** December 2024
