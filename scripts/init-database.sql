-- ===== COVENANT GUARDIAN DATABASE INITIALIZATION =====
-- Complete database setup with optimizations and enhancements
-- This script extends the base schema.sql with performance optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring

-- ===== PERFORMANCE OPTIMIZATION INDEXES =====

-- Multi-tenant isolation with status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_bank_status_created 
ON contracts(bank_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_type_frequency 
ON covenants(bank_id, covenant_type, check_frequency);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_bank_status_severity_triggered 
ON alerts(bank_id, status, severity, triggered_at DESC);

-- Covenant health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_status_buffer 
ON covenant_health(status, buffer_percentage DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_trend_calculated 
ON covenant_health(trend, last_calculated DESC);

-- Financial data queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_borrower_period_type 
ON financial_metrics(borrower_id, period_date DESC, period_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_confidence 
ON financial_metrics(data_confidence DESC, period_date DESC);

-- Dashboard and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_risk_score 
ON adverse_events(risk_score DESC, event_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_bank_action_created 
ON audit_logs(bank_id, action, created_at DESC);

-- ===== PARTIAL INDEXES FOR ACTIVE RECORDS =====

-- Only index active contracts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_active_bank 
ON contracts(bank_id, borrower_id) WHERE status = 'active';

-- Only index unacknowledged alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_unacknowledged 
ON alerts(bank_id, severity, triggered_at DESC) WHERE status IN ('new', 'escalated');

-- Only index breached/warning covenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_at_risk 
ON covenant_health(bank_id, contract_id, last_calculated DESC) WHERE status IN ('warning', 'breached');

-- Only index recent financial data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_recent 
ON financial_metrics(borrower_id, period_date DESC) WHERE period_date >= CURRENT_DATE - INTERVAL '2 years';

-- ===== ADDITIONAL MATERIALIZED VIEWS =====

-- Covenant health summary by bank
CREATE MATERIALIZED VIEW IF NOT EXISTS covenant_health_summary_view AS
SELECT
  ch.bank_id,
  COUNT(*) as total_covenants,
  COUNT(CASE WHEN ch.status = 'compliant' THEN 1 END) as compliant_count,
  COUNT(CASE WHEN ch.status = 'warning' THEN 1 END) as warning_count,
  COUNT(CASE WHEN ch.status = 'breached' THEN 1 END) as breached_count,
  AVG(ch.buffer_percentage) as avg_buffer_percentage,
  COUNT(CASE WHEN ch.trend = 'deteriorating' THEN 1 END) as deteriorating_count,
  MAX(ch.last_calculated) as last_updated
FROM covenant_health ch
GROUP BY ch.bank_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_covenant_health_summary_bank 
ON covenant_health_summary_view(bank_id);

-- Risk metrics by borrower
CREATE MATERIALIZED VIEW IF NOT EXISTS borrower_risk_summary_view AS
SELECT
  b.id as borrower_id,
  b.bank_id,
  b.legal_name,
  COUNT(DISTINCT c.id) as contract_count,
  SUM(c.principal_amount) as total_exposure,
  COUNT(CASE WHEN ch.status = 'breached' THEN 1 END) as breached_covenants,
  COUNT(CASE WHEN ch.status = 'warning' THEN 1 END) as warning_covenants,
  AVG(ae.risk_score) as avg_adverse_event_risk,
  COUNT(ae.id) as adverse_event_count,
  MAX(fm.period_date) as last_financial_update
FROM borrowers b
LEFT JOIN contracts c ON b.id = c.borrower_id AND c.status = 'active'
LEFT JOIN covenant_health ch ON c.id = ch.contract_id
LEFT JOIN adverse_events ae ON b.id = ae.borrower_id AND ae.event_date >= CURRENT_DATE - INTERVAL '1 year'
LEFT JOIN financial_metrics fm ON b.id = fm.borrower_id
GROUP BY b.id, b.bank_id, b.legal_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_borrower_risk_summary_borrower 
ON borrower_risk_summary_view(borrower_id);

CREATE INDEX IF NOT EXISTS idx_borrower_risk_summary_bank 
ON borrower_risk_summary_view(bank_id);

-- ===== DATA INTEGRITY CONSTRAINTS =====

-- Add check constraints
ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS chk_contracts_dates 
CHECK (maturity_date > origination_date);

ALTER TABLE contracts ADD CONSTRAINT IF NOT EXISTS chk_contracts_principal 
CHECK (principal_amount > 0);

ALTER TABLE covenants ADD CONSTRAINT IF NOT EXISTS chk_covenants_threshold 
CHECK (threshold_value IS NOT NULL OR metric_name IS NULL);

ALTER TABLE covenant_health ADD CONSTRAINT IF NOT EXISTS chk_covenant_health_buffer 
CHECK (buffer_percentage >= 0);

ALTER TABLE financial_metrics ADD CONSTRAINT IF NOT EXISTS chk_financial_confidence 
CHECK (data_confidence >= 0 AND data_confidence <= 1);

ALTER TABLE adverse_events ADD CONSTRAINT IF NOT EXISTS chk_adverse_risk_score 
CHECK (risk_score >= 0 AND risk_score <= 1);

-- ===== ENHANCED AUDIT LOGGING =====

-- Enhanced audit function with better change tracking
CREATE OR REPLACE FUNCTION enhanced_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data = to_jsonb(OLD);
    INSERT INTO audit_logs (
      bank_id, action, table_name, record_id, changes, created_at
    ) VALUES (
      COALESCE(OLD.bank_id, (SELECT bank_id FROM contracts WHERE id = OLD.contract_id LIMIT 1)),
      TG_TABLE_NAME || '_deleted',
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object('deleted_data', old_data),
      NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data = to_jsonb(OLD);
    new_data = to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_data->key, 'new', new_data->key))
    INTO changed_fields
    FROM jsonb_each(new_data)
    WHERE new_data->key IS DISTINCT FROM old_data->key;
    
    INSERT INTO audit_logs (
      bank_id, action, table_name, record_id, changes, created_at
    ) VALUES (
      COALESCE(NEW.bank_id, (SELECT bank_id FROM contracts WHERE id = NEW.contract_id LIMIT 1)),
      TG_TABLE_NAME || '_updated',
      TG_TABLE_NAME,
      NEW.id,
      changed_fields,
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_data = to_jsonb(NEW);
    INSERT INTO audit_logs (
      bank_id, action, table_name, record_id, changes, created_at
    ) VALUES (
      COALESCE(NEW.bank_id, (SELECT bank_id FROM contracts WHERE id = NEW.contract_id LIMIT 1)),
      TG_TABLE_NAME || '_created',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('created_data', new_data),
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===== UPDATED_AT TRIGGERS =====

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers for all relevant tables
CREATE TRIGGER IF NOT EXISTS update_contracts_updated_at 
BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_borrowers_updated_at 
BEFORE UPDATE ON borrowers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_covenants_updated_at 
BEFORE UPDATE ON covenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_covenant_health_updated_at 
BEFORE UPDATE ON covenant_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_financial_metrics_updated_at 
BEFORE UPDATE ON financial_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ENHANCED AUDIT TRIGGERS =====

-- Replace existing audit triggers with enhanced version
DROP TRIGGER IF EXISTS audit_contracts_trigger ON contracts;
DROP TRIGGER IF EXISTS audit_covenants_trigger ON covenants;
DROP TRIGGER IF EXISTS audit_alerts_trigger ON alerts;

CREATE TRIGGER enhanced_audit_contracts_trigger 
AFTER INSERT OR UPDATE OR DELETE ON contracts 
FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER enhanced_audit_covenants_trigger 
AFTER INSERT OR UPDATE OR DELETE ON covenants 
FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER enhanced_audit_alerts_trigger 
AFTER INSERT OR UPDATE OR DELETE ON alerts 
FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER enhanced_audit_financial_metrics_trigger 
AFTER INSERT OR UPDATE OR DELETE ON financial_metrics 
FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

-- ===== UTILITY FUNCTIONS =====

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY covenant_health_summary_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY borrower_risk_summary_view;
END;
$$ LANGUAGE plpgsql;

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins + n_tup_upd + n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION get_slow_queries(min_duration_ms INTEGER DEFAULT 1000)
RETURNS TABLE(
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pss.query,
    pss.calls,
    pss.total_time,
    pss.mean_time,
    pss.rows
  FROM pg_stat_statements pss
  WHERE pss.mean_time > min_duration_ms
  ORDER BY pss.mean_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ===== MAINTENANCE PROCEDURES =====

-- Procedure to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure to update covenant health for all active contracts
CREATE OR REPLACE FUNCTION update_all_covenant_health()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  covenant_record RECORD;
BEGIN
  FOR covenant_record IN 
    SELECT c.id, c.contract_id, c.bank_id, c.operator, c.threshold_value
    FROM covenants c
    JOIN contracts ct ON c.contract_id = ct.id
    WHERE ct.status = 'active'
  LOOP
    -- This would typically call the covenant health calculation logic
    -- For now, just update the last_calculated timestamp
    UPDATE covenant_health 
    SET last_calculated = NOW()
    WHERE covenant_id = covenant_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ===== INITIAL DATA SETUP =====

-- Ensure demo bank exists
INSERT INTO banks (name, country, regulatory_id, subscription_tier) 
VALUES ('Demo Bank', 'US', 'DEMO001', 'professional')
ON CONFLICT (name) DO NOTHING;

-- Create demo admin user
INSERT INTO bank_users (bank_id, email, role, hashed_password)
SELECT 
  b.id,
  'admin@demobank.com',
  'admin',
  '$2b$10$example_hashed_password' -- This should be properly hashed in production
FROM banks b 
WHERE b.name = 'Demo Bank'
ON CONFLICT (bank_id, email) DO NOTHING;

-- ===== PERFORMANCE MONITORING SETUP =====

-- Enable query statistics collection
SELECT pg_stat_statements_reset();

-- Create view for monitoring covenant health performance
CREATE OR REPLACE VIEW covenant_health_monitoring AS
SELECT 
  b.name as bank_name,
  COUNT(ch.id) as total_covenants,
  COUNT(CASE WHEN ch.status = 'breached' THEN 1 END) as breached_count,
  COUNT(CASE WHEN ch.status = 'warning' THEN 1 END) as warning_count,
  AVG(ch.buffer_percentage) as avg_buffer,
  MIN(ch.last_calculated) as oldest_calculation,
  MAX(ch.last_calculated) as newest_calculation
FROM banks b
LEFT JOIN covenant_health ch ON b.id = ch.bank_id
GROUP BY b.id, b.name;

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
  RAISE NOTICE 'Covenant Guardian database initialization completed successfully!';
  RAISE NOTICE 'Performance indexes: Created';
  RAISE NOTICE 'Materialized views: Created';
  RAISE NOTICE 'Data integrity constraints: Added';
  RAISE NOTICE 'Enhanced audit logging: Enabled';
  RAISE NOTICE 'Utility functions: Available';
  RAISE NOTICE 'Demo data: Initialized';
END $$;