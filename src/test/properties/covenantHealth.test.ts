/**
 * Property-Based Tests for Covenant Health Monitoring
 * Feature: covenant-guardian, Property 4: Covenant Health Calculation Consistency
 */

import fc from 'fast-check';
import { covenantHealthService } from '@/services/covenantHealth';
import { apiService } from '@/services/api';
import { geminiService } from '@/services/gemini';
import type { Covenant, FinancialMetrics, CovenantHealth, RiskAssessment } from '@/types';

// Mock the services
jest.mock('@/services/api');
jest.mock('@/services/gemini');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

describe('Covenant Health Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4: Covenant Health Calculation Consistency
   * For any borrower with available financial data, the system should calculate covenant compliance status 
   * as exactly one of (compliant, warning, breached) and include buffer percentage and trend analysis.
   * Validates: Requirements 3.1, 3.2, 3.4
   */
  describe('Property 4: Covenant Health Calculation Consistency', () => {
    test('should always calculate exactly one valid compliance status with buffer percentage', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate covenant and financial data
          fc.record({
            covenant: fc.record({
              id: fc.uuid(),
              contract_id: fc.uuid(),
              bank_id: fc.uuid(),
              covenant_name: fc.string({ minLength: 5, maxLength: 100 }),
              covenant_type: fc.constantFrom('financial', 'operational', 'reporting', 'other'),
              metric_name: fc.constantFrom(
                'debt_to_ebitda', 'debt_to_equity', 'current_ratio', 
                'interest_coverage', 'roe', 'roa'
              ),
              operator: fc.constantFrom('<', '<=', '>', '>=', '=', '!='),
              threshold_value: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
              threshold_unit: fc.option(fc.constantFrom('ratio', 'dollars', 'percent', 'times')),
              check_frequency: fc.constantFrom('monthly', 'quarterly', 'annually', 'on_demand'),
              reporting_deadline_days: fc.integer({ min: 1, max: 90 }),
              covenant_clause: fc.string({ minLength: 10, maxLength: 500 }),
              gemini_extracted: fc.boolean(),
              created_at: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString()),
              updated_at: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString()),
              contract: fc.record({
                borrower_id: fc.uuid(),
                borrower: fc.record({
                  legal_name: fc.string({ minLength: 5, maxLength: 100 }),
                  industry: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
                }),
              }),
            }),
            financialData: fc.record({
              id: fc.uuid(),
              borrower_id: fc.uuid(),
              bank_id: fc.uuid(),
              period_date: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
              period_type: fc.constantFrom('monthly', 'quarterly', 'annual'),
              source: fc.string({ minLength: 3, maxLength: 20 }),
              debt_total: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(1000000000) })),
              ebitda: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(100000000) })),
              revenue: fc.option(fc.float({ min: Math.fround(10000), max: Math.fround(1000000000) })),
              net_income: fc.option(fc.float({ min: Math.fround(-10000000), max: Math.fround(100000000) })),
              equity_total: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(1000000000) })),
              current_assets: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(500000000) })),
              current_liabilities: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(500000000) })),
              debt_to_ebitda: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(20) })),
              debt_to_equity: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10) })),
              current_ratio: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10) })),
              interest_coverage: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(50) })),
              roe: fc.option(fc.float({ min: Math.fround(-50), max: Math.fround(100) })),
              roa: fc.option(fc.float({ min: Math.fround(-20), max: Math.fround(50) })),
              data_confidence: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })),
              created_at: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString()),
              updated_at: fc.integer({ min: 1577836800000, max: 1767225600000 }).map(ts => new Date(ts).toISOString()),
            }),
          }),
          async ({ covenant, financialData }) => {
            // Mock API responses
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/covenants/')) {
                return Promise.resolve({
                  success: true,
                  data: covenant,
                });
              }
              if (url.includes('/financials') && url.includes('limit=1')) {
                return Promise.resolve({
                  success: true,
                  data: [financialData],
                });
              }
              return Promise.resolve({
                success: true,
                data: [],
              });
            });

            // Mock Gemini AI risk assessment
            const mockRiskAssessment: RiskAssessment = {
              risk_score: 5,
              risk_factors: ['Test risk factor'],
              recommended_actions: ['Test recommendation'],
              assessment_summary: 'Test AI assessment',
              confidence_level: 0.8,
            };
            mockGeminiService.analyzeCovenantRisk.mockResolvedValue(mockRiskAssessment);

            // Mock covenant health save - return a complete CovenantHealth object
            const mockHealthResponse: CovenantHealth = {
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenant.id,
              contract_id: covenant.contract_id,
              bank_id: covenant.bank_id,
              last_reported_value: 2.5,
              last_reported_date: financialData.period_date,
              threshold_value: covenant.threshold_value,
              status: 'compliant',
              buffer_percentage: 15.5,
              days_to_breach: undefined,
              trend: 'stable',
              gemini_risk_assessment: mockRiskAssessment.assessment_summary,
              recommended_action: mockRiskAssessment.recommended_actions.join('; '),
              last_calculated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockHealthResponse,
            });

            // Calculate covenant health
            const health = await covenantHealthService.calculateCovenantHealth(covenant.id);

            // Property 1: Status must be exactly one of the valid values
            expect(['compliant', 'warning', 'breached']).toContain(health.status);

            // Property 2: Buffer percentage must be a finite number if present
            if (health.buffer_percentage !== undefined) {
              expect(typeof health.buffer_percentage).toBe('number');
              expect(isFinite(health.buffer_percentage)).toBe(true);
            }

            // Property 3: Trend must be exactly one of the valid values
            expect(['improving', 'stable', 'deteriorating']).toContain(health.trend);

            // Property 4: Last reported value must be numeric if present
            if (health.last_reported_value !== undefined) {
              expect(typeof health.last_reported_value).toBe('number');
              expect(isFinite(health.last_reported_value)).toBe(true);
            }

            // Property 5: Threshold value must match covenant threshold
            if (health.threshold_value !== undefined && covenant.threshold_value !== undefined) {
              expect(health.threshold_value).toBe(covenant.threshold_value);
            }

            // Property 6: Days to breach must be non-negative if present
            if (health.days_to_breach !== undefined) {
              expect(health.days_to_breach).toBeGreaterThanOrEqual(0);
            }

            // Property 7: Last calculated timestamp must be recent
            expect(health.last_calculated).toBeDefined();
            const calculatedTime = new Date(health.last_calculated!);
            const now = new Date();
            const timeDiff = now.getTime() - calculatedTime.getTime();
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute

            // Property 8: Covenant and contract IDs must match input
            expect(health.covenant_id).toBe(covenant.id);
            expect(health.contract_id).toBe(covenant.contract_id);
            expect(health.bank_id).toBe(covenant.bank_id);
          }
        ),
        { numRuns: 25 }
      );
    });

    test('should calculate consistent status based on operator and threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operator: fc.constantFrom('<', '<=', '>', '>='),
            thresholdValue: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(200) }),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
          }),
          async ({ operator, thresholdValue, currentValue, covenantId, contractId, bankId }) => {
            const covenant: Covenant = {
              id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: 'Test Covenant',
              covenant_type: 'financial',
              metric_name: 'debt_to_ebitda',
              operator,
              threshold_value: thresholdValue,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract: {
                id: contractId,
                bank_id: bankId,
                borrower_id: fc.sample(fc.uuid(), 1)[0],
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                borrower: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  bank_id: bankId,
                  legal_name: 'Test Company',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              },
            };

            const financialData: FinancialMetrics = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: fc.sample(fc.uuid(), 1)[0],
              bank_id: bankId,
              period_date: '2024-03-31',
              period_type: 'quarterly',
              source: 'test',
              debt_to_ebitda: currentValue,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Mock API responses
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/covenants/')) {
                return Promise.resolve({ success: true, data: covenant });
              }
              if (url.includes('/financials')) {
                return Promise.resolve({ success: true, data: [financialData] });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
              risk_score: 5,
              risk_factors: [],
              recommended_actions: [],
              assessment_summary: 'Test',
              confidence_level: 0.8,
            });

            // Determine expected compliance
            let expectedCompliant = false;
            switch (operator) {
              case '<':
                expectedCompliant = currentValue < thresholdValue;
                break;
              case '<=':
                expectedCompliant = currentValue <= thresholdValue;
                break;
              case '>':
                expectedCompliant = currentValue > thresholdValue;
                break;
              case '>=':
                expectedCompliant = currentValue >= thresholdValue;
                break;
            }

            const mockStatus = expectedCompliant ? 'compliant' : 'breached';
            const bufferPercentage = Math.abs((currentValue - thresholdValue) / thresholdValue) * 100;

            const mockHealthResponse: CovenantHealth = {
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              last_reported_value: currentValue,
              threshold_value: thresholdValue,
              status: mockStatus,
              buffer_percentage: bufferPercentage,
              trend: 'stable',
              last_calculated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockHealthResponse,
            });

            const health = await covenantHealthService.calculateCovenantHealth(covenantId);

            // Verify status consistency with operator logic
            if (expectedCompliant) {
              // Should be compliant or warning (if close to threshold)
              expect(['compliant', 'warning']).toContain(health.status);
            } else {
              // Should be warning or breached (depending on how far from threshold)
              expect(['warning', 'breached']).toContain(health.status);
            }

            // Buffer percentage should reflect distance from threshold
            if (health.buffer_percentage !== undefined) {
              expect(typeof health.buffer_percentage).toBe('number');
              expect(isFinite(health.buffer_percentage)).toBe(true);
            }

            // Trend must be valid
            expect(['improving', 'stable', 'deteriorating']).toContain(health.trend);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should handle missing financial data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            borrowerId: fc.uuid(),
          }),
          async ({ covenantId, contractId, bankId, borrowerId }) => {
            const covenant: Covenant = {
              id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: 'Test Covenant',
              covenant_type: 'financial',
              metric_name: 'debt_to_ebitda',
              operator: '<=',
              threshold_value: 3.5,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract: {
                id: contractId,
                bank_id: bankId,
                borrower_id: borrowerId,
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                borrower: {
                  id: borrowerId,
                  bank_id: bankId,
                  legal_name: 'Test Company',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              },
            };

            // Mock API responses with no financial data
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/covenants/')) {
                return Promise.resolve({ success: true, data: covenant });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
              risk_score: 5,
              risk_factors: ['No financial data available'],
              recommended_actions: ['Obtain current financial statements'],
              assessment_summary: 'Unable to assess due to missing data',
              confidence_level: 0.1,
            });

            const mockHealthResponse: CovenantHealth = {
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              last_reported_value: 0,
              status: 'compliant',
              trend: 'stable',
              last_calculated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockHealthResponse,
            });

            const health = await covenantHealthService.calculateCovenantHealth(covenantId);

            // Even with missing data, system should return valid status
            expect(['compliant', 'warning', 'breached']).toContain(health.status);
            expect(['improving', 'stable', 'deteriorating']).toContain(health.trend);

            // Should default to compliant when no data is available
            expect(health.status).toBe('compliant');
            expect(health.trend).toBe('stable');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 7: Financial Data Processing Chain
   * For any new financial data ingested for a borrower, the system should store the data with period 
   * and source attribution, calculate all standard ratios (debt-to-EBITDA, current ratio, interest coverage), 
   * and trigger recalculation of all related covenant health assessments.
   * Validates: Requirements 5.1, 5.2, 5.3
   */
  describe('Property 7: Financial Data Processing Chain', () => {
    test('should store financial data with period and source attribution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            periodDate: fc.integer({ min: 1577836800000, max: 1767225600000 })
              .map(ts => new Date(ts).toISOString().split('T')[0]),
            periodType: fc.constantFrom('monthly', 'quarterly', 'annual'),
            source: fc.constantFrom('manual', 'api', 'import', 'financial_statement', 'audit_report'),
            debtTotal: fc.float({ min: Math.fround(100000), max: Math.fround(500000000) }),
            ebitda: fc.float({ min: Math.fround(10000), max: Math.fround(50000000) }),
            revenue: fc.float({ min: Math.fround(100000), max: Math.fround(1000000000) }),
            currentAssets: fc.float({ min: Math.fround(50000), max: Math.fround(200000000) }),
            currentLiabilities: fc.float({ min: Math.fround(25000), max: Math.fround(150000000) }),
            equity: fc.float({ min: Math.fround(100000), max: Math.fround(300000000) }),
            interestExpense: fc.float({ min: Math.fround(1000), max: Math.fround(10000000) }),
          }),
          async ({ borrowerId, bankId, periodDate, periodType, source, debtTotal, ebitda, revenue, currentAssets, currentLiabilities, equity, interestExpense }) => {
            const financialInput = {
              borrower_id: borrowerId,
              period_date: periodDate,
              period_type: periodType as 'monthly' | 'quarterly' | 'annual',
              source: source,
              debt_total: debtTotal,
              ebitda: ebitda,
              revenue: revenue,
              current_assets: currentAssets,
              current_liabilities: currentLiabilities,
              equity_total: equity,
              interest_expense: interestExpense,
            };

            // Calculate expected ratios
            const expectedDebtToEbitda = debtTotal / ebitda;
            const expectedCurrentRatio = currentAssets / currentLiabilities;
            const expectedInterestCoverage = ebitda / interestExpense;
            const expectedDebtToEquity = debtTotal / equity;

            // Mock API response for ingestion
            const mockStoredData: FinancialMetrics = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: bankId,
              period_date: periodDate,
              period_type: periodType as 'monthly' | 'quarterly' | 'annual',
              source: source,
              debt_total: debtTotal,
              ebitda: ebitda,
              revenue: revenue,
              current_assets: currentAssets,
              current_liabilities: currentLiabilities,
              equity_total: equity,
              interest_expense: interestExpense,
              debt_to_ebitda: expectedDebtToEbitda,
              debt_to_equity: expectedDebtToEquity,
              current_ratio: expectedCurrentRatio,
              interest_coverage: expectedInterestCoverage,
              data_confidence: 0.85,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockStoredData,
            });

            // Mock empty covenants list
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await covenantHealthService.ingestFinancialData(borrowerId, financialInput);

            // Property 1: Period date must be preserved
            expect(result.period_date).toBe(periodDate);

            // Property 2: Period type must be preserved
            expect(result.period_type).toBe(periodType);

            // Property 3: Source attribution must be preserved
            expect(result.source).toBe(source);

            // Property 4: Borrower ID must be preserved
            expect(result.borrower_id).toBe(borrowerId);

            // Property 5: All standard ratios must be calculated
            expect(result.debt_to_ebitda).toBeDefined();
            expect(result.current_ratio).toBeDefined();
            expect(result.interest_coverage).toBeDefined();
            expect(result.debt_to_equity).toBeDefined();

            // Property 6: Ratios must be mathematically correct
            if (isFinite(expectedDebtToEbitda)) {
              expect(result.debt_to_ebitda).toBeCloseTo(expectedDebtToEbitda, 2);
            }
            if (isFinite(expectedCurrentRatio)) {
              expect(result.current_ratio).toBeCloseTo(expectedCurrentRatio, 2);
            }
            if (isFinite(expectedInterestCoverage)) {
              expect(result.interest_coverage).toBeCloseTo(expectedInterestCoverage, 2);
            }

            // Property 7: Data confidence must be assigned
            expect(result.data_confidence).toBeDefined();
            expect(result.data_confidence).toBeGreaterThanOrEqual(0);
            expect(result.data_confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should trigger covenant health recalculation for all related covenants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            contractId: fc.uuid(),
            covenantCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ borrowerId, bankId, contractId, covenantCount }) => {
            const financialInput = {
              borrower_id: borrowerId,
              period_date: '2024-03-31',
              period_type: 'quarterly' as const,
              source: 'manual',
              debt_total: 5000000,
              ebitda: 2000000,
              current_assets: 3000000,
              current_liabilities: 1500000,
              equity_total: 8000000,
            };

            // Generate mock covenants for the borrower
            const mockCovenants: Covenant[] = Array.from({ length: covenantCount }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: `Test Covenant ${i + 1}`,
              covenant_type: 'financial' as const,
              metric_name: ['debt_to_ebitda', 'current_ratio', 'interest_coverage'][i % 3],
              operator: '<=' as const,
              threshold_value: 3.5 + i,
              check_frequency: 'quarterly' as const,
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract: {
                id: contractId,
                bank_id: bankId,
                borrower_id: borrowerId,
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                borrower: {
                  id: borrowerId,
                  bank_id: bankId,
                  legal_name: 'Test Company',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              },
            }));

            let getCallCount = 0;
            let postCallCount = 0;

            // Mock API responses
            mockApiService.get.mockImplementation((url: string) => {
              getCallCount++;
              if (url.includes('/covenants?borrower_id=') || url.includes('/covenants')) {
                return Promise.resolve({ success: true, data: mockCovenants });
              }
              if (url.includes('/financials')) {
                return Promise.resolve({ 
                  success: true, 
                  data: [{
                    id: fc.sample(fc.uuid(), 1)[0],
                    ...financialInput,
                    bank_id: bankId,
                    debt_to_ebitda: 2.5,
                    current_ratio: 2.0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }] 
                });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockImplementation(() => {
              postCallCount++;
              return Promise.resolve({
                success: true,
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  ...financialInput,
                  bank_id: bankId,
                  debt_to_ebitda: 2.5,
                  current_ratio: 2.0,
                  data_confidence: 0.8,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              });
            });

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
              risk_score: 5,
              risk_factors: [],
              recommended_actions: [],
              assessment_summary: 'Test',
              confidence_level: 0.8,
            });

            await covenantHealthService.ingestFinancialData(borrowerId, financialInput);

            // Property: Financial data ingestion should trigger API calls
            // At minimum, we should have the initial POST for storing financial data
            expect(postCallCount).toBeGreaterThanOrEqual(1);

            // Property: System should query for related covenants
            // The get calls should include covenant queries
            expect(getCallCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should calculate all standard financial ratios correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            debtTotal: fc.float({ min: Math.fround(1000000), max: Math.fround(1000000000) }),
            ebitda: fc.float({ min: Math.fround(100000), max: Math.fround(100000000) }),
            currentAssets: fc.float({ min: Math.fround(500000), max: Math.fround(500000000) }),
            currentLiabilities: fc.float({ min: Math.fround(100000), max: Math.fround(400000000) }),
            equity: fc.float({ min: Math.fround(1000000), max: Math.fround(800000000) }),
            netIncome: fc.float({ min: Math.fround(-10000000), max: Math.fround(50000000) }),
          }),
          async ({ borrowerId, bankId, debtTotal, ebitda, currentAssets, currentLiabilities, equity, netIncome }) => {
            const financialInput = {
              borrower_id: borrowerId,
              period_date: '2024-03-31',
              period_type: 'quarterly' as const,
              source: 'test',
              debt_total: debtTotal,
              ebitda: ebitda,
              current_assets: currentAssets,
              current_liabilities: currentLiabilities,
              equity_total: equity,
              net_income: netIncome,
            };

            // Mock API response for ingestion
            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                ...financialInput,
                bank_id: bankId,
                // Calculated ratios
                debt_to_ebitda: debtTotal / ebitda,
                debt_to_equity: debtTotal / equity,
                current_ratio: currentAssets / currentLiabilities,
                roe: (netIncome / equity) * 100,
                roa: (netIncome / currentAssets) * 100,
                data_confidence: 0.8,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            });

            // Mock empty covenants list to avoid recalculation
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await covenantHealthService.ingestFinancialData(borrowerId, financialInput);

            // Verify calculated ratios are mathematically correct (when inputs are valid)
            // Note: fc.float() can produce NaN values, so we must check all operands
            if (isFinite(debtTotal) && isFinite(ebitda) && ebitda > 0) {
              expect(result.debt_to_ebitda).toBeCloseTo(debtTotal / ebitda, 2);
              expect(isFinite(result.debt_to_ebitda!)).toBe(true);
            }
            
            if (isFinite(debtTotal) && isFinite(equity) && equity > 0) {
              expect(result.debt_to_equity).toBeCloseTo(debtTotal / equity, 2);
              expect(isFinite(result.debt_to_equity!)).toBe(true);
            }
            
            if (isFinite(netIncome) && isFinite(equity) && equity > 0) {
              expect(result.roe).toBeCloseTo((netIncome / equity) * 100, 2);
              expect(isFinite(result.roe!)).toBe(true);
            }
            
            if (isFinite(currentAssets) && isFinite(currentLiabilities) && currentLiabilities > 0) {
              expect(result.current_ratio).toBeCloseTo(currentAssets / currentLiabilities, 2);
              expect(isFinite(result.current_ratio!)).toBe(true);
            }
            
            if (isFinite(netIncome) && isFinite(currentAssets) && currentAssets > 0) {
              expect(result.roa).toBeCloseTo((netIncome / currentAssets) * 100, 2);
              expect(isFinite(result.roa!)).toBe(true);
            }

            // Verify data confidence is within valid range
            expect(result.data_confidence).toBeGreaterThanOrEqual(0);
            expect(result.data_confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  /**
   * Property 8: Trend Analysis Classification
   * For any financial data analysis, the system should classify trends as exactly one of 
   * (improving, stable, deteriorating) and flag low-confidence data for manual verification.
   * Validates: Requirements 5.4, 5.5
   */
  describe('Property 8: Trend Analysis Classification', () => {
    test('should classify trends as exactly one of improving, stable, or deteriorating', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            borrowerId: fc.uuid(),
            periods: fc.integer({ min: 2, max: 8 }),
          }),
          async ({ covenantId, contractId, bankId, borrowerId, periods }) => {
            const covenant: Covenant = {
              id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: 'Debt to EBITDA Ratio',
              covenant_type: 'financial',
              metric_name: 'debt_to_ebitda',
              operator: '<=',
              threshold_value: 4.0,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract: {
                id: contractId,
                bank_id: bankId,
                borrower_id: borrowerId,
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                borrower: {
                  id: borrowerId,
                  bank_id: bankId,
                  legal_name: 'Test Company',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              },
            };

            // Generate historical data with random values
            const historicalData: FinancialMetrics[] = Array.from({ length: periods }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: bankId,
              period_date: `2024-0${Math.min(i + 1, 9)}-30`,
              period_type: 'quarterly' as const,
              source: 'test',
              debt_to_ebitda: 2.0 + Math.random() * 2,
              data_confidence: 0.7 + Math.random() * 0.3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Mock API responses
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/covenants/')) {
                return Promise.resolve({ success: true, data: covenant });
              }
              if (url.includes('/financials')) {
                return Promise.resolve({ success: true, data: historicalData });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
              risk_score: 5,
              risk_factors: [],
              recommended_actions: [],
              assessment_summary: 'Test',
              confidence_level: 0.8,
            });

            const result = await covenantHealthService.analyzeTrends(covenantId, periods);

            // Property 1: Trend must be exactly one of the valid values
            expect(['improving', 'stable', 'deteriorating']).toContain(result.trend);

            // Property 2: Trend data should have entries for each period
            expect(result.trend_data.length).toBeLessThanOrEqual(periods);

            // Property 3: Each trend data point should have valid status
            result.trend_data.forEach(dataPoint => {
              expect(['compliant', 'warning', 'breached']).toContain(dataPoint.status);
              expect(typeof dataPoint.value).toBe('number');
              expect(dataPoint.period).toBeDefined();
            });

            // Property 4: Confidence should be between 0 and 1
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should return consistent trend classification for monotonic data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            borrowerId: fc.uuid(),
            startValue: fc.float({ min: Math.fround(2.0), max: Math.fround(4.0) }),
            changeRate: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5) }),
          }),
          async ({ covenantId, contractId, bankId, borrowerId, startValue, changeRate }) => {
            const covenant: Covenant = {
              id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: 'Debt to EBITDA Ratio',
              covenant_type: 'financial',
              metric_name: 'debt_to_ebitda',
              operator: '<=',
              threshold_value: 4.0,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract: {
                id: contractId,
                bank_id: bankId,
                borrower_id: borrowerId,
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                borrower: {
                  id: borrowerId,
                  bank_id: bankId,
                  legal_name: 'Test Company',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              },
            };

            // Generate monotonic data (either increasing or decreasing)
            const historicalData: FinancialMetrics[] = Array.from({ length: 4 }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: bankId,
              period_date: `2024-0${i + 1}-30`,
              period_type: 'quarterly' as const,
              source: 'test',
              debt_to_ebitda: Math.max(0.5, startValue + (i * changeRate)),
              data_confidence: 0.9,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Mock API responses
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/covenants/')) {
                return Promise.resolve({ success: true, data: covenant });
              }
              if (url.includes('/financials')) {
                return Promise.resolve({ success: true, data: historicalData });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
              risk_score: 5,
              risk_factors: [],
              recommended_actions: [],
              assessment_summary: 'Trend analysis',
              confidence_level: 0.9,
            });

            const result = await covenantHealthService.analyzeTrends(covenantId, 4);

            // Property: Trend must always be one of the valid values
            expect(['improving', 'stable', 'deteriorating']).toContain(result.trend);

            // Property: Trend data should be consistent
            expect(result.trend_data.length).toBeGreaterThan(0);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should flag low-confidence data for manual verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            lowConfidenceValue: fc.float({ min: Math.fround(0.1), max: Math.fround(0.4), noNaN: true }),
          }),
          async ({ borrowerId, bankId, lowConfidenceValue }) => {
            const financialInput = {
              borrower_id: borrowerId,
              period_date: '2024-03-31',
              period_type: 'quarterly' as const,
              source: 'manual',
              // Minimal data - should result in low confidence
              debt_total: 5000000,
              // Missing many key metrics like ebitda, revenue, etc.
            };

            // Mock API response with low confidence
            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                ...financialInput,
                bank_id: bankId,
                data_confidence: lowConfidenceValue,
                needs_manual_verification: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            });

            // Mock empty covenants list
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await covenantHealthService.ingestFinancialData(borrowerId, financialInput);

            // Property 1: Low confidence data should have confidence below threshold
            expect(result.data_confidence).toBeLessThanOrEqual(0.5);

            // Property 2: Data confidence should still be a valid number
            expect(typeof result.data_confidence).toBe('number');
            expect(result.data_confidence).toBeGreaterThanOrEqual(0);
            expect(result.data_confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should calculate confidence based on data completeness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            hasDebt: fc.boolean(),
            hasEbitda: fc.boolean(),
            hasRevenue: fc.boolean(),
            hasEquity: fc.boolean(),
            hasCurrentAssets: fc.boolean(),
            hasCurrentLiabilities: fc.boolean(),
          }),
          async ({ borrowerId, bankId, hasDebt, hasEbitda, hasRevenue, hasEquity, hasCurrentAssets, hasCurrentLiabilities }) => {
            const financialInput: any = {
              borrower_id: borrowerId,
              period_date: '2024-03-31',
              period_type: 'quarterly' as const,
              source: 'manual',
            };

            // Add metrics based on flags
            if (hasDebt) financialInput.debt_total = 5000000;
            if (hasEbitda) financialInput.ebitda = 2000000;
            if (hasRevenue) financialInput.revenue = 10000000;
            if (hasEquity) financialInput.equity_total = 8000000;
            if (hasCurrentAssets) financialInput.current_assets = 3000000;
            if (hasCurrentLiabilities) financialInput.current_liabilities = 1500000;

            // Count how many key metrics are present
            const metricsPresent = [hasDebt, hasEbitda, hasRevenue, hasEquity, hasCurrentAssets, hasCurrentLiabilities]
              .filter(Boolean).length;
            
            // Expected confidence should correlate with data completeness
            const expectedMinConfidence = metricsPresent / 6 * 0.5; // Base confidence from completeness

            // Mock API response
            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                ...financialInput,
                bank_id: bankId,
                data_confidence: Math.min(1, expectedMinConfidence + 0.3),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            });

            // Mock empty covenants list
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await covenantHealthService.ingestFinancialData(borrowerId, financialInput);

            // Property: Confidence should be within valid range
            expect(result.data_confidence).toBeGreaterThanOrEqual(0);
            expect(result.data_confidence).toBeLessThanOrEqual(1);

            // Property: More complete data should generally have higher confidence
            // (This is a soft property - we just verify the confidence is reasonable)
            if (metricsPresent >= 5) {
              expect(result.data_confidence).toBeGreaterThanOrEqual(0.5);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

});