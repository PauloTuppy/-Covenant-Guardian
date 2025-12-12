-- ===== COVENANT GUARDIAN DATABASE SCHEMA =====
-- Multi-tenant PostgreSQL schema for loan covenant monitoring
-- Compatible with Xano and direct PostgreSQL deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== CORE MULTI-TENANT TABLES =====

-- 1. Banks (Tenants)
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(2),
    regulatory_id VARCHAR(50),
    subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
    max_contracts INTEGER DEFAULT 500,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_banks_regulatory_id ON banks(regulatory_id);

-- 2. Bank Users (for authentication)
CREATE TABLE bank_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'analyst', 'viewer')) DEFAULT 'analyst',
    hashed_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bank_id, email)
);
CREATE INDEX idx_bank_users_bank_id ON bank_users(bank_id);

-- ===== CONTRACT & COVENANT STRUCTURE =====

-- 3. Borrowers (Companies)
CREATE TABLE borrowers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    contract_name VARCHAR(255) NOT NULL,
    contract_number VARCHAR(50),
    principal_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    origination_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    interest_rate DECIMAL(5, 3), -- e.g., 5.250 = 5.25%
    status VARCHAR(20) CHECK (status IN ('active', 'closed', 'default', 'watch')) DEFAULT 'active',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Covenant Classification
    covenant_name VARCHAR(255) NOT NULL, -- e.g., "Debt-to-EBITDA Ratio"
    covenant_type VARCHAR(20) CHECK (covenant_type IN ('financial', 'operational', 'reporting', 'other')) DEFAULT 'financial',
    
    -- Threshold & Trigger
    metric_name VARCHAR(100), -- e.g., "Debt-to-EBITDA"
    operator VARCHAR(5) CHECK (operator IN ('<', '<=', '>', '>=', '=', '!=')) NOT NULL,
    threshold_value DECIMAL(10, 3), -- e.g., 3.50 for "Debt/EBITDA <= 3.5"
    threshold_unit VARCHAR(50), -- e.g., 'ratio', '%', 'USD', 'days'
    
    -- Monitoring
    check_frequency VARCHAR(20) CHECK (check_frequency IN ('monthly', 'quarterly', 'annually', 'on_demand')) DEFAULT 'quarterly',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Period & Source
    period_date DATE NOT NULL, -- e.g., Q4 2024
    period_type VARCHAR(20) CHECK (period_type IN ('monthly', 'quarterly', 'annual')) DEFAULT 'quarterly',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    event_type VARCHAR(30) CHECK (event_type IN ('news', 'regulatory', 'credit_rating_downgrade', 'executive_change', 'litigation', 'other')) DEFAULT 'news',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    covenant_id UUID NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    -- Latest Value & Status
    last_reported_value DECIMAL(10, 3),
    last_reported_date DATE,
    threshold_value DECIMAL(10, 3),
    
    -- Health Assessment
    status VARCHAR(20) CHECK (status IN ('compliant', 'warning', 'breached')) DEFAULT 'compliant',
    buffer_percentage DECIMAL(5, 2), -- How far from breach? (100% = at threshold, 0% = safe)
    days_to_breach INTEGER, -- Estimate based on trend
    
    trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'deteriorating')) DEFAULT 'stable',
    
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    covenant_id UUID NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(20) CHECK (alert_type IN ('warning', 'critical', 'breach', 'reporting_due')) DEFAULT 'warning',
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    trigger_metric_value DECIMAL(10, 3),
    threshold_value DECIMAL(10, 3),
    
    status VARCHAR(20) CHECK (status IN ('new', 'acknowledged', 'resolved', 'escalated')) DEFAULT 'new',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    report_type VARCHAR(30) CHECK (report_type IN ('portfolio_summary', 'borrower_deep_dive', 'covenant_analysis')) DEFAULT 'portfolio_summary',
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
    key_risks JSONB, -- {risk_1: severity, ...}
    recommendations JSONB,
    
    generated_by UUID REFERENCES bank_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_risk_reports_bank_id ON risk_reports(bank_id);
CREATE INDEX idx_risk_reports_date ON risk_reports(report_date DESC);

-- ===== AUDIT & SYSTEM TABLES =====

-- 12. Audit Log (compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    
    action VARCHAR(100), -- e.g., 'contract_created', 'alert_acknowledged', 'report_generated'
    table_name VARCHAR(50),
    record_id UUID,
    changes JSONB, -- old values vs new values
    
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES bank_users(id),
    
    alert_severity VARCHAR(20) CHECK (alert_severity IN ('critical', 'high', 'medium', 'all')) DEFAULT 'high',
    notification_channel VARCHAR(20) CHECK (notification_channel IN ('email', 'in_app', 'webhook')) DEFAULT 'email',
    
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

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary_view;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate buffer percentage
CREATE OR REPLACE FUNCTION calculate_buffer_percentage(
    last_value DECIMAL,
    threshold DECIMAL,
    operator_type VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
    CASE operator_type
        WHEN '<=' THEN
            RETURN CASE 
                WHEN last_value <= threshold THEN 0
                ELSE ((last_value - threshold) / threshold) * 100
            END;
        WHEN '>=' THEN
            RETURN CASE 
                WHEN last_value >= threshold THEN 0
                ELSE ((threshold - last_value) / threshold) * 100
            END;
        ELSE
            RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS FOR AUDIT LOGGING =====

-- Function to log changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (bank_id, action, table_name, record_id, changes, created_at)
        VALUES (
            COALESCE(NEW.bank_id, (SELECT bank_id FROM contracts WHERE id = NEW.contract_id LIMIT 1)),
            TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (bank_id, action, table_name, record_id, changes, created_at)
        VALUES (
            COALESCE(NEW.bank_id, (SELECT bank_id FROM contracts WHERE id = NEW.contract_id LIMIT 1)),
            TG_TABLE_NAME || '_updated',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (bank_id, action, table_name, record_id, changes, created_at)
        VALUES (
            COALESCE(OLD.bank_id, (SELECT bank_id FROM contracts WHERE id = OLD.contract_id LIMIT 1)),
            TG_TABLE_NAME || '_deleted',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for critical tables
CREATE TRIGGER audit_contracts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contracts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_covenants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON covenants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_alerts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON alerts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ===== INITIAL DATA =====

-- Insert default bank for development
INSERT INTO banks (name, country, regulatory_id, subscription_tier) 
VALUES ('Demo Bank', 'US', 'DEMO001', 'professional')
ON CONFLICT (name) DO NOTHING;