/**
 * Unit Tests for Covenant Extraction Service
 * Tests extraction orchestration and queue management
 */

import { covenantExtractionService } from '../covenantExtraction';
import { geminiService } from '../gemini';
import { apiService } from '../api';
import { xanoIntegrationService } from '../xanoIntegration';
import type { CovenantExtractionResult } from '@/types';

// Mock dependencies
jest.mock('../gemini');
jest.mock('../api');
jest.mock('../xanoIntegration');

const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockXanoIntegrationService = xanoIntegrationService as jest.Mocked<typeof xanoIntegrationService>;

describe('CovenantExtractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing jobs
    const service = covenantExtractionService as any;
    service.activeJobs.clear();
    service.extractionQueue.clear();
    
    // Mock Xano integration to fail so we use local processing
    mockXanoIntegrationService.queueCovenantExtraction.mockRejectedValue(
      new Error('Xano not available - using local processing')
    );
  });

  describe('queueExtraction', () => {
    it('should queue extraction job successfully', async () => {
      const contractId = 'contract-123';
      const contractText = 'Test contract with covenants';

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const jobStatus = covenantExtractionService.getJobStatus(jobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.contract_id).toBe(contractId);
      expect(jobStatus?.status).toBe('pending');
    });

    it('should process extraction job with successful result', async () => {
      const contractId = 'contract-123';
      const contractText = 'Borrower shall maintain a debt to EBITDA ratio not exceeding 3.0:1.0';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Debt to EBITDA Ratio',
            covenant_type: 'financial',
            metric_name: 'debt_to_ebitda',
            operator: '<=',
            threshold_value: 3.0,
            threshold_unit: 'ratio',
            check_frequency: 'quarterly',
            covenant_clause: 'Borrower shall maintain a debt to EBITDA ratio not exceeding 3.0:1.0',
            confidence_score: 0.95,
          },
        ],
        extraction_summary: 'Successfully extracted 1 covenant',
        processing_time_ms: 1500,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'covenant-1',
          contract_id: contractId,
          bank_id: 'test-bank',
          covenant_name: 'Debt to EBITDA Ratio',
          covenant_type: 'financial',
          gemini_extracted: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'high'
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = covenantExtractionService.getJobStatus(jobId);
      expect(jobStatus?.status).toBe('completed');
      expect(jobStatus?.extracted_covenants_count).toBe(1);
      expect(jobStatus?.progress_percentage).toBe(100);

      expect(mockGeminiService.extractCovenants).toHaveBeenCalledWith(contractText);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/covenants',
        expect.objectContaining({
          contract_id: contractId,
          covenant_name: 'Debt to EBITDA Ratio',
          covenant_type: 'financial',
          gemini_extracted: true,
        })
      );
    });

    it('should handle extraction failures with retry logic', async () => {
      const contractId = 'contract-123';
      const contractText = 'Invalid contract text';

      mockGeminiService.extractCovenants.mockRejectedValue(new Error('AI service unavailable'));

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      // Wait for initial processing attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = covenantExtractionService.getJobStatus(jobId);
      
      // Job should either be failed or still retrying
      expect(['failed', 'pending']).toContain(jobStatus?.status);
      expect(jobStatus?.extracted_covenants_count).toBe(0);

      // Should have attempted at least once
      expect(mockGeminiService.extractCovenants).toHaveBeenCalledWith(contractText);
    });

    it('should filter out low-confidence covenants', async () => {
      const contractId = 'contract-123';
      const contractText = 'Contract with unclear covenants';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Low Confidence Covenant',
            covenant_type: 'other',
            operator: '>=',
            threshold_value: 1.0,
            check_frequency: 'quarterly',
            covenant_clause: 'Unclear clause',
            confidence_score: 0.2, // Low confidence
          },
          {
            covenant_name: 'High Confidence Covenant',
            covenant_type: 'financial',
            operator: '<=',
            threshold_value: 2.5,
            check_frequency: 'quarterly',
            covenant_clause: 'Clear financial covenant',
            confidence_score: 0.9, // High confidence
          },
        ],
        extraction_summary: 'Mixed confidence extraction',
        processing_time_ms: 1200,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'covenant-1',
          contract_id: contractId,
          covenant_name: 'High Confidence Covenant',
          gemini_extracted: true,
        },
      });

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = covenantExtractionService.getJobStatus(jobId);
      expect(jobStatus?.status).toBe('completed');
      expect(jobStatus?.extracted_covenants_count).toBe(1);

      // Only high-confidence covenant should be stored
      expect(mockApiService.post).toHaveBeenCalledTimes(1);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/covenants',
        expect.objectContaining({
          covenant_name: 'High Confidence Covenant',
        })
      );
    });
  });

  describe('getContractExtractionStatus', () => {
    it('should return status for active extraction job', async () => {
      const contractId = 'contract-123';
      const contractText = 'Test contract';

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      const status = await covenantExtractionService.getContractExtractionStatus(contractId);
      expect(status).toBeDefined();
      expect(status?.contract_id).toBe(contractId);
      expect(status?.id).toBe(jobId);
    });

    it('should return null for non-existent contract', async () => {
      mockXanoIntegrationService.getContractExtractionStatus.mockResolvedValue(null);
      
      const status = await covenantExtractionService.getContractExtractionStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('covenant classification', () => {
    it('should classify financial covenants correctly', async () => {
      const contractId = 'contract-123';
      const contractText = 'Financial covenant text';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Debt Service Coverage Ratio',
            covenant_type: 'other', // Will be reclassified
            metric_name: 'debt_service_coverage',
            operator: '>=',
            threshold_value: 1.25,
            check_frequency: 'quarterly',
            covenant_clause: 'Maintain debt service coverage ratio of at least 1.25x',
            confidence_score: 0.8,
          },
        ],
        extraction_summary: 'Extracted financial covenant',
        processing_time_ms: 1000,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'covenant-1', contract_id: contractId },
      });

      await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify covenant was classified as financial
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/covenants',
        expect.objectContaining({
          covenant_type: 'financial', // Should be reclassified from 'other'
        })
      );
    });

    it('should classify reporting covenants correctly', async () => {
      const contractId = 'contract-123';
      const contractText = 'Reporting covenant text';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Quarterly Financial Reporting',
            covenant_type: 'other',
            operator: '=',
            threshold_value: 1,
            check_frequency: 'quarterly',
            covenant_clause: 'Borrower shall deliver quarterly financial statements within 45 days',
            confidence_score: 0.85,
          },
        ],
        extraction_summary: 'Extracted reporting covenant',
        processing_time_ms: 800,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'covenant-1', contract_id: contractId },
      });

      await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify covenant was classified as reporting
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/covenants',
        expect.objectContaining({
          covenant_type: 'reporting',
        })
      );
    });
  });

  describe('queue management', () => {
    it('should provide queue statistics', async () => {
      const stats = covenantExtractionService.getQueueStats();
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
      expect(typeof stats.total).toBe('number');
    });

    it('should handle multiple concurrent jobs', async () => {
      const contractIds = ['contract-1', 'contract-2', 'contract-3'];
      
      mockGeminiService.extractCovenants.mockResolvedValue({
        covenants: [],
        extraction_summary: 'No covenants found',
        processing_time_ms: 500,
      });

      const jobIds = await Promise.all(
        contractIds.map(contractId =>
          covenantExtractionService.queueExtraction(
            contractId,
            'Test contract text',
            'normal'
          )
        )
      );

      expect(jobIds).toHaveLength(3);
      jobIds.forEach(jobId => {
        expect(typeof jobId).toBe('string');
        const status = covenantExtractionService.getJobStatus(jobId);
        expect(status).toBeDefined();
      });
    });

    it('should clean up old completed jobs', async () => {
      const contractId = 'contract-123';
      
      mockGeminiService.extractCovenants.mockResolvedValueOnce({
        covenants: [],
        extraction_summary: 'No covenants found',
        processing_time_ms: 100,
      });

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        'Test contract',
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Job should be completed
      let status = covenantExtractionService.getJobStatus(jobId);
      expect(status?.status).toBe('completed');

      // Clean up jobs older than 0 hours (should clean immediately)
      covenantExtractionService.cleanupOldJobs(0);

      // Job should be cleaned up
      status = covenantExtractionService.getJobStatus(jobId);
      expect(status).toBeNull();
    });
  });

  describe('validation', () => {
    it('should validate operator and threshold values', async () => {
      const contractId = 'contract-123';
      const contractText = 'Contract with invalid data';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Invalid Covenant',
            covenant_type: 'financial',
            operator: 'invalid_operator' as any,
            threshold_value: NaN,
            check_frequency: 'quarterly',
            covenant_clause: 'Invalid covenant clause',
            confidence_score: 0.8,
          },
        ],
        extraction_summary: 'Extracted invalid covenant',
        processing_time_ms: 1000,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);

      const jobId = await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = covenantExtractionService.getJobStatus(jobId);
      expect(jobStatus?.status).toBe('completed');
      expect(jobStatus?.extracted_covenants_count).toBe(0);

      // No covenants should be stored due to validation failure
      expect(mockApiService.post).not.toHaveBeenCalled();
    });

    it('should determine check frequency from covenant text', async () => {
      const contractId = 'contract-123';
      const contractText = 'Monthly reporting covenant';

      const mockExtractionResult: CovenantExtractionResult = {
        covenants: [
          {
            covenant_name: 'Monthly Reporting',
            covenant_type: 'reporting',
            operator: '=',
            threshold_value: 1,
            check_frequency: 'quarterly', // Will be overridden
            covenant_clause: 'Borrower shall provide monthly financial reports',
            confidence_score: 0.9,
          },
        ],
        extraction_summary: 'Extracted monthly covenant',
        processing_time_ms: 800,
      };

      mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'covenant-1', contract_id: contractId },
      });

      await covenantExtractionService.queueExtraction(
        contractId,
        contractText,
        'normal'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify frequency was determined from clause text
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/covenants',
        expect.objectContaining({
          check_frequency: 'monthly', // Should be determined from clause
        })
      );
    });
  });
});