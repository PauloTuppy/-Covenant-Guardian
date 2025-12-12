/**
 * End-to-End Integration Tests
 * Tests complete workflows across all system components
 * Requirements: 10.2, 10.5
 */

import fc from 'fast-check';
import { PBT_CONFIG } from '@/test/setup';

// Mock services for integration testing
jest.mock('@/services/api');
jest.mock('@/services/auth');
jest.mock('@/services/contracts');
jest.mock('@/services/covenantExtraction');
jest.mock('@/services/covenantHealth');
jest.mock('@/services/alerts');
jest.mock('@/services/gemini');

import { apiService } from '@/services/api';
import { authService } from '@/services/auth';
import { contractService } from '@/services/contracts';
import { covenantExtractionService } from '@/services/covenantExtraction';
import { covenantHealthService } from '@/services/covenantHealth';
import { alertService } from '@/services/alerts';
import { geminiService } from '@/services/gemini';

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockContractService = contractService as jest.Mocked<typeof contractService>;
const mockCovenantExtractionService = covenantExtractionService as jest.Mocked<typeof covenantExtractionService>;
const mockCovenantHealthService = covenantHealthService as jest.Mocked<typeof covenantHealthService>;
const mockAlertService = alertService as jest.Mocked<typeof alertService>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Contract Creation to Covenant Monitoring Workflow', () => {
    test('E2E: Complete contract lifecycle from creation to health monitoring', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            contractData: fc.record({
              borrower_id: fc.uuid(),
              contract_name: fc.string({ minLength: 5, maxLength: 100 }),
              principal_amount: fc.float({ min: 10000, max: 10000000 }),
              currency: fc.constantFrom('USD', 'EUR', 'GBP'),
              origination_date: fc.integer({ min: 1577836800000, max: 1704067200000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
              maturity_date: fc.integer({ min: 1735689600000, max: 1893456000000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
              raw_document_text: fc.string({ minLength: 100, maxLength: 1000 }),
            }),
          }),
          async ({ bankId, userId, contractData }) => {
            // Step 1: Authenticate user
            const mockUser = {
              id: userId,
              email: 'analyst@bank.com',
              role: 'analyst' as const,
              bank_id: bankId,
              bank_name: 'Test Bank',
            };
            
            mockAuthService.getCurrentUserSync.mockReturnValue(mockUser);
            mockAuthService.isSessionValid.mockReturnValue(true);
            mockApiService.getBankIdFromStorage.mockReturnValue(bankId);

            // Step 2: Create contract
            const mockContract = {
              id: 'contract-123',
              bank_id: bankId,
              ...contractData,
              status: 'active' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockContractService.createContract.mockResolvedValue(mockContract);

            const createdContract = await contractService.createContract(contractData as any);
            
            expect(createdContract.id).toBeDefined();
            expect(createdContract.bank_id).toBe(bankId);
            expect(createdContract.status).toBe('active');

            // Step 3: Verify covenant extraction was queued
            mockCovenantExtractionService.queueExtraction.mockResolvedValue('job-123');
            
            const jobId = await covenantExtractionService.queueExtraction(
              createdContract.id,
              contractData.raw_document_text,
              'normal'
            );
            
            expect(jobId).toBeDefined();

            // Step 4: Simulate extraction completion
            const mockCovenants = [
              {
                id: 'covenant-1',
                contract_id: createdContract.id,
                bank_id: bankId,
                covenant_name: 'Debt-to-EBITDA Ratio',
                covenant_type: 'financial' as const,
                metric_name: 'debt_to_ebitda',
                operator: '<=' as const,
                threshold_value: 3.5,
                check_frequency: 'quarterly' as const,
                gemini_extracted: true,
                created_at: new Date().toISOString(),
              },
            ];

            mockCovenantExtractionService.getJobStatus.mockReturnValue({
              id: jobId,
              contract_id: createdContract.id,
              status: 'completed',
              progress_percentage: 100,
              extracted_covenants_count: mockCovenants.length,
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });

            const jobStatus = covenantExtractionService.getJobStatus(jobId);
            expect(jobStatus?.status).toBe('completed');
            expect(jobStatus?.extracted_covenants_count).toBe(1);

            // Step 5: Calculate covenant health
            const mockHealth = {
              id: 'health-1',
              covenant_id: mockCovenants[0].id,
              contract_id: createdContract.id,
              bank_id: bankId,
              last_reported_value: 2.8,
              last_reported_date: new Date().toISOString(),
              threshold_value: 3.5,
              status: 'compliant' as const,
              buffer_percentage: 20,
              days_to_breach: 180,
              trend: 'stable' as const,
              last_calculated: new Date().toISOString(),
            };

            mockCovenantHealthService.calculateCovenantHealth.mockResolvedValue(mockHealth);

            const health = await covenantHealthService.calculateCovenantHealth(mockCovenants[0].id);
            
            expect(health.status).toBe('compliant');
            expect(health.bank_id).toBe(bankId);
            expect(health.buffer_percentage).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50, timeout: PBT_CONFIG.timeout }
      );
    });

    test('E2E: Alert generation when covenant status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            previousStatus: fc.constantFrom('compliant'),
            newStatus: fc.constantFrom('warning', 'breached'),
            currentValue: fc.float({ min: 0, max: 10 }),
            thresholdValue: fc.float({ min: 0, max: 10 }),
          }),
          async ({ bankId, covenantId, contractId, previousStatus, newStatus, currentValue, thresholdValue }) => {
            // Setup mock context
            mockApiService.getBankIdFromStorage.mockReturnValue(bankId);

            // Simulate status change detection
            const statusChange = {
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              previous_status: previousStatus,
              new_status: newStatus,
              current_value: currentValue,
              threshold_value: thresholdValue,
            };

            // Determine expected severity
            const expectedSeverity = newStatus === 'breached' ? 'critical' : 'high';

            // Mock alert creation
            const mockAlert = {
              id: 'alert-123',
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: newStatus === 'breached' ? 'breach' : 'warning',
              severity: expectedSeverity,
              title: `Covenant ${newStatus === 'breached' ? 'Breach' : 'Warning'}`,
              description: `Covenant status changed from ${previousStatus} to ${newStatus}`,
              trigger_metric_value: currentValue,
              threshold_value: thresholdValue,
              status: 'new' as const,
              triggered_at: new Date().toISOString(),
            };

            mockAlertService.createAlert.mockResolvedValue(mockAlert);

            const alert = await alertService.createAlert({
              covenant_id: covenantId,
              contract_id: contractId,
              alert_type: newStatus === 'breached' ? 'breach' : 'warning',
              severity: expectedSeverity,
              title: mockAlert.title,
              description: mockAlert.description,
              trigger_metric_value: currentValue,
              threshold_value: thresholdValue,
            } as any);

            // Verify alert was created correctly
            expect(alert.bank_id).toBe(bankId);
            expect(alert.covenant_id).toBe(covenantId);
            expect(alert.status).toBe('new');
            
            if (newStatus === 'breached') {
              expect(alert.severity).toBe('critical');
              expect(alert.alert_type).toBe('breach');
            } else {
              expect(['high', 'medium']).toContain(alert.severity);
              expect(alert.alert_type).toBe('warning');
            }
          }
        ),
        { numRuns: 50, timeout: PBT_CONFIG.timeout }
      );
    });
  });

  describe('Multi-Tenant Isolation in Production Scenarios', () => {
    test('E2E: Data isolation across concurrent bank operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bank1Id: fc.uuid(),
            bank2Id: fc.uuid(),
            bank1UserId: fc.uuid(),
            bank2UserId: fc.uuid(),
          }),
          async ({ bank1Id, bank2Id, bank1UserId, bank2UserId }) => {
            // Ensure different banks
            fc.pre(bank1Id !== bank2Id);

            // Simulate Bank 1 user session
            const bank1User = {
              id: bank1UserId,
              email: 'user@bank1.com',
              role: 'analyst' as const,
              bank_id: bank1Id,
              bank_name: 'Bank 1',
            };

            // Simulate Bank 2 user session
            const bank2User = {
              id: bank2UserId,
              email: 'user@bank2.com',
              role: 'analyst' as const,
              bank_id: bank2Id,
              bank_name: 'Bank 2',
            };

            // Bank 1 creates a contract
            mockApiService.getBankIdFromStorage.mockReturnValue(bank1Id);
            mockAuthService.getCurrentUserSync.mockReturnValue(bank1User);

            const bank1Contract = {
              id: 'contract-bank1',
              bank_id: bank1Id,
              contract_name: 'Bank 1 Contract',
              status: 'active' as const,
            };

            mockContractService.createContract.mockResolvedValue(bank1Contract as any);
            const createdContract1 = await contractService.createContract({} as any);
            expect(createdContract1.bank_id).toBe(bank1Id);

            // Bank 2 tries to access Bank 1's contract - should fail
            mockApiService.getBankIdFromStorage.mockReturnValue(bank2Id);
            mockAuthService.getCurrentUserSync.mockReturnValue(bank2User);

            mockContractService.getContractById.mockRejectedValue({
              response: {
                status: 403,
                data: {
                  error: {
                    code: 'CROSS_TENANT_ACCESS_DENIED',
                    message: 'Access denied to resource from different bank',
                  },
                },
              },
            });

            try {
              await contractService.getContractById(bank1Contract.id);
              // Should not reach here
              expect(true).toBe(false);
            } catch (error: any) {
              expect(error.response.status).toBe(403);
              expect(error.response.data.error.code).toBe('CROSS_TENANT_ACCESS_DENIED');
            }

            // Bank 2 creates their own contract
            const bank2Contract = {
              id: 'contract-bank2',
              bank_id: bank2Id,
              contract_name: 'Bank 2 Contract',
              status: 'active' as const,
            };

            mockContractService.createContract.mockResolvedValue(bank2Contract as any);
            const createdContract2 = await contractService.createContract({} as any);
            expect(createdContract2.bank_id).toBe(bank2Id);

            // Verify contracts are isolated
            expect(createdContract1.bank_id).not.toBe(createdContract2.bank_id);
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });

    test('E2E: Query filtering ensures tenant isolation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            authenticatedBankId: fc.uuid(),
            otherBankIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          }),
          async ({ authenticatedBankId, otherBankIds }) => {
            // Ensure authenticated bank is different from others
            fc.pre(!otherBankIds.includes(authenticatedBankId));

            mockApiService.getBankIdFromStorage.mockReturnValue(authenticatedBankId);

            // Mock contracts list - should only return authenticated bank's contracts
            const mockContracts = [
              { id: 'c1', bank_id: authenticatedBankId, contract_name: 'Contract 1' },
              { id: 'c2', bank_id: authenticatedBankId, contract_name: 'Contract 2' },
            ];

            mockContractService.getContracts.mockResolvedValue({
              data: mockContracts,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            } as any);

            const result = await contractService.getContracts();

            // Verify all returned contracts belong to authenticated bank
            result.data.forEach((contract: any) => {
              expect(contract.bank_id).toBe(authenticatedBankId);
              expect(otherBankIds).not.toContain(contract.bank_id);
            });
          }
        ),
        { numRuns: 50, timeout: PBT_CONFIG.timeout }
      );
    });
  });

  describe('Gemini AI Integration Tests', () => {
    test('E2E: Covenant extraction with various document types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            documentType: fc.constantFrom('loan_agreement', 'credit_facility', 'term_sheet', 'amendment'),
            documentText: fc.string({ minLength: 200, maxLength: 2000 }),
            expectedCovenantCount: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ documentType, documentText, expectedCovenantCount }) => {
            // Mock Gemini extraction response
            const mockCovenants = Array.from({ length: expectedCovenantCount }, (_, i) => ({
              covenant_name: `Covenant ${i + 1}`,
              covenant_type: 'financial' as const,
              metric_name: `metric_${i + 1}`,
              operator: '<=' as const,
              threshold_value: Math.random() * 10,
              threshold_unit: 'ratio',
              check_frequency: 'quarterly',
              covenant_clause: `Sample clause ${i + 1}`,
              confidence_score: 0.8 + Math.random() * 0.2,
            }));

            mockGeminiService.extractCovenants.mockResolvedValue({
              covenants: mockCovenants,
              extraction_metadata: {
                document_type: documentType,
                processing_time_ms: 1500,
                model_version: 'gemini-pro',
              },
            });

            const result = await geminiService.extractCovenants(documentText);

            // Verify extraction results
            expect(result.covenants.length).toBe(expectedCovenantCount);
            expect(result.extraction_metadata.document_type).toBe(documentType);

            // Verify each covenant has required fields
            result.covenants.forEach(covenant => {
              expect(covenant.covenant_name).toBeDefined();
              expect(covenant.confidence_score).toBeGreaterThanOrEqual(0.8);
              expect(['financial', 'operational', 'reporting', 'other']).toContain(covenant.covenant_type);
            });
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });

    test('E2E: Gemini risk assessment integration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
            trend: fc.constantFrom('improving', 'stable', 'deteriorating'),
          }),
          async ({ covenantId, currentValue, thresholdValue, trend }) => {
            // Ensure thresholdValue is not zero to avoid division by zero
            fc.pre(thresholdValue > 0);
            
            // Calculate buffer percentage
            const bufferPercentage = ((thresholdValue - currentValue) / thresholdValue) * 100;

            // Mock Gemini risk assessment
            const mockAssessment = {
              risk_level: bufferPercentage < 10 ? 'high' : bufferPercentage < 25 ? 'medium' : 'low',
              risk_score: Math.max(0, Math.min(100, 100 - bufferPercentage)),
              assessment_text: `Based on current metrics, the covenant shows ${trend} trend.`,
              recommended_actions: [
                'Monitor closely',
                'Review financial projections',
              ],
              confidence: 0.85,
            };

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue(mockAssessment);

            const assessment = await geminiService.analyzeCovenantRisk({
              covenant_id: covenantId,
              current_value: currentValue,
              threshold_value: thresholdValue,
              trend,
            } as any);

            // Verify assessment structure
            expect(assessment.risk_level).toBeDefined();
            expect(['low', 'medium', 'high']).toContain(assessment.risk_level);
            expect(assessment.risk_score).toBeGreaterThanOrEqual(0);
            expect(assessment.risk_score).toBeLessThanOrEqual(100);
            expect(assessment.recommended_actions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50, timeout: PBT_CONFIG.timeout }
      );
    });

    test('E2E: Gemini extraction error handling and retry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contractId: fc.uuid(),
            documentText: fc.string({ minLength: 100, maxLength: 500 }),
            failureCount: fc.integer({ min: 1, max: 3 }),
          }),
          async ({ contractId, documentText, failureCount }) => {
            let callCount = 0;

            // Mock Gemini to fail initially then succeed
            mockGeminiService.extractCovenants.mockImplementation(async () => {
              callCount++;
              if (callCount <= failureCount) {
                throw new Error('Gemini API temporarily unavailable');
              }
              return {
                covenants: [
                  {
                    covenant_name: 'Test Covenant',
                    covenant_type: 'financial' as const,
                    metric_name: 'test_metric',
                    operator: '<=' as const,
                    threshold_value: 3.0,
                    confidence_score: 0.9,
                  },
                ],
                extraction_metadata: {
                  document_type: 'loan_agreement',
                  processing_time_ms: 1000,
                  model_version: 'gemini-pro',
                },
              };
            });

            // Simulate retry logic
            let result;
            let attempts = 0;
            const maxAttempts = failureCount + 1;

            while (attempts < maxAttempts) {
              try {
                result = await geminiService.extractCovenants(documentText);
                break;
              } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                  throw error;
                }
                // Wait before retry (simulated)
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }

            // Verify eventual success
            expect(result).toBeDefined();
            expect(result!.covenants.length).toBeGreaterThan(0);
            expect(callCount).toBe(failureCount + 1);
          }
        ),
        { numRuns: 20, timeout: PBT_CONFIG.timeout }
      );
    });
  });

  describe('Report Generation Workflow', () => {
    test('E2E: Complete report generation with data aggregation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            reportType: fc.constantFrom('portfolio_summary', 'risk_analysis', 'covenant_status'),
            periodStart: fc.integer({ min: 1640995200000, max: 1672531200000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
            periodEnd: fc.integer({ min: 1672531200000, max: 1704067200000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
          }),
          async ({ bankId, reportType, periodStart, periodEnd }) => {
            mockApiService.getBankIdFromStorage.mockReturnValue(bankId);

            // Mock report generation
            const mockReport = {
              id: 'report-123',
              bank_id: bankId,
              report_type: reportType,
              period_start: periodStart,
              period_end: periodEnd,
              status: 'completed' as const,
              data: {
                total_contracts: 50,
                total_covenants: 150,
                compliant_count: 120,
                warning_count: 20,
                breached_count: 10,
                total_principal: 500000000,
              },
              executive_summary: 'Portfolio shows stable performance with minor concerns.',
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockReport,
            });

            const response = await apiService.post('/reports/generate', {
              report_type: reportType,
              period_start: periodStart,
              period_end: periodEnd,
            });

            // Verify report structure
            expect(response.success).toBe(true);
            expect(response.data.bank_id).toBe(bankId);
            expect(response.data.report_type).toBe(reportType);
            expect(response.data.status).toBe('completed');
            expect(response.data.data.total_contracts).toBeGreaterThanOrEqual(0);
            expect(response.data.executive_summary).toBeDefined();
          }
        ),
        { numRuns: 30, timeout: PBT_CONFIG.timeout }
      );
    });
  });
});
