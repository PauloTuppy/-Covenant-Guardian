/**
 * Database Utility Functions
 * Helper functions for database operations, query optimization, and data validation
 */

import { 
  Contract, 
  Covenant, 
  CovenantHealth, 
  FinancialMetrics, 
  Alert,
  PortfolioSummary,
  CovenantStatus,
  TrendDirection 
} from '@/types';

// ===== QUERY BUILDERS =====

/**
 * Build multi-tenant WHERE clause for database queries
 */
export function buildTenantFilter(bankId: string): string {
  return `bank_id = '${bankId}'`;
}

/**
 * Build pagination clause for queries
 */
export function buildPaginationClause(page: number = 1, limit: number = 20): string {
  const offset = (page - 1) * limit;
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Build ORDER BY clause with validation
 */
export function buildOrderByClause(
  sortField: string, 
  order: 'asc' | 'desc' = 'desc',
  allowedFields: string[] = []
): string {
  // Validate sort field to prevent SQL injection
  if (allowedFields.length > 0 && !allowedFields.includes(sortField)) {
    throw new Error(`Invalid sort field: ${sortField}`);
  }
  
  // Sanitize field name (basic validation)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortField)) {
    throw new Error(`Invalid field name format: ${sortField}`);
  }
  
  return `ORDER BY ${sortField} ${order.toUpperCase()}`;
}

// ===== COVENANT HEALTH CALCULATIONS =====

/**
 * Calculate buffer percentage for covenant health
 */
export function calculateBufferPercentage(
  currentValue: number,
  thresholdValue: number,
  operator: string
): number {
  switch (operator) {
    case '<=':
      return currentValue <= thresholdValue 
        ? 0 
        : ((currentValue - thresholdValue) / thresholdValue) * 100;
    
    case '>=':
      return currentValue >= thresholdValue 
        ? 0 
        : ((thresholdValue - currentValue) / thresholdValue) * 100;
    
    case '<':
      return currentValue < thresholdValue 
        ? 0 
        : ((currentValue - thresholdValue) / thresholdValue) * 100;
    
    case '>':
      return currentValue > thresholdValue 
        ? 0 
        : ((thresholdValue - currentValue) / thresholdValue) * 100;
    
    case '=':
      return currentValue === thresholdValue ? 0 : 100;
    
    case '!=':
      return currentValue !== thresholdValue ? 0 : 100;
    
    default:
      return 0;
  }
}

/**
 * Determine covenant status based on current value and threshold
 */
export function determineCovenantStatus(
  currentValue: number,
  thresholdValue: number,
  operator: string,
  warningThreshold: number = 0.1 // 10% buffer for warning
): CovenantStatus {
  // Check if breached first
  const isBreached = evaluateCovenantCondition(currentValue, thresholdValue, operator, true);
  if (isBreached) {
    return 'breached';
  }
  
  // Calculate how close we are to the threshold
  let distanceToThreshold: number;
  
  switch (operator) {
    case '<=':
    case '<':
      distanceToThreshold = (thresholdValue - currentValue) / thresholdValue;
      break;
    case '>=':
    case '>':
      distanceToThreshold = (currentValue - thresholdValue) / thresholdValue;
      break;
    case '=':
      distanceToThreshold = Math.abs(currentValue - thresholdValue) / thresholdValue;
      break;
    case '!=':
      return 'compliant'; // For != operator, either compliant or breached
    default:
      return 'compliant';
  }
  
  // Check if in warning zone (within warning threshold of breach)
  if (distanceToThreshold <= warningThreshold) {
    return 'warning';
  }
  
  return 'compliant';
}

/**
 * Evaluate if covenant condition is met or breached
 */
export function evaluateCovenantCondition(
  currentValue: number,
  thresholdValue: number,
  operator: string,
  checkForBreach: boolean = false
): boolean {
  switch (operator) {
    case '<=':
      return checkForBreach ? currentValue > thresholdValue : currentValue <= thresholdValue;
    case '>=':
      return checkForBreach ? currentValue < thresholdValue : currentValue >= thresholdValue;
    case '<':
      return checkForBreach ? currentValue >= thresholdValue : currentValue < thresholdValue;
    case '>':
      return checkForBreach ? currentValue <= thresholdValue : currentValue > thresholdValue;
    case '=':
      return checkForBreach ? currentValue !== thresholdValue : currentValue === thresholdValue;
    case '!=':
      return checkForBreach ? currentValue === thresholdValue : currentValue !== thresholdValue;
    default:
      return false;
  }
}

// ===== TREND ANALYSIS =====

/**
 * Calculate trend direction from historical data points
 */
export function calculateTrend(dataPoints: number[]): TrendDirection {
  if (dataPoints.length < 2) {
    return 'stable';
  }
  
  // Simple linear regression to determine trend
  const n = dataPoints.length;
  const xSum = dataPoints.reduce((sum, _, index) => sum + index, 0);
  const ySum = dataPoints.reduce((sum, value) => sum + value, 0);
  const xySum = dataPoints.reduce((sum, value, index) => sum + (index * value), 0);
  const x2Sum = dataPoints.reduce((sum, _, index) => sum + (index * index), 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  
  // Determine trend based on slope
  const threshold = 0.01; // Minimum slope to consider as trending
  
  if (slope > threshold) {
    return 'improving';
  } else if (slope < -threshold) {
    return 'deteriorating';
  } else {
    return 'stable';
  }
}

/**
 * Estimate days to breach based on current trend
 */
export function estimateDaysToBreach(
  currentValue: number,
  thresholdValue: number,
  operator: string,
  trendSlope: number,
  periodsPerYear: number = 4 // Quarterly reporting
): number | null {
  if (trendSlope === 0) {
    return null; // No trend, can't estimate
  }
  
  let targetValue: number;
  
  switch (operator) {
    case '<=':
    case '<':
      if (trendSlope <= 0) return null; // Improving or stable
      targetValue = thresholdValue;
      break;
    case '>=':
    case '>':
      if (trendSlope >= 0) return null; // Improving or stable
      targetValue = thresholdValue;
      break;
    default:
      return null;
  }
  
  const periodsToBreach = (targetValue - currentValue) / trendSlope;
  const daysPerPeriod = 365 / periodsPerYear;
  
  return Math.max(0, Math.round(periodsToBreach * daysPerPeriod));
}

// ===== DATA VALIDATION =====

/**
 * Validate financial metrics data
 */
export function validateFinancialMetrics(metrics: Partial<FinancialMetrics>): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (!metrics.borrower_id) {
    errors.push('Borrower ID is required');
  }
  
  if (!metrics.period_date) {
    errors.push('Period date is required');
  }
  
  if (!metrics.source) {
    errors.push('Data source is required');
  }
  
  // Validate numeric fields are positive where appropriate
  const positiveFields = ['debt_total', 'revenue', 'current_assets', 'equity_total'];
  positiveFields.forEach(field => {
    const value = metrics[field as keyof FinancialMetrics] as number;
    if (value !== undefined && value < 0) {
      errors.push(`${field} cannot be negative`);
    }
  });
  
  // Validate ratios are reasonable
  if (metrics.debt_to_ebitda !== undefined && metrics.debt_to_ebitda < 0) {
    errors.push('Debt-to-EBITDA ratio cannot be negative');
  }
  
  if (metrics.current_ratio !== undefined && metrics.current_ratio < 0) {
    errors.push('Current ratio cannot be negative');
  }
  
  // Validate data confidence
  if (metrics.data_confidence !== undefined) {
    if (metrics.data_confidence < 0 || metrics.data_confidence > 1) {
      errors.push('Data confidence must be between 0 and 1');
    }
  }
  
  return errors;
}

/**
 * Validate covenant data
 */
export function validateCovenant(covenant: Partial<Covenant>): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (!covenant.contract_id) {
    errors.push('Contract ID is required');
  }
  
  if (!covenant.covenant_name) {
    errors.push('Covenant name is required');
  }
  
  if (!covenant.operator) {
    errors.push('Operator is required');
  }
  
  // Validate operator
  const validOperators = ['<', '<=', '>', '>=', '=', '!='];
  if (covenant.operator && !validOperators.includes(covenant.operator)) {
    errors.push('Invalid operator');
  }
  
  // Validate covenant type
  const validTypes = ['financial', 'operational', 'reporting', 'other'];
  if (covenant.covenant_type && !validTypes.includes(covenant.covenant_type)) {
    errors.push('Invalid covenant type');
  }
  
  // Validate check frequency
  const validFrequencies = ['monthly', 'quarterly', 'annually', 'on_demand'];
  if (covenant.check_frequency && !validFrequencies.includes(covenant.check_frequency)) {
    errors.push('Invalid check frequency');
  }
  
  return errors;
}

// ===== QUERY OPTIMIZATION HELPERS =====

/**
 * Generate optimized query for covenant health dashboard
 */
export function buildCovenantHealthQuery(bankId: string, filters?: {
  status?: CovenantStatus;
  contractId?: string;
  limit?: number;
}): string {
  const baseQuery = `
    SELECT 
      ch.*,
      c.covenant_name,
      c.covenant_type,
      c.operator,
      c.threshold_value as covenant_threshold,
      ct.contract_name,
      ct.borrower_id,
      b.legal_name as borrower_name
    FROM covenant_health ch
    JOIN covenants c ON ch.covenant_id = c.id
    JOIN contracts ct ON ch.contract_id = ct.id
    JOIN borrowers b ON ct.borrower_id = b.id
    WHERE ch.bank_id = '${bankId}'
  `;
  
  let whereClause = '';
  
  if (filters?.status) {
    whereClause += ` AND ch.status = '${filters.status}'`;
  }
  
  if (filters?.contractId) {
    whereClause += ` AND ch.contract_id = '${filters.contractId}'`;
  }
  
  const orderClause = ' ORDER BY ch.last_calculated DESC';
  const limitClause = filters?.limit ? ` LIMIT ${filters.limit}` : '';
  
  return baseQuery + whereClause + orderClause + limitClause;
}

/**
 * Generate query for portfolio risk summary
 */
export function buildPortfolioRiskQuery(bankId: string): string {
  return `
    SELECT 
      COUNT(DISTINCT c.id) as total_contracts,
      SUM(c.principal_amount) as total_principal,
      COUNT(CASE WHEN ch.status = 'breached' THEN 1 END) as breached_covenants,
      COUNT(CASE WHEN ch.status = 'warning' THEN 1 END) as warning_covenants,
      COUNT(CASE WHEN ch.status = 'compliant' THEN 1 END) as compliant_covenants,
      COUNT(CASE WHEN a.status = 'new' THEN 1 END) as new_alerts,
      AVG(CASE WHEN ch.buffer_percentage IS NOT NULL THEN ch.buffer_percentage END) as avg_buffer_percentage
    FROM contracts c
    LEFT JOIN covenant_health ch ON c.id = ch.contract_id
    LEFT JOIN alerts a ON c.id = a.contract_id AND a.status = 'new'
    WHERE c.bank_id = '${bankId}' AND c.status = 'active'
  `;
}

// ===== MATERIALIZED VIEW REFRESH HELPERS =====

/**
 * Check if materialized view needs refresh based on last update
 */
export function shouldRefreshMaterializedView(
  lastRefresh: Date,
  refreshIntervalMinutes: number = 15
): boolean {
  const now = new Date();
  const timeDiff = now.getTime() - lastRefresh.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  
  return minutesDiff >= refreshIntervalMinutes;
}

/**
 * Generate SQL for refreshing materialized views
 */
export function buildRefreshMaterializedViewQuery(viewName: string, concurrent: boolean = true): string {
  return `REFRESH MATERIALIZED VIEW ${concurrent ? 'CONCURRENTLY' : ''} ${viewName}`;
}

// ===== AUDIT LOG HELPERS =====

/**
 * Generate audit log entry data
 */
export function createAuditLogEntry(
  bankId: string,
  action: string,
  tableName: string,
  recordId: string,
  changes: any,
  userId?: string,
  userEmail?: string
): any {
  return {
    bank_id: bankId,
    action,
    table_name: tableName,
    record_id: recordId,
    changes: typeof changes === 'object' ? changes : { data: changes },
    user_id: userId,
    user_email: userEmail,
    created_at: new Date().toISOString(),
  };
}

// ===== INDEX OPTIMIZATION SUGGESTIONS =====

/**
 * Get recommended indexes for performance optimization
 */
export function getRecommendedIndexes(): string[] {
  return [
    // Multi-tenant isolation indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_bank_status ON contracts(bank_id, status)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_type ON covenants(bank_id, covenant_type)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_bank_status_severity ON alerts(bank_id, status, severity)',
    
    // Performance indexes for common queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_status_calculated ON covenant_health(status, last_calculated DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_borrower_period ON financial_metrics(borrower_id, period_date DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_borrower_date ON adverse_events(borrower_id, event_date DESC)',
    
    // Composite indexes for dashboard queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_borrower_status ON contracts(borrower_id, status)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_contract_triggered ON alerts(contract_id, triggered_at DESC)',
  ];
}

// ===== EXPORT ALL UTILITIES =====

export const DatabaseUtils = {
  // Query builders
  buildTenantFilter,
  buildPaginationClause,
  buildOrderByClause,
  buildCovenantHealthQuery,
  buildPortfolioRiskQuery,
  
  // Covenant calculations
  calculateBufferPercentage,
  determineCovenantStatus,
  evaluateCovenantCondition,
  
  // Trend analysis
  calculateTrend,
  estimateDaysToBreach,
  
  // Validation
  validateFinancialMetrics,
  validateCovenant,
  
  // Materialized views
  shouldRefreshMaterializedView,
  buildRefreshMaterializedViewQuery,
  
  // Audit logging
  createAuditLogEntry,
  
  // Performance optimization
  getRecommendedIndexes,
};

export default DatabaseUtils;