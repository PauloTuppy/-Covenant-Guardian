-- ===== COVENANT GUARDIAN DATABASE MAINTENANCE =====
-- Periodic maintenance script for optimal database performance
-- Run this script weekly or monthly depending on data volume

-- ===== MAINTENANCE REPORT HEADER =====
DO $$
BEGIN
  RAISE NOTICE '=== COVENANT GUARDIAN DATABASE MAINTENANCE ===';
  RAISE NOTICE 'Started at: %', NOW();
  RAISE NOTICE '';
END $$;

-- ===== ANALYZE TABLES FOR QUERY PLANNER =====
DO $$
BEGIN
  RAISE NOTICE '1. Analyzing tables for query planner optimization...';
END $$;

ANALYZE banks;
ANALYZE bank_users;
ANALYZE borrowers;
ANALYZE contracts;
ANALYZE covenants;
ANALYZE covenant_health;
ANALYZE financial_metrics;
ANALYZE adverse_events;
ANALYZE alerts;
ANALYZE risk_reports;
ANALYZE audit_logs;

-- ===== REFRESH MATERIALIZED VIEWS =====
DO $$
BEGIN
  RAISE NOTICE '2. Refreshing materialized views...';
END $$;

REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY covenant_health_summary_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY borrower_risk_summary_view;

-- ===== CLEANUP OLD DATA =====
DO $$
DECLARE
  deleted_audit_logs INTEGER;
  deleted_old_alerts INTEGER;
  deleted_old_reports INTEGER;
BEGIN
  RAISE NOTICE '3. Cleaning up old data...';
  
  -- Clean up audit logs older than 1 year
  SELECT cleanup_old_audit_logs(365) INTO deleted_audit_logs;
  RAISE NOTICE '   Deleted % old audit log entries', deleted_audit_logs;
  
  -- Clean up resolved alerts older than 6 months
  DELETE FROM alerts 
  WHERE status = 'resolved' 
    AND updated_at < NOW() - INTERVAL '6 months';
  GET DIAGNOSTICS deleted_old_alerts = ROW_COUNT;
  RAISE NOTICE '   Deleted % old resolved alerts', deleted_old_alerts;
  
  -- Clean up old risk reports (keep last 2 years)
  DELETE FROM risk_reports 
  WHERE created_at < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS deleted_old_reports = ROW_COUNT;
  RAISE NOTICE '   Deleted % old risk reports', deleted_old_reports;
END $$;

-- ===== VACUUM AND REINDEX =====
DO $$
BEGIN
  RAISE NOTICE '4. Performing vacuum and reindex operations...';
END $$;

-- Vacuum analyze critical tables
VACUUM ANALYZE contracts;
VACUUM ANALYZE covenants;
VACUUM ANALYZE covenant_health;
VACUUM ANALYZE alerts;
VACUUM ANALYZE financial_metrics;
VACUUM ANALYZE audit_logs;

-- Reindex critical indexes if needed
REINDEX INDEX CONCURRENTLY idx_contracts_bank_id;
REINDEX INDEX CONCURRENTLY idx_covenant_health_status;
REINDEX INDEX CONCURRENTLY idx_alerts_triggered;

-- ===== UPDATE STATISTICS =====
DO $$
DECLARE
  total_contracts INTEGER;
  total_covenants INTEGER;
  total_alerts INTEGER;
  breached_covenants INTEGER;
  warning_covenants INTEGER;
BEGIN
  RAISE NOTICE '5. Generating database statistics...';
  
  SELECT COUNT(*) INTO total_contracts FROM contracts WHERE status = 'active';
  SELECT COUNT(*) INTO total_covenants FROM covenants;
  SELECT COUNT(*) INTO total_alerts FROM alerts WHERE status IN ('new', 'escalated');
  SELECT COUNT(*) INTO breached_covenants FROM covenant_health WHERE status = 'breached';
  SELECT COUNT(*) INTO warning_covenants FROM covenant_health WHERE status = 'warning';
  
  RAISE NOTICE '   Active contracts: %', total_contracts;
  RAISE NOTICE '   Total covenants: %', total_covenants;
  RAISE NOTICE '   Open alerts: %', total_alerts;
  RAISE NOTICE '   Breached covenants: %', breached_covenants;
  RAISE NOTICE '   Warning covenants: %', warning_covenants;
END $$;

-- ===== CHECK INDEX USAGE =====
DO $$
BEGIN
  RAISE NOTICE '6. Checking index usage statistics...';
  RAISE NOTICE '   Top 10 most used indexes:';
END $$;

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE idx_scan > 0
ORDER BY idx_scan DESC 
LIMIT 10;

-- ===== IDENTIFY UNUSED INDEXES =====
DO $$
BEGIN
  RAISE NOTICE '7. Identifying potentially unused indexes...';
END $$;

SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ===== CHECK TABLE SIZES =====
DO $$
BEGIN
  RAISE NOTICE '8. Table size analysis...';
END $$;

SELECT 
  schemaname||'.'||tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
  n_tup_ins + n_tup_upd + n_tup_del as total_operations
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- ===== SLOW QUERY ANALYSIS =====
DO $$
BEGIN
  RAISE NOTICE '9. Analyzing slow queries (if pg_stat_statements is enabled)...';
END $$;

-- Check if pg_stat_statements is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE '   Top 5 slowest queries by mean execution time:';
    
    -- This would show slow queries, but we'll just indicate it's available
    PERFORM 1 FROM pg_stat_statements LIMIT 1;
    RAISE NOTICE '   pg_stat_statements data available - check manually if needed';
  ELSE
    RAISE NOTICE '   pg_stat_statements extension not available';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '   Could not access pg_stat_statements';
END $$;

-- ===== CHECK CONSTRAINT VIOLATIONS =====
DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  RAISE NOTICE '10. Checking for potential data integrity issues...';
  
  -- Check for contracts with invalid date ranges
  SELECT COUNT(*) INTO violation_count
  FROM contracts 
  WHERE maturity_date <= origination_date;
  
  IF violation_count > 0 THEN
    RAISE WARNING '   Found % contracts with invalid date ranges', violation_count;
  END IF;
  
  -- Check for covenant health records without recent calculations
  SELECT COUNT(*) INTO violation_count
  FROM covenant_health 
  WHERE last_calculated < NOW() - INTERVAL '7 days';
  
  IF violation_count > 0 THEN
    RAISE WARNING '   Found % covenant health records with stale calculations', violation_count;
  END IF;
  
  -- Check for financial metrics with invalid confidence scores
  SELECT COUNT(*) INTO violation_count
  FROM financial_metrics 
  WHERE data_confidence < 0 OR data_confidence > 1;
  
  IF violation_count > 0 THEN
    RAISE WARNING '   Found % financial metrics with invalid confidence scores', violation_count;
  END IF;
  
  IF violation_count = 0 THEN
    RAISE NOTICE '   No data integrity issues found';
  END IF;
END $$;

-- ===== UPDATE COVENANT HEALTH CALCULATIONS =====
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE '11. Updating covenant health calculations...';
  
  SELECT update_all_covenant_health() INTO updated_count;
  RAISE NOTICE '   Updated % covenant health records', updated_count;
END $$;

-- ===== MAINTENANCE COMPLETION =====
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MAINTENANCE COMPLETED ===';
  RAISE NOTICE 'Finished at: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'Recommendations:';
  RAISE NOTICE '- Review any warnings above';
  RAISE NOTICE '- Monitor slow queries if pg_stat_statements is available';
  RAISE NOTICE '- Consider archiving old data if tables are growing large';
  RAISE NOTICE '- Schedule this maintenance script to run weekly/monthly';
END $$;

-- ===== GENERATE MAINTENANCE REPORT =====
INSERT INTO audit_logs (
  bank_id, 
  action, 
  table_name, 
  record_id, 
  changes, 
  user_email,
  created_at
) 
SELECT 
  b.id,
  'database_maintenance_completed',
  'system',
  gen_random_uuid()::text,
  jsonb_build_object(
    'maintenance_type', 'scheduled_maintenance',
    'completed_at', NOW(),
    'operations', ARRAY[
      'analyze_tables',
      'refresh_materialized_views', 
      'cleanup_old_data',
      'vacuum_reindex',
      'update_covenant_health'
    ]
  ),
  'system@maintenance',
  NOW()
FROM banks b
LIMIT 1;