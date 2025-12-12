-- ===== DATABASE OPTIMIZATION SCRIPT =====
-- Performance optimization indexes and configurations
-- Requirements: 9.1, 10.1, 10.4

-- ===== COMPOSITE INDEXES FOR MULTI-TENANT QUERIES =====

-- Contracts: Optimize bank-filtered queries with status and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_bank_status_date 
ON contracts(bank_id, status, created_at DESC);

-- Contracts: Optimize borrower lookups with principal amount
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_borrower_principal 
ON contracts(borrower_id, principal_amount) 
WHERE status = 'active';

-- Covenants: Optimize bank-filtered queries with contract and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_contract_type 
ON covenants(bank_id, contract_id, covenant_type);

-- Covenants: Optimize next check date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_next_check 
ON covenants(bank_id, next_check_date) 
WHERE next_check_date IS NOT NULL;

-- ===== ALERT SYSTEM INDEXES =====

-- Alerts: Optimize dashboard queries for new alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_bank_status_severity_date 
ON alerts(bank_id, status, severity, triggered_at DESC);

-- Alerts: Partial index for new alerts only (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_new_only 
ON alerts(bank_id, triggered_at DESC) 
WHERE status = 'new';

-- Alerts: Optimize escalation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_escalation 
ON alerts(bank_id, status, triggered_at) 
WHERE status IN ('new', 'escalated');

-- ===== COVENANT HEALTH INDEXES =====

-- Covenant Health: Optimize status-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_bank_status 
ON covenant_health(bank_id, status, last_calculated DESC);

-- Covenant Health: Partial index for breached covenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_breached 
ON covenant_health(bank_id, covenant_id, buffer_percentage) 
WHERE status = 'breached';

-- Covenant Health: Partial index for warning covenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_warning 
ON covenant_health(bank_id, covenant_id, buffer_percentage) 
WHERE status = 'warning';

-- ===== FINANCIAL DATA INDEXES =====

-- Financial Metrics: Optimize borrower period lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_borrower_period 
ON financial_metrics(borrower_id, period_date DESC);

-- Financial Metrics: Optimize bank-filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_bank_borrower 
ON financial_metrics(bank_id, borrower_id, period_date DESC);

-- Adverse Events: Optimize risk-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_borrower_risk 
ON adverse_events(borrower_id, risk_score DESC, event_date DESC);

-- Adverse Events: Optimize bank-filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_bank_date 
ON adverse_events(bank_id, event_date DESC);

-- ===== AUDIT LOG INDEXES =====

-- Audit Logs: Optimize action-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_bank_action_date 
ON audit_logs(bank_id, action, created_at DESC);

-- Audit Logs: Optimize user activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- ===== BORROWER INDEXES =====

-- Borrowers: Optimize ticker symbol lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrowers_bank_ticker 
ON borrowers(bank_id, ticker_symbol) 
WHERE ticker_symbol IS NOT NULL;

-- Borrowers: Optimize credit rating queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrowers_bank_rating 
ON borrowers(bank_id, credit_rating);

-- ===== REPORT INDEXES =====

-- Risk Reports: Optimize date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_reports_bank_date_type 
ON risk_reports(bank_id, report_date DESC, report_type);

-- ===== MATERIALIZED VIEW OPTIMIZATION =====

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_summary_unique 
ON portfolio_summary_view(bank_id);

-- ===== ADDITIONAL MATERIALIZED VIEWS FOR DASHBOARD PERFORMANCE =====

-- Covenant status summary by bank
CREATE MATERIALIZED VIEW IF NOT EXISTS covenant_status_summary AS
SELECT
    bank_id,
    COUNT(*) as total_covenants,
    COUNT(CASE WHEN status = 'compliant' THEN 1 END) as compliant_count,
    COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN status = 'breached' THEN 1 END) as breached_count,
    AVG(buffer_percentage) as avg_buffer_percentage,
    MAX(last_calculated) as last_updated
FROM covenant_health
GROUP BY bank_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_covenant_status_summary_bank 
ON covenant_status_summary(bank_id);

-- Alert summary by bank
CREATE MATERIALIZED VIEW IF NOT EXISTS alert_summary AS
SELECT
    bank_id,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
    COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged_count,
    COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_count,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
    MAX(triggered_at) as latest_alert
FROM alerts
GROUP BY bank_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_summary_bank 
ON alert_summary(bank_id);

-- ===== REFRESH FUNCTIONS FOR MATERIALIZED VIEWS =====

-- Function to refresh all dashboard materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary_view;
    REFRESH MATERIALIZED VIEW CONCURRENTLY covenant_status_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY alert_summary;
END;
$$ LANGUAGE plpgsql;

-- ===== QUERY OPTIMIZATION SETTINGS =====

-- Increase work_mem for complex queries (adjust based on available memory)
-- ALTER SYSTEM SET work_mem = '256MB';

-- Enable parallel query execution
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Optimize for SSD storage
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- ===== VACUUM AND ANALYZE =====

-- Analyze tables for query planner optimization
ANALYZE contracts;
ANALYZE covenants;
ANALYZE covenant_health;
ANALYZE alerts;
ANALYZE financial_metrics;
ANALYZE adverse_events;
ANALYZE borrowers;
ANALYZE audit_logs;
ANALYZE risk_reports;

-- ===== TABLE STATISTICS =====

-- Increase statistics target for frequently filtered columns
ALTER TABLE contracts ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE contracts ALTER COLUMN bank_id SET STATISTICS 1000;
ALTER TABLE alerts ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE alerts ALTER COLUMN severity SET STATISTICS 1000;
ALTER TABLE covenant_health ALTER COLUMN status SET STATISTICS 1000;

-- ===== PARTITIONING RECOMMENDATIONS =====
-- For large deployments, consider partitioning these tables:
-- 
-- 1. audit_logs - Partition by created_at (monthly)
-- CREATE TABLE audit_logs_partitioned (LIKE audit_logs INCLUDING ALL)
-- PARTITION BY RANGE (created_at);
--
-- 2. financial_metrics - Partition by period_date (quarterly)
-- 3. adverse_events - Partition by event_date (monthly)
--
-- This improves query performance and enables efficient data archival.

-- ===== CONNECTION POOLING RECOMMENDATIONS =====
-- For production, use PgBouncer or similar connection pooler:
-- - pool_mode = transaction
-- - max_client_conn = 1000
-- - default_pool_size = 25
-- - reserve_pool_size = 5
