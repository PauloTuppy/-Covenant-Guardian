# Covenant Guardian - Complete Technical Blueprint
## LMA EDGE Hackathon | Xano + React + Gemini

---

## 📊 PARTE 1: PostgreSQL Schema (Xano-Ready)

### Design Principles
- **Multi-tenant isolation**: Todos os data por `bank_id`
- **Relational integrity**: Foreign keys, indexes em queries frequentes
- **Scalability**: Particionable (contracts por date range, alerts por tenant)
- **Auditability**: `created_at`, `updated_at`, `created_by` em tabelas críticas

### Complete Schema

```sql
-- ===== CORE MULTI-TENANT TABLES =====

-- 1. Banks (Tenants)
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(2),
    regulatory_id VARCHAR(50),
    subscription_tier ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
    max_contracts INTEGER DEFAULT 500,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_banks_regulatory_id ON banks(regulatory_id);

-- 2. Bank Users (for future auth)
CREATE TABLE bank_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analyst', 'viewer') DEFAULT 'analyst',
    hashed_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bank_id, email)
);
CREATE INDEX idx_bank_users_bank_id ON bank_users(bank_id);

-- ===== CONTRACT & COVENANT STRUCTURE =====

-- 3. Borrowers (Companies)
CREATE TABLE borrowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    legal_name VARCHAR(255) NOT NULL,
    ticker_symbol VARCHAR(10),
    industry VARCHAR(100),
    country VARCHAR(2),
    credit_rating VARCHAR(5), -- e.g., 'BBB+'
    last_financial_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_borrowers_bank_id ON borrowers(bank_id);
CREATE INDEX idx_borrowers_ticker ON borrowers(ticker_symbol);

-- 4. Loan Contracts
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    contract_name VARCHAR(255) NOT NULL,
    contract_number VARCHAR(50),
    principal_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    origination_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    interest_rate DECIMAL(5, 3), -- e.g., 5.250 = 5.25%
    status ENUM('active', 'closed', 'default', 'watch') DEFAULT 'active',
    raw_document_text TEXT, -- Store original contract text (for Gemini)
    document_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES bank_users(id)
);
CREATE INDEX idx_contracts_bank_id ON contracts(bank_id);
CREATE INDEX idx_contracts_borrower_id ON contracts(borrower_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);

-- 5. Covenants (Extracted from contracts)
CREATE TABLE covenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Covenant Classification
    covenant_name VARCHAR(255) NOT NULL, -- e.g., "Debt-to-EBITDA Ratio"
    covenant_type ENUM('financial', 'operational', 'reporting', 'other') DEFAULT 'financial',
    
    -- Threshold & Trigger
    metric_name VARCHAR(100), -- e.g., "Debt-to-EBITDA"
    operator ENUM('<', '<=', '>', '>=', '=', '!=') NOT NULL, -- e.g., '<='
    threshold_value DECIMAL(10, 3), -- e.g., 3.50 for "Debt/EBITDA <= 3.5"
    threshold_unit VARCHAR(50), -- e.g., 'ratio', '%', 'USD', 'days'
    
    -- Monitoring
    check_frequency ENUM('monthly', 'quarterly', 'annually', 'on_demand') DEFAULT 'quarterly',
    next_check_date DATE,
    reporting_deadline_days INTEGER DEFAULT 45, -- days after period end
    
    -- Context
    covenant_clause VARCHAR(500), -- Original clause text from contract
    gemini_extracted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_covenants_contract_id ON covenants(contract_id);
CREATE INDEX idx_covenants_bank_id ON covenants(bank_id);
CREATE INDEX idx_covenants_next_check ON covenants(next_check_date);
CREATE INDEX idx_covenants_type ON covenants(covenant_type);

-- ===== FINANCIAL DATA & MONITORING =====

-- 6. Financial Data (from APIs: Alpha Vantage, SEC, etc.)
CREATE TABLE financial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Period & Source
    period_date DATE NOT NULL, -- e.g., Q4 2024
    period_type ENUM('monthly', 'quarterly', 'annual') DEFAULT 'quarterly',
    source VARCHAR(50), -- e.g., 'SEC_10Q', 'API_ALPHA_VANTAGE', 'manual', 'news'
    
    -- Key Metrics (normalized)
    debt_total DECIMAL(18, 2),
    ebitda DECIMAL(18, 2),
    revenue DECIMAL(18, 2),
    net_income DECIMAL(18, 2),
    operating_cash_flow DECIMAL(18, 2),
    capex DECIMAL(18, 2),
    interest_expense DECIMAL(18, 2),
    equity_total DECIMAL(18, 2),
    current_assets DECIMAL(18, 2),
    current_liabilities DECIMAL(18, 2),
    
    -- Calculated Ratios
    debt_to_ebitda DECIMAL(10, 3),
    debt_to_equity DECIMAL(10, 3),
    current_ratio DECIMAL(10, 3),
    interest_coverage DECIMAL(10, 3),
    roe DECIMAL(10, 3),
    roa DECIMAL(10, 3),
    
    data_confidence DECIMAL(3, 2), -- 0.0 to 1.0 (how confident is this data?)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_financial_borrower_id ON financial_metrics(borrower_id);
CREATE INDEX idx_financial_period ON financial_metrics(period_date DESC);
CREATE INDEX idx_financial_bank_id ON financial_metrics(bank_id);

-- 7. News & Events (from NewsAPI or manual entry)
CREATE TABLE adverse_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    event_type ENUM('news', 'regulatory', 'credit_rating_downgrade', 'executive_change', 'litigation', 'other') DEFAULT 'news',
    headline VARCHAR(500) NOT NULL,
    description TEXT,
    source_url VARCHAR(500),
    
    risk_score DECIMAL(3, 2), -- 0.0 to 1.0 (0 = benign, 1.0 = severe)
    gemini_analyzed BOOLEAN DEFAULT FALSE,
    
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adverse_events_borrower_id ON adverse_events(borrower_id);
CREATE INDEX idx_adverse_events_event_type ON adverse_events(event_type);
CREATE INDEX idx_adverse_events_date ON adverse_events(event_date DESC);

-- ===== COVENANT MONITORING & ALERTS =====

-- 8. Covenant Health Snapshots (calculated view, but store for performance)
CREATE TABLE covenant_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    covenant_id UUID NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Latest Value & Status
    last_reported_value DECIMAL(10, 3),
    last_reported_date DATE,
    threshold_value DECIMAL(10, 3),
    
    -- Health Assessment
    status ENUM('compliant', 'warning', 'breached') DEFAULT 'compliant',
    buffer_percentage DECIMAL(5, 2), -- How far from breach? (100% = at threshold, 0% = safe)
    days_to_breach INTEGER, -- Estimate based on trend
    
    trend ENUM('improving', 'stable', 'deteriorating') DEFAULT 'stable',
    
    -- Gemini Analysis
    gemini_risk_assessment TEXT, -- "This covenant is at risk due to..."
    recommended_action VARCHAR(500),
    
    last_calculated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_covenant_health_covenant_id ON covenant_health(covenant_id);
CREATE INDEX idx_covenant_health_status ON covenant_health(status);
CREATE INDEX idx_covenant_health_bank_id ON covenant_health(bank_id);

-- 9. Alerts (triggered when covenant breached or at risk)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    covenant_id UUID NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    alert_type ENUM('warning', 'critical', 'breach', 'reporting_due') DEFAULT 'warning',
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    trigger_metric_value DECIMAL(10, 3),
    threshold_value DECIMAL(10, 3),
    
    status ENUM('new', 'acknowledged', 'resolved', 'escalated') DEFAULT 'new',
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by UUID REFERENCES bank_users(id),
    resolution_notes TEXT,
    
    triggered_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_alerts_covenant_id ON alerts(covenant_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_bank_id ON alerts(bank_id);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);

-- 10. Alert History (audit trail)
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    status_from VARCHAR(50),
    status_to VARCHAR(50),
    changed_by UUID REFERENCES bank_users(id),
    change_reason VARCHAR(500),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- ===== REPORTS & ANALYTICS =====

-- 11. Risk Reports (generated periodically)
CREATE TABLE risk_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    report_type ENUM('portfolio_summary', 'borrower_deep_dive', 'covenant_analysis') DEFAULT 'portfolio_summary',
    report_date DATE NOT NULL,
    
    -- Portfolio Stats
    total_contracts INTEGER,
    contracts_at_risk INTEGER,
    total_principal DECIMAL(18, 2),
    
    -- Covenant Stats
    total_covenants INTEGER,
    covenants_breached INTEGER,
    covenants_warning INTEGER,
    
    -- Content
    summary_text TEXT, -- Gemini-generated summary
    key_risks JSON, -- {risk_1: severity, ...}
    recommendations JSON,
    
    generated_by UUID REFERENCES bank_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_risk_reports_bank_id ON risk_reports(bank_id);
CREATE INDEX idx_risk_reports_date ON risk_reports(report_date DESC);

-- ===== AUDIT & SYSTEM TABLES =====

-- 12. Audit Log (compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    action VARCHAR(100), -- e.g., 'contract_created', 'alert_acknowledged', 'report_generated'
    table_name VARCHAR(50),
    record_id UUID,
    changes JSON, -- old values vs new values
    
    user_id UUID REFERENCES bank_users(id),
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_bank_id ON audit_logs(bank_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ===== SETTINGS & CONFIGURATION =====

-- 13. Notification Preferences
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES bank_users(id),
    
    alert_severity ENUM('critical', 'high', 'medium', 'all') DEFAULT 'high',
    notification_channel ENUM('email', 'in_app', 'webhook') DEFAULT 'email',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== MATERIALIZED VIEWS (for dashboard performance) =====

CREATE MATERIALIZED VIEW portfolio_summary_view AS
SELECT
    b.id as bank_id,
    b.name as bank_name,
    COUNT(DISTINCT c.id) as total_contracts,
    SUM(c.principal_amount) as total_principal_usd,
    COUNT(CASE WHEN ch.status = 'breached' THEN 1 END) as contracts_breached,
    COUNT(CASE WHEN ch.status = 'warning' THEN 1 END) as contracts_at_warning,
    COUNT(CASE WHEN a.status = 'new' THEN 1 END) as open_alerts_count,
    MAX(a.triggered_at) as latest_alert_time
FROM
    banks b
    LEFT JOIN contracts c ON b.id = c.bank_id AND c.deleted_at IS NULL
    LEFT JOIN covenant_health ch ON c.id = ch.contract_id
    LEFT JOIN alerts a ON c.id = a.contract_id
GROUP BY
    b.id, b.name;

CREATE INDEX idx_portfolio_summary_bank ON portfolio_summary_view(bank_id);

-- ===== HELPER FUNCTIONS =====

-- Calculate buffer percentage: how far is current value from threshold?
CREATE OR REPLACE FUNCTION calculate_buffer_percentage(
    last_value DECIMAL,
    threshold DECIMAL,
    operator VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
    CASE operator
        WHEN '<' THEN
            IF last_value >= threshold THEN RETURN 0; -- breached
            ELSE RETURN (threshold - last_value) / threshold * 100;
            END IF;
        WHEN '<=' THEN
            IF last_value > threshold THEN RETURN 0;
            ELSE RETURN (threshold - last_value) / threshold * 100;
            END IF;
        WHEN '>' THEN
            IF last_value <= threshold THEN RETURN 0;
            ELSE RETURN (last_value - threshold) / last_value * 100;
            END IF;
        ELSE RETURN 50; -- default neutral
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ===== INDICES SUMMARY =====
-- Key indices:
-- - banks, borrowers, contracts, covenants: filtered by bank_id (multi-tenant)
-- - contracts: status, created_at (dashboard queries)
-- - covenants: next_check_date (monitoring scheduler)
-- - financial_metrics: borrower_id, period_date (ratio calculations)
-- - alerts: status, severity (inbox patterns)
-- - portfolio_summary_view: pre-aggregated for dashboards
```

---

## 🔌 PARTE 2: Xano API Endpoints (In Order of Implementation)

### Architecture: REST endpoints exposed by Xano Visual Builder
- **Authentication**: JWT-based (bank_id + user_id in token)
- **Rate Limiting**: Built-in Xano (per tenant)
- **Response Format**: JSON
- **Error Handling**: Standardized error codes + user-friendly messages

### Phase 1: Core Contract Management (Week 2, Days 1-2)

#### **1. POST /api/contracts/create**
**Purpose**: Create a new loan contract + trigger Gemini extraction of covenants

**Request**:
```json
{
  "bank_id": "uuid",
  "borrower_id": "uuid or new",
  "contract_name": "Syndicated Loan - ABC Corp 2025",
  "contract_number": "LOAN-2025-001",
  "principal_amount": 150000000,
  "currency": "USD",
  "origination_date": "2025-01-15",
  "maturity_date": "2028-01-15",
  "interest_rate": 5.25,
  "document_url": "https://...", // optional: PDF link
  "raw_document_text": "..." // contract text for Gemini
}
```

**Response**:
```json
{
  "success": true,
  "contract": {
    "id": "uuid",
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "covenant_extraction_job": {
    "job_id": "uuid",
    "status": "queued", // "queued" | "extracting" | "complete"
    "estimated_seconds": 45
  }
}
```

**Xano Logic**:
1. Insert into `contracts` table
2. Trigger async Xano workflow: `extract_covenants_with_gemini` (queue task)
3. Return contract + job status

---

#### **2. GET /api/contracts**
**Purpose**: List all contracts for a bank (paginated)

**Query Params**:
```
?bank_id=uuid&status=active&page=1&limit=20&sort=created_at&sort_order=desc
```

**Response**:
```json
{
  "success": true,
  "contracts": [
    {
      "id": "uuid",
      "contract_name": "Syndicated Loan - ABC Corp",
      "borrower_id": "uuid",
      "principal_amount": 150000000,
      "status": "active",
      "covenant_count": 8,
      "breached_covenant_count": 0,
      "alert_count": 2,
      "created_at": "2025-01-15"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "pages": 3
  }
}
```

---

#### **3. GET /api/contracts/:contract_id**
**Purpose**: Get detailed view of a single contract + all covenants + health

**Response**:
```json
{
  "success": true,
  "contract": {
    "id": "uuid",
    "contract_name": "...",
    "borrower": {
      "id": "uuid",
      "legal_name": "ABC Corporation",
      "ticker": "ABC",
      "credit_rating": "BBB+"
    },
    "principal_amount": 150000000,
    "status": "active",
    "covenants": [
      {
        "id": "uuid",
        "covenant_name": "Debt-to-EBITDA Ratio",
        "covenant_type": "financial",
        "metric_name": "Debt-to-EBITDA",
        "operator": "<=",
        "threshold_value": 3.5,
        "health": {
          "status": "compliant",
          "last_reported_value": 2.8,
          "last_reported_date": "2024-12-31",
          "buffer_percentage": 80,
          "trend": "stable"
        },
        "next_check_date": "2025-03-31"
      }
      // ... more covenants
    ],
    "alerts": [
      {
        "id": "uuid",
        "covenant_name": "...",
        "severity": "high",
        "title": "...",
        "status": "new"
      }
    ]
  }
}
```

---

### Phase 1b: Borrower Management (Week 2, Days 3-4)

#### **4. POST /api/borrowers/create**
**Purpose**: Create or update borrower (company) profile

**Request**:
```json
{
  "bank_id": "uuid",
  "legal_name": "ABC Corporation Inc.",
  "ticker_symbol": "ABC",
  "industry": "Technology",
  "country": "US",
  "credit_rating": "BBB+"
}
```

**Response**:
```json
{
  "success": true,
  "borrower": {
    "id": "uuid",
    "legal_name": "ABC Corporation Inc.",
    "ticker_symbol": "ABC"
  }
}
```

---

#### **5. GET /api/borrowers/:borrower_id**
**Purpose**: Get borrower profile + financials + news + all linked contracts

**Response**:
```json
{
  "success": true,
  "borrower": {
    "id": "uuid",
    "legal_name": "ABC Corporation Inc.",
    "ticker": "ABC",
    "credit_rating": "BBB+",
    "contracts": [
      { "id": "uuid", "contract_name": "..." }
    ],
    "latest_financials": {
      "period_date": "2024-12-31",
      "debt_total": 500000000,
      "ebitda": 150000000,
      "debt_to_ebitda": 3.33,
      "revenue": 2000000000,
      "net_income": 200000000
    },
    "recent_news": [
      {
        "id": "uuid",
        "headline": "ABC Corp Reports Q4 Earnings",
        "risk_score": 0.2,
        "event_date": "2025-01-10"
      }
    ]
  }
}
```

---

### Phase 2: Covenant Extraction & Management (Week 3)

#### **6. GET /api/contracts/:contract_id/covenants/extraction-status**
**Purpose**: Check if Gemini extraction job is done

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "complete",
  "covenants_extracted": 8,
  "covenants": [
    {
      "id": "uuid",
      "covenant_name": "Debt-to-EBITDA Ratio",
      "covenant_type": "financial",
      "metric_name": "Debt-to-EBITDA",
      "operator": "<=",
      "threshold_value": 3.5,
      "check_frequency": "quarterly",
      "covenant_clause": "The Borrower shall maintain a Debt-to-EBITDA ratio not to exceed 3.5x..."
    }
  ]
}
```

---

#### **7. POST /api/covenants/:covenant_id/update**
**Purpose**: Update a covenant (if Gemini extraction was imperfect or manual edit)

**Request**:
```json
{
  "covenant_name": "Debt-to-EBITDA Ratio",
  "threshold_value": 3.5,
  "operator": "<=",
  "check_frequency": "quarterly",
  "next_check_date": "2025-03-31"
}
```

**Response**:
```json
{
  "success": true,
  "covenant": { "id": "uuid", "updated_at": "..." }
}
```

---

#### **8. DELETE /api/covenants/:covenant_id**
**Purpose**: Remove a covenant (if incorrectly extracted)

**Response**:
```json
{
  "success": true,
  "message": "Covenant deleted"
}
```

---

### Phase 2b: Financial Data Ingestion (Week 4)

#### **9. POST /api/financial-metrics/ingest**
**Purpose**: Ingest financial data (from APIs or manual upload)

**Request**:
```json
{
  "bank_id": "uuid",
  "borrower_id": "uuid",
  "period_date": "2024-12-31",
  "period_type": "annual",
  "source": "SEC_10K",
  "debt_total": 500000000,
  "ebitda": 150000000,
  "revenue": 2000000000,
  "net_income": 200000000,
  "equity_total": 1000000000,
  "current_assets": 800000000,
  "current_liabilities": 300000000,
  "interest_expense": 25000000,
  "data_confidence": 0.95
}
```

**Xano Logic**:
1. Insert into `financial_metrics`
2. **Trigger: Recalculate all covenant health for this borrower**
   - For each covenant tied to this borrower:
     - Fetch latest financial data
     - Calculate current metric value (e.g., debt_total / ebitda)
     - Compare vs. threshold
     - Update `covenant_health` table
     - If breached or warning → **Create alert**

**Response**:
```json
{
  "success": true,
  "metrics_id": "uuid",
  "covenant_health_updated": 12,
  "alerts_created": 2
}
```

---

#### **10. GET /api/borrowers/:borrower_id/financials**
**Purpose**: Get financial history (last 8 quarters or years)

**Query Params**:
```
?period_type=quarterly&limit=8
```

**Response**:
```json
{
  "success": true,
  "borrower_id": "uuid",
  "financials": [
    {
      "period_date": "2024-12-31",
      "period_type": "annual",
      "debt_to_ebitda": 3.33,
      "current_ratio": 2.67,
      "interest_coverage": 6.0,
      "roe": 20.0,
      "data_confidence": 0.95
    }
  ]
}
```

---

### Phase 3: Covenant Health & Alerts (Week 4-5)

#### **11. GET /api/covenants/:covenant_id/health**
**Purpose**: Get current health status + Gemini risk assessment

**Response**:
```json
{
  "success": true,
  "covenant_health": {
    "id": "uuid",
    "status": "compliant", // "compliant" | "warning" | "breached"
    "last_reported_value": 2.8,
    "threshold_value": 3.5,
    "last_reported_date": "2024-12-31",
    "buffer_percentage": 80,
    "days_to_breach": 720, // estimate: how many days until breach at current trend?
    "trend": "stable",
    "gemini_risk_assessment": "Covenant is healthy. Debt-to-EBITDA at 2.8x with 20% buffer. Recent earnings beat expectations, EBITDA growth trajectory positive. No immediate concerns.",
    "recommended_action": "Continue quarterly monitoring. Consider proactive communication with borrower on growth initiatives.",
    "last_calculated": "2025-01-15T10:00:00Z"
  }
}
```

---

#### **12. GET /api/alerts**
**Purpose**: Get all alerts for a bank (dashboard inbox)

**Query Params**:
```
?bank_id=uuid&status=new,acknowledged&severity=high,critical&limit=50
```

**Response**:
```json
{
  "success": true,
  "alerts": [
    {
      "id": "uuid",
      "contract_name": "Syndicated Loan - ABC Corp",
      "borrower_name": "ABC Corporation",
      "covenant_name": "Debt-to-EBITDA Ratio",
      "severity": "high",
      "status": "new",
      "title": "Approaching Covenant Threshold",
      "description": "Debt-to-EBITDA at 3.2x (threshold: 3.5x). 10% buffer remaining.",
      "triggered_at": "2025-01-15T10:00:00Z"
    }
  ],
  "summary": {
    "critical": 1,
    "high": 3,
    "medium": 5,
    "low": 2
  }
}
```

---

#### **13. POST /api/alerts/:alert_id/acknowledge**
**Purpose**: Mark an alert as read + add resolution note

**Request**:
```json
{
  "user_id": "uuid",
  "resolution_notes": "Discussed with borrower. They expect EBITDA improvement in Q2 2025. Monitoring closely."
}
```

**Response**:
```json
{
  "success": true,
  "alert": {
    "id": "uuid",
    "status": "acknowledged",
    "acknowledged_at": "2025-01-15T11:00:00Z"
  }
}
```

---

### Phase 4: News & Event Monitoring (Week 5)

#### **14. POST /api/adverse-events/ingest**
**Purpose**: Ingest news or events from NewsAPI or manual entry

**Request**:
```json
{
  "bank_id": "uuid",
  "borrower_id": "uuid",
  "event_type": "news",
  "headline": "ABC Corp CEO Steps Down Amid Market Uncertainty",
  "description": "Long-time CEO John Smith resigned effective immediately...",
  "source_url": "https://...",
  "event_date": "2025-01-14"
}
```

**Xano Logic**:
1. Insert into `adverse_events`
2. **Trigger: Gemini risk analysis**
   - Call Gemini: "Analyze this news about [borrower_name]. Rate risk 0-1 for loan covenant defaults. Is this relevant to [covenant_names]?"
   - Store risk_score
   - If risk_score > 0.6 AND any covenant at warning/risk → **Create alert**

**Response**:
```json
{
  "success": true,
  "event_id": "uuid",
  "risk_score": 0.75,
  "alerts_created": 2,
  "gemini_analysis": "High-risk event. CEO departure signals potential strategic uncertainty. Monitor Q1 earnings closely for EBITDA impact."
}
```

---

#### **15. GET /api/borrowers/:borrower_id/events**
**Purpose**: Get news & events timeline for a borrower

**Response**:
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "event_type": "news",
      "headline": "ABC Corp CEO Steps Down...",
      "event_date": "2025-01-14",
      "risk_score": 0.75
    }
  ]
}
```

---

### Phase 5: Portfolio Dashboard & Reports (Week 5-6)

#### **16. GET /api/dashboard/portfolio-summary**
**Purpose**: Dashboard overview for a bank (portfolio health at a glance)

**Response**:
```json
{
  "success": true,
  "bank_id": "uuid",
  "summary": {
    "total_contracts": 47,
    "total_principal_usd": 3500000000,
    "contracts_at_risk": 5,
    "open_alerts": 12,
    "critical_alerts": 2
  },
  "covenant_breakdown": {
    "compliant": 156,
    "warning": 12,
    "breached": 2
  },
  "top_risks": [
    {
      "contract_name": "Syndicated Loan - XYZ Corp",
      "borrower_name": "XYZ Corporation",
      "covenant_name": "Debt-to-EBITDA Ratio",
      "status": "warning",
      "buffer_percentage": 5,
      "severity": "critical"
    }
  ],
  "alerts_by_type": {
    "covenant_warning": 6,
    "covenant_breach": 2,
    "reporting_due": 4
  }
}
```

---

#### **17. GET /api/reports/portfolio-risk/:period**
**Purpose**: Generate a detailed portfolio risk report

**Query Params**:
```
?period=2024-Q4&format=json
```

**Xano Logic**:
1. Fetch all contracts, covenant health, alerts for period
2. **Call Gemini**: "Generate executive summary of portfolio risk for [period]"
3. Include:
   - Total covenants monitored
   - Covenants breached / at warning
   - Key risks identified
   - Recommendations
4. Store in `risk_reports` table
5. Return report

**Response**:
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "bank_id": "uuid",
    "report_type": "portfolio_summary",
    "report_date": "2024-12-31",
    "summary": "Portfolio of 47 contracts monitored. 2 covenant breaches, 12 warnings. Risk level: MEDIUM. Key driver: XYZ Corp debt service stress.",
    "key_risks": [
      {
        "risk_name": "XYZ Corp Leverage Spike",
        "severity": "high",
        "affected_contracts": 3,
        "recommended_action": "Proactive engagement with borrower"
      }
    ],
    "recommendations": [
      "Discuss with XYZ Corp management on capex plans",
      "Monitor Q1 earnings closely",
      "Consider additional covenants on debt caps"
    ]
  }
}
```

---

#### **18. GET /api/reports/borrower-deep-dive/:borrower_id**
**Purpose**: Single borrower risk analysis report

**Response**:
```json
{
  "success": true,
  "report": {
    "borrower_name": "ABC Corporation",
    "contracts_count": 3,
    "total_principal": 450000000,
    "latest_financials": { /* ... */ },
    "covenants": [
      {
        "covenant_name": "Debt-to-EBITDA",
        "health": { /* ... */ }
      }
    ],
    "recent_news": [ /* ... */ ],
    "gemini_analysis": "ABC Corp is a stable BB+ rated company. Latest financials show steady EBITDA growth. All covenants compliant. News sentiment mixed but no material negative events. Recommend continued quarterly monitoring.",
    "overall_risk_score": 0.25
  }
}
```

---

### Phase 6: Monitoring & Scheduled Tasks (Week 6)

#### **19. POST /api/workflows/check-covenant-health**
**Purpose**: Batch job (runs nightly or weekly via Xano scheduler)

**Xano Logic**:
1. For each active covenant:
   - Fetch latest financial data
   - Recalculate health status
   - Compare to threshold
   - Update `covenant_health` table
2. For any covenant that moved from compliant → warning/breached:
   - Create alert
   - Trigger notification (email via Xano webhooks)

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "covenants_checked": 467,
  "covenant_health_updated": 467,
  "alerts_created": 3,
  "completed_at": "2025-01-15T02:00:00Z"
}
```

---

#### **20. POST /api/workflows/ingest-news-daily**
**Purpose**: Batch job (runs daily via Xano scheduler + NewsAPI)

**Xano Logic**:
1. For each borrower in system:
   - Call NewsAPI: Search for [borrower_name] + [ticker]
   - For each new article:
     - Store in `adverse_events`
     - Call Gemini for risk analysis
     - Create alert if risk_score > threshold
2. Return summary

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "articles_ingested": 47,
  "events_created": 23,
  "alerts_created": 2,
  "completed_at": "2025-01-15T06:00:00Z"
}
```

---

## 🤖 PARTE 3: Gemini Prompt Engineering

### Context
Gemini 3 Pro will handle:
1. **Covenant extraction** from contract text
2. **Risk assessment** based on financials + news
3. **Narrative generation** for reports

### 3.1: Covenant Extraction Prompt

**System Prompt**:
```
You are an expert loan covenant analyst. Your task is to extract and classify 
all financial and operational covenants from loan contracts.

You MUST respond with valid JSON only. No explanations outside JSON.

For each covenant found, provide:
- covenant_name: Clear, standardized name (e.g., "Debt-to-EBITDA Ratio")
- covenant_type: One of [financial, operational, reporting, other]
- metric_name: The metric being measured (e.g., "Total Debt", "EBITDA")
- operator: One of [<, <=, >, >=, =, !=]
- threshold_value: Numeric threshold
- threshold_unit: Unit of measurement (ratio, %, USD, days, etc.)
- check_frequency: One of [monthly, quarterly, annually, on_demand]
- clause_excerpt: Original text from contract

IMPORTANT RULES:
- Only extract explicit, measurable covenants. Skip qualitative language.
- If a covenant mentions "financial statements" but no specific ratio, ask for clarification.
- Standardize covenant names (e.g., "Leverage Ratio" not "Lev Ratio" or "LR").
- Always include the reporting deadline if mentioned (e.g., "45 days after quarter end").
```

**User Prompt** (example):
```
Extract covenants from this loan contract:

[RAW CONTRACT TEXT]

{
  "contract_identifier": "LOAN-2025-001",
  "covenants": [
    {
      "covenant_name": "...",
      "covenant_type": "...",
      ...
    }
  ]
}
```

**Example Response**:
```json
{
  "contract_identifier": "LOAN-2025-001",
  "covenants": [
    {
      "covenant_name": "Debt-to-EBITDA Ratio",
      "covenant_type": "financial",
      "metric_name": "Total Debt / EBITDA",
      "operator": "<=",
      "threshold_value": 3.5,
      "threshold_unit": "ratio",
      "check_frequency": "quarterly",
      "reporting_deadline_days": 45,
      "clause_excerpt": "The Borrower shall maintain a consolidated Debt-to-EBITDA ratio not to exceed 3.5x..."
    },
    {
      "covenant_name": "Current Ratio",
      "covenant_type": "financial",
      "metric_name": "Current Assets / Current Liabilities",
      "operator": ">=",
      "threshold_value": 1.2,
      "threshold_unit": "ratio",
      "check_frequency": "quarterly",
      "reporting_deadline_days": 45,
      "clause_excerpt": "The Borrower shall maintain a current ratio of at least 1.2x..."
    }
  ]
}
```

---

### 3.2: Health Assessment & Risk Scoring Prompt

**System Prompt**:
```
You are an expert credit risk analyst. Given a borrower's financial metrics, 
recent news, and a specific covenant, assess health and risk.

Respond with JSON only:
- status: "compliant" | "warning" | "breached"
- risk_assessment: 2-3 sentence narrative
- recommended_action: Specific next step for analyst
- risk_score: 0.0 (safe) to 1.0 (critical breach)

DECISION RULES:
- Status = "breached" if current_value violates threshold
- Status = "warning" if current_value is within 10% of threshold OR trend is deteriorating
- Status = "compliant" otherwise

Consider:
- Recent financial trends (improving vs. deteriorating)
- Recent adverse news (layoffs, CEO change, lawsuit, etc.)
- Industry headwinds
```

**User Prompt** (example):
```
Assess covenant health:

Covenant: Debt-to-EBITDA Ratio <= 3.5x
Borrower: ABC Corporation (ticker: ABC)
Latest Financial Data:
  - Q4 2024: Debt=500M, EBITDA=150M → D/E=3.33x ✓
  - Q3 2024: Debt=480M, EBITDA=155M → D/E=3.10x ✓
  Trend: Slight increase in debt, flat EBITDA

Recent News:
  - Jan 10: Q4 earnings beat, EBITDA +2% YoY
  - Jan 5: New CFO hired, previous CFO left for competitor
  - Dec 28: Announced $100M capex reduction due to market uncertainty

Credit Rating: BBB+ (stable outlook)
Industry: Technology
```

**Example Response**:
```json
{
  "status": "compliant",
  "buffer_percentage": 4.6,
  "trend": "stable",
  "risk_score": 0.35,
  "risk_assessment": "Covenant currently compliant at 3.33x, but buffer is tightening. Recent capex cut is positive for leverage. EBITDA growth stalled due to macro headwinds, but earnings beat shows operational resilience. CFO transition adds moderate uncertainty.",
  "recommended_action": "Schedule proactive call with borrower to discuss FY2025 EBITDA targets and capex plans. Confirm that cost discipline will continue. Plan for Q1 call after earnings."
}
```

---

### 3.3: Executive Summary / Report Generation Prompt

**System Prompt**:
```
You are a senior credit advisor writing executive summaries for loan portfolio reviews.

Produce a 150-200 word summary covering:
1. Portfolio overview (# contracts, principal, key stats)
2. Current risk assessment (# breached, # warning, overall trend)
3. Key risk drivers (top 2-3 concerns)
4. Recommended actions

Tone: Professional, concise, actionable. No jargon.
Format: Plain text (newline-separated paragraphs).
```

**User Prompt** (example):
```
Generate portfolio summary for:

Period: Q4 2024
Bank: LMA Bank plc
Total Contracts: 47
Total Principal: $3.5B

Covenant Status:
- Compliant: 156 covenants
- Warning: 12 covenants (10 financial, 2 operational)
- Breached: 2 covenants

Top Risks:
1. XYZ Corp: Debt-to-EBITDA at 4.1x (threshold 3.5x) — CEO transition + macro headwinds
2. DEF Inc: Interest Coverage at 1.8x (threshold 2.0x) — Margin compression from input costs
3. GHI Ltd: Covenant breach imminent (30 days) — Acquisition integration overrun

Recent Positive:
- ABC Corp EBITDA +5% despite recession forecasts
- JKL Corp refinanced senior debt, improved leverage profile
```

**Example Response**:
```
Portfolio Overview
Q4 2024 portfolio of 47 contracts totaling $3.5B. Key exposures in technology (40%), 
industrials (35%), and healthcare (25%). Average BBB credit rating.

Risk Assessment
14 of 214 covenants at elevated risk: 2 breaches, 12 warnings (mostly leverage and 
interest coverage post-capex/M&A activity). Portfolio risk trending upward due to 
macro uncertainty and sector-specific challenges.

Key Drivers
Primary concern: XYZ Corp (CEO transition + capex overrun) and DEF Inc (margin compression). 
Both require immediate borrower engagement. GHI Ltd acquisition integration requires close 
monitoring (covenant waiver pending Board approval).

Recommendations
1. Proactive calls with XYZ, DEF, GHI management within 2 weeks
2. Request updated FY2025 guidance from all warning-status borrowers
3. Accelerate covenant waiver process for GHI Ltd to avoid technical breach
4. Consider covenant amendments for interest coverage thresholds (market-wide macro sensitivity)
```

---

### 3.4: Integration with Xano

**Xano Function**: `call_gemini_covenant_extraction`

```javascript
// Pseudocode for Xano Function Stack

// 1. Input: contract_text, contract_id
// 2. Call Gemini API
const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent', {
  contents: [{
    role: 'user',
    parts: [{
      text: `[SYSTEM_PROMPT]\n\n[USER_PROMPT with contract_text]`
    }]
  }],
  generationConfig: {
    temperature: 0.3, // Low temperature for deterministic output
    maxOutputTokens: 2000,
    topK: 40,
    topP: 0.95
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_ONLY_HIGH'
    }
  ]
}, {
  headers: {
    'x-goog-api-key': XANO_SECRET_GEMINI_API_KEY
  }
});

// 3. Parse JSON response
const covenants = JSON.parse(response.data.candidates[0].content.parts[0].text);

// 4. Insert into database (for each covenant):
for (const covenant of covenants.covenants) {
  await db.insert('covenants', {
    contract_id: contract_id,
    bank_id: bank_id,
    covenant_name: covenant.covenant_name,
    covenant_type: covenant.covenant_type,
    metric_name: covenant.metric_name,
    operator: covenant.operator,
    threshold_value: covenant.threshold_value,
    threshold_unit: covenant.threshold_unit,
    check_frequency: covenant.check_frequency,
    covenant_clause: covenant.clause_excerpt,
    gemini_extracted: true
  });
}

// 5. Return success
return { success: true, covenants_extracted: covenants.covenants.length };
```

---

## ⚛️ PARTE 4: React Component Structure

### Project Setup
```bash
npx create-react-app covenant-guardian --template typescript
cd covenant-guardian
npm install react-router-dom axios zustand recharts date-fns clsx
```

### Directory Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   ├── dashboard/
│   │   ├── DashboardOverview.tsx
│   │   ├── PortfolioSummary.tsx
│   │   ├── AlertsInbox.tsx
│   │   └── RiskHeatmap.tsx
│   ├── contracts/
│   │   ├── ContractsList.tsx
│   │   ├── ContractDetail.tsx
│   │   ├── ContractUpload.tsx
│   │   └── CovenantBreakdown.tsx
│   ├── covenants/
│   │   ├── CovenantHealthCard.tsx
│   │   ├── CovenantMonitor.tsx
│   │   └── CovenantTrendChart.tsx
│   ├── borrowers/
│   │   ├── BorrowerProfile.tsx
│   │   ├── FinancialMetricsChart.tsx
│   │   └── NewsTimeline.tsx
│   ├── alerts/
│   │   ├── AlertDetail.tsx
│   │   ├── AlertList.tsx
│   │   └── AlertActions.tsx
│   ├── reports/
│   │   ├── ReportGenerator.tsx
│   │   └── ReportView.tsx
│   └── common/
│       ├── Loading.tsx
│       ├── ErrorBoundary.tsx
│       ├── Badge.tsx
│       ├── StatusIndicator.tsx
│       └── Modal.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── ContractsPage.tsx
│   ├── DashboardPage.tsx
│   ├── BorrowerPage.tsx
│   ├── AlertsPage.tsx
│   └── ReportsPage.tsx
├── hooks/
│   ├── useContracts.ts
│   ├── useCovenants.ts
│   ├── useAlerts.ts
│   ├── useBorrowers.ts
│   ├── useFinancials.ts
│   └── useFetch.ts
├── store/
│   ├── authStore.ts
│   ├── contractStore.ts
│   ├── alertStore.ts
│   └── uiStore.ts
├── services/
│   ├── api.ts
│   ├── covenantService.ts
│   ├── contractService.ts
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
│   ├── global.css
│   ├── tailwind.config.js
│   └── colors.ts
└── App.tsx
```

---

### 4.1: Type Definitions (types/index.ts)

```typescript
// types/index.ts

export interface Bank {
  id: string;
  name: string;
  country: string;
  regulatory_id?: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
}

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
}

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

export interface Borrower {
  id: string;
  bank_id: string;
  legal_name: string;
  ticker_symbol?: string;
  industry: string;
  country: string;
  credit_rating?: string;
  contracts: Contract[];
  latest_financials?: FinancialMetrics;
  recent_news?: AdverseEvent[];
}

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
```

---

### 4.2: API Service (services/api.ts)

```typescript
// services/api.ts
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_XANO_API_URL || 'https://app.xano.com/api:...';

class ApiService {
  client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to all requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Contracts
  async getContracts(bankId: string, params?: any) {
    return this.client.get('/api/contracts', { params: { bank_id: bankId, ...params } });
  }

  async getContract(contractId: string) {
    return this.client.get(`/api/contracts/${contractId}`);
  }

  async createContract(data: any) {
    return this.client.post('/api/contracts/create', data);
  }

  // Covenants
  async getCovenantHealth(covenantId: string) {
    return this.client.get(`/api/covenants/${covenantId}/health`);
  }

  async getExtractionStatus(contractId: string) {
    return this.client.get(`/api/contracts/${contractId}/covenants/extraction-status`);
  }

  // Alerts
  async getAlerts(bankId: string, params?: any) {
    return this.client.get('/api/alerts', { params: { bank_id: bankId, ...params } });
  }

  async acknowledgeAlert(alertId: string, data: any) {
    return this.client.post(`/api/alerts/${alertId}/acknowledge`, data);
  }

  // Dashboard
  async getPortfolioSummary(bankId: string) {
    return this.client.get('/api/dashboard/portfolio-summary', { params: { bank_id: bankId } });
  }

  // Reports
  async generateReport(type: string, params?: any) {
    return this.client.get(`/api/reports/${type}`, { params });
  }

  // Financials
  async getFinancials(borrowerId: string, params?: any) {
    return this.client.get(`/api/borrowers/${borrowerId}/financials`, { params });
  }
}

export default new ApiService();
```

---

### 4.3: Key Components

#### DashboardOverview.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { DashboardSummary, Alert } from '../types';
import api from '../services/api';
import PortfolioSummary from './dashboard/PortfolioSummary';
import AlertsInbox from './dashboard/AlertsInbox';
import RiskHeatmap from './dashboard/RiskHeatmap';

const DashboardOverview: React.FC<{ bankId: string }> = ({ bankId }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, alertsRes] = await Promise.all([
          api.getPortfolioSummary(bankId),
          api.getAlerts(bankId, { status: 'new,acknowledged', limit: 10 }),
        ]);

        setSummary(summaryRes.data.summary);
        setAlerts(alertsRes.data.alerts);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bankId]);

  if (loading) return <Loading />;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Total Contracts" value={summary?.total_contracts} />
        <SummaryCard label="Total Principal" value={`$${(summary?.total_principal_usd || 0) / 1e9}B`} />
        <SummaryCard label="Contracts at Risk" value={summary?.contracts_at_risk} highlight />
        <SummaryCard label="Critical Alerts" value={summary?.critical_alerts} highlight />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioSummary data={summary} />
        </div>
        <RiskHeatmap summary={summary} />
      </div>

      <AlertsInbox alerts={alerts} />
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: any; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`rounded-lg p-4 ${highlight ? 'bg-red-50 border-l-4 border-red-500' : 'bg-gray-50'}`}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
  </div>
);

export default DashboardOverview;
```

---

#### ContractDetail.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Contract, Covenant } from '../types';
import api from '../services/api';
import CovenantBreakdown from './contracts/CovenantBreakdown';
import Loading from './common/Loading';

const ContractDetail: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [covenants, setCovenants] = useState<Covenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await api.getContract(contractId!);
        setContract(res.data.contract);
        setCovenants(res.data.contract.covenants || []);
      } catch (err) {
        console.error('Failed to fetch contract', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  if (loading) return <Loading />;
  if (!contract) return <div>Contract not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold">{contract.contract_name}</h1>
        <p className="mt-2 text-gray-600">Contract #{contract.contract_number}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">Principal Amount</p>
            <p className="text-lg font-semibold">${contract.principal_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Interest Rate</p>
            <p className="text-lg font-semibold">{contract.interest_rate}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Maturity Date</p>
            <p className="text-lg font-semibold">{new Date(contract.maturity_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <StatusBadge status={contract.status} />
          </div>
        </div>
      </div>

      <CovenantBreakdown covenants={covenants} contractId={contractId!} />
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    watch: 'bg-yellow-100 text-yellow-800',
    default: 'bg-red-100 text-red-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  return <span className={`inline-block rounded px-3 py-1 text-sm font-semibold ${colors[status as keyof typeof colors]}`}>{status}</span>;
};

export default ContractDetail;
```

---

#### AlertsInbox.tsx
```typescript
import React, { useState } from 'react';
import { Alert } from '../types';
import api from '../services/api';

const AlertsInbox: React.FC<{ alerts: Alert[] }> = ({ alerts: initialAlerts }) => {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, { user_id: 'current_user' });
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a)));
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const severityColor = (severity: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-50 border-l-4 border-red-600',
      high: 'text-orange-600 bg-orange-50 border-l-4 border-orange-600',
      medium: 'text-yellow-600 bg-yellow-50 border-l-4 border-yellow-600',
      low: 'text-blue-600 bg-blue-50 border-l-4 border-blue-600',
    };
    return colors[severity as keyof typeof colors];
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold">Alerts</h2>

      {alerts.length === 0 ? (
        <p className="text-gray-600">No alerts at this time. Great job!</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded p-4 ${severityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-sm">{alert.description}</p>
                  <p className="mt-1 text-xs opacity-75">
                    {alert.contract_name} • {alert.borrower_name}
                  </p>
                </div>
                {alert.status === 'new' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="ml-4 rounded bg-white px-3 py-1 text-sm font-semibold hover:bg-gray-100"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsInbox;
```

---

#### CovenantHealthCard.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { Covenant, CovenantHealth } from '../types';
import api from '../services/api';

const CovenantHealthCard: React.FC<{ covenant: Covenant }> = ({ covenant }) => {
  const [health, setHealth] = useState<CovenantHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.getCovenantHealth(covenant.id);
        setHealth(res.data.covenant_health);
      } catch (err) {
        console.error('Failed to fetch covenant health', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [covenant.id]);

  if (loading) return <div className="rounded bg-gray-100 p-4">Loading...</div>;
  if (!health) return null;

  const statusColor = {
    compliant: 'bg-green-50 border-l-4 border-green-500',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500',
    breached: 'bg-red-50 border-l-4 border-red-500',
  };

  const statusTextColor = {
    compliant: 'text-green-700',
    warning: 'text-yellow-700',
    breached: 'text-red-700',
  };

  return (
    <div className={`rounded p-4 ${statusColor[health.status]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{covenant.covenant_name}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTextColor[health.status]}`}>
          {health.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Current Value:</span>
          <span className="font-semibold">{health.last_reported_value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Threshold:</span>
          <span className="font-semibold">{health.threshold_value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Buffer:</span>
          <span className="font-semibold">{health.buffer_percentage.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trend:</span>
          <span className="font-semibold capitalize">{health.trend}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 rounded-full bg-gray-300">
          <div
            className={`h-full rounded-full transition-all ${
              health.status === 'compliant' ? 'bg-green-500' : health.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(health.buffer_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Gemini Risk Assessment */}
      <div className="mt-4 rounded bg-white p-3">
        <p className="text-xs font-semibold text-gray-600">RISK ASSESSMENT</p>
        <p className="mt-1 text-sm">{health.gemini_risk_assessment}</p>
        <p className="mt-2 text-xs italic text-gray-500">
          <strong>Recommendation:</strong> {health.recommended_action}
        </p>
      </div>
    </div>
  );
};

export default CovenantHealthCard;
```

---

### 4.4: Zustand Store (store/alertStore.ts)

```typescript
import { create } from 'zustand';
import { Alert } from '../types';

interface AlertStore {
  alerts: Alert[];
  loading: boolean;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, alert: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  filterByStatus: (status: string) => Alert[];
  filterBySeverity: (severity: string) => Alert[];
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  loading: false,
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  updateAlert: (id, updatedAlert) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updatedAlert } : a)),
    })),
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
  filterByStatus: (status) => get().alerts.filter((a) => a.status === status),
  filterBySeverity: (severity) => get().alerts.filter((a) => a.severity === severity),
}));
```

---

### 4.5: Router Setup (App.tsx)

```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';
import BorrowerPage from './pages/BorrowerPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:contractId" element={<ContractDetailPage />} />
          <Route path="/borrowers/:borrowerId" element={<BorrowerPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
```

---

## 📋 RESUMO: 8-Week Implementation Timeline

| Week | Task | Deliverable |
|------|------|-------------|
| **1** | Schema design + setup Xano | PostgreSQL DDL + Xano project initialized |
| **2-3** | Core APIs (contracts, covenants) + Gemini extraction | 6 endpoints working |
| **4** | Financial data ingestion + health calculation | 4 endpoints + nightly job |
| **5** | Alerts + news ingestion | 4 endpoints + daily job + Gemini risk scoring |
| **5-6** | Portfolio dashboard + report generation | 3 report endpoints |
| **6** | React frontend (screens 1-7) | UI fully connected to APIs |
| **7** | Polish + testing + demo video script | Bug fixes, design refinement |
| **8** | Video recording + Devpost submission | Hackathon ready |

---

**Próximo passo: Você quer que eu comece a implementar qual parte primeiro?**
- PostgreSQL migration scripts?
- Xano visual builder walkthrough (Canvas View)?
- React component templates?
- Gemini prompt testing?

