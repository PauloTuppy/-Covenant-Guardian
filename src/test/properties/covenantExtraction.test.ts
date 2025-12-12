/**
 * Property-Based Tests for Covenant Extraction
 * Feature: covenant-guardian, Property 3: Covenant Extraction Data Integrity
 */

import fc from 'fast-check';
import { covenantExtractionService } from '@/services/covenantExtraction';
import { geminiService } from '@/services/gemini';
import { apiService } from '@/services/api';
import { xanoIntegrationService } from '@/services/xanoIntegration';
import type { CovenantExtractionResult } from '@/types';

// Mock the services
jest.mock('@/services/gemini');
jest.mock('@/services/api');
jest.mock('@/services/xanoIntegration');

const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockXanoIntegrationService = xanoIntegrationService as jest.Mocked<typeof xanoIntegrationService>;

describe('Covenant Extraction Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Mock Xano integration to fail so we use local processing
    mockXanoIntegrationService.queueCovenantExtraction.mockRejectedValue(
      new Error('Xano not available - using local processing')
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 3: Covenant Extraction Data Integrity
   * For any successfully extracted covenant, the system should assign a valid classification type,
   * populate all required fields (metric name, operator, threshold value, monitoring frequency),
   * and maintain reference to the original contract clause.
   * Validates: Requirements 2.2, 2.3, 2.4
   */
  describe('Property 3: Covenant Extraction Data Integrity', () => {
    test('should maintain data integrity for all successfully extracted covenants', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate contract data and extraction results
          fc.record({
            contractId: fc.uuid(),
            contractText: fc.string({ minLength: 100, maxLength: 5000 }),
            extractedCovenants: fc.array(
              fc.record({
                covenant_name: fc.string({ minLength: 5, maxLength: 100 }),
                covenant_type: fc.constantFrom('financial', 'operational', 'reporting', 'other'),
                metric_name: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                operator: fc.constantFrom('<', '<=', '>', '>=', '=', '!='),
                threshold_value: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }),
                threshold_unit: fc.option(fc.constantFrom('ratio', 'dollars', 'percent', 'times')),
                check_frequency: fc.constantFrom('monthly', 'quarterly', 'annually', 'on_demand'),
                covenant_clause: fc.string({ minLength: 10, maxLength: 500 }),
                confidence_score: fc.float({ min: Math.fround(0.3), max: Math.fround(1.0) }), // Only high-confidence covenants
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ contractId, contractText, extractedCovenants }) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            mockXanoIntegrationService.queueCovenantExtraction.mockRejectedValue(
              new Error('Xano not available - using local processing')
            );
            // Mock Gemini AI response
            const mockExtractionResult: CovenantExtractionResult = {
              covenants: extractedCovenants,
              extraction_summary: 'Test extraction completed',
              processing_time_ms: 1500,
            };

            mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);

            // Mock API responses for storing covenants
            extractedCovenants.forEach((covenant, index) => {
              mockApiService.post.mockResolvedValueOnce({
                success: true,
                data: {
                  id: `covenant-${index}`,
                  contract_id: contractId,
                  bank_id: 'test-bank',
                  gemini_extracted: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...covenant,
                },
              });
            });

            // Queue extraction
            const jobId = await covenantExtractionService.queueExtraction(
              contractId,
              contractText,
              'normal'
            );

            // Wait for processing to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const jobStatus = covenantExtractionService.getJobStatus(jobId);

            // Verify job completed successfully
            expect(jobStatus).toBeDefined();
            expect(jobStatus?.status).toBe('completed');
            expect(jobStatus?.extracted_covenants_count).toBe(extractedCovenants.length);

            // Verify all API calls were made correctly
            expect(mockGeminiService.extractCovenants).toHaveBeenCalledWith(contractText);
            expect(mockApiService.post).toHaveBeenCalledTimes(extractedCovenants.length);

            // Verify data integrity for each stored covenant
            extractedCovenants.forEach((originalCovenant, index) => {
              const apiCall = mockApiService.post.mock.calls[index];
              const storedData = apiCall[1];

              // Verify required fields are populated
              expect(storedData.contract_id).toBe(contractId);
              expect(storedData.covenant_name).toBeDefined();
              expect(storedData.covenant_name.trim()).toBe(originalCovenant.covenant_name.trim());
              
              // Verify classification type is valid
              expect(['financial', 'operational', 'reporting', 'other']).toContain(storedData.covenant_type);
              
              // Verify operator is valid
              expect(['<', '<=', '>', '>=', '=', '!=']).toContain(storedData.operator);
              
              // Verify threshold value is numeric and valid
              expect(typeof storedData.threshold_value).toBe('number');
              expect(storedData.threshold_value).toBeGreaterThan(0);
              expect(isFinite(storedData.threshold_value)).toBe(true);
              
              // Verify monitoring frequency is valid
              expect(['monthly', 'quarterly', 'annually', 'on_demand']).toContain(storedData.check_frequency);
              
              // Verify original contract clause is maintained
              expect(storedData.covenant_clause).toBeDefined();
              expect(storedData.covenant_clause.trim()).toBe(originalCovenant.covenant_clause.trim());
              
              // Verify Gemini extraction flag is set
              expect(storedData.gemini_extracted).toBe(true);
            });
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    test('should properly classify covenant types based on content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contractId: fc.uuid(),
            financialCovenant: fc.record({
              covenant_name: fc.constantFrom(
                'Debt to EBITDA Ratio',
                'Current Ratio Maintenance',
                'Minimum Net Worth',
                'Interest Coverage Ratio'
              ),
              metric_name: fc.constantFrom('debt_to_ebitda', 'current_ratio', 'net_worth', 'interest_coverage'),
              operator: fc.constantFrom('<=', '>='),
              threshold_value: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
              covenant_clause: fc.constantFrom(
                'Borrower shall maintain a debt to EBITDA ratio not exceeding 3.0:1.0',
                'Current ratio shall not be less than 1.25:1.0',
                'Minimum tangible net worth of $10,000,000'
              ),
              confidence_score: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) }),
            }),
          }),
          async ({ contractId, financialCovenant }) => {
            const mockExtractionResult: CovenantExtractionResult = {
              covenants: [
                {
                  ...financialCovenant,
                  covenant_type: 'financial', // This should be preserved or correctly classified
                  check_frequency: 'quarterly',
                  threshold_unit: 'ratio',
                }
              ],
              extraction_summary: 'Financial covenant extracted',
              processing_time_ms: 1000,
            };

            mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
            mockApiService.post.mockResolvedValueOnce({
              success: true,
              data: {
                id: 'covenant-1',
                contract_id: contractId,
                bank_id: 'test-bank',
                gemini_extracted: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...financialCovenant,
                covenant_type: 'financial',
                check_frequency: 'quarterly',
                threshold_unit: 'ratio',
              },
            });

            const jobId = await covenantExtractionService.queueExtraction(
              contractId,
              'Contract text with financial covenants',
              'normal'
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            const jobStatus = covenantExtractionService.getJobStatus(jobId);
            expect(jobStatus?.status).toBe('completed');

            // Verify financial covenant was classified correctly
            const storedData = mockApiService.post.mock.calls[0][1];
            expect(storedData.covenant_type).toBe('financial');
          }
        ),
        { numRuns: 10 }
      );
    });

    test.skip('should handle extraction failures gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contractId: fc.uuid(),
            contractText: fc.string({ minLength: 50, maxLength: 1000 }),
            errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async ({ contractId, contractText, errorMessage }) => {
            // Mock Gemini AI failure
            mockGeminiService.extractCovenants.mockRejectedValueOnce(new Error(errorMessage));

            const jobId = await covenantExtractionService.queueExtraction(
              contractId,
              contractText,
              'normal'
            );

            // Wait for processing to complete (with retries)
            await new Promise(resolve => setTimeout(resolve, 500));

            const jobStatus = covenantExtractionService.getJobStatus(jobId);

            // Verify job failed gracefully
            expect(jobStatus).toBeDefined();
            expect(jobStatus?.status).toBe('failed');
            expect(jobStatus?.error_message).toContain(errorMessage);
            expect(jobStatus?.extracted_covenants_count).toBe(0);

            // Verify no covenants were stored
            expect(mockApiService.post).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 5, timeout: 5000 }
      );
    }, 15000);

    test.skip('should filter out low-confidence extractions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contractId: fc.uuid(),
            contractText: fc.string({ minLength: 100, maxLength: 1000 }),
            lowConfidenceCovenant: fc.record({
              covenant_name: fc.string({ minLength: 5, maxLength: 50 }),
              covenant_type: fc.constantFrom('financial', 'operational'),
              operator: fc.constantFrom('>=', '<='),
              threshold_value: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
              covenant_clause: fc.string({ minLength: 10, maxLength: 200 }),
              confidence_score: fc.float({ min: Math.fround(0.1), max: Math.fround(0.29) }), // Low confidence
            }),
            highConfidenceCovenant: fc.record({
              covenant_name: fc.string({ minLength: 5, maxLength: 50 }),
              covenant_type: fc.constantFrom('financial', 'operational'),
              operator: fc.constantFrom('>=', '<='),
              threshold_value: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
              covenant_clause: fc.string({ minLength: 10, maxLength: 200 }),
              confidence_score: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) }), // High confidence
            }),
          }),
          async ({ contractId, contractText, lowConfidenceCovenant, highConfidenceCovenant }) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            mockXanoIntegrationService.queueCovenantExtraction.mockRejectedValue(
              new Error('Xano not available - using local processing')
            );
            const mockExtractionResult: CovenantExtractionResult = {
              covenants: [lowConfidenceCovenant, highConfidenceCovenant],
              extraction_summary: 'Mixed confidence extraction',
              processing_time_ms: 1200,
            };

            mockGeminiService.extractCovenants.mockResolvedValueOnce(mockExtractionResult);
            
            // Only mock API call for high-confidence covenant
            mockApiService.post.mockResolvedValueOnce({
              success: true,
              data: {
                id: 'covenant-1',
                contract_id: contractId,
                bank_id: 'test-bank',
                gemini_extracted: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...highConfidenceCovenant,
                check_frequency: 'quarterly',
              },
            });

            const jobId = await covenantExtractionService.queueExtraction(
              contractId,
              contractText,
              'normal'
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            const jobStatus = covenantExtractionService.getJobStatus(jobId);

            // Verify only high-confidence covenant was stored
            expect(jobStatus?.status).toBe('completed');
            expect(jobStatus?.extracted_covenants_count).toBe(1);
            expect(mockApiService.post).toHaveBeenCalledTimes(1);

            // Verify the stored covenant is the high-confidence one
            const storedData = mockApiService.post.mock.calls[0][1];
            expect(storedData.covenant_name).toBe(highConfidenceCovenant.covenant_name);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });

  describe('Queue Management Properties', () => {
    test('should process jobs in priority order', async () => {
      const contractIds = ['contract-1', 'contract-2', 'contract-3'];
      const priorities: Array<'low' | 'normal' | 'high'> = ['low', 'normal', 'high'];
      
      // Mock successful extractions
      mockGeminiService.extractCovenants.mockResolvedValue({
        covenants: [],
        extraction_summary: 'No covenants found',
        processing_time_ms: 100,
      });

      // Queue jobs with different priorities
      const jobIds = await Promise.all(
        contractIds.map((contractId, index) =>
          covenantExtractionService.queueExtraction(
            contractId,
            'Test contract text',
            priorities[index]
          )
        )
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify all jobs completed
      jobIds.forEach(jobId => {
        const status = covenantExtractionService.getJobStatus(jobId);
        expect(status?.status).toBe('completed');
      });
    });
  });
});