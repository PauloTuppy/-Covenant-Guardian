/**
 * Financial Data Service
 * Handles financial metrics ingestion, validation, and processing
 */

import { apiService } from './api';
import { covenantHealthService } from './covenantHealth';
import { API_ENDPOINTS } from '@/config/api';
import type {
  FinancialMetrics,
  FinancialMetricsInput,
  Borrower,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

export interface FinancialDataFilters {
  borrower_id?: string;
  period_type?: 'monthly' | 'quarterly' | 'annual';
  source?: string;
  date_from?: string;
  date_to?: string;
  confidence_min?: number;
}

export interface FinancialDataSummary {
  borrower_id: string;
  latest_period: string;
  periods_available: number;
  data_sources: string[];
  avg_confidence: number;
  key_ratios: {
    debt_to_ebitda?: number;
    current_ratio?: number;
    interest_coverage?: number;
  };
}

export class FinancialDataService {
  /**
   * Ingest financial data for a borrower
   */
  async ingestFinancialData(
    financialData: FinancialMetricsInput
  ): Promise<FinancialMetrics> {
    // Validate the borrower exists
    await this.validateBorrowerExists(financialData.borrower_id);

    // Use covenant health service for ingestion (includes ratio calculations)
    return covenantHealthService.ingestFinancialData(
      financialData.borrower_id,
      financialData
    );
  }

  /**
   * Batch ingest multiple financial data records
   */
  async batchIngestFinancialData(
    dataRecords: FinancialMetricsInput[]
  ): Promise<{
    successful: FinancialMetrics[];
    failed: Array<{ data: FinancialMetricsInput; error: string }>;
  }> {
    const successful: FinancialMetrics[] = [];
    const failed: Array<{ data: FinancialMetricsInput; error: string }> = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < dataRecords.length; i += batchSize) {
      const batch = dataRecords.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(data => this.ingestFinancialData(data))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            data: batch[index],
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    return { successful, failed };
  }

  /**
   * Get financial data for a borrower
   */
  async getFinancialData(
    borrowerId: string,
    filters: Omit<FinancialDataFilters, 'borrower_id'> = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<FinancialMetrics>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters
    if (filters.period_type) params.append('period_type', filters.period_type);
    if (filters.source) params.append('source', filters.source);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.confidence_min) params.append('confidence_min', filters.confidence_min.toString());

    const response = await apiService.get<PaginatedResponse<FinancialMetrics>>(
      `${API_ENDPOINTS.financialMetrics.get(borrowerId)}?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch financial data');
    }

    return response.data;
  }

  /**
   * Get latest financial metrics for a borrower
   */
  async getLatestFinancialMetrics(borrowerId: string): Promise<FinancialMetrics | null> {
    const response = await this.getFinancialData(borrowerId, {}, 1, 1);
    
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Get financial ratios for a borrower
   */
  async getFinancialRatios(
    borrowerId: string,
    periods = 4
  ): Promise<{
    current: FinancialMetrics | null;
    historical: FinancialMetrics[];
    trend_analysis: {
      debt_to_ebitda_trend: 'improving' | 'stable' | 'deteriorating';
      current_ratio_trend: 'improving' | 'stable' | 'deteriorating';
      interest_coverage_trend: 'improving' | 'stable' | 'deteriorating';
    };
  }> {
    const response = await apiService.get<{
      current: FinancialMetrics | null;
      historical: FinancialMetrics[];
      trend_analysis: {
        debt_to_ebitda_trend: 'improving' | 'stable' | 'deteriorating';
        current_ratio_trend: 'improving' | 'stable' | 'deteriorating';
        interest_coverage_trend: 'improving' | 'stable' | 'deteriorating';
      };
    }>(`${API_ENDPOINTS.financialMetrics.ratios(borrowerId)}?periods=${periods}`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch financial ratios');
    }

    return response.data;
  }

  /**
   * Update financial data record
   */
  async updateFinancialData(
    metricsId: string,
    updates: Partial<FinancialMetricsInput>
  ): Promise<FinancialMetrics> {
    const response = await apiService.put<FinancialMetrics>(
      `/financial-metrics/${metricsId}`,
      updates
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update financial data');
    }

    // Trigger covenant health recalculation
    if (response.data.borrower_id) {
      await covenantHealthService.updateHealthMetrics(
        response.data.borrower_id,
        response.data
      );
    }

    return response.data;
  }

  /**
   * Delete financial data record
   */
  async deleteFinancialData(metricsId: string): Promise<void> {
    const response = await apiService.delete(`/financial-metrics/${metricsId}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete financial data');
    }
  }

  /**
   * Get financial data summary for a borrower
   */
  async getFinancialDataSummary(borrowerId: string): Promise<FinancialDataSummary> {
    const response = await apiService.get<FinancialDataSummary>(
      `/financial-metrics/${borrowerId}/summary`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch financial data summary');
    }

    return response.data;
  }

  /**
   * Validate financial data quality
   */
  async validateFinancialDataQuality(
    borrowerId: string,
    periodDate: string
  ): Promise<{
    is_valid: boolean;
    confidence_score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const response = await apiService.post<{
      is_valid: boolean;
      confidence_score: number;
      issues: string[];
      recommendations: string[];
    }>('/financial-metrics/validate', {
      borrower_id: borrowerId,
      period_date: periodDate,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to validate financial data');
    }

    return response.data;
  }

  /**
   * Get financial data sources for a borrower
   */
  async getDataSources(borrowerId: string): Promise<{
    sources: Array<{
      source: string;
      periods_count: number;
      latest_period: string;
      avg_confidence: number;
    }>;
  }> {
    const response = await apiService.get<{
      sources: Array<{
        source: string;
        periods_count: number;
        latest_period: string;
        avg_confidence: number;
      }>;
    }>(`/financial-metrics/${borrowerId}/sources`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch data sources');
    }

    return response.data;
  }

  /**
   * Compare financial metrics across periods
   */
  async compareFinancialMetrics(
    borrowerId: string,
    periodFrom: string,
    periodTo: string
  ): Promise<{
    period_from: FinancialMetrics | null;
    period_to: FinancialMetrics | null;
    changes: {
      metric: string;
      from_value: number;
      to_value: number;
      change_amount: number;
      change_percentage: number;
    }[];
    summary: string;
  }> {
    const response = await apiService.post<{
      period_from: FinancialMetrics | null;
      period_to: FinancialMetrics | null;
      changes: {
        metric: string;
        from_value: number;
        to_value: number;
        change_amount: number;
        change_percentage: number;
      }[];
      summary: string;
    }>('/financial-metrics/compare', {
      borrower_id: borrowerId,
      period_from: periodFrom,
      period_to: periodTo,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to compare financial metrics');
    }

    return response.data;
  }

  /**
   * Get borrowers with stale financial data
   */
  async getBorrowersWithStaleData(
    daysThreshold = 120
  ): Promise<Array<{
    borrower: Borrower;
    last_update: string;
    days_since_update: number;
    missing_periods: number;
  }>> {
    const response = await apiService.get<Array<{
      borrower: Borrower;
      last_update: string;
      days_since_update: number;
      missing_periods: number;
    }>>(`/financial-metrics/stale?days=${daysThreshold}`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch borrowers with stale data');
    }

    return response.data;
  }

  /**
   * Trigger covenant health recalculation for all borrowers
   */
  async recalculateAllCovenantHealth(): Promise<{
    processed_borrowers: number;
    updated_covenants: number;
    errors: string[];
  }> {
    const response = await apiService.post<{
      processed_borrowers: number;
      updated_covenants: number;
      errors: string[];
    }>('/financial-metrics/recalculate-health');

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to trigger health recalculation');
    }

    return response.data;
  }

  /**
   * Export financial data for a borrower
   */
  async exportFinancialData(
    borrowerId: string,
    format: 'csv' | 'xlsx' | 'json' = 'csv',
    filters: Omit<FinancialDataFilters, 'borrower_id'> = {}
  ): Promise<Blob> {
    const params = new URLSearchParams({
      format,
    });

    // Add filters
    if (filters.period_type) params.append('period_type', filters.period_type);
    if (filters.source) params.append('source', filters.source);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    const response = await fetch(
      `${API_ENDPOINTS.financialMetrics.get(borrowerId)}/export?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export financial data');
    }

    return response.blob();
  }

  /**
   * Import financial data from file
   */
  async importFinancialData(
    borrowerId: string,
    file: File,
    options: {
      source: string;
      period_type: 'monthly' | 'quarterly' | 'annual';
      skip_validation?: boolean;
    }
  ): Promise<{
    imported_records: number;
    skipped_records: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('borrower_id', borrowerId);
    formData.append('source', options.source);
    formData.append('period_type', options.period_type);
    if (options.skip_validation) {
      formData.append('skip_validation', 'true');
    }

    const response = await apiService.post<{
      imported_records: number;
      skipped_records: number;
      errors: Array<{ row: number; error: string }>;
    }>('/financial-metrics/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to import financial data');
    }

    return response.data;
  }

  /**
   * Helper methods
   */
  private async validateBorrowerExists(borrowerId: string): Promise<void> {
    try {
      const response = await apiService.get(`/borrowers/${borrowerId}`);
      if (!response.success) {
        throw new Error(`Borrower not found: ${borrowerId}`);
      }
    } catch (error) {
      throw new Error(`Invalid borrower ID: ${borrowerId}`);
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const financialDataService = new FinancialDataService();
export default financialDataService;