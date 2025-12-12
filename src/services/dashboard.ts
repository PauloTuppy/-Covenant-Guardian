/**
 * Portfolio Dashboard Service
 * Handles dashboard data aggregation, risk calculations, and real-time updates
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/config/api';
import type {
  DashboardData,
  PortfolioSummary,
  RiskMetrics,
  CovenantHealthSummary,
  Contract,
  Alert,
  CovenantHealth,
} from '@/types';

export interface DashboardFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
}

export interface TopRiskContract extends Contract {
  risk_score: number;
  risk_factors: string[];
  recommended_actions: string[];
}

class DashboardService {
  /**
   * Get complete dashboard data
   * Property 11: Dashboard Data Completeness
   * Displays total contracts, principal amounts, risk summaries, covenant breakdown,
   * and highlights highest-risk contracts with real-time data
   */
  async getDashboardData(): Promise<DashboardData> {
    const [
      portfolioSummary,
      riskMetrics,
      covenantHealthBreakdown,
      recentAlerts,
      topRiskContracts,
    ] = await Promise.all([
      this.getPortfolioSummary(),
      this.getRiskMetrics(),
      this.getCovenantHealthBreakdown(),
      this.getRecentAlerts(),
      this.getTopRiskContracts(),
    ]);

    return {
      portfolio_summary: portfolioSummary,
      risk_metrics: riskMetrics,
      covenant_health_breakdown: covenantHealthBreakdown,
      recent_alerts: recentAlerts,
      top_risk_contracts: topRiskContracts,
    };
  }


  /**
   * Get portfolio summary with total contracts and principal amounts
   * Validates: Requirements 7.1
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const response = await apiService.get<PortfolioSummary>(
      API_ENDPOINTS.dashboard.portfolioSummary
    );

    if (!response.data) {
      // Return default empty summary if no data
      return {
        bank_id: '',
        bank_name: '',
        total_contracts: 0,
        total_principal_usd: 0,
        contracts_breached: 0,
        contracts_at_warning: 0,
        open_alerts_count: 0,
      };
    }

    return response.data;
  }

  /**
   * Get risk metrics for the portfolio
   * Validates: Requirements 7.4
   */
  async getRiskMetrics(): Promise<RiskMetrics> {
    const response = await apiService.get<RiskMetrics>(
      API_ENDPOINTS.dashboard.riskMetrics
    );

    if (!response.data) {
      return {
        portfolio_risk_score: 0,
        high_risk_contracts: 0,
        trending_deteriorating: 0,
        upcoming_covenant_checks: 0,
        overdue_reports: 0,
      };
    }

    return response.data;
  }

  /**
   * Get covenant health breakdown by compliance status
   * Validates: Requirements 7.2
   */
  async getCovenantHealthBreakdown(): Promise<CovenantHealthSummary> {
    const response = await apiService.get<CovenantHealth[]>(
      API_ENDPOINTS.covenants.health
    );

    const healthData = response.data || [];

    const compliant = healthData.filter(h => h.status === 'compliant').length;
    const warning = healthData.filter(h => h.status === 'warning').length;
    const breached = healthData.filter(h => h.status === 'breached').length;
    const total = healthData.length;

    return {
      total_covenants: total,
      compliant,
      warning,
      breached,
      compliance_rate: total > 0 ? (compliant / total) * 100 : 100,
    };
  }

  /**
   * Get recent alerts for the dashboard
   */
  async getRecentAlerts(limit: number = 10): Promise<Alert[]> {
    const response = await apiService.get<Alert[]>(
      `${API_ENDPOINTS.dashboard.alerts}?limit=${limit}&sort=triggered_at&order=desc`
    );

    return response.data || [];
  }

  /**
   * Get top risk contracts with actionable insights
   * Validates: Requirements 7.3
   */
  async getTopRiskContracts(limit: number = 5): Promise<Contract[]> {
    const response = await apiService.get<Contract[]>(
      `/contracts?status=watch,default&sort=risk_score&order=desc&limit=${limit}`
    );

    return response.data || [];
  }

  /**
   * Calculate portfolio risk score
   * Aggregates risk from all contracts and covenants
   */
  async calculatePortfolioRiskScore(): Promise<number> {
    const [contracts, covenantHealth] = await Promise.all([
      apiService.get<Contract[]>('/contracts?status=active,watch'),
      apiService.get<CovenantHealth[]>(API_ENDPOINTS.covenants.health),
    ]);

    const contractList = contracts.data || [];
    const healthList = covenantHealth.data || [];

    if (contractList.length === 0) return 0;

    // Calculate risk based on covenant health
    const breachedCount = healthList.filter(h => h.status === 'breached').length;
    const warningCount = healthList.filter(h => h.status === 'warning').length;
    const totalCovenants = healthList.length;

    if (totalCovenants === 0) return 0;

    // Risk score formula: weighted average of breach and warning rates
    const breachRate = breachedCount / totalCovenants;
    const warningRate = warningCount / totalCovenants;
    
    // Breaches contribute more to risk than warnings
    const riskScore = (breachRate * 10) + (warningRate * 5);
    
    return Math.min(10, Math.max(0, riskScore));
  }

  /**
   * Get contracts trending deteriorating
   */
  async getContractsTrendingDeteriorating(): Promise<Contract[]> {
    const response = await apiService.get<Contract[]>(
      '/contracts?trend=deteriorating'
    );

    return response.data || [];
  }

  /**
   * Get upcoming covenant checks
   */
  async getUpcomingCovenantChecks(days: number = 30): Promise<number> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const response = await apiService.get<{ count: number }>(
      `/covenants/upcoming-checks?before=${futureDate.toISOString().split('T')[0]}`
    );

    return response.data?.count || 0;
  }

  /**
   * Refresh dashboard data
   * Validates: Requirements 7.5 - real-time updates
   */
  async refreshDashboard(): Promise<DashboardData> {
    // Force fresh data fetch
    const [
      portfolioSummary,
      riskMetrics,
      covenantHealthBreakdown,
      recentAlerts,
      topRiskContracts,
    ] = await Promise.all([
      this.getPortfolioSummary(),
      this.getRiskMetrics(),
      this.getCovenantHealthBreakdown(),
      this.getRecentAlerts(),
      this.getTopRiskContracts(),
    ]);

    return {
      portfolio_summary: portfolioSummary,
      risk_metrics: riskMetrics,
      covenant_health_breakdown: covenantHealthBreakdown,
      recent_alerts: recentAlerts,
      top_risk_contracts: topRiskContracts,
    };
  }

  /**
   * Get dashboard data with filters
   */
  async getFilteredDashboardData(filters: DashboardFilters): Promise<DashboardData> {
    const params = new URLSearchParams();
    
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : '';

    const response = await apiService.get<DashboardData>(
      `${API_ENDPOINTS.dashboard.portfolioSummary}${suffix}`
    );

    if (!response.data) {
      return this.getDashboardData();
    }

    return response.data as unknown as DashboardData;
  }

  /**
   * Validate dashboard data completeness
   * Used for property testing
   */
  validateDashboardCompleteness(data: DashboardData): {
    isComplete: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    // Check portfolio summary
    if (!data.portfolio_summary) {
      missingFields.push('portfolio_summary');
    } else {
      if (data.portfolio_summary.total_contracts === undefined) {
        missingFields.push('portfolio_summary.total_contracts');
      }
      if (data.portfolio_summary.total_principal_usd === undefined) {
        missingFields.push('portfolio_summary.total_principal_usd');
      }
    }

    // Check risk metrics
    if (!data.risk_metrics) {
      missingFields.push('risk_metrics');
    } else {
      if (data.risk_metrics.portfolio_risk_score === undefined) {
        missingFields.push('risk_metrics.portfolio_risk_score');
      }
      if (data.risk_metrics.high_risk_contracts === undefined) {
        missingFields.push('risk_metrics.high_risk_contracts');
      }
    }

    // Check covenant health breakdown
    if (!data.covenant_health_breakdown) {
      missingFields.push('covenant_health_breakdown');
    } else {
      if (data.covenant_health_breakdown.total_covenants === undefined) {
        missingFields.push('covenant_health_breakdown.total_covenants');
      }
      if (data.covenant_health_breakdown.compliance_rate === undefined) {
        missingFields.push('covenant_health_breakdown.compliance_rate');
      }
    }

    // Check recent alerts
    if (!data.recent_alerts) {
      missingFields.push('recent_alerts');
    }

    // Check top risk contracts
    if (!data.top_risk_contracts) {
      missingFields.push('top_risk_contracts');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }
}

export const dashboardService = new DashboardService();
