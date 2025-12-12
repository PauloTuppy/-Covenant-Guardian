# React Frontend - Advanced Components & Pages
## Contracts, Covenants, Authentication & Reports

---

## 🔐 Part 11: Authentication Components

### Step 11.1: Login Page (pages/HomePage.tsx)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call your Xano login endpoint
      // This is a placeholder - implement with your actual auth API
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      setUser({
        id: data.user.id,
        email: data.user.email,
        bank_id: data.user.bank_id,
        role: data.user.role,
      });
      setToken(data.token);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xl font-bold">CG</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Covenant Guardian
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Loan Covenant Monitoring Platform
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@bank.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center mb-3">Demo Credentials:</p>
            <div className="space-y-2 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><span className="font-semibold">Email:</span> analyst@covenant.com</p>
              <p><span className="font-semibold">Password:</span> demo123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
```

---

## 📋 Part 12: Contracts Components

### Step 12.1: Contracts List (components/contracts/ContractsList.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract } from '../../types';
import { useContracts } from '../../hooks/useContracts';
import { ChevronRight, Plus, Filter } from 'lucide-react';
import ContractCard from './ContractCard';
import Loading from '../common/Loading';
import StatusBadge from '../common/StatusBadge';

const ContractsList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const { contracts, loading, error, total, pages, refetch } = useContracts({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });

  const riskContracts = contracts.filter(
    (c) => c.breached_covenant_count > 0 || c.alert_count > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 mt-1">
            {total} total contracts • {riskContracts.length} at risk
          </p>
        </div>
        <button
          onClick={() => navigate('/contracts/new')}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Contract
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-5 w-5 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="watch">Watch</option>
          <option value="default">Default</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <Loading />
      ) : contracts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No contracts found</p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onClick={() => navigate(`/contracts/${contract.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContractsList;
```

---

### Step 12.2: Contract Card (components/contracts/ContractCard.tsx)

```typescript
import React from 'react';
import { Contract } from '../../types';
import StatusBadge from '../common/StatusBadge';
import { AlertCircle, TrendingDown, ChevronRight } from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onClick }) => {
  const hasRisk =
    contract.breached_covenant_count > 0 || contract.alert_count > 0;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-6 transition-all hover:shadow-lg ${
        hasRisk
          ? 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{contract.contract_name}</h3>
          <p className="text-xs text-gray-500 mt-1">{contract.contract_number}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      {/* Status */}
      <div className="mb-4">
        <StatusBadge status={contract.status} />
      </div>

      {/* Principal */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-600">Principal</p>
          <p className="font-semibold text-gray-900">
            ${(contract.principal_amount / 1e6).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-gray-600">Rate</p>
          <p className="font-semibold text-gray-900">{contract.interest_rate}%</p>
        </div>
      </div>

      {/* Covenants & Alerts */}
      <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-600">Covenants</p>
          <p className="font-semibold text-gray-900">{contract.covenant_count}</p>
        </div>
        <div className={hasRisk ? 'text-red-600' : ''}>
          <p className="text-gray-600">At Risk</p>
          <div className="flex items-center gap-1 mt-0.5">
            {contract.breached_covenant_count > 0 && (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <p className="font-semibold">
              {contract.breached_covenant_count + contract.alert_count}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractCard;
```

---

### Step 12.3: Contract Upload Form (components/contracts/ContractUpload.tsx)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

const ContractUpload: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    borrower_id: '',
    contract_name: '',
    contract_number: '',
    principal_amount: '',
    currency: 'USD',
    origination_date: '',
    maturity_date: '',
    interest_rate: '',
    raw_document_text: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractionJob, setExtractionJob] = useState<any>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!user?.bank_id) throw new Error('Bank ID not found');

      const response = await api.createContract({
        bank_id: user.bank_id,
        borrower_id: formData.borrower_id,
        contract_name: formData.contract_name,
        contract_number: formData.contract_number,
        principal_amount: parseFloat(formData.principal_amount),
        currency: formData.currency,
        origination_date: formData.origination_date,
        maturity_date: formData.maturity_date,
        interest_rate: parseFloat(formData.interest_rate),
        raw_document_text: formData.raw_document_text,
      });

      setSuccess(true);
      setExtractionJob(response.covenant_extraction_job);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/contracts/${response.contract.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-white p-8 text-center max-w-md mx-auto">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contract Created</h2>
        <p className="text-gray-600 mb-4">
          Your contract has been created successfully.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            📊 Covenant Extraction
          </p>
          <p className="text-sm text-blue-700">
            Job ID: {extractionJob.job_id}
          </p>
          <p className="text-sm text-blue-700">
            Status: {extractionJob.status}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Estimated processing time: {extractionJob.estimated_seconds}s
          </p>
        </div>
        <p className="text-gray-600 text-sm">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-lg bg-white p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Contract</h1>
        <p className="text-gray-600 mb-8">
          Upload a new loan contract for covenant monitoring
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Borrower ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Borrower ID *
            </label>
            <input
              type="text"
              name="borrower_id"
              value={formData.borrower_id}
              onChange={handleChange}
              placeholder="e.g., borrower-uuid"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Contract Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Name *
            </label>
            <input
              type="text"
              name="contract_name"
              value={formData.contract_name}
              onChange={handleChange}
              placeholder="e.g., Syndicated Loan - ABC Corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Contract Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Number *
            </label>
            <input
              type="text"
              name="contract_number"
              value={formData.contract_number}
              onChange={handleChange}
              placeholder="e.g., LOAN-2025-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Principal Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Principal Amount *
              </label>
              <input
                type="number"
                name="principal_amount"
                value={formData.principal_amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency *
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>JPY</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Origination Date *
              </label>
              <input
                type="date"
                name="origination_date"
                value={formData.origination_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maturity Date *
              </label>
              <input
                type="date"
                name="maturity_date"
                value={formData.maturity_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Rate (%) *
            </label>
            <input
              type="number"
              name="interest_rate"
              value={formData.interest_rate}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Document Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Text (for AI covenant extraction)
            </label>
            <textarea
              name="raw_document_text"
              value={formData.raw_document_text}
              onChange={handleChange}
              placeholder="Paste full contract text here. Gemini will extract covenants automatically..."
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-2">
              Optional: Paste contract text for automated covenant extraction
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/contracts')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractUpload;
```

---

## 🔗 Part 13: Covenant Health Components

### Step 13.1: Covenant Health Card (components/covenants/CovenantHealthCard.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { Covenant, CovenantHealth } from '../../types';
import api from '../../services/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import Loading from '../common/Loading';

interface CovenantHealthCardProps {
  covenant: Covenant;
}

const CovenantHealthCard: React.FC<CovenantHealthCardProps> = ({ covenant }) => {
  const [health, setHealth] = useState<CovenantHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.getCovenantHealth(covenant.id);
        setHealth(response.covenant_health);
      } catch (error) {
        console.error('Failed to fetch covenant health', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [covenant.id]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const isBreached = health.status === 'breached';
  const isWarning = health.status === 'warning';
  const isCompliant = health.status === 'compliant';

  const statusColor = isBreached
    ? 'text-red-600'
    : isWarning
    ? 'text-yellow-600'
    : 'text-green-600';

  const statusBgColor = isBreached
    ? 'bg-red-50'
    : isWarning
    ? 'bg-yellow-50'
    : 'bg-green-50';

  const statusIcon = isBreached ? (
    <AlertCircle className={`h-5 w-5 ${statusColor}`} />
  ) : isCompliant ? (
    <CheckCircle className={`h-5 w-5 ${statusColor}`} />
  ) : (
    <AlertCircle className={`h-5 w-5 ${statusColor}`} />
  );

  return (
    <div className={`rounded-lg border p-6 ${statusBgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{covenant.covenant_name}</h3>
          <p className="text-xs text-gray-600 mt-1">{covenant.metric_name}</p>
        </div>
        {statusIcon}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full capitalize ${
            isBreached
              ? 'bg-red-200 text-red-800'
              : isWarning
              ? 'bg-yellow-200 text-yellow-800'
              : 'bg-green-200 text-green-800'
          }`}
        >
          {health.status}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
        {/* Current Value vs Threshold */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">Current Value</p>
            <p className="font-semibold text-gray-900">
              {health.last_reported_value.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Threshold</p>
            <p className="font-semibold text-gray-900">
              {health.threshold_value.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Buffer & Days */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">Buffer</p>
            <p
              className={`font-semibold ${
                health.buffer_percentage < 10 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {health.buffer_percentage.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Days to Breach</p>
            <p
              className={`font-semibold ${
                health.days_to_breach < 30 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {health.days_to_breach}d
            </p>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 mb-4">
        {health.trend === 'improving' ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : health.trend === 'deteriorating' ? (
          <TrendingDown className="h-4 w-4 text-red-600" />
        ) : (
          <div className="h-1 w-1 rounded-full bg-gray-400" />
        )}
        <span className="text-xs font-medium text-gray-600 capitalize">
          {health.trend}
        </span>
      </div>

      {/* Gemini Assessment */}
      {health.gemini_risk_assessment && (
        <div className="bg-white/70 rounded p-3 mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            🤖 Risk Assessment
          </p>
          <p className="text-xs text-gray-600">{health.gemini_risk_assessment}</p>
        </div>
      )}

      {/* Recommended Action */}
      {health.recommended_action && (
        <div className="bg-white/70 rounded p-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            ✅ Recommended Action
          </p>
          <p className="text-xs text-gray-600">{health.recommended_action}</p>
        </div>
      )}

      {/* Last Calculated */}
      <p className="text-xs text-gray-500 mt-4">
        Last calculated: {new Date(health.last_calculated).toLocaleDateString()}
      </p>
    </div>
  );
};

export default CovenantHealthCard;
```

---

## 📊 Part 14: Reports & Utilities

### Step 14.1: Report Generator (components/reports/ReportGenerator.tsx)

```typescript
import React, { useState } from 'react';
import { FileDown, Calendar, Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

type ReportType = 'portfolio-summary' | 'covenant-monitoring' | 'risk-analysis';

const ReportGenerator: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [reportType, setReportType] = useState<ReportType>('portfolio-summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const reportOptions = [
    {
      id: 'portfolio-summary',
      name: 'Portfolio Summary',
      description: 'Overview of all contracts and covenants',
    },
    {
      id: 'covenant-monitoring',
      name: 'Covenant Monitoring',
      description: 'Detailed covenant health and compliance status',
    },
    {
      id: 'risk-analysis',
      name: 'Risk Analysis',
      description: 'Risk scoring and trend analysis',
    },
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.bank_id) return;

    setGenerating(true);

    try {
      const response = await api.generateReport(reportType, {
        bank_id: user.bank_id,
        start_date: startDate,
        end_date: endDate,
      });

      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Auto download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('Failed to generate report', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-lg bg-white p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Report</h1>
        <p className="text-gray-600 mb-8">
          Create custom reports on portfolio and covenant monitoring
        </p>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <div className="space-y-2">
              {reportOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="report-type"
                    value={option.id}
                    checked={reportType === option.id}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="mt-1"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{option.name}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportGenerator;
```

---

### Step 14.2: Format & Calculation Utilities (utils/formatters.ts)

```typescript
// Currency Formatting
export const formatCurrency = (value: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

// Percentage Formatting
export const formatPercent = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// Date Formatting
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

// Large Number Formatting
export const formatNumber = (value: number, decimals = 1): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
};

// Status Color Mapping
export const getStatusColor = (
  status: string
): { bg: string; text: string; border: string } => {
  const colors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
    },
    breached: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
    },
    compliant: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    },
  };

  return colors[status] || colors.active;
};
```

---

### Step 14.3: Calculation Utilities (utils/calculations.ts)

```typescript
import { Contract, CovenantHealth } from '../types';

// Calculate portfolio risk score
export const calculatePortfolioRisk = (contracts: Contract[]): number => {
  if (contracts.length === 0) return 0;

  const breachedCount = contracts.filter(
    (c) => c.breached_covenant_count > 0
  ).length;
  const warningCount = contracts.filter(
    (c) => c.alert_count > 0 && c.breached_covenant_count === 0
  ).length;

  const breachedWeight = 100;
  const warningWeight = 30;

  const riskScore =
    (breachedCount * breachedWeight + warningCount * warningWeight) /
    contracts.length;

  return Math.min(100, riskScore);
};

// Classify risk level
export const classifyRiskLevel = (
  riskScore: number
): 'low' | 'medium' | 'high' | 'critical' => {
  if (riskScore >= 75) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
};

// Calculate days to breach
export const calculateDaysToBreachFromTrend = (
  currentValue: number,
  threshold: number,
  trend: 'improving' | 'stable' | 'deteriorating',
  bufferDays: number = 30
): number => {
  const buffer = Math.abs(currentValue - threshold);

  if (trend === 'improving') {
    return bufferDays * 2;
  } else if (trend === 'deteriorating') {
    const estimatedDaysToBreachPerMonth = 5;
    return Math.max(0, Math.floor(buffer / (buffer / 30)));
  }

  return bufferDays;
};

// Calculate covenant compliance percentage
export const calculateCompliancePercent = (
  covenants: any[]
): Record<string, number> => {
  if (covenants.length === 0) {
    return { compliant: 0, warning: 0, breached: 0 };
  }

  const compliant = covenants.filter(
    (c) => c.health?.status === 'compliant'
  ).length;
  const warning = covenants.filter(
    (c) => c.health?.status === 'warning'
  ).length;
  const breached = covenants.filter(
    (c) => c.health?.status === 'breached'
  ).length;

  const total = covenants.length;

  return {
    compliant: (compliant / total) * 100,
    warning: (warning / total) * 100,
    breached: (breached / total) * 100,
  };
};
```

---

## ✅ Part 15: Page Wrappers

### Step 15.1: Contracts Page (pages/ContractsPage.tsx)

```typescript
import React from 'react';
import ContractsList from '../components/contracts/ContractsList';

const ContractsPage: React.FC = () => {
  return <ContractsList />;
};

export default ContractsPage;
```

---

### Step 15.2: Alerts Page (pages/AlertsPage.tsx)

```typescript
import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import Loading from '../components/common/Loading';
import { Filter, CheckCircle } from 'lucide-react';

const AlertsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('new,acknowledged');
  const [severityFilter, setSeverityFilter] = useState('');

  const { alerts, loading, error } = useAlerts({
    status: statusFilter,
    severity: severityFilter || undefined,
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-600 mt-1">{alerts.length} total alerts</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-5 w-5 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="new">New</option>
          <option value="new,acknowledged">New & Acknowledged</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* List */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-gray-600">All caught up! No alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

const AlertRow: React.FC<{ alert: any }> = ({ alert }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {alert.contract_name} • {alert.borrower_name}
        </p>
        <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
      </div>
      <div className="text-right">
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full capitalize ${
            alert.severity === 'critical'
              ? 'bg-red-100 text-red-800'
              : alert.severity === 'high'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {alert.severity}
        </span>
      </div>
    </div>
  </div>
);

export default AlertsPage;
```

---

## 🎯 Complete Feature Checklist

### ✅ Components Built
- [x] Login/Authentication
- [x] Header with notifications
- [x] Sidebar navigation
- [x] Dashboard with summary cards
- [x] Alerts inbox
- [x] Contracts list & cards
- [x] Contract upload form
- [x] Covenant health cards
- [x] Status badges
- [x] Loading spinners
- [x] Report generator

### ✅ State Management
- [x] Auth store (user, token, login/logout)
- [x] Contract store (contracts, filtering)
- [x] Alert store (alerts, filtering, counting)

### ✅ API Integration
- [x] API service with Xano
- [x] Type definitions
- [x] Error handling
- [x] Token interceptors
- [x] Pagination support

### ✅ Utilities
- [x] Currency formatting
- [x] Date formatting
- [x] Risk calculations
- [x] Compliance scoring

---

## 🚀 Next Steps to Deploy

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Update REACT_APP_API_BASE_URL and keys

# 3. Start development
npm run dev

# 4. Build for production
npm run build

# 5. Deploy to Vercel
vercel deploy --prod
```

**Complete React frontend ready for production!** 🎉

