# React Frontend Setup - Covenant Guardian
## Complete Project Implementation with Xano Integration

---

## 📦 Part 1: Project Setup & Dependencies

### Step 1.1: Create React Project

```bash
# Create new React app with TypeScript
npx create-react-app covenant-guardian --template typescript

cd covenant-guardian

# Install required dependencies
npm install \
  react-router-dom \
  axios \
  zustand \
  recharts \
  date-fns \
  clsx \
  lucide-react \
  tailwindcss \
  postcss \
  autoprefixer

# Install dev dependencies
npm install -D \
  @types/react-router-dom \
  tailwindcss \
  postcss \
  autoprefixer

# Initialize Tailwind CSS
npx tailwindcss init -p
```

---

### Step 1.2: Tailwind Configuration

**tailwind.config.js:**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#208082',
        secondary: '#32b8c6',
        accent: '#e67f61',
        danger: '#c0152f',
        warning: '#a84b2f',
        success: '#208082',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Berkeley Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

---

### Step 1.3: Environment Configuration

**.env:**

```
REACT_APP_API_BASE_URL=https://[your-xano-workspace].xano.io/api
REACT_APP_XANO_API_KEY=[your-xano-api-key]
REACT_APP_ENV=development
```

**.env.production:**

```
REACT_APP_API_BASE_URL=https://[your-xano-workspace].xano.io/api
REACT_APP_XANO_API_KEY=[your-xano-api-key]
REACT_APP_ENV=production
```

---

### Step 1.4: Directory Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MainLayout.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── DashboardOverview.tsx
│   │   ├── PortfolioSummary.tsx
│   │   ├── AlertsInbox.tsx
│   │   ├── RiskMetrics.tsx
│   │   └── CovenantBreakdown.tsx
│   ├── contracts/
│   │   ├── ContractsList.tsx
│   │   ├── ContractDetail.tsx
│   │   ├── ContractUpload.tsx
│   │   └── ContractCard.tsx
│   ├── covenants/
│   │   ├── CovenantHealthCard.tsx
│   │   ├── CovenantMonitor.tsx
│   │   └── CovenantTrendChart.tsx
│   ├── alerts/
│   │   ├── AlertsInbox.tsx
│   │   ├── AlertDetail.tsx
│   │   └── AlertActions.tsx
│   ├── borrowers/
│   │   ├── BorrowerProfile.tsx
│   │   ├── FinancialMetrics.tsx
│   │   └── NewsTimeline.tsx
│   ├── reports/
│   │   ├── ReportGenerator.tsx
│   │   └── ReportView.tsx
│   └── common/
│       ├── Loading.tsx
│       ├── ErrorBoundary.tsx
│       ├── Badge.tsx
│       ├── StatusBadge.tsx
│       ├── Modal.tsx
│       └── ConfirmDialog.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── DashboardPage.tsx
│   ├── ContractsPage.tsx
│   ├── ContractDetailPage.tsx
│   ├── BorrowerPage.tsx
│   ├── AlertsPage.tsx
│   └── ReportsPage.tsx
├── hooks/
│   ├── useContracts.ts
│   ├── useCovenants.ts
│   ├── useAlerts.ts
│   ├── useBorrowers.ts
│   ├── useAuth.ts
│   └── useFetch.ts
├── store/
│   ├── authStore.ts
│   ├── contractStore.ts
│   ├── alertStore.ts
│   ├── uiStore.ts
│   └── index.ts
├── services/
│   ├── api.ts
│   ├── contractService.ts
│   ├── covenantService.ts
│   ├── alertService.ts
│   └── reportService.ts
├── types/
│   ├── index.ts
│   ├── contract.ts
│   ├── covenant.ts
│   ├── alert.ts
│   └── borrower.ts
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   ├── calculations.ts
│   └── constants.ts
├── styles/
│   └── globals.css
├── App.tsx
├── App.css
└── index.tsx
```

---

## 🔌 Part 2: API Service Layer

### Step 2.1: Create API Service (services/api.ts)

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://app.xano.com/api';

interface ApiErrorResponse {
  success: false;
  error: string;
  http_status?: number;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: Add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - clear and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== CONTRACTS =====
  async getContracts(bankId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await this.client.get('/contracts', {
      params: { bank_id: bankId, ...params },
    });
    return response.data;
  }

  async getContract(contractId: string) {
    const response = await this.client.get(`/contracts/${contractId}`);
    return response.data;
  }

  async createContract(data: {
    bank_id: string;
    borrower_id: string;
    contract_name: string;
    contract_number: string;
    principal_amount: number;
    currency: string;
    origination_date: string;
    maturity_date: string;
    interest_rate: number;
    raw_document_text?: string;
  }) {
    const response = await this.client.post('/contracts/create', data);
    return response.data;
  }

  // ===== COVENANTS =====
  async getCovenantHealth(covenantId: string) {
    const response = await this.client.get(`/covenants/${covenantId}/health`);
    return response.data;
  }

  async getExtractionStatus(contractId: string) {
    const response = await this.client.get(`/contracts/${contractId}/covenants/extraction-status`);
    return response.data;
  }

  async updateCovenant(covenantId: string, data: any) {
    const response = await this.client.post(`/covenants/${covenantId}/update`, data);
    return response.data;
  }

  // ===== ALERTS =====
  async getAlerts(bankId: string, params?: {
    status?: string;
    severity?: string;
    limit?: number;
  }) {
    const response = await this.client.get('/alerts', {
      params: { bank_id: bankId, ...params },
    });
    return response.data;
  }

  async acknowledgeAlert(alertId: string, data: {
    user_id: string;
    resolution_notes?: string;
  }) {
    const response = await this.client.post(`/alerts/${alertId}/acknowledge`, data);
    return response.data;
  }

  // ===== DASHBOARD =====
  async getPortfolioSummary(bankId: string) {
    const response = await this.client.get('/dashboard/portfolio-summary', {
      params: { bank_id: bankId },
    });
    return response.data;
  }

  // ===== BORROWERS =====
  async getBorrower(borrowerId: string) {
    const response = await this.client.get(`/borrowers/${borrowerId}`);
    return response.data;
  }

  async getFinancials(borrowerId: string, params?: {
    period_type?: string;
    limit?: number;
  }) {
    const response = await this.client.get(`/borrowers/${borrowerId}/financials`, {
      params,
    });
    return response.data;
  }

  async getAdverseEvents(borrowerId: string) {
    const response = await this.client.get(`/borrowers/${borrowerId}/events`);
    return response.data;
  }

  // ===== REPORTS =====
  async generateReport(type: string, params?: any) {
    const response = await this.client.get(`/reports/${type}`, { params });
    return response.data;
  }

  // ===== ERROR HANDLING =====
  handleError(error: any): ApiErrorResponse {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        http_status: error.response?.status,
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

export default new ApiService();
```

---

### Step 2.2: Type Definitions (types/index.ts)

```typescript
// ===== BANK =====
export interface Bank {
  id: string;
  name: string;
  country: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
}

// ===== CONTRACT =====
export interface Contract {
  id: string;
  bank_id: string;
  borrower_id: string;
  contract_name: string;
  contract_number: string;
  principal_amount: number;
  currency: string;
  origination_date: string;
  maturity_date: string;
  interest_rate: number;
  status: 'active' | 'closed' | 'default' | 'watch';
  covenant_count: number;
  breached_covenant_count: number;
  alert_count: number;
  created_at: string;
  updated_at: string;
}

// ===== COVENANT =====
export interface Covenant {
  id: string;
  contract_id: string;
  covenant_name: string;
  covenant_type: 'financial' | 'operational' | 'reporting' | 'other';
  metric_name: string;
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  threshold_value: number;
  threshold_unit: string;
  check_frequency: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  next_check_date: string;
  covenant_clause: string;
  gemini_extracted: boolean;
  health?: CovenantHealth;
}

export interface CovenantHealth {
  id: string;
  covenant_id: string;
  status: 'compliant' | 'warning' | 'breached';
  last_reported_value: number;
  last_reported_date: string;
  threshold_value: number;
  buffer_percentage: number;
  days_to_breach: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  gemini_risk_assessment: string;
  recommended_action: string;
  last_calculated: string;
}

// ===== ALERT =====
export interface Alert {
  id: string;
  covenant_id: string;
  contract_id: string;
  alert_type: 'warning' | 'critical' | 'breach' | 'reporting_due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'escalated';
  triggered_at: string;
  acknowledged_at?: string;
  contract_name?: string;
  borrower_name?: string;
  covenant_name?: string;
}

// ===== BORROWER =====
export interface Borrower {
  id: string;
  bank_id: string;
  legal_name: string;
  ticker_symbol?: string;
  industry: string;
  country: string;
  credit_rating?: string;
  website?: string;
  contracts?: Contract[];
  latest_financials?: FinancialMetrics;
  recent_news?: AdverseEvent[];
}

// ===== FINANCIAL METRICS =====
export interface FinancialMetrics {
  id: string;
  borrower_id: string;
  period_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  source: string;
  debt_total: number;
  ebitda: number;
  revenue: number;
  net_income: number;
  debt_to_ebitda: number;
  current_ratio: number;
  interest_coverage: number;
  roe: number;
  roa: number;
  data_confidence: number;
}

// ===== ADVERSE EVENT =====
export interface AdverseEvent {
  id: string;
  borrower_id: string;
  event_type: 'news' | 'regulatory' | 'credit_rating_downgrade' | 'executive_change' | 'litigation' | 'other';
  headline: string;
  description?: string;
  source_url?: string;
  risk_score: number;
  event_date: string;
}

// ===== DASHBOARD =====
export interface DashboardSummary {
  total_contracts: number;
  total_principal_usd: number;
  contracts_at_risk: number;
  open_alerts: number;
  critical_alerts: number;
  covenant_breakdown: {
    compliant: number;
    warning: number;
    breached: number;
  };
}

// ===== PAGINATION =====
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

---

## 🏪 Part 3: Zustand Store (State Management)

### Step 3.1: Auth Store (store/authStore.ts)

```typescript
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  bank_id: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoggedIn: false,

  setUser: (user) => set({ user, isLoggedIn: true }),
  setToken: (token) => {
    localStorage.setItem('auth_token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isLoggedIn: false });
  },
  hydrate: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ token, isLoggedIn: true });
    }
  },
}));
```

---

### Step 3.2: Contract Store (store/contractStore.ts)

```typescript
import { create } from 'zustand';
import { Contract } from '../types';

interface ContractStore {
  contracts: Contract[];
  selectedContract: Contract | null;
  loading: boolean;
  error: string | null;
  
  setContracts: (contracts: Contract[]) => void;
  setSelectedContract: (contract: Contract | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addContract: (contract: Contract) => void;
  updateContract: (id: string, contract: Partial<Contract>) => void;
  removeContract: (id: string) => void;
  filterByStatus: (status: string) => Contract[];
  filterByRisk: () => Contract[];
}

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  selectedContract: null,
  loading: false,
  error: null,

  setContracts: (contracts) => set({ contracts }),
  setSelectedContract: (contract) => set({ selectedContract: contract }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addContract: (contract) =>
    set((state) => ({ contracts: [contract, ...state.contracts] })),

  updateContract: (id, updates) =>
    set((state) => ({
      contracts: state.contracts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeContract: (id) =>
    set((state) => ({
      contracts: state.contracts.filter((c) => c.id !== id),
    })),

  filterByStatus: (status) =>
    get().contracts.filter((c) => c.status === status),

  filterByRisk: () =>
    get().contracts.filter((c) => c.breached_covenant_count > 0 || c.alert_count > 0),
}));
```

---

### Step 3.3: Alert Store (store/alertStore.ts)

```typescript
import { create } from 'zustand';
import { Alert } from '../types';

interface AlertStore {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  
  setAlerts: (alerts: Alert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, alert: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  filterByStatus: (status: string) => Alert[];
  filterBySeverity: (severity: string) => Alert[];
  countBySeverity: () => Record<string, number>;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,

  setAlerts: (alerts) => set({ alerts }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),

  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  filterByStatus: (status) =>
    get().alerts.filter((a) => a.status === status),

  filterBySeverity: (severity) =>
    get().alerts.filter((a) => a.severity === severity),

  countBySeverity: () => {
    const alerts = get().alerts;
    return {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length,
    };
  },
}));
```

---

## 🎨 Part 4: Layout Components

### Step 4.1: Header Component (components/layout/Header.tsx)

```typescript
import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const alerts = useAlertStore((state) =>
    state.alerts.filter((a) => a.status === 'new')
  );

  const criticalCount = alerts.filter(
    (a) => a.severity === 'critical'
  ).length;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary"></div>
          <h1 className="text-xl font-bold text-gray-900">
            Covenant Guardian
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Alerts Bell */}
          <button className="relative rounded-lg p-2 hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            {criticalCount > 0 && (
              <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                {criticalCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

---

### Step 4.2: Sidebar Component (components/layout/Sidebar.tsx)

```typescript
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  BarChart3,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/contracts', label: 'Contracts', icon: FileText },
    { path: '/alerts', label: 'Alerts', icon: AlertCircle },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white overflow-y-auto">
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
```

---

### Step 4.3: Main Layout (components/layout/MainLayout.tsx)

```typescript
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex gap-0">
        <Sidebar />
        <main className="ml-64 flex-1 pt-4">
          <div className="mx-auto max-w-7xl px-6 py-4">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
```

---

## 📊 Part 5: Dashboard Components

### Step 5.1: Dashboard Overview (components/dashboard/DashboardOverview.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { DashboardSummary, Alert } from '../../types';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import Loading from '../common/Loading';
import PortfolioSummary from './PortfolioSummary';
import AlertsInbox from './AlertsInbox';
import RiskMetrics from './RiskMetrics';

const DashboardOverview: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { setAlerts } = useAlertStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setLocalAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.bank_id) return;

      try {
        setLoading(true);
        const [summaryRes, alertsRes] = await Promise.all([
          api.getPortfolioSummary(user.bank_id),
          api.getAlerts(user.bank_id, {
            status: 'new,acknowledged',
            limit: 10,
          }),
        ]);

        setSummary(summaryRes.summary);
        setLocalAlerts(alertsRes.alerts);
        setAlerts(alertsRes.alerts);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.bank_id, setAlerts]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.email}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Contracts"
          value={summary?.total_contracts || 0}
          icon="📋"
        />
        <SummaryCard
          label="Total Principal"
          value={`$${((summary?.total_principal_usd || 0) / 1e9).toFixed(1)}B`}
          icon="💰"
        />
        <SummaryCard
          label="At Risk"
          value={summary?.contracts_at_risk || 0}
          highlight={true}
          icon="⚠️"
        />
        <SummaryCard
          label="Critical Alerts"
          value={summary?.critical_alerts || 0}
          highlight={summary?.critical_alerts ? true : false}
          icon="🚨"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PortfolioSummary data={summary} />
          <RiskMetrics data={summary} />
        </div>
        <AlertsInbox alerts={alerts} />
      </div>
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  highlight,
  icon,
}) => (
  <div
    className={`rounded-lg p-6 ${
      highlight
        ? 'border-l-4 border-danger bg-red-50'
        : 'border border-gray-200 bg-white'
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p
          className={`mt-2 text-2xl font-bold ${
            highlight ? 'text-danger' : 'text-gray-900'
          }`}
        >
          {value}
        </p>
      </div>
      {icon && <span className="text-3xl">{icon}</span>}
    </div>
  </div>
);

export default DashboardOverview;
```

---

### Step 5.2: Alerts Inbox (components/dashboard/AlertsInbox.tsx)

```typescript
import React, { useState } from 'react';
import { Alert } from '../../types';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface AlertsInboxProps {
  alerts: Alert[];
}

const AlertsInbox: React.FC<AlertsInboxProps> = ({ alerts: initialAlerts }) => {
  const user = useAuthStore((state) => state.user);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const handleAcknowledge = async (alertId: string) => {
    if (!user?.id) return;

    try {
      setAcknowledging(alertId);
      await api.acknowledgeAlert(alertId, {
        user_id: user.id,
        resolution_notes: 'Acknowledged by analyst',
      });
      setAlerts(
        alerts.map((a) =>
          a.id === alertId ? { ...a, status: 'acknowledged' } : a
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert', error);
    } finally {
      setAcknowledging(null);
    }
  };

  const severityConfig = {
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-l-4 border-red-500',
    },
    high: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-l-4 border-orange-500',
    },
    medium: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-l-4 border-yellow-500',
    },
    low: {
      icon: AlertCircle,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-l-4 border-blue-500',
    },
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Alerts</h2>

      {alerts.length === 0 ? (
        <p className="text-center text-gray-500">No alerts at this time</p>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => {
            const config =
              severityConfig[alert.severity as keyof typeof severityConfig];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`rounded p-4 ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${config.textColor} mt-0.5`} />
                    <div>
                      <p className={`font-semibold ${config.textColor}`}>
                        {alert.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {alert.contract_name} • {alert.borrower_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(alert.triggered_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {alert.status === 'new' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledging === alert.id}
                      className="rounded bg-white px-3 py-1 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                      {acknowledging === alert.id ? '...' : 'Ack'}
                    </button>
                  )}
                  {alert.status === 'acknowledged' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {alerts.length > 5 && (
        <button className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
          View All Alerts
        </button>
      )}
    </div>
  );
};

export default AlertsInbox;
```

---

## 🎯 Part 6: Custom Hooks

### Step 6.1: useContracts Hook (hooks/useContracts.ts)

```typescript
import { useEffect, useState } from 'react';
import { Contract } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useContractStore } from '../store/contractStore';

interface UseContractsOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export const useContracts = (options?: UseContractsOptions) => {
  const user = useAuthStore((state) => state.user);
  const { contracts, loading, error, setContracts, setLoading, setError } =
    useContractStore();
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const fetchContracts = async () => {
    if (!user?.bank_id) return;

    try {
      setLoading(true);
      const response = await api.getContracts(user.bank_id, options);
      setContracts(response.contracts);
      setTotal(response.pagination.total);
      setPages(response.pagination.pages);
    } catch (err) {
      setError('Failed to fetch contracts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user?.bank_id, options?.page]);

  return { contracts, loading, error, total, pages, refetch: fetchContracts };
};
```

---

### Step 6.2: useAlerts Hook (hooks/useAlerts.ts)

```typescript
import { useEffect } from 'react';
import { Alert } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';

interface UseAlertsOptions {
  status?: string;
  severity?: string;
  limit?: number;
}

export const useAlerts = (options?: UseAlertsOptions) => {
  const user = useAuthStore((state) => state.user);
  const { alerts, loading, error, setAlerts, setLoading, setError } =
    useAlertStore();

  const fetchAlerts = async () => {
    if (!user?.bank_id) return;

    try {
      setLoading(true);
      const response = await api.getAlerts(user.bank_id, options);
      setAlerts(response.alerts);
    } catch (err) {
      setError('Failed to fetch alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user?.bank_id]);

  return { alerts, loading, error, refetch: fetchAlerts };
};
```

---

## 📱 Part 7: Common Components

### Step 7.1: Loading Component (components/common/Loading.tsx)

```typescript
import React from 'react';

const Loading: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="space-y-4 text-center">
      <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

export default Loading;
```

---

### Step 7.2: Status Badge (components/common/StatusBadge.tsx)

```typescript
import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: 'active' | 'closed' | 'default' | 'watch' | 'compliant' | 'warning' | 'breached';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const statusConfig = {
    active: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    default: 'bg-red-100 text-red-800',
    watch: 'bg-yellow-100 text-yellow-800',
    compliant: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    breached: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={clsx(
        'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize',
        statusConfig[status],
        className
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
```

---

## 🚀 Part 8: App.tsx & Router Setup

### Step 8.1: App Component (src/App.tsx)

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import DashboardPage from './pages/DashboardPage';
import ContractsPage from './pages/ContractsPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import HomePage from './pages/HomePage';

// Layout
import MainLayout from './components/layout/MainLayout';

function App() {
  const { isLoggedIn, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <Router>
      {isLoggedIn ? (
        <MainLayout>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
```

---

## 📋 Part 9: Development & Production Scripts

### Step 9.1: package.json Scripts

```json
{
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "generate-types": "openapi-typescript [xano-openapi-url] -o src/types/generated.ts"
  }
}
```

---

## ✅ Part 10: Deployment Checklist

### Build for Production

```bash
# Build the project
npm run build

# Test the build locally
npx serve -s build

# Deploy to Vercel/Netlify
vercel deploy --prod
```

### Environment Variables (Production)

```
REACT_APP_API_BASE_URL=https://[xano-workspace].xano.io/api
REACT_APP_ENV=production
```

---

## 🎯 Component Checklist

| Component | Status | Props |
|-----------|--------|-------|
| **Header** | ✅ | alerts count, user info |
| **Sidebar** | ✅ | navigation items |
| **MainLayout** | ✅ | children |
| **DashboardOverview** | ✅ | auto-fetch from API |
| **AlertsInbox** | ✅ | alerts array |
| **ContractsList** | ⏳ | Build like DashboardOverview |
| **CovenantHealthCard** | ⏳ | covenant, health data |
| **StatusBadge** | ✅ | status, className |
| **Loading** | ✅ | generic spinner |

---

## 🔄 Next Steps

1. **Build remaining pages** using DashboardOverview as template
2. **Add authentication** (login form, JWT handling)
3. **Implement error boundaries** (graceful error handling)
4. **Add unit tests** (Jest + React Testing Library)
5. **Performance optimization** (lazy loading, code splitting)
6. **E2E testing** (Cypress or Playwright)
7. **Deploy to production** (Vercel/Netlify)

**Ready to test the complete system!** 🚀

