/**
 * Covenant Health Monitoring Service
 * Handles covenant compliance calculations, trend analysis, and health status updates
 */

import { apiService } from './api';
import { geminiService } from './gemini';
import { API_ENDPOINTS } from '@/config/api';
import type {
  CovenantHealth,
  Covenant,
  FinancialMetrics,
  FinancialMetricsInput,
  RiskAssessment,
} from '@/types';

export interface CovenantHealthCalculation {
  covenant_id: string;
  current_value?: number;
  threshold_value?: number;
  status: 'compliant' | 'warning' | 'breached';
  buffer_percentage?: number;
  days_to_breach?: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  confidence_level: number;
}

export interface FinancialRatioCalculation {
  debt_to_ebitda?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  interest_coverage?: number;
  roe?: number;
  roa?: number;
}

export class CovenantHealthService {
  /**
   * Calculate covenant health for a specific covenant
   */
  async calculateCovenantHealth(covenantId: string): Promise<CovenantHealth> {
    // Get covenant details
    const covenant = await this.getCovenantById(covenantId);
    if (!covenant) {
      throw new Error(`Covenant not found: ${covenantId}`);
    }

    // Get latest financial data for the borrower
    const financialData = await this.getLatestFinancialData(covenant.contract?.borrower_id || '');
    
    // Calculate current covenant value based on the metric
    const currentValue = await this.calculateCovenantValue(covenant, financialData ?? undefined);
    
    // Determine compliance status
    const status = this.determineComplianceStatus(
      currentValue,
      covenant.threshold_value,
      covenant.operator
    );

    // Calculate buffer percentage
    const bufferPercentage = this.calculateBufferPercentage(
      currentValue,
      covenant.threshold_value,
      covenant.operator
    );

    // Calculate days to breach (if trending toward breach)
    const daysToBreach = await this.calculateDaysToBreach(covenant, financialData ?? undefined);

    // Analyze trend
    const trend = await this.analyzeTrend(covenant, financialData ?? undefined);

    // Get AI risk assessment
    const riskAssessment = await this.getAIRiskAssessment(covenant, {
      current_value: currentValue,
      threshold_value: covenant.threshold_value,
      trend,
      buffer_percentage: bufferPercentage,
    });

    // Create or update covenant health record
    const healthData = {
      covenant_id: covenantId,
      contract_id: covenant.contract_id,
      bank_id: covenant.bank_id,
      last_reported_value: currentValue,
      last_reported_date: financialData?.period_date || new Date().toISOString(),
      threshold_value: covenant.threshold_value,
      status,
      buffer_percentage: bufferPercentage,
      days_to_breach: daysToBreach,
      trend,
      gemini_risk_assessment: riskAssessment.assessment_summary,
      recommended_action: riskAssessment.recommended_actions.join('; '),
      last_calculated: new Date().toISOString(),
    };

    return this.saveCovenantHealth(healthData);
  }

  /**
   * Ingest financial data for a borrower
   */
  async ingestFinancialData(
    borrowerId: string,
    financialData: FinancialMetricsInput
  ): Promise<FinancialMetrics> {
    // Validate input data
    this.validateFinancialData(financialData);

    // Calculate standard financial ratios
    const calculatedRatios = this.calculateFinancialRatios(financialData);

    // Assess data confidence
    const dataConfidence = this.assessDataConfidence(financialData);

    // Store financial data
    const response = await apiService.post<FinancialMetrics>(
      API_ENDPOINTS.financialMetrics.ingest,
      {
        ...financialData,
        ...calculatedRatios,
        data_confidence: dataConfidence,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to ingest financial data');
    }

    const storedMetrics = response.data;

    // Trigger covenant health recalculation for all related covenants
    await this.recalculateRelatedCovenants(borrowerId);

    return storedMetrics;
  }

  /**
   * Update health metrics for all covenants of a borrower
   */
  async updateHealthMetrics(
    borrowerId: string,
    _financialData: FinancialMetrics
  ): Promise<CovenantHealth[]> {
    // Get all covenants for contracts of this borrower
    const covenants = await this.getCovenantsForBorrower(borrowerId);
    
    const healthUpdates: CovenantHealth[] = [];

    for (const covenant of covenants) {
      try {
        const health = await this.calculateCovenantHealth(covenant.id);
        healthUpdates.push(health);
      } catch (error) {
        console.error(`Failed to update health for covenant ${covenant.id}:`, error);
        // Continue with other covenants
      }
    }

    return healthUpdates;
  }

  /**
   * Analyze trends for a covenant over time
   */
  async analyzeTrends(
    covenantId: string,
    periods: number = 4
  ): Promise<{
    trend: 'improving' | 'stable' | 'deteriorating';
    trend_data: Array<{
      period: string;
      value: number;
      status: 'compliant' | 'warning' | 'breached';
    }>;
    confidence: number;
  }> {
    const covenant = await this.getCovenantById(covenantId);
    if (!covenant) {
      throw new Error(`Covenant not found: ${covenantId}`);
    }

    // Get historical financial data
    const historicalData = await this.getHistoricalFinancialData(
      covenant.contract?.borrower_id || '',
      periods
    );

    const trendData = [];
    const values = [];

    for (const data of historicalData) {
      const value = await this.calculateCovenantValue(covenant, data);
      const status = this.determineComplianceStatus(
        value,
        covenant.threshold_value,
        covenant.operator
      );

      trendData.push({
        period: data.period_date,
        value,
        status,
      });

      values.push(value);
    }

    // Calculate trend direction
    const trend = this.calculateTrendDirection(values);
    const confidence = this.calculateTrendConfidence(values, historicalData);

    return {
      trend,
      trend_data: trendData,
      confidence,
    };
  }

  /**
   * Calculate covenant value based on financial data and metric type
   */
  private async calculateCovenantValue(
    covenant: Covenant,
    financialData?: FinancialMetrics
  ): Promise<number> {
    if (!financialData || !covenant.metric_name) {
      return 0;
    }

    // Map metric names to financial data fields
    const metricMap: Record<string, keyof FinancialMetrics> = {
      debt_to_ebitda: 'debt_to_ebitda',
      debt_to_equity: 'debt_to_equity',
      current_ratio: 'current_ratio',
      interest_coverage: 'interest_coverage',
      roe: 'roe',
      roa: 'roa',
      debt_total: 'debt_total',
      ebitda: 'ebitda',
      revenue: 'revenue',
      net_income: 'net_income',
      equity_total: 'equity_total',
      current_assets: 'current_assets',
      current_liabilities: 'current_liabilities',
    };

    const fieldName = metricMap[covenant.metric_name];
    if (!fieldName) {
      throw new Error(`Unknown metric: ${covenant.metric_name}`);
    }

    const value = financialData[fieldName] as number;
    return value || 0;
  }

  /**
   * Determine compliance status based on current value and threshold
   */
  private determineComplianceStatus(
    currentValue?: number,
    thresholdValue?: number,
    operator?: string
  ): 'compliant' | 'warning' | 'breached' {
    if (currentValue === undefined || thresholdValue === undefined || !operator) {
      return 'compliant'; // Default to compliant if data is missing
    }

    const isCompliant = this.evaluateCovenantCondition(currentValue, thresholdValue, operator);
    
    if (isCompliant) {
      return 'compliant';
    }

    // Calculate how close to breach (warning threshold is 10% buffer)
    const bufferPercentage = this.calculateBufferPercentage(currentValue, thresholdValue, operator);
    
    if (Math.abs(bufferPercentage) <= 10) {
      return 'warning';
    }

    return 'breached';
  }

  /**
   * Evaluate covenant condition based on operator
   */
  private evaluateCovenantCondition(
    currentValue: number,
    thresholdValue: number,
    operator: string
  ): boolean {
    switch (operator) {
      case '<':
        return currentValue < thresholdValue;
      case '<=':
        return currentValue <= thresholdValue;
      case '>':
        return currentValue > thresholdValue;
      case '>=':
        return currentValue >= thresholdValue;
      case '=':
        return Math.abs(currentValue - thresholdValue) < 0.01; // Small tolerance for floating point
      case '!=':
        return Math.abs(currentValue - thresholdValue) >= 0.01;
      default:
        return true; // Default to compliant for unknown operators
    }
  }

  /**
   * Calculate buffer percentage from threshold
   */
  private calculateBufferPercentage(
    currentValue?: number,
    thresholdValue?: number,
    operator?: string
  ): number {
    if (currentValue === undefined || thresholdValue === undefined || thresholdValue === 0) {
      return 0;
    }

    const difference = currentValue - thresholdValue;
    const percentage = (difference / Math.abs(thresholdValue)) * 100;

    // Adjust sign based on operator (positive buffer means safer)
    switch (operator) {
      case '<':
      case '<=':
        return -percentage; // Negative difference is good (further from threshold)
      case '>':
      case '>=':
        return percentage; // Positive difference is good (further from threshold)
      default:
        return Math.abs(percentage);
    }
  }

  /**
   * Calculate days to breach based on trend
   */
  private async calculateDaysToBreach(
    covenant: Covenant,
    currentData?: FinancialMetrics
  ): Promise<number | undefined> {
    if (!currentData || !covenant.threshold_value) {
      return undefined;
    }

    // Get historical data to calculate trend velocity
    const historicalData = await this.getHistoricalFinancialData(
      covenant.contract?.borrower_id || '',
      3
    );

    if (historicalData.length < 2) {
      return undefined; // Need at least 2 data points
    }

    const values = [];
    for (const data of historicalData) {
      const value = await this.calculateCovenantValue(covenant, data);
      values.push(value);
    }

    // Calculate velocity (change per period)
    const velocity = this.calculateVelocity(values);
    
    if (velocity === 0) {
      return undefined; // No trend
    }

    const currentValue = await this.calculateCovenantValue(covenant, currentData);
    const distanceToThreshold = Math.abs(currentValue - covenant.threshold_value);

    // Calculate days based on quarterly reporting (90 days per period)
    const periodsToBreach = distanceToThreshold / Math.abs(velocity);
    const daysToBreach = periodsToBreach * 90; // Assuming quarterly reporting

    return Math.max(0, Math.round(daysToBreach));
  }

  /**
   * Analyze trend direction
   */
  private async analyzeTrend(
    covenant: Covenant,
    currentData?: FinancialMetrics
  ): Promise<'improving' | 'stable' | 'deteriorating'> {
    if (!currentData) {
      return 'stable';
    }

    // Get historical data
    const historicalData = await this.getHistoricalFinancialData(
      covenant.contract?.borrower_id || '',
      4
    );

    if (historicalData.length < 2) {
      return 'stable';
    }

    const values = [];
    for (const data of historicalData) {
      const value = await this.calculateCovenantValue(covenant, data);
      values.push(value);
    }

    return this.calculateTrendDirection(values);
  }

  /**
   * Calculate trend direction from values
   */
  private calculateTrendDirection(values: number[]): 'improving' | 'stable' | 'deteriorating' {
    if (values.length < 2) {
      return 'stable';
    }

    // Calculate linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend based on slope magnitude
    const threshold = 0.05; // 5% change threshold
    
    if (Math.abs(slope) < threshold) {
      return 'stable';
    }

    return slope > 0 ? 'improving' : 'deteriorating';
  }

  /**
   * Calculate velocity (rate of change)
   */
  private calculateVelocity(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    // Simple velocity: (latest - earliest) / periods
    const periods = values.length - 1;
    return (values[values.length - 1] - values[0]) / periods;
  }

  /**
   * Calculate trend confidence based on data quality
   */
  private calculateTrendConfidence(
    values: number[],
    historicalData: FinancialMetrics[]
  ): number {
    if (values.length < 2) {
      return 0;
    }

    // Base confidence on data availability and consistency
    let confidence = 0.5; // Base confidence

    // Increase confidence with more data points
    confidence += Math.min(0.3, (values.length - 2) * 0.1);

    // Increase confidence based on data quality
    const avgDataConfidence = historicalData.reduce(
      (sum, data) => sum + (data.data_confidence || 0.5),
      0
    ) / historicalData.length;
    
    confidence += avgDataConfidence * 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Calculate standard financial ratios
   */
  private calculateFinancialRatios(data: FinancialMetricsInput): FinancialRatioCalculation {
    const ratios: FinancialRatioCalculation = {};

    // Debt to EBITDA
    if (data.debt_total && data.ebitda && data.ebitda > 0) {
      ratios.debt_to_ebitda = data.debt_total / data.ebitda;
    }

    // Debt to Equity
    if (data.debt_total && data.equity_total && data.equity_total > 0) {
      ratios.debt_to_equity = data.debt_total / data.equity_total;
    }

    // Current Ratio
    if (data.current_assets && data.current_liabilities && data.current_liabilities > 0) {
      ratios.current_ratio = data.current_assets / data.current_liabilities;
    }

    // Interest Coverage
    if (data.ebitda && data.interest_expense && data.interest_expense > 0) {
      ratios.interest_coverage = data.ebitda / data.interest_expense;
    }

    // Return on Equity
    if (data.net_income && data.equity_total && data.equity_total > 0) {
      ratios.roe = (data.net_income / data.equity_total) * 100;
    }

    // Return on Assets
    if (data.net_income && data.current_assets && data.current_assets > 0) {
      ratios.roa = (data.net_income / data.current_assets) * 100;
    }

    return ratios;
  }

  /**
   * Assess data confidence based on completeness and consistency
   */
  private assessDataConfidence(data: FinancialMetricsInput): number {
    let confidence = 0.5; // Base confidence

    // Key financial metrics present
    const keyMetrics = ['debt_total', 'ebitda', 'revenue', 'net_income', 'equity_total'];
    const presentMetrics = keyMetrics.filter(metric => 
      data[metric as keyof FinancialMetricsInput] !== undefined && 
      data[metric as keyof FinancialMetricsInput] !== null
    );

    confidence += (presentMetrics.length / keyMetrics.length) * 0.3;

    // Balance sheet consistency
    if (data.current_assets && data.current_liabilities) {
      confidence += 0.1;
    }

    // Income statement consistency
    if (data.revenue && data.net_income) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Validate financial data input
   */
  private validateFinancialData(data: FinancialMetricsInput): void {
    const errors: string[] = [];

    if (!data.borrower_id) {
      errors.push('Borrower ID is required');
    }

    if (!data.period_date) {
      errors.push('Period date is required');
    }

    if (!data.period_type) {
      errors.push('Period type is required');
    }

    if (!data.source) {
      errors.push('Data source is required');
    }

    // Validate numeric fields are non-negative where applicable
    const numericFields = [
      'debt_total', 'ebitda', 'revenue', 'equity_total', 
      'current_assets', 'current_liabilities', 'capex'
    ];

    for (const field of numericFields) {
      const value = data[field as keyof FinancialMetricsInput] as number;
      if (value !== undefined && value < 0) {
        errors.push(`${field} cannot be negative`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get AI risk assessment for covenant
   */
  private async getAIRiskAssessment(
    covenant: Covenant,
    healthData: {
      current_value?: number;
      threshold_value?: number;
      trend: 'improving' | 'stable' | 'deteriorating';
      buffer_percentage?: number;
    }
  ): Promise<RiskAssessment> {
    try {
      return await geminiService.analyzeCovenantRisk(
        {
          covenant_name: covenant.covenant_name,
          current_value: healthData.current_value,
          threshold_value: healthData.threshold_value,
          trend: healthData.trend,
          buffer_percentage: healthData.buffer_percentage,
        },
        {
          borrower_name: covenant.contract?.borrower?.legal_name || 'Unknown',
          industry: covenant.contract?.borrower?.industry,
        }
      );
    } catch (error) {
      console.warn('Failed to get AI risk assessment:', error);
      // Return default assessment
      return {
        risk_score: 5,
        risk_factors: ['Unable to perform AI analysis'],
        recommended_actions: ['Manual review recommended'],
        assessment_summary: 'AI risk analysis unavailable',
        confidence_level: 0.1,
      };
    }
  }

  /**
   * Helper methods for data retrieval
   */
  private async getCovenantById(covenantId: string): Promise<Covenant | null> {
    try {
      const response = await apiService.get<Covenant>(
        API_ENDPOINTS.covenants.get(covenantId)
      );
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Failed to get covenant:', error);
      return null;
    }
  }

  private async getLatestFinancialData(borrowerId: string): Promise<FinancialMetrics | null> {
    try {
      const response = await apiService.get<FinancialMetrics[]>(
        `${API_ENDPOINTS.financialMetrics.get(borrowerId)}?limit=1&sort=period_date&order=desc`
      );
      
      if (response.success && response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('Failed to get financial data:', error);
      return null;
    }
  }

  private async getHistoricalFinancialData(
    borrowerId: string,
    periods: number
  ): Promise<FinancialMetrics[]> {
    try {
      const response = await apiService.get<FinancialMetrics[]>(
        `${API_ENDPOINTS.financialMetrics.get(borrowerId)}?limit=${periods}&sort=period_date&order=desc`
      );
      
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Failed to get historical financial data:', error);
      return [];
    }
  }

  private async getCovenantsForBorrower(borrowerId: string): Promise<Covenant[]> {
    try {
      const response = await apiService.get<Covenant[]>(
        `${API_ENDPOINTS.covenants.list}?borrower_id=${borrowerId}`
      );
      
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Failed to get covenants for borrower:', error);
      return [];
    }
  }

  private async saveCovenantHealth(healthData: any): Promise<CovenantHealth> {
    const response = await apiService.post<CovenantHealth>(
      '/covenant-health',
      healthData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to save covenant health');
    }

    return response.data;
  }

  private async recalculateRelatedCovenants(borrowerId: string): Promise<void> {
    // Get all covenants for this borrower and trigger recalculation
    const covenants = await this.getCovenantsForBorrower(borrowerId);
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < covenants.length; i += batchSize) {
      const batch = covenants.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(covenant => this.calculateCovenantHealth(covenant.id))
      );
    }
  }
}

// Export singleton instance
export const covenantHealthService = new CovenantHealthService();
export default covenantHealthService;