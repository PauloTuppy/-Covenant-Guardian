/**
 * Covenant Extraction Service
 * Orchestrates the covenant extraction process using Gemini AI
 */

import { geminiService } from './gemini';
import { apiService } from './api';
import { xanoIntegrationService } from './xanoIntegration';
import { API_ENDPOINTS } from '@/config/api';
import type {
  Contract,
  Covenant,
  CovenantExtractionResult,
  CovenantCreateInput,
} from '@/types';

export interface ExtractionJob {
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

export interface ExtractionQueueItem {
  contract_id: string;
  contract_text: string;
  priority: 'low' | 'normal' | 'high';
  retry_count: number;
  max_retries: number;
}

export class CovenantExtractionService {
  private extractionQueue: Map<string, ExtractionQueueItem> = new Map();
  private activeJobs: Map<string, ExtractionJob> = new Map();
  private readonly MAX_CONCURRENT_JOBS = 3;
  private readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Queue a contract for covenant extraction
   * Uses Xano for server-side processing with fallback to local processing
   */
  async queueExtraction(
    contractId: string,
    contractText: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    try {
      // Try Xano integration first for server-side processing
      const xanoJobId = await xanoIntegrationService.queueCovenantExtraction(
        contractId,
        contractText,
        priority
      );
      
      console.log(`Queued extraction job in Xano: ${xanoJobId}`);
      return xanoJobId;
    } catch (error) {
      console.warn('Xano extraction failed, falling back to local processing:', error);
      
      // Fallback to local processing
      const jobId = this.generateJobId();

      // Create extraction job record
      const job: ExtractionJob = {
        id: jobId,
        contract_id: contractId,
        status: 'pending',
        progress_percentage: 0,
        extracted_covenants_count: 0,
        created_at: new Date().toISOString(),
      };

      // Add to queue
      const queueItem: ExtractionQueueItem = {
        contract_id: contractId,
        contract_text: contractText,
        priority,
        retry_count: 0,
        max_retries: this.DEFAULT_MAX_RETRIES,
      };

      this.activeJobs.set(jobId, job);
      this.extractionQueue.set(jobId, queueItem);

      // Process queue
      this.processQueue();

      return jobId;
    }
  }

  /**
   * Get extraction job status
   */
  getJobStatus(jobId: string): ExtractionJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get extraction status for a contract
   * Checks both Xano and local processing
   */
  async getContractExtractionStatus(contractId: string): Promise<ExtractionJob | null> {
    // First check Xano
    try {
      const xanoStatus = await xanoIntegrationService.getContractExtractionStatus(contractId);
      if (xanoStatus) {
        return {
          id: xanoStatus.id,
          contract_id: xanoStatus.contract_id,
          status: xanoStatus.status,
          progress_percentage: xanoStatus.progress_percentage,
          extracted_covenants_count: xanoStatus.extracted_covenants_count,
          error_message: xanoStatus.error_message,
          started_at: xanoStatus.started_at,
          completed_at: xanoStatus.completed_at,
          created_at: xanoStatus.created_at,
        };
      }
    } catch (error) {
      console.warn('Failed to get Xano extraction status:', error);
    }

    // Fallback to local jobs
    for (const job of this.activeJobs.values()) {
      if (job.contract_id === contractId) {
        return job;
      }
    }
    return null;
  }

  /**
   * Process the extraction queue
   */
  private async processQueue(): Promise<void> {
    const runningJobs = Array.from(this.activeJobs.values()).filter(
      job => job.status === 'processing'
    ).length;

    if (runningJobs >= this.MAX_CONCURRENT_JOBS) {
      return; // Already at capacity
    }

    // Find next job to process (prioritize by priority, then FIFO)
    const pendingJobs = Array.from(this.extractionQueue.entries())
      .filter(([jobId]) => {
        const job = this.activeJobs.get(jobId);
        return job?.status === 'pending';
      })
      .sort(([, a], [, b]) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    if (pendingJobs.length === 0) {
      return; // No pending jobs
    }

    const [jobId, queueItem] = pendingJobs[0];
    await this.processExtractionJob(jobId, queueItem);
  }

  /**
   * Process a single extraction job
   */
  private async processExtractionJob(
    jobId: string,
    queueItem: ExtractionQueueItem
  ): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      // Update job status
      job.status = 'processing';
      job.started_at = new Date().toISOString();
      job.progress_percentage = 10;

      // Extract covenants using Gemini AI
      job.progress_percentage = 30;
      const extractionResult = await geminiService.extractCovenants(
        queueItem.contract_text
      );

      job.progress_percentage = 60;

      // Validate and classify extracted covenants
      const validatedCovenants = await this.validateAndClassifyCovenants(
        extractionResult.covenants,
        queueItem.contract_id
      );

      job.progress_percentage = 80;

      // Store covenants in database
      const storedCovenants = await this.storeExtractedCovenants(
        queueItem.contract_id,
        validatedCovenants
      );

      // Complete job
      job.status = 'completed';
      job.progress_percentage = 100;
      job.extracted_covenants_count = storedCovenants.length;
      job.completed_at = new Date().toISOString();

      // Clean up
      this.extractionQueue.delete(jobId);

      // Process next job in queue
      setTimeout(() => this.processQueue(), 100);

    } catch (error) {
      console.error(`Extraction job ${jobId} failed:`, error);
      
      // Handle retry logic
      queueItem.retry_count++;
      
      if (queueItem.retry_count < queueItem.max_retries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, queueItem.retry_count) * 1000;
        job.status = 'pending';
        job.progress_percentage = 0;
        
        setTimeout(() => this.processQueue(), delay);
      } else {
        // Mark as failed
        job.status = 'failed';
        job.error_message = error instanceof Error ? error.message : 'Unknown error';
        job.completed_at = new Date().toISOString();
        
        this.extractionQueue.delete(jobId);
        
        // Process next job
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Validate and classify extracted covenants
   */
  private async validateAndClassifyCovenants(
    extractedCovenants: CovenantExtractionResult['covenants'],
    contractId: string
  ): Promise<CovenantCreateInput[]> {
    const validatedCovenants: CovenantCreateInput[] = [];

    for (const extracted of extractedCovenants) {
      try {
        // Basic validation
        if (!extracted.covenant_name || extracted.confidence_score < 0.3) {
          console.warn(`Skipping low-confidence covenant: ${extracted.covenant_name}`);
          continue;
        }

        // Classify covenant type
        const covenantType = this.classifyCovenantType(
          extracted.covenant_name,
          extracted.metric_name,
          extracted.covenant_clause
        );

        // Validate operator and threshold
        const { operator, threshold_value } = this.validateOperatorAndThreshold(
          extracted.operator,
          extracted.threshold_value
        );

        // Determine check frequency
        const checkFrequency = this.determineCheckFrequency(
          extracted.check_frequency,
          extracted.covenant_clause
        );

        const validatedCovenant: CovenantCreateInput = {
          contract_id: contractId,
          covenant_name: extracted.covenant_name.trim(),
          covenant_type: covenantType,
          metric_name: extracted.metric_name?.trim() || undefined,
          operator,
          threshold_value,
          threshold_unit: extracted.threshold_unit?.trim() || undefined,
          check_frequency: checkFrequency,
          covenant_clause: extracted.covenant_clause?.trim() || undefined,
        };

        validatedCovenants.push(validatedCovenant);

      } catch (error) {
        console.error(`Failed to validate covenant ${extracted.covenant_name}:`, error);
        // Continue with other covenants
      }
    }

    return validatedCovenants;
  }

  /**
   * Classify covenant type based on content analysis
   */
  private classifyCovenantType(
    covenantName: string,
    metricName?: string,
    covenantClause?: string
  ): 'financial' | 'operational' | 'reporting' | 'other' {
    const text = `${covenantName} ${metricName || ''} ${covenantClause || ''}`.toLowerCase();

    // Financial covenant indicators
    const financialKeywords = [
      'ratio', 'ebitda', 'debt', 'equity', 'cash', 'revenue', 'income',
      'assets', 'liabilities', 'coverage', 'leverage', 'liquidity',
      'working capital', 'net worth', 'tangible', 'current ratio'
    ];

    // Operational covenant indicators
    const operationalKeywords = [
      'maintain', 'operate', 'business', 'insurance', 'compliance',
      'permits', 'licenses', 'environmental', 'safety', 'employment'
    ];

    // Reporting covenant indicators
    const reportingKeywords = [
      'report', 'deliver', 'provide', 'furnish', 'submit', 'financial statements',
      'audit', 'certificate', 'notice', 'information', 'quarterly', 'annual'
    ];

    if (financialKeywords.some(keyword => text.includes(keyword))) {
      return 'financial';
    }

    if (reportingKeywords.some(keyword => text.includes(keyword))) {
      return 'reporting';
    }

    if (operationalKeywords.some(keyword => text.includes(keyword))) {
      return 'operational';
    }

    return 'other';
  }

  /**
   * Validate and normalize operator and threshold
   */
  private validateOperatorAndThreshold(
    operator: string,
    thresholdValue: number
  ): { operator: '<' | '<=' | '>' | '>=' | '=' | '!='; threshold_value: number } {
    const validOperators = ['<', '<=', '>', '>=', '=', '!='];
    const normalizedOperator = operator.trim();

    if (!validOperators.includes(normalizedOperator)) {
      throw new Error(`Invalid operator: ${operator}`);
    }

    if (isNaN(thresholdValue) || !isFinite(thresholdValue)) {
      throw new Error(`Invalid threshold value: ${thresholdValue}`);
    }

    return {
      operator: normalizedOperator as '<' | '<=' | '>' | '>=' | '=' | '!=',
      threshold_value: thresholdValue,
    };
  }

  /**
   * Determine appropriate check frequency
   */
  private determineCheckFrequency(
    extractedFrequency: string,
    covenantClause?: string
  ): 'monthly' | 'quarterly' | 'annually' | 'on_demand' {
    const text = `${extractedFrequency} ${covenantClause || ''}`.toLowerCase();

    if (text.includes('month') || text.includes('monthly')) {
      return 'monthly';
    }

    if (text.includes('quarter') || text.includes('quarterly')) {
      return 'quarterly';
    }

    if (text.includes('annual') || text.includes('yearly') || text.includes('year')) {
      return 'annually';
    }

    if (text.includes('demand') || text.includes('request') || text.includes('upon')) {
      return 'on_demand';
    }

    // Default to quarterly for financial covenants
    return 'quarterly';
  }

  /**
   * Store extracted covenants in database
   */
  private async storeExtractedCovenants(
    contractId: string,
    covenants: CovenantCreateInput[]
  ): Promise<Covenant[]> {
    const storedCovenants: Covenant[] = [];

    for (const covenantData of covenants) {
      try {
        const response = await apiService.post<Covenant>(
          API_ENDPOINTS.covenants.list,
          {
            ...covenantData,
            gemini_extracted: true,
          }
        );

        if (response.success && response.data) {
          storedCovenants.push(response.data);
        }
      } catch (error) {
        console.error(`Failed to store covenant ${covenantData.covenant_name}:`, error);
        // Continue with other covenants
      }
    }

    return storedCovenants;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const jobs = Array.from(this.activeJobs.values());
    
    return {
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length,
      total: jobs.length,
    };
  }

  /**
   * Clear completed and failed jobs older than specified time
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [jobId, job] of this.activeJobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completed_at &&
        new Date(job.completed_at) < cutoffTime
      ) {
        this.activeJobs.delete(jobId);
        this.extractionQueue.delete(jobId);
      }
    }
  }
}

// Export singleton instance
export const covenantExtractionService = new CovenantExtractionService();
export default covenantExtractionService;