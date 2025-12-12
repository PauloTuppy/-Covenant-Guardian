/**
 * Database Migration Utilities
 * Helper functions for database schema updates and data migrations
 */

// ===== MIGRATION INTERFACE =====

export interface Migration {
  id: string;
  name: string;
  description: string;
  up: string[];
  down: string[];
  dependencies?: string[];
}

// ===== PERFORMANCE OPTIMIZATION MIGRATIONS =====

export const performanceOptimizationMigrations: Migration[] = [
  {
    id: '001_add_performance_indexes',
    name: 'Add Performance Indexes',
    description: 'Add composite indexes for common query patterns',
    up: [
      // Multi-tenant isolation with status filtering
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_bank_status_created ON contracts(bank_id, status, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_type_frequency ON covenants(bank_id, covenant_type, check_frequency)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_bank_status_severity_triggered ON alerts(bank_id, status, severity, triggered_at DESC)',
      
      // Covenant health monitoring
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_status_buffer ON covenant_health(status, buffer_percentage DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_trend_calculated ON covenant_health(trend, last_calculated DESC)',
      
      // Financial data queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_borrower_period_type ON financial_metrics(borrower_id, period_date DESC, period_type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_confidence ON financial_metrics(data_confidence DESC, period_date DESC)',
      
      // Dashboard and reporting
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_risk_score ON adverse_events(risk_score DESC, event_date DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_bank_action_created ON audit_logs(bank_id, action, created_at DESC)',
    ],
    down: [
      'DROP INDEX CONCURRENTLY IF EXISTS idx_contracts_bank_status_created',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_covenants_bank_type_frequency',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_alerts_bank_status_severity_triggered',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_covenant_health_status_buffer',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_covenant_health_trend_calculated',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_financial_metrics_borrower_period_type',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_financial_metrics_confidence',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_adverse_events_risk_score',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_bank_action_created',
    ],
  },
  
  {
    id: '002_add_partial_indexes',
    name: 'Add Partial Indexes',
    description: 'Add partial indexes for active records and specific statuses',
    up: [
      // Only index active contracts
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_active_bank ON contracts(bank_id, borrower_id) WHERE status = \'active\'',
      
      // Only index unacknowledged alerts
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_unacknowledged ON alerts(bank_id, severity, triggered_at DESC) WHERE status IN (\'new\', \'escalated\')',
      
      // Only index breached/warning covenants
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_at_risk ON covenant_health(bank_id, contract_id, last_calculated DESC) WHERE status IN (\'warning\', \'breached\')',
      
      // Only index recent financial data
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_recent ON financial_metrics(borrower_id, period_date DESC) WHERE period_date >= CURRENT_DATE - INTERVAL \'2 years\'',
    ],
    down: [
      'DROP INDEX CONCURRENTLY IF EXISTS idx_contracts_active_bank',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_alerts_unacknowledged',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_covenant_health_at_risk',
      'DROP INDEX CONCURRENTLY IF EXISTS idx_financial_metrics_recent',
    ],
  },
  
  {
    id: '003_optimize_materialized_views',
    name: 'Optimize Materialized Views',
    description: 'Add additional materialized views for dashboard performance',
    up: [
      // Covenant health summary by bank
      `CREATE MATERIALIZED VIEW covenant_health_summary_view AS
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
       GROUP BY ch.bank_id`,
      
      'CREATE UNIQUE INDEX idx_covenant_health_summary_bank ON covenant_health_summary_view(bank_id)',
      
      // Risk metrics by borrower
      `CREATE MATERIALIZED VIEW borrower_risk_summary_view AS
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
       GROUP BY b.id, b.bank_id, b.legal_name`,
      
      'CREATE UNIQUE INDEX idx_borrower_risk_summary_borrower ON borrower_risk_summary_view(borrower_id)',
      'CREATE INDEX idx_borrower_risk_summary_bank ON borrower_risk_summary_view(bank_id)',
    ],
    down: [
      'DROP MATERIALIZED VIEW IF EXISTS covenant_health_summary_view',
      'DROP MATERIALIZED VIEW IF EXISTS borrower_risk_summary_view',
    ],
  },
];

// ===== DATA INTEGRITY MIGRATIONS =====

export const dataIntegrityMigrations: Migration[] = [
  {
    id: '004_add_data_constraints',
    name: 'Add Data Integrity Constraints',
    description: 'Add check constraints and triggers for data validation',
    up: [
      // Add check constraints
      'ALTER TABLE contracts ADD CONSTRAINT chk_contracts_dates CHECK (maturity_date > origination_date)',
      'ALTER TABLE contracts ADD CONSTRAINT chk_contracts_principal CHECK (principal_amount > 0)',
      'ALTER TABLE covenants ADD CONSTRAINT chk_covenants_threshold CHECK (threshold_value IS NOT NULL OR metric_name IS NULL)',
      'ALTER TABLE covenant_health ADD CONSTRAINT chk_covenant_health_buffer CHECK (buffer_percentage >= 0)',
      'ALTER TABLE financial_metrics ADD CONSTRAINT chk_financial_confidence CHECK (data_confidence >= 0 AND data_confidence <= 1)',
      'ALTER TABLE adverse_events ADD CONSTRAINT chk_adverse_risk_score CHECK (risk_score >= 0 AND risk_score <= 1)',
      
      // Add updated_at triggers
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      
      'CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON borrowers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_covenants_updated_at BEFORE UPDATE ON covenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_covenant_health_updated_at BEFORE UPDATE ON covenant_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_financial_metrics_updated_at BEFORE UPDATE ON financial_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    ],
    down: [
      'ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_dates',
      'ALTER TABLE contracts DROP CONSTRAINT IF EXISTS chk_contracts_principal',
      'ALTER TABLE covenants DROP CONSTRAINT IF EXISTS chk_covenants_threshold',
      'ALTER TABLE covenant_health DROP CONSTRAINT IF EXISTS chk_covenant_health_buffer',
      'ALTER TABLE financial_metrics DROP CONSTRAINT IF EXISTS chk_financial_confidence',
      'ALTER TABLE adverse_events DROP CONSTRAINT IF EXISTS chk_adverse_risk_score',
      
      'DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts',
      'DROP TRIGGER IF EXISTS update_borrowers_updated_at ON borrowers',
      'DROP TRIGGER IF EXISTS update_covenants_updated_at ON covenants',
      'DROP TRIGGER IF EXISTS update_covenant_health_updated_at ON covenant_health',
      'DROP TRIGGER IF EXISTS update_financial_metrics_updated_at ON financial_metrics',
      
      'DROP FUNCTION IF EXISTS update_updated_at_column()',
    ],
  },
];

// ===== AUDIT ENHANCEMENT MIGRATIONS =====

export const auditEnhancementMigrations: Migration[] = [
  {
    id: '005_enhance_audit_logging',
    name: 'Enhance Audit Logging',
    description: 'Add comprehensive audit triggers and improve audit log structure',
    up: [
      // Enhanced audit function with better change tracking
      `CREATE OR REPLACE FUNCTION enhanced_audit_trigger_function()
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
       $$ LANGUAGE plpgsql`,
      
      // Replace existing audit triggers with enhanced version
      'DROP TRIGGER IF EXISTS audit_contracts_trigger ON contracts',
      'DROP TRIGGER IF EXISTS audit_covenants_trigger ON covenants',
      'DROP TRIGGER IF EXISTS audit_alerts_trigger ON alerts',
      
      'CREATE TRIGGER enhanced_audit_contracts_trigger AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function()',
      'CREATE TRIGGER enhanced_audit_covenants_trigger AFTER INSERT OR UPDATE OR DELETE ON covenants FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function()',
      'CREATE TRIGGER enhanced_audit_alerts_trigger AFTER INSERT OR UPDATE OR DELETE ON alerts FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function()',
      'CREATE TRIGGER enhanced_audit_financial_metrics_trigger AFTER INSERT OR UPDATE OR DELETE ON financial_metrics FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function()',
    ],
    down: [
      'DROP TRIGGER IF EXISTS enhanced_audit_contracts_trigger ON contracts',
      'DROP TRIGGER IF EXISTS enhanced_audit_covenants_trigger ON covenants',
      'DROP TRIGGER IF EXISTS enhanced_audit_alerts_trigger ON alerts',
      'DROP TRIGGER IF EXISTS enhanced_audit_financial_metrics_trigger ON financial_metrics',
      
      // Restore original audit triggers
      'CREATE TRIGGER audit_contracts_trigger AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      'CREATE TRIGGER audit_covenants_trigger AFTER INSERT OR UPDATE OR DELETE ON covenants FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      'CREATE TRIGGER audit_alerts_trigger AFTER INSERT OR UPDATE OR DELETE ON alerts FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      
      'DROP FUNCTION IF EXISTS enhanced_audit_trigger_function()',
    ],
  },
];

// ===== MIGRATION UTILITIES =====

/**
 * Get all available migrations
 */
export function getAllMigrations(): Migration[] {
  return [
    ...performanceOptimizationMigrations,
    ...dataIntegrityMigrations,
    ...auditEnhancementMigrations,
  ];
}

/**
 * Get migrations by category
 */
export function getMigrationsByCategory(category: 'performance' | 'integrity' | 'audit'): Migration[] {
  switch (category) {
    case 'performance':
      return performanceOptimizationMigrations;
    case 'integrity':
      return dataIntegrityMigrations;
    case 'audit':
      return auditEnhancementMigrations;
    default:
      return [];
  }
}

/**
 * Generate SQL script for migration
 */
export function generateMigrationSQL(migration: Migration, direction: 'up' | 'down' = 'up'): string {
  const statements = direction === 'up' ? migration.up : migration.down;
  
  return `
-- Migration: ${migration.name}
-- Description: ${migration.description}
-- Direction: ${direction.toUpperCase()}
-- Generated: ${new Date().toISOString()}

BEGIN;

${statements.map(stmt => `${stmt};`).join('\n\n')}

COMMIT;
  `.trim();
}

/**
 * Validate migration dependencies
 */
export function validateMigrationDependencies(migrations: Migration[]): string[] {
  const errors: string[] = [];
  const migrationIds = new Set(migrations.map(m => m.id));
  
  migrations.forEach(migration => {
    if (migration.dependencies) {
      migration.dependencies.forEach(depId => {
        if (!migrationIds.has(depId)) {
          errors.push(`Migration ${migration.id} depends on missing migration ${depId}`);
        }
      });
    }
  });
  
  return errors;
}

/**
 * Sort migrations by dependencies
 */
export function sortMigrationsByDependencies(migrations: Migration[]): Migration[] {
  const sorted: Migration[] = [];
  const remaining = [...migrations];
  const processed = new Set<string>();
  
  while (remaining.length > 0) {
    const canProcess = remaining.filter(migration => 
      !migration.dependencies || 
      migration.dependencies.every(depId => processed.has(depId))
    );
    
    if (canProcess.length === 0) {
      throw new Error('Circular dependency detected in migrations');
    }
    
    canProcess.forEach(migration => {
      sorted.push(migration);
      processed.add(migration.id);
      const index = remaining.indexOf(migration);
      remaining.splice(index, 1);
    });
  }
  
  return sorted;
}

// ===== EXPORT UTILITIES =====

export const MigrationUtils = {
  getAllMigrations,
  getMigrationsByCategory,
  generateMigrationSQL,
  validateMigrationDependencies,
  sortMigrationsByDependencies,
};

export default MigrationUtils;