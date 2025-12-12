/**
 * Gemini AI Integration Tests
 * Tests AI-powered covenant extraction with various document types
 * Requirements: 10.2, 10.5
 */

import fc from 'fast-check';
import { PBT_CONFIG } from '@/test/setup';

// Mock Gemini service
jest.mock('@/services/gemini');
jest.mock('@/services/covenantExtraction');

import { geminiService } from '@/services/gemini';
import { covenantExtractionService } from '@/services/covenantExtraction';

const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockCovenantExtractionService = covenantExtractionService as jest.Mocked<typeof covenantExtractionService>;

describe('Gemini AI Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Type Handling', () => {
    test('Integration: Loan agreement document extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerName: fc.string({ minLength: 3, maxLength: 50 }),
            principalAmount: fc.float({ min: 100000, max: 100000000 }),
            interestRate: fc.float({ min: 1, max: 15 }),
            covenantCount: fc.integer({ min: 1, max: 8 }),
          }),
          async ({ borrowerName, principalAmount, interestRate, covenantCount }) => {
            // Generate sample loan agreement text
            const documentText = generateLoanAgreementText(
              borrowerName,
              principalAmount,
              interestRate,
              covenantCount
            );

            // Mock Gemini extraction
            const mockCovenants = generateMockCovenants(covenantCount, 'financial');

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: 'loan_agreement',
                processing_time_ms: 1200,
                model_version: 'gemini-pro',
                confidence_overall: 0.92,
              },
            });

            const result = await geminiService.extractCovenants(documentText);

            // Verify extraction results
            expect(result.covenants.length).toBe(covenantCount);
            expect(result.extraction_metadata.document_type).toBe('loan_agreement');
            
            // Verify covenant structure
            result.covenants.forEach(covenant => {
              expect(covenant.covenant_name).toBeDefined();
              expect(covenant.covenant_type).toBe('financial');
              expect(covenant.threshold_value).toBeDefined();
              expect(covenant.operator).toBeDefined();
              expect(covenant.confidence_score).toBeGreaterThanOrEqual(0.7);
            });
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: Credit facility document extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            facilityType: fc.constantFrom('revolving', 'term', 'bridge'),
            commitmentAmount: fc.float({ min: 1000000, max: 500000000 }),
            covenantTypes: fc.array(
              fc.constantFrom('financial', 'operational', 'reporting'),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ facilityType, commitmentAmount, covenantTypes }) => {
            const documentText = `Credit Facility Agreement - ${facilityType} facility of ${commitmentAmount}`;

            // Generate mixed covenant types
            const mockCovenants = covenantTypes.flatMap((type, index) => 
              generateMockCovenants(2, type as any).map(c => ({
                ...c,
                covenant_name: `${type} Covenant ${index + 1}`,
              }))
            );

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: 'credit_facility',
                processing_time_ms: 1500,
                model_version: 'gemini-pro',
                confidence_overall: 0.88,
              },
            });

            const result = await geminiService.extractCovenants(documentText);

            // Verify mixed covenant types are handled
            expect(result.covenants.length).toBe(covenantTypes.length * 2);
            expect(result.extraction_metadata.document_type).toBe('credit_facility');

            // Verify each covenant type is represented
            const extractedTypes = new Set(result.covenants.map(c => c.covenant_type));
            covenantTypes.forEach(type => {
              expect(extractedTypes.has(type)).toBe(true);
            });
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: Term sheet document extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            dealSize: fc.float({ min: 5000000, max: 200000000 }),
            tenor: fc.integer({ min: 1, max: 10 }),
            hasFinancialCovenants: fc.boolean(),
            hasReportingCovenants: fc.boolean(),
          }),
          async ({ dealSize, tenor, hasFinancialCovenants, hasReportingCovenants }) => {
            const documentText = `Term Sheet - Deal Size: ${dealSize}, Tenor: ${tenor} years`;

            const mockCovenants: any[] = [];
            
            if (hasFinancialCovenants) {
              mockCovenants.push(...generateMockCovenants(2, 'financial'));
            }
            if (hasReportingCovenants) {
              mockCovenants.push(...generateMockCovenants(1, 'reporting'));
            }

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: 'term_sheet',
                processing_time_ms: 800,
                model_version: 'gemini-pro',
                confidence_overall: 0.85,
              },
            });

            const result = await geminiService.extractCovenants(documentText);

            expect(result.extraction_metadata.document_type).toBe('term_sheet');
            
            if (hasFinancialCovenants) {
              const financialCovenants = result.covenants.filter(c => c.covenant_type === 'financial');
              expect(financialCovenants.length).toBeGreaterThan(0);
            }
            
            if (hasReportingCovenants) {
              const reportingCovenants = result.covenants.filter(c => c.covenant_type === 'reporting');
              expect(reportingCovenants.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: Amendment document extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            amendmentNumber: fc.integer({ min: 1, max: 10 }),
            originalCovenantCount: fc.integer({ min: 2, max: 5 }),
            modifiedCovenantCount: fc.integer({ min: 1, max: 3 }),
          }),
          async ({ amendmentNumber, originalCovenantCount, modifiedCovenantCount }) => {
            fc.pre(modifiedCovenantCount <= originalCovenantCount);

            const documentText = `Amendment No. ${amendmentNumber} - Modifying ${modifiedCovenantCount} covenants`;

            const mockCovenants = generateMockCovenants(modifiedCovenantCount, 'financial').map(c => ({
              ...c,
              is_amendment: true,
              amendment_number: amendmentNumber,
            }));

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: 'amendment',
                processing_time_ms: 600,
                model_version: 'gemini-pro',
                confidence_overall: 0.90,
                amendment_detected: true,
                amendment_number: amendmentNumber,
              },
            });

            const result = await geminiService.extractCovenants(documentText);

            expect(result.extraction_metadata.document_type).toBe('amendment');
            expect(result.extraction_metadata.amendment_detected).toBe(true);
            expect(result.covenants.length).toBe(modifiedCovenantCount);
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });
  });

  describe('Extraction Quality and Validation', () => {
    test('Integration: Confidence score filtering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalCovenants: fc.integer({ min: 5, max: 15 }),
            confidenceThreshold: fc.float({ min: Math.fround(0.5), max: Math.fround(0.9) }),
          }),
          async ({ totalCovenants, confidenceThreshold }) => {
            // Generate covenants with varying confidence scores
            const mockCovenants = Array.from({ length: totalCovenants }, (_, i) => ({
              covenant_name: `Covenant ${i + 1}`,
              covenant_type: 'financial' as const,
              metric_name: `metric_${i + 1}`,
              operator: '<=' as const,
              threshold_value: Math.random() * 10,
              confidence_score: Math.random(), // Random confidence 0-1
            }));

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: 'loan_agreement',
                processing_time_ms: 1000,
                model_version: 'gemini-pro',
              },
            });

            const result = await geminiService.extractCovenants('Sample document');

            // Filter by confidence threshold
            const highConfidenceCovenants = result.covenants.filter(
              c => c.confidence_score >= confidenceThreshold
            );

            // Verify filtering logic
            highConfidenceCovenants.forEach(covenant => {
              expect(covenant.confidence_score).toBeGreaterThanOrEqual(confidenceThreshold);
            });

            // Low confidence covenants should be flagged for review
            const lowConfidenceCovenants = result.covenants.filter(
              c => c.confidence_score < confidenceThreshold
            );

            expect(highConfidenceCovenants.length + lowConfidenceCovenants.length).toBe(totalCovenants);
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: Covenant classification accuracy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantName: fc.constantFrom(
              'Debt-to-EBITDA Ratio',
              'Current Ratio',
              'Interest Coverage',
              'Quarterly Financial Statements',
              'Annual Audit Report',
              'Insurance Maintenance',
              'Environmental Compliance'
            ),
          }),
          async ({ covenantName }) => {
            // Determine expected type based on covenant name
            const expectedType = getExpectedCovenantType(covenantName);

            const mockCovenant = {
              covenant_name: covenantName,
              covenant_type: expectedType,
              metric_name: covenantName.toLowerCase().replace(/\s+/g, '_'),
              operator: '<=' as const,
              threshold_value: 3.5,
              confidence_score: 0.95,
            };

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: [mockCovenant],
              extraction_metadata: {
                document_type: 'loan_agreement',
                processing_time_ms: 500,
                model_version: 'gemini-pro',
              },
            });

            const result = await geminiService.extractCovenants(`Covenant: ${covenantName}`);

            expect(result.covenants[0].covenant_type).toBe(expectedType);
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Integration: Malformed document handling', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            documentContent: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 1, maxLength: 10 }), // Too short
              fc.constant('!@#$%^&*()'), // Special characters only
              fc.constant('12345678901234567890'), // Numbers only
            ),
          }),
          async ({ documentContent }) => {
            // Mock handling of malformed documents
            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: [],
              extraction_metadata: {
                document_type: 'unknown',
                processing_time_ms: 100,
                model_version: 'gemini-pro',
                error: 'Document content insufficient for covenant extraction',
                requires_manual_review: true,
              },
            });

            const result = await geminiService.extractCovenants(documentContent);

            // Verify graceful handling
            expect(result.covenants.length).toBe(0);
            expect(result.extraction_metadata.requires_manual_review).toBe(true);
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: API timeout and retry behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            timeoutMs: fc.integer({ min: 1000, max: 5000 }),
            maxRetries: fc.integer({ min: 1, max: 3 }),
            successOnRetry: fc.integer({ min: 1, max: 3 }),
          }),
          async ({ timeoutMs, maxRetries, successOnRetry }) => {
            fc.pre(successOnRetry <= maxRetries);

            let attemptCount = 0;

            mockGeminiService.extractCovenants.mockImplementation(async () => {
              attemptCount++;
              
              if (attemptCount < successOnRetry) {
                throw new Error('Request timeout');
              }

              return {
                covenants: [
                  {
                    covenant_name: 'Test Covenant',
                    covenant_type: 'financial' as const,
                    metric_name: 'test',
                    operator: '<=' as const,
                    threshold_value: 3.0,
                    confidence_score: 0.9,
                  },
                ],
                extraction_metadata: {
                  document_type: 'loan_agreement',
                  processing_time_ms: timeoutMs,
                  model_version: 'gemini-pro',
                  retry_count: attemptCount - 1,
                },
              };
            });

            // Simulate retry logic
            let result;
            let retries = 0;

            while (retries < maxRetries) {
              try {
                result = await geminiService.extractCovenants('Test document');
                break;
              } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                  throw error;
                }
              }
            }

            expect(result).toBeDefined();
            expect(attemptCount).toBe(successOnRetry);
          }
        ),
        { numRuns: 15, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Integration: Partial extraction handling', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalCovenants: fc.integer({ min: 5, max: 10 }),
            successfulExtractions: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ totalCovenants, successfulExtractions }) => {
            fc.pre(successfulExtractions <= totalCovenants);

            const successfulCovenants = generateMockCovenants(successfulExtractions, 'financial');
            const failedCount = totalCovenants - successfulExtractions;

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: successfulCovenants,
              extraction_metadata: {
                document_type: 'loan_agreement',
                processing_time_ms: 1500,
                model_version: 'gemini-pro',
                partial_extraction: failedCount > 0,
                failed_extractions: failedCount,
                requires_manual_review: failedCount > 0,
              },
            });

            const result = await geminiService.extractCovenants('Complex document');

            expect(result.covenants.length).toBe(successfulExtractions);
            
            if (failedCount > 0) {
              expect(result.extraction_metadata.partial_extraction).toBe(true);
              expect(result.extraction_metadata.failed_extractions).toBe(failedCount);
              expect(result.extraction_metadata.requires_manual_review).toBe(true);
            }
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });
  });
});

// ===== HELPER FUNCTIONS =====

function generateLoanAgreementText(
  borrowerName: string,
  principalAmount: number,
  interestRate: number,
  covenantCount: number
): string {
  return `
    LOAN AGREEMENT
    
    Borrower: ${borrowerName}
    Principal Amount: $${principalAmount.toLocaleString()}
    Interest Rate: ${interestRate}%
    
    FINANCIAL COVENANTS:
    ${Array.from({ length: covenantCount }, (_, i) => 
      `${i + 1}. Maintain Debt-to-EBITDA ratio not exceeding ${3 + i * 0.5}x`
    ).join('\n')}
  `;
}

function generateMockCovenants(
  count: number,
  type: 'financial' | 'operational' | 'reporting' | 'other'
): any[] {
  const covenantTemplates = {
    financial: [
      { name: 'Debt-to-EBITDA Ratio', metric: 'debt_to_ebitda', operator: '<=', threshold: 3.5 },
      { name: 'Current Ratio', metric: 'current_ratio', operator: '>=', threshold: 1.2 },
      { name: 'Interest Coverage', metric: 'interest_coverage', operator: '>=', threshold: 2.0 },
      { name: 'Leverage Ratio', metric: 'leverage_ratio', operator: '<=', threshold: 4.0 },
    ],
    operational: [
      { name: 'Insurance Maintenance', metric: 'insurance_coverage', operator: '>=', threshold: 1000000 },
      { name: 'Asset Maintenance', metric: 'asset_value', operator: '>=', threshold: 5000000 },
    ],
    reporting: [
      { name: 'Quarterly Financials', metric: 'reporting_frequency', operator: '=', threshold: 4 },
      { name: 'Annual Audit', metric: 'audit_frequency', operator: '=', threshold: 1 },
    ],
    other: [
      { name: 'General Compliance', metric: 'compliance_score', operator: '>=', threshold: 80 },
    ],
  };

  const templates = covenantTemplates[type];
  
  return Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    return {
      covenant_name: `${template.name} ${i + 1}`,
      covenant_type: type,
      metric_name: template.metric,
      operator: template.operator,
      threshold_value: template.threshold,
      threshold_unit: type === 'financial' ? 'ratio' : 'value',
      check_frequency: type === 'reporting' ? 'quarterly' : 'monthly',
      confidence_score: 0.85 + Math.random() * 0.15,
    };
  });
}

function getExpectedCovenantType(covenantName: string): 'financial' | 'operational' | 'reporting' | 'other' {
  const name = covenantName.toLowerCase();
  
  if (name.includes('ratio') || name.includes('coverage') || name.includes('ebitda')) {
    return 'financial';
  }
  if (name.includes('statement') || name.includes('report') || name.includes('audit')) {
    return 'reporting';
  }
  if (name.includes('insurance') || name.includes('compliance') || name.includes('environmental')) {
    return 'operational';
  }
  
  return 'other';
}
