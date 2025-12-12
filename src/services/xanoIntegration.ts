/**
 * Xano Integration Service for Covenant Extraction
 * Handles server-side covenant extraction processing using Xano functions
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/config/api';
import type {
  CovenantExtractionResult,
  RiskAssessment,
  Covenant,
  CovenantCreateInput,
} from '@/types';

export interface XanoExtractionJob {
  id: string;
  contract_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  extracted_covenants_count: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface XanoExtractionRequest {
  contract_id: string;
  contract_text: string;
  priority: 'low' | 'normal' | 'high';
}

export class XanoIntegrationService {
  /**
   * Queue covenant extraction job in Xano
   */
  async queueCovenantExtraction(
    contractId: string,
    contractText: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const response = await apiService.post<{ job_id: string }>(
      '/xano/covenant-extraction/queue',
      {
        contract_id: contractId,
        contract_text: contractText,
        priority,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to queue extraction job');
    }

    return response.data.job_id;
  }

  /**
   * Get extraction job status from Xano
   */
  async getExtractionJobStatus(jobId: string): Promise<XanoExtractionJob | null> {
    try {
      const response = await apiService.get<XanoExtractionJob>(
        `/xano/covenant-extraction/jobs/${jobId}`
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.warn('Failed to get extraction job status:', error);
      return null;
    }
  }

  /**
   * Get extraction status for a contract
   */
  async getContractExtractionStatus(contractId: string): Promise<XanoExtractionJob | null> {
    try {
      const response = await apiService.get<XanoExtractionJob>(
        API_ENDPOINTS.covenants.extractionStatus(contractId)
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      console.warn('Failed to get contract extraction status:', error);
      return null;
    }
  }

  /**
   * Trigger immediate covenant extraction (for testing/admin use)
   */
  async extractCovenantsImmediate(
    contractId: string,
    contractText: string
  ): Promise<CovenantExtractionResult> {
    const response = await apiService.post<CovenantExtractionResult>(
      '/xano/covenant-extraction/immediate',
      {
        contract_id: contractId,
        contract_text: contractText,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to extract covenants');
    }

    return response.data;
  }

  /**
   * Get extracted covenants for a contract
   */
  async getExtractedCovenants(contractId: string): Promise<Covenant[]> {
    const response = await apiService.get<Covenant[]>(
      `/xano/covenants/by-contract/${contractId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get extracted covenants');
    }

    return response.data;
  }

  /**
   * Analyze covenant risk using Xano + Gemini
   */
  async analyzeCovenantRisk(
    covenantId: string,
    covenantData: {
      covenant_name: string;
      current_value?: number;
      threshold_value?: number;
      trend?: 'improving' | 'stable' | 'deteriorating';
      buffer_percentage?: number;
    },
    financialContext?: {
      borrower_name: string;
      industry?: string;
      recent_metrics?: Record<string, number>;
    }
  ): Promise<RiskAssessment> {
    const response = await apiService.post<RiskAssessment>(
      '/xano/risk-analysis/covenant',
      {
        covenant_id: covenantId,
        covenant_data: covenantData,
        financial_context: financialContext,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to analyze covenant risk');
    }

    return response.data;
  }

  /**
   * Analyze adverse events using Xano + Gemini
   */
  async analyzeAdverseEvent(
    eventData: {
      headline: string;
      description?: string;
      event_type: string;
    },
    borrowerContext: {
      borrower_name: string;
      industry?: string;
      active_covenants?: Array<{
        covenant_name: string;
        covenant_type: string;
      }>;
    }
  ): Promise<{
    risk_score: number;
    impact_assessment: string;
    affected_covenants: string[];
    recommended_actions: string[];
  }> {
    const response = await apiService.post<{
      risk_score: number;
      impact_assessment: string;
      affected_covenants: string[];
      recommended_actions: string[];
    }>('/xano/risk-analysis/adverse-event', {
      event_data: eventData,
      borrower_context: borrowerContext,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to analyze adverse event');
    }

    return response.data;
  }

  /**
   * Validate and store extracted covenants
   */
  async storeExtractedCovenants(
    contractId: string,
    covenants: CovenantCreateInput[]
  ): Promise<Covenant[]> {
    const response = await apiService.post<Covenant[]>(
      '/xano/covenants/store-extracted',
      {
        contract_id: contractId,
        covenants,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to store extracted covenants');
    }

    return response.data;
  }

  /**
   * Get extraction queue statistics
   */
  async getExtractionQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const response = await apiService.get<{
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      total: number;
    }>('/xano/covenant-extraction/queue/stats');

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get queue statistics');
    }

    return response.data;
  }

  /**
   * Retry failed extraction job
   */
  async retryExtractionJob(jobId: string): Promise<void> {
    const response = await apiService.post(
      `/xano/covenant-extraction/jobs/${jobId}/retry`
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to retry extraction job');
    }
  }

  /**
   * Cancel pending extraction job
   */
  async cancelExtractionJob(jobId: string): Promise<void> {
    const response = await apiService.delete(
      `/xano/covenant-extraction/jobs/${jobId}`
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to cancel extraction job');
    }
  }

  /**
   * Health check for Xano extraction services
   */
  async healthCheck(): Promise<{
    extraction_service: boolean;
    gemini_integration: boolean;
    queue_processing: boolean;
  }> {
    try {
      const response = await apiService.get<{
        extraction_service: boolean;
        gemini_integration: boolean;
        queue_processing: boolean;
      }>('/xano/covenant-extraction/health');

      if (!response.success || !response.data) {
        return {
          extraction_service: false,
          gemini_integration: false,
          queue_processing: false,
        };
      }

      return response.data;
    } catch (error) {
      console.warn('Xano health check failed:', error);
      return {
        extraction_service: false,
        gemini_integration: false,
        queue_processing: false,
      };
    }
  }

  /**
   * Run Covenant Analysis Agent
   * Calls the Xano AI Agent to analyze covenants for a contract
   */
  async runCovenantAnalysisAgent(
    contractId: number | string,
    prompt?: string
  ): Promise<{
    analysis: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    compliance_status: string;
    recommendations: string[];
    covenants_analyzed: number;
  }> {
    const response = await apiService.post<{
      analysis: string;
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      compliance_status: string;
      recommendations: string[];
      covenants_analyzed: number;
    }>('/agent/covenant-analysis-agent/run', {
      contract_id: contractId,
      prompt: prompt || `Analyze the covenants for contract ID ${contractId} and provide compliance assessment`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to run covenant analysis agent');
    }

    return response.data;
  }

  /**
   * Fetch covenant data for a contract using the covenants endpoint
   * Falls back to filtering all covenants by contract_id
   */
  async testGetCovenantDataTool(contractId: number | string): Promise<{
    covenants: Array<{
      id: number;
      contract_id: number;
      covenant_name: string;
      threshold_value: number;
      current_value: number;
      status: string;
      operator: string;
    }>;
  }> {
    // Use the working /covenants endpoint and filter by contract_id
    const response = await apiService.get<
      Array<{
        id: number;
        contract_id: number;
        covenant_name: string;
        threshold_value: number;
        current_value: number;
        status: string;
        operator: string;
      }>
    >('/covenants');

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch covenants');
    }

    // Filter covenants by contract_id
    const contractIdNum = typeof contractId === 'string' ? parseInt(contractId, 10) : contractId;
    const filteredCovenants = response.data.filter((c) => c.contract_id === contractIdNum);

    return { covenants: filteredCovenants };
  }

  /**
   * Analyze covenants locally (fallback when AI agent endpoint is not available)
   * Performs basic breach detection based on threshold vs current values
   */
  analyzeCovenantDataLocally(covenants: Array<{
    covenant_name: string;
    threshold_value: number;
    current_value: number;
    operator: string;
  }>): {
    analysis: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    compliance_status: string;
    recommendations: string[];
    covenants_analyzed: number;
  } {
    const breached: string[] = [];
    const warning: string[] = [];
    const compliant: string[] = [];

    covenants.forEach((cov) => {
      // Simple breach detection logic based on threshold comparison
      if (cov.current_value < cov.threshold_value * 0.9) {
        breached.push(cov.covenant_name);
      } else if (cov.current_value < cov.threshold_value) {
        warning.push(cov.covenant_name);
      } else {
        compliant.push(cov.covenant_name);
      }
    });

    // Determine risk level
    let risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (breached.length > 0) {
      risk_level = breached.length >= 2 ? 'critical' : 'high';
    } else if (warning.length > 0) {
      risk_level = warning.length >= 2 ? 'high' : 'medium';
    }

    // Generate analysis
    const analysis = [
      `Analyzed ${covenants.length} covenants for compliance.`,
      breached.length > 0 ? `⚠️ ${breached.length} covenant(s) in BREACH: ${breached.join(', ')}` : '',
      warning.length > 0 ? `⚡ ${warning.length} covenant(s) at WARNING level: ${warning.join(', ')}` : '',
      compliant.length > 0 ? `✅ ${compliant.length} covenant(s) COMPLIANT: ${compliant.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    // Generate recommendations
    const recommendations: string[] = [];
    if (breached.length > 0) {
      recommendations.push('Immediate action required: Review breached covenants with borrower');
      recommendations.push('Consider covenant waiver or amendment negotiations');
    }
    if (warning.length > 0) {
      recommendations.push('Monitor warning-level covenants closely');
      recommendations.push('Request updated financial projections from borrower');
    }
    if (risk_level === 'low') {
      recommendations.push('Continue regular monitoring schedule');
    }

    return {
      analysis,
      risk_level,
      compliance_status: breached.length > 0 ? 'Non-Compliant' : warning.length > 0 ? 'At Risk' : 'Compliant',
      recommendations,
      covenants_analyzed: covenants.length,
    };
  }
}

// Export singleton instance
export const xanoIntegrationService = new XanoIntegrationService();
export default xanoIntegrationService;