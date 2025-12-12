/**
 * Report Generation Service
 * Handles report creation, storage, and retrieval for portfolio analysis
 * Feature: covenant-guardian
 */

import { apiService } from '@/services/api';
import { geminiService } from '@/services/gemini';
import type {
  RiskReport,
  Contract,
  CovenantHealth,
  Alert,
  Borrower,
  FinancialMetrics,
} from '@/types';

export interface ReportGenerationInput {
  report_type: 'portfolio_summary' | 'borrower_deep_dive' | 'covenant_analysis';
  start_date: string;
  end_date: string;
  borrower_id?: string; // Required for borrower_deep_dive
  include_ai_summary?: boolean;
}

export interface ReportData {
  // Portfolio stats
  total_contracts: number;
  contracts_at_risk: number;
  total_principal: number;
  
  // Covenant stats
  total_covenants: number;
  covenants_breached: number;
  covenants_warning: number;
  covenants_compliant: number;
  
  // Breach statistics
  breach_statistics: {
    new_breaches: number;
    resolved_breaches: number;
    ongoing_breaches: number;
    breach_rate: number;
  };
  
  // Borrower risk profiles
  borrower_risk_profiles: Array<{
    borrower_id: string;
    borrower_name: string;
    risk_score: number;
    covenant_status: 'compliant' | 'warning' | 'breached';
    principal_at_risk: number;
  }>;
  
  // Trend analysis
  trend_analysis: {
    improving_covenants: number;
    stable_covenants: number;
    deteriorating_covenants: number;
    overall_trend: 'improving' | 'stable' | 'deteriorating';
  };
  
  // AI-generated content
  executive_summary?: string;
  key_risks?: string[];
  recommendations?: string[];
}

export interface GeneratedReport extends RiskReport {
  report_data: ReportData;
}

export interface ReportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ReportService {
  /**
   * Generate a comprehensive risk report for the specified period
   */
  async generateReport(input: ReportGenerationInput): Promise<GeneratedReport> {
    // Validate input
    this.validateReportInput(input);
    
    // Gather data based on report type
    const reportData = await this.gatherReportData(input);
    
    // Generate AI summary if requested
    if (input.include_ai_summary !== false) {
      const aiContent = await this.generateAISummary(reportData, input);
      reportData.executive_summary = aiContent.summary;
      reportData.key_risks = aiContent.key_risks;
      reportData.recommendations = aiContent.recommendations;
    }
    
    // Create and store the report
    const report = await this.createReport(input, reportData);
    
    return report;
  }


  /**
   * Validate report generation input
   */
  private validateReportInput(input: ReportGenerationInput): void {
    if (!input.report_type) {
      throw new Error('Report type is required');
    }
    
    if (!input.start_date || !input.end_date) {
      throw new Error('Start date and end date are required');
    }
    
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
    
    if (input.report_type === 'borrower_deep_dive' && !input.borrower_id) {
      throw new Error('Borrower ID is required for borrower deep dive reports');
    }
  }

  /**
   * Gather all data needed for the report
   */
  private async gatherReportData(input: ReportGenerationInput): Promise<ReportData> {
    const [contracts, covenantHealth, alerts, borrowers] = await Promise.all([
      this.getContractsForPeriod(input.start_date, input.end_date, input.borrower_id),
      this.getCovenantHealthForPeriod(input.start_date, input.end_date, input.borrower_id),
      this.getAlertsForPeriod(input.start_date, input.end_date, input.borrower_id),
      this.getBorrowersWithRisk(input.borrower_id),
    ]);

    // Calculate portfolio stats
    const totalContracts = contracts.length;
    const contractsAtRisk = contracts.filter(c => 
      c.status === 'watch' || c.status === 'default'
    ).length;
    const totalPrincipal = contracts.reduce((sum, c) => sum + (c.principal_amount || 0), 0);

    // Calculate covenant stats
    const totalCovenants = covenantHealth.length;
    const covenantsBreached = covenantHealth.filter(ch => ch.status === 'breached').length;
    const covenantsWarning = covenantHealth.filter(ch => ch.status === 'warning').length;
    const covenantsCompliant = covenantHealth.filter(ch => ch.status === 'compliant').length;

    // Calculate breach statistics
    const breachStatistics = this.calculateBreachStatistics(alerts, covenantHealth);

    // Calculate borrower risk profiles
    const borrowerRiskProfiles = await this.calculateBorrowerRiskProfiles(
      borrowers, contracts, covenantHealth
    );

    // Calculate trend analysis
    const trendAnalysis = this.calculateTrendAnalysis(covenantHealth);

    return {
      total_contracts: totalContracts,
      contracts_at_risk: contractsAtRisk,
      total_principal: totalPrincipal,
      total_covenants: totalCovenants,
      covenants_breached: covenantsBreached,
      covenants_warning: covenantsWarning,
      covenants_compliant: covenantsCompliant,
      breach_statistics: breachStatistics,
      borrower_risk_profiles: borrowerRiskProfiles,
      trend_analysis: trendAnalysis,
    };
  }

  /**
   * Get contracts for the specified period
   */
  private async getContractsForPeriod(
    startDate: string,
    endDate: string,
    borrowerId?: string
  ): Promise<Contract[]> {
    try {
      const params: Record<string, string> = {
        date_from: startDate,
        date_to: endDate,
      };
      if (borrowerId) {
        params.borrower_id = borrowerId;
      }
      
      const response = await apiService.get<Contract[]>('/api/contracts', params);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get covenant health data for the specified period
   */
  private async getCovenantHealthForPeriod(
    startDate: string,
    endDate: string,
    borrowerId?: string
  ): Promise<CovenantHealth[]> {
    try {
      const params: Record<string, string> = {
        date_from: startDate,
        date_to: endDate,
      };
      if (borrowerId) {
        params.borrower_id = borrowerId;
      }
      
      const response = await apiService.get<CovenantHealth[]>('/api/covenants/health', params);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get alerts for the specified period
   */
  private async getAlertsForPeriod(
    startDate: string,
    endDate: string,
    borrowerId?: string
  ): Promise<Alert[]> {
    try {
      const params: Record<string, string> = {
        date_from: startDate,
        date_to: endDate,
      };
      if (borrowerId) {
        params.borrower_id = borrowerId;
      }
      
      const response = await apiService.get<Alert[]>('/api/alerts', params);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get borrowers with risk data
   */
  private async getBorrowersWithRisk(borrowerId?: string): Promise<Borrower[]> {
    try {
      const params: Record<string, string> = {};
      if (borrowerId) {
        params.id = borrowerId;
      }
      
      const response = await apiService.get<Borrower[]>('/api/borrowers', params);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }


  /**
   * Calculate breach statistics from alerts and covenant health
   */
  private calculateBreachStatistics(
    alerts: Alert[],
    covenantHealth: CovenantHealth[]
  ): ReportData['breach_statistics'] {
    const breachAlerts = alerts.filter(a => a.alert_type === 'breach');
    const resolvedBreaches = breachAlerts.filter(a => a.status === 'resolved').length;
    const newBreaches = breachAlerts.filter(a => a.status === 'new').length;
    const ongoingBreaches = covenantHealth.filter(ch => ch.status === 'breached').length;
    
    const totalCovenants = covenantHealth.length;
    const breachRate = totalCovenants > 0 
      ? (ongoingBreaches / totalCovenants) * 100 
      : 0;

    return {
      new_breaches: newBreaches,
      resolved_breaches: resolvedBreaches,
      ongoing_breaches: ongoingBreaches,
      breach_rate: Math.round(breachRate * 100) / 100,
    };
  }

  /**
   * Calculate borrower risk profiles
   */
  private async calculateBorrowerRiskProfiles(
    borrowers: Borrower[],
    contracts: Contract[],
    covenantHealth: CovenantHealth[]
  ): Promise<ReportData['borrower_risk_profiles']> {
    return borrowers.map(borrower => {
      // Get contracts for this borrower
      const borrowerContracts = contracts.filter(c => c.borrower_id === borrower.id);
      
      // Get covenant health for borrower's contracts
      const contractIds = borrowerContracts.map(c => c.id);
      const borrowerCovenantHealth = covenantHealth.filter(ch => 
        contractIds.includes(ch.contract_id)
      );
      
      // Determine overall covenant status
      let covenantStatus: 'compliant' | 'warning' | 'breached' = 'compliant';
      if (borrowerCovenantHealth.some(ch => ch.status === 'breached')) {
        covenantStatus = 'breached';
      } else if (borrowerCovenantHealth.some(ch => ch.status === 'warning')) {
        covenantStatus = 'warning';
      }
      
      // Calculate risk score (0-10)
      const riskScore = this.calculateBorrowerRiskScore(borrowerCovenantHealth);
      
      // Calculate principal at risk
      const principalAtRisk = borrowerContracts
        .filter(c => c.status === 'watch' || c.status === 'default')
        .reduce((sum, c) => sum + (c.principal_amount || 0), 0);

      return {
        borrower_id: borrower.id,
        borrower_name: borrower.legal_name,
        risk_score: riskScore,
        covenant_status: covenantStatus,
        principal_at_risk: principalAtRisk,
      };
    });
  }

  /**
   * Calculate risk score for a borrower based on covenant health
   */
  private calculateBorrowerRiskScore(covenantHealth: CovenantHealth[]): number {
    if (covenantHealth.length === 0) return 0;

    const breachedCount = covenantHealth.filter(ch => ch.status === 'breached').length;
    const warningCount = covenantHealth.filter(ch => ch.status === 'warning').length;
    const deterioratingCount = covenantHealth.filter(ch => ch.trend === 'deteriorating').length;
    
    const total = covenantHealth.length;
    
    // Weighted scoring: breached = 10, warning = 5, deteriorating trend = 2
    const rawScore = (breachedCount * 10 + warningCount * 5 + deterioratingCount * 2) / total;
    
    // Normalize to 0-10 scale
    return Math.min(10, Math.round(rawScore * 100) / 100);
  }

  /**
   * Calculate trend analysis from covenant health data
   */
  private calculateTrendAnalysis(
    covenantHealth: CovenantHealth[]
  ): ReportData['trend_analysis'] {
    const improving = covenantHealth.filter(ch => ch.trend === 'improving').length;
    const stable = covenantHealth.filter(ch => ch.trend === 'stable').length;
    const deteriorating = covenantHealth.filter(ch => ch.trend === 'deteriorating').length;
    
    // Determine overall trend
    let overallTrend: 'improving' | 'stable' | 'deteriorating' = 'stable';
    if (deteriorating > improving && deteriorating > stable) {
      overallTrend = 'deteriorating';
    } else if (improving > deteriorating && improving > stable) {
      overallTrend = 'improving';
    }

    return {
      improving_covenants: improving,
      stable_covenants: stable,
      deteriorating_covenants: deteriorating,
      overall_trend: overallTrend,
    };
  }

  /**
   * Generate AI summary using Gemini
   */
  private async generateAISummary(
    reportData: ReportData,
    input: ReportGenerationInput
  ): Promise<{
    summary: string;
    key_risks: string[];
    recommendations: string[];
  }> {
    try {
      // Build context for Gemini
      const context = this.buildAISummaryContext(reportData, input);
      
      // Use Gemini to analyze and generate summary
      const riskAssessment = await geminiService.analyzeCovenantRisk(
        {
          covenant_name: `Portfolio Report (${input.report_type})`,
          current_value: reportData.breach_statistics.breach_rate,
          threshold_value: 10, // 10% breach rate threshold
          trend: reportData.trend_analysis.overall_trend,
          buffer_percentage: 100 - reportData.breach_statistics.breach_rate,
        },
        {
          borrower_name: 'Portfolio',
          industry: 'Mixed',
          recent_metrics: {
            total_contracts: reportData.total_contracts,
            contracts_at_risk: reportData.contracts_at_risk,
            breach_rate: reportData.breach_statistics.breach_rate,
          },
        }
      );

      return {
        summary: this.generateExecutiveSummary(reportData, riskAssessment.assessment_summary),
        key_risks: riskAssessment.risk_factors,
        recommendations: riskAssessment.recommended_actions,
      };
    } catch (error) {
      // Fallback to basic summary if AI fails
      return {
        summary: this.generateBasicSummary(reportData),
        key_risks: this.identifyBasicRisks(reportData),
        recommendations: this.generateBasicRecommendations(reportData),
      };
    }
  }

  /**
   * Build context string for AI summary
   */
  private buildAISummaryContext(reportData: ReportData, input: ReportGenerationInput): string {
    return `
Report Type: ${input.report_type}
Period: ${input.start_date} to ${input.end_date}
Total Contracts: ${reportData.total_contracts}
Contracts at Risk: ${reportData.contracts_at_risk}
Total Principal: $${reportData.total_principal.toLocaleString()}
Covenant Breach Rate: ${reportData.breach_statistics.breach_rate}%
Overall Trend: ${reportData.trend_analysis.overall_trend}
    `.trim();
  }


  /**
   * Generate executive summary text
   */
  private generateExecutiveSummary(reportData: ReportData, aiSummary?: string): string {
    const baseStats = `Portfolio contains ${reportData.total_contracts} contracts with total principal of $${reportData.total_principal.toLocaleString()}. `;
    const riskStats = `${reportData.contracts_at_risk} contracts (${((reportData.contracts_at_risk / Math.max(reportData.total_contracts, 1)) * 100).toFixed(1)}%) are currently at risk. `;
    const covenantStats = `Of ${reportData.total_covenants} covenants monitored, ${reportData.covenants_breached} are breached and ${reportData.covenants_warning} are at warning status. `;
    const trendStats = `Overall portfolio trend is ${reportData.trend_analysis.overall_trend}.`;
    
    const baseSummary = baseStats + riskStats + covenantStats + trendStats;
    
    return aiSummary ? `${baseSummary}\n\nAI Analysis: ${aiSummary}` : baseSummary;
  }

  /**
   * Generate basic summary without AI
   */
  private generateBasicSummary(reportData: ReportData): string {
    return this.generateExecutiveSummary(reportData);
  }

  /**
   * Identify basic risks without AI
   */
  private identifyBasicRisks(reportData: ReportData): string[] {
    const risks: string[] = [];
    
    if (reportData.breach_statistics.breach_rate > 10) {
      risks.push(`High breach rate of ${reportData.breach_statistics.breach_rate}%`);
    }
    
    if (reportData.contracts_at_risk > reportData.total_contracts * 0.2) {
      risks.push(`${reportData.contracts_at_risk} contracts at risk (>${20}% of portfolio)`);
    }
    
    if (reportData.trend_analysis.overall_trend === 'deteriorating') {
      risks.push('Overall portfolio trend is deteriorating');
    }
    
    if (reportData.trend_analysis.deteriorating_covenants > reportData.total_covenants * 0.3) {
      risks.push(`${reportData.trend_analysis.deteriorating_covenants} covenants showing deteriorating trends`);
    }
    
    const highRiskBorrowers = reportData.borrower_risk_profiles.filter(b => b.risk_score > 7);
    if (highRiskBorrowers.length > 0) {
      risks.push(`${highRiskBorrowers.length} borrowers with high risk scores (>7)`);
    }
    
    return risks.length > 0 ? risks : ['No significant risks identified'];
  }

  /**
   * Generate basic recommendations without AI
   */
  private generateBasicRecommendations(reportData: ReportData): string[] {
    const recommendations: string[] = [];
    
    if (reportData.covenants_breached > 0) {
      recommendations.push('Review and address all breached covenants immediately');
    }
    
    if (reportData.covenants_warning > 0) {
      recommendations.push('Monitor warning-status covenants closely for potential breaches');
    }
    
    if (reportData.trend_analysis.deteriorating_covenants > 0) {
      recommendations.push('Investigate root causes of deteriorating covenant trends');
    }
    
    const highRiskBorrowers = reportData.borrower_risk_profiles.filter(b => b.risk_score > 7);
    if (highRiskBorrowers.length > 0) {
      recommendations.push(`Conduct detailed review of ${highRiskBorrowers.length} high-risk borrowers`);
    }
    
    if (reportData.breach_statistics.new_breaches > 0) {
      recommendations.push(`Address ${reportData.breach_statistics.new_breaches} new breach alerts`);
    }
    
    return recommendations.length > 0 ? recommendations : ['Continue regular monitoring'];
  }

  /**
   * Create and store the report
   */
  private async createReport(
    input: ReportGenerationInput,
    reportData: ReportData
  ): Promise<GeneratedReport> {
    const report: GeneratedReport = {
      id: this.generateReportId(),
      bank_id: '', // Will be set by API based on auth
      report_type: input.report_type,
      report_date: new Date().toISOString(),
      total_contracts: reportData.total_contracts,
      contracts_at_risk: reportData.contracts_at_risk,
      total_principal: reportData.total_principal,
      total_covenants: reportData.total_covenants,
      covenants_breached: reportData.covenants_breached,
      covenants_warning: reportData.covenants_warning,
      summary_text: reportData.executive_summary,
      key_risks: { risks: reportData.key_risks || [] },
      recommendations: { actions: reportData.recommendations || [] },
      created_at: new Date().toISOString(),
      report_data: reportData,
    };

    // Store the report
    try {
      const response = await apiService.post<RiskReport>('/api/reports', report);
      if (response.success && response.data) {
        return { ...report, ...response.data, report_data: reportData };
      }
    } catch {
      // Continue with local report if storage fails
    }

    return report;
  }

  /**
   * Generate a unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a stored report by ID
   */
  async getReport(reportId: string): Promise<GeneratedReport | null> {
    try {
      const response = await apiService.get<GeneratedReport>(`/api/reports/${reportId}`);
      return response.success ? response.data || null : null;
    } catch {
      return null;
    }
  }

  /**
   * List all reports with optional filtering
   */
  async listReports(filters?: {
    report_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<RiskReport[]> {
    try {
      const response = await apiService.get<RiskReport[]>('/api/reports', filters as Record<string, string>);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<boolean> {
    try {
      const response = await apiService.delete(`/api/reports/${reportId}`);
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Validate report data accuracy
   */
  validateReportAccuracy(report: GeneratedReport): ReportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!report.id) errors.push('Report ID is missing');
    if (!report.report_type) errors.push('Report type is missing');
    if (!report.report_date) errors.push('Report date is missing');
    if (!report.created_at) errors.push('Created timestamp is missing');

    // Validate report data
    const data = report.report_data;
    if (!data) {
      errors.push('Report data is missing');
      return { isValid: false, errors, warnings };
    }

    // Validate numeric fields
    if (data.total_contracts < 0) errors.push('Total contracts cannot be negative');
    if (data.contracts_at_risk < 0) errors.push('Contracts at risk cannot be negative');
    if (data.total_principal < 0) errors.push('Total principal cannot be negative');
    if (data.total_covenants < 0) errors.push('Total covenants cannot be negative');

    // Validate consistency
    if (data.contracts_at_risk > data.total_contracts) {
      errors.push('Contracts at risk exceeds total contracts');
    }

    const covenantSum = data.covenants_breached + data.covenants_warning + data.covenants_compliant;
    if (covenantSum !== data.total_covenants) {
      warnings.push('Covenant status counts do not sum to total covenants');
    }

    // Validate breach statistics
    if (data.breach_statistics.breach_rate < 0 || data.breach_statistics.breach_rate > 100) {
      errors.push('Breach rate must be between 0 and 100');
    }

    // Validate trend analysis
    const validTrends = ['improving', 'stable', 'deteriorating'];
    if (!validTrends.includes(data.trend_analysis.overall_trend)) {
      errors.push('Invalid overall trend value');
    }

    // Validate borrower risk profiles
    data.borrower_risk_profiles.forEach((profile, index) => {
      if (profile.risk_score < 0 || profile.risk_score > 10) {
        errors.push(`Borrower ${index + 1} has invalid risk score (must be 0-10)`);
      }
    });

    // Check for AI content
    if (!data.executive_summary) {
      warnings.push('Executive summary is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate report completeness for Property 12
   */
  validateReportCompleteness(report: GeneratedReport): {
    isComplete: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];
    const data = report.report_data;

    // Check portfolio analysis fields
    if (data.total_contracts === undefined) missingFields.push('total_contracts');
    if (data.contracts_at_risk === undefined) missingFields.push('contracts_at_risk');
    if (data.total_principal === undefined) missingFields.push('total_principal');

    // Check covenant breach statistics
    if (!data.breach_statistics) {
      missingFields.push('breach_statistics');
    } else {
      if (data.breach_statistics.new_breaches === undefined) missingFields.push('breach_statistics.new_breaches');
      if (data.breach_statistics.resolved_breaches === undefined) missingFields.push('breach_statistics.resolved_breaches');
      if (data.breach_statistics.ongoing_breaches === undefined) missingFields.push('breach_statistics.ongoing_breaches');
      if (data.breach_statistics.breach_rate === undefined) missingFields.push('breach_statistics.breach_rate');
    }

    // Check borrower risk profiles
    if (!data.borrower_risk_profiles) {
      missingFields.push('borrower_risk_profiles');
    }

    // Check trend analysis
    if (!data.trend_analysis) {
      missingFields.push('trend_analysis');
    } else {
      if (data.trend_analysis.improving_covenants === undefined) missingFields.push('trend_analysis.improving_covenants');
      if (data.trend_analysis.stable_covenants === undefined) missingFields.push('trend_analysis.stable_covenants');
      if (data.trend_analysis.deteriorating_covenants === undefined) missingFields.push('trend_analysis.deteriorating_covenants');
      if (data.trend_analysis.overall_trend === undefined) missingFields.push('trend_analysis.overall_trend');
    }

    // Check report storage fields
    if (!report.id) missingFields.push('id');
    if (!report.report_type) missingFields.push('report_type');
    if (!report.report_date) missingFields.push('report_date');
    if (!report.created_at) missingFields.push('created_at');

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }
}

// Export singleton instance
export const reportService = new ReportService();
export default reportService;
