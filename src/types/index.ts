/**
 * TypeScript type definitions for Covenant Guardian
 * Based on PostgreSQL schema and API responses
 */

// ===== CORE ENTITY TYPES =====

export interface Bank {
  id: string;
  name: string;
  country?: string;
  regulatory_id?: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
  max_contracts: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface BankUser {
  id: string;
  bank_id: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  created_at: string;
}

export interface Borrower {
  id: string;
  bank_id: string;
  legal_name: string;
  ticker_symbol?: string;
  industry?: string;
  country?: string;
  credit_rating?: string;
  last_financial_update?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  bank_id: string;
  borrower_id: string;
  contract_name: string;
  contract_number?: string;
  principal_amount: number;
  currency: string;
  origination_date: string;
  maturity_date: string;
  interest_rate?: number;
  status: 'active' | 'closed' | 'default' | 'watch';
  raw_document_text?: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Populated relations
  borrower?: Borrower;
  covenants?: Covenant[];
  covenant_health_summary?: CovenantHealthSummary;
}

export interface Covenant {
  id: string;
  contract_id: string;
  bank_id: string;
  covenant_name: string;
  covenant_type: 'financial' | 'operational' | 'reporting' | 'other';
  metric_name?: string;
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  threshold_value?: number;
  threshold_unit?: string;
  check_frequency: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  next_check_date?: string;
  reporting_deadline_days: number;
  covenant_clause?: string;
  gemini_extracted: boolean;
  created_at: string;
  updated_at: string;
  
  // Populated relations
  contract?: Contract;
  health?: CovenantHealth;
}

export interface CovenantHealth {
  id: string;
  covenant_id: string;
  contract_id: string;
  bank_id: string;
  last_reported_value?: number;
  last_reported_date?: string;
  threshold_value?: number;
  status: 'compliant' | 'warning' | 'breached';
  buffer_percentage?: number;
  days_to_breach?: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  gemini_risk_assessment?: string;
  recommended_action?: string;
  last_calculated?: string;
  created_at: string;
  updated_at: string;
  
  // Populated relations
  covenant?: Covenant;
}

export interface FinancialMetrics {
  id: string;
  borrower_id: string;
  bank_id: string;
  period_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  source: string;
  
  // Raw metrics
  debt_total?: number;
  ebitda?: number;
  revenue?: number;
  net_income?: number;
  operating_cash_flow?: number;
  capex?: number;
  interest_expense?: number;
  equity_total?: number;
  current_assets?: number;
  current_liabilities?: number;
  
  // Calculated ratios
  debt_to_ebitda?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  interest_coverage?: number;
  roe?: number;
  roa?: number;
  
  data_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface AdverseEvent {
  id: string;
  borrower_id: string;
  bank_id: string;
  event_type: 'news' | 'regulatory' | 'credit_rating_downgrade' | 'executive_change' | 'litigation' | 'other';
  headline: string;
  description?: string;
  source_url?: string;
  risk_score?: number;
  gemini_analyzed: boolean;
  event_date: string;
  created_at: string;
  
  // Populated relations
  borrower?: Borrower;
}

export interface Alert {
  id: string;
  covenant_id: string;
  contract_id: string;
  bank_id: string;
  alert_type: 'warning' | 'critical' | 'breach' | 'reporting_due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  trigger_metric_value?: number;
  threshold_value?: number;
  status: 'new' | 'acknowledged' | 'resolved' | 'escalated';
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolution_notes?: string;
  triggered_at: string;
  created_at: string;
  updated_at: string;
  
  // Populated relations
  covenant?: Covenant;
  contract?: Contract;
  acknowledged_by_user?: BankUser;
}

export interface RiskReport {
  id: string;
  bank_id: string;
  report_type: 'portfolio_summary' | 'borrower_deep_dive' | 'covenant_analysis';
  report_date: string;
  
  // Portfolio stats
  total_contracts?: number;
  contracts_at_risk?: number;
  total_principal?: number;
  
  // Covenant stats
  total_covenants?: number;
  covenants_breached?: number;
  covenants_warning?: number;
  
  // Content
  summary_text?: string;
  key_risks?: Record<string, any>;
  recommendations?: Record<string, any>;
  
  generated_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  bank_id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  changes?: Record<string, any>;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  created_at: string;
}

// ===== DASHBOARD & ANALYTICS TYPES =====

export interface PortfolioSummary {
  bank_id: string;
  bank_name: string;
  total_contracts: number;
  total_principal_usd: number;
  contracts_breached: number;
  contracts_at_warning: number;
  open_alerts_count: number;
  latest_alert_time?: string;
}

export interface CovenantHealthSummary {
  total_covenants: number;
  compliant: number;
  warning: number;
  breached: number;
  compliance_rate: number;
}

export interface RiskMetrics {
  portfolio_risk_score: number;
  high_risk_contracts: number;
  trending_deteriorating: number;
  upcoming_covenant_checks: number;
  overdue_reports: number;
}

export interface DashboardData {
  portfolio_summary: PortfolioSummary;
  risk_metrics: RiskMetrics;
  recent_alerts: Alert[];
  covenant_health_breakdown: CovenantHealthSummary;
  top_risk_contracts: Contract[];
}

// ===== FORM & INPUT TYPES =====

export interface ContractCreateInput {
  borrower_id: string;
  contract_name: string;
  contract_number?: string;
  principal_amount: number;
  currency: string;
  origination_date: string;
  maturity_date: string;
  interest_rate?: number;
  raw_document_text?: string;
  document_file?: File;
}

export interface CovenantCreateInput {
  contract_id: string;
  covenant_name: string;
  covenant_type: 'financial' | 'operational' | 'reporting' | 'other';
  metric_name?: string;
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  threshold_value?: number;
  threshold_unit?: string;
  check_frequency: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  covenant_clause?: string;
}

export interface BorrowerCreateInput {
  legal_name: string;
  ticker_symbol?: string;
  industry?: string;
  country?: string;
  credit_rating?: string;
}

export interface FinancialMetricsInput {
  borrower_id: string;
  period_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  source: string;
  
  // Financial data
  debt_total?: number;
  ebitda?: number;
  revenue?: number;
  net_income?: number;
  operating_cash_flow?: number;
  capex?: number;
  interest_expense?: number;
  equity_total?: number;
  current_assets?: number;
  current_liabilities?: number;
}

export interface AlertAcknowledgeInput {
  resolution_notes?: string;
}

// ===== FILTER & SEARCH TYPES =====

export interface ContractFilters {
  status?: 'active' | 'closed' | 'default' | 'watch';
  borrower_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  principal_min?: number;
  principal_max?: number;
}

export interface AlertFilters {
  status?: 'new' | 'acknowledged' | 'resolved' | 'escalated';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  alert_type?: 'warning' | 'critical' | 'breach' | 'reporting_due';
  contract_id?: string;
  covenant_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface CovenantFilters {
  contract_id?: string;
  covenant_type?: 'financial' | 'operational' | 'reporting' | 'other';
  status?: 'compliant' | 'warning' | 'breached';
  check_frequency?: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
}

// ===== PAGINATION & SORTING =====

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== AUTHENTICATION TYPES =====

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  bank_id: string;
  bank_name: string;
}

export interface AuthResponse {
  user: AuthUser;
  auth_token: string;
  refresh_token?: string;
  expires_at: string;
}

// ===== GEMINI AI TYPES =====

export interface CovenantExtractionResult {
  covenants: Array<{
    covenant_name: string;
    covenant_type: 'financial' | 'operational' | 'reporting' | 'other';
    metric_name?: string;
    operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
    threshold_value?: number;
    threshold_unit?: string;
    check_frequency: 'monthly' | 'quarterly' | 'annually' | 'on_demand';
    covenant_clause: string;
    confidence_score: number;
  }>;
  extraction_summary: string;
  processing_time_ms: number;
}

export interface RiskAssessment {
  risk_score: number;
  risk_factors: string[];
  recommended_actions: string[];
  assessment_summary: string;
  confidence_level: number;
}

// ===== UTILITY TYPES =====

export type CovenantStatus = 'compliant' | 'warning' | 'breached';
export type ContractStatus = 'active' | 'closed' | 'default' | 'watch';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'admin' | 'analyst' | 'viewer';
export type TrendDirection = 'improving' | 'stable' | 'deteriorating';

// ===== CHART & VISUALIZATION TYPES =====

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CovenantTrendData {
  covenant_id: string;
  covenant_name: string;
  data_points: ChartDataPoint[];
  threshold_value: number;
  current_status: CovenantStatus;
}

export interface PortfolioRiskChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

// ===== ERROR HANDLING TYPES =====

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    validation_errors?: ValidationError[];
    timestamp: string;
    request_id?: string;
  };
}