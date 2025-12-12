/**
 * Property-Based Tests for Report Generation
 * Feature: covenant-guardian, Property 12: Report Generation Completeness
 */

import fc from 'fast-check';
import { reportService, GeneratedReport } from '@/services/reports';
import { apiService } from '@/services/api';
import { geminiService } from '@/services/gemini';
import type {
  Contract,
  CovenantHealth,
  Alert,
  Borrower,
} from '@/types';

// Mock the services
jest.mock('@/services/api');
jest.mock('@/services/gemini');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

describe('Report Generation Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for Gemini service
    mockGeminiService.analyzeCovenantRisk.mockResolvedValue({
      risk_score: 5,
      risk_factors: ['Test risk factor'],
      recommended_actions: ['Test recommendation'],
      assessment_summary: 'Test AI summary',
      confidence_level: 0.8,
    });
  });

  /**
   * Property 12: Report Generation Completeness
   * For any risk report request for a specified period, the system should generate 
   * portfolio analysis including covenant breach statistics, borrower risk profiles, 
   * trend analysis, and store the completed report with proper attribution.
   * Validates: Requirements 8.1, 8.2, 8.4, 8.5
   */
  describe('Property 12: Report Generation Completeness', () => {
    test('should generate complete portfolio analysis for any valid period', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            contractCount: fc.integer({ min: 1, max: 20 }),
            covenantCount: fc.integer({ min: 1, max: 50 }),
            alertCount: fc.integer({ min: 0, max: 30 }),
            borrowerCount: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ bankId, contractCount, covenantCount, alertCount, borrowerCount }) => {
            // Generate mock data
            const mockContracts: Contract[] = Array.from({ length: contractCount }, (_, i) => ({
              id: `contract-${i}`,
              bank_id: bankId,
              borrower_id: `borrower-${i % borrowerCount}`,
              contract_name: `Contract ${i + 1}`,
              principal_amount: Math.fround(1000000 * (i + 1)),
              currency: 'USD',
              origination_date: '2024-01-01',
              maturity_date: '2027-01-01',
              status: i % 4 === 0 ? 'watch' : i % 4 === 1 ? 'default' : 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockCovenantHealth: CovenantHealth[] = Array.from({ length: covenantCount }, (_, i) => ({
              id: `health-${i}`,
              covenant_id: `covenant-${i}`,
              contract_id: `contract-${i % contractCount}`,
              bank_id: bankId,
              status: i % 3 === 0 ? 'breached' : i % 3 === 1 ? 'warning' : 'compliant',
              trend: i % 3 === 0 ? 'deteriorating' : i % 3 === 1 ? 'stable' : 'improving',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockAlerts: Alert[] = Array.from({ length: alertCount }, (_, i) => ({
              id: `alert-${i}`,
              covenant_id: `covenant-${i % covenantCount}`,
              contract_id: `contract-${i % contractCount}`,
              bank_id: bankId,
              alert_type: i % 2 === 0 ? 'breach' : 'warning',
              severity: i % 2 === 0 ? 'critical' : 'medium',
              title: `Alert ${i + 1}`,
              description: 'Test alert',
              status: i % 3 === 0 ? 'resolved' : 'new',
              triggered_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockBorrowers: Borrower[] = Array.from({ length: borrowerCount }, (_, i) => ({
              id: `borrower-${i}`,
              bank_id: bankId,
              legal_name: `Borrower ${i + 1}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Setup API mocks
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({ success: true, data: mockContracts });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({ success: true, data: mockCovenantHealth });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: mockAlerts });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({ success: true, data: mockBorrowers });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({
              success: true,
              data: { id: 'stored-report-id', bank_id: bankId },
            });

            // Generate report
            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: true,
            });

            // Property 1: Report must have portfolio analysis
            expect(report.report_data.total_contracts).toBe(contractCount);
            expect(report.report_data.total_principal).toBeGreaterThan(0);
            expect(report.report_data.contracts_at_risk).toBeGreaterThanOrEqual(0);
            expect(report.report_data.contracts_at_risk).toBeLessThanOrEqual(contractCount);

            // Property 2: Report must have covenant breach statistics
            expect(report.report_data.breach_statistics).toBeDefined();
            expect(report.report_data.breach_statistics.new_breaches).toBeGreaterThanOrEqual(0);
            expect(report.report_data.breach_statistics.resolved_breaches).toBeGreaterThanOrEqual(0);
            expect(report.report_data.breach_statistics.ongoing_breaches).toBeGreaterThanOrEqual(0);
            expect(report.report_data.breach_statistics.breach_rate).toBeGreaterThanOrEqual(0);
            expect(report.report_data.breach_statistics.breach_rate).toBeLessThanOrEqual(100);

            // Property 3: Report must have borrower risk profiles
            expect(Array.isArray(report.report_data.borrower_risk_profiles)).toBe(true);
            expect(report.report_data.borrower_risk_profiles.length).toBe(borrowerCount);
            report.report_data.borrower_risk_profiles.forEach(profile => {
              expect(profile.borrower_id).toBeDefined();
              expect(profile.borrower_name).toBeDefined();
              expect(profile.risk_score).toBeGreaterThanOrEqual(0);
              expect(profile.risk_score).toBeLessThanOrEqual(10);
              expect(['compliant', 'warning', 'breached']).toContain(profile.covenant_status);
            });

            // Property 4: Report must have trend analysis
            expect(report.report_data.trend_analysis).toBeDefined();
            expect(report.report_data.trend_analysis.improving_covenants).toBeGreaterThanOrEqual(0);
            expect(report.report_data.trend_analysis.stable_covenants).toBeGreaterThanOrEqual(0);
            expect(report.report_data.trend_analysis.deteriorating_covenants).toBeGreaterThanOrEqual(0);
            expect(['improving', 'stable', 'deteriorating']).toContain(
              report.report_data.trend_analysis.overall_trend
            );

            // Property 5: Report must be stored with proper attribution
            expect(report.id).toBeDefined();
            expect(report.report_type).toBe('portfolio_summary');
            expect(report.report_date).toBeDefined();
            expect(report.created_at).toBeDefined();

            // Property 6: Validate completeness
            const validation = reportService.validateReportCompleteness(report);
            expect(validation.isComplete).toBe(true);
            expect(validation.missingFields.length).toBe(0);
          }
        ),
        { numRuns: 15 }
      );
    });


    test('should calculate breach statistics correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            breachedCount: fc.integer({ min: 0, max: 20 }),
            warningCount: fc.integer({ min: 0, max: 20 }),
            compliantCount: fc.integer({ min: 0, max: 20 }),
            newBreachAlerts: fc.integer({ min: 0, max: 10 }),
            resolvedBreachAlerts: fc.integer({ min: 0, max: 10 }),
          }),
          async ({ bankId, breachedCount, warningCount, compliantCount, newBreachAlerts, resolvedBreachAlerts }) => {
            const totalCovenants = breachedCount + warningCount + compliantCount;
            if (totalCovenants === 0) return; // Skip empty case

            // Generate covenant health data
            const mockCovenantHealth: CovenantHealth[] = [
              ...Array.from({ length: breachedCount }, (_, i) => ({
                id: `breached-${i}`,
                covenant_id: `cov-b-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'breached' as const,
                trend: 'deteriorating' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: warningCount }, (_, i) => ({
                id: `warning-${i}`,
                covenant_id: `cov-w-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'warning' as const,
                trend: 'stable' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: compliantCount }, (_, i) => ({
                id: `compliant-${i}`,
                covenant_id: `cov-c-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'compliant' as const,
                trend: 'improving' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
            ];

            // Generate alerts
            const mockAlerts: Alert[] = [
              ...Array.from({ length: newBreachAlerts }, (_, i) => ({
                id: `new-breach-${i}`,
                covenant_id: `cov-b-${i % breachedCount || 0}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                alert_type: 'breach' as const,
                severity: 'critical' as const,
                title: 'Breach Alert',
                description: 'Test',
                status: 'new' as const,
                triggered_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: resolvedBreachAlerts }, (_, i) => ({
                id: `resolved-breach-${i}`,
                covenant_id: `cov-b-${i % breachedCount || 0}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                alert_type: 'breach' as const,
                severity: 'critical' as const,
                title: 'Breach Alert',
                description: 'Test',
                status: 'resolved' as const,
                triggered_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
            ];

            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({
                  success: true,
                  data: [{ id: 'contract-1', bank_id: bankId, borrower_id: 'b1', contract_name: 'Test', principal_amount: 1000000, currency: 'USD', origination_date: '2024-01-01', maturity_date: '2027-01-01', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
                });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({ success: true, data: mockCovenantHealth });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: mockAlerts });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({
                  success: true,
                  data: [{ id: 'b1', bank_id: bankId, legal_name: 'Test Borrower', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
                });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: false,
            });

            // Property 1: Breach statistics must match input data
            expect(report.report_data.breach_statistics.new_breaches).toBe(newBreachAlerts);
            expect(report.report_data.breach_statistics.resolved_breaches).toBe(resolvedBreachAlerts);
            expect(report.report_data.breach_statistics.ongoing_breaches).toBe(breachedCount);

            // Property 2: Breach rate must be calculated correctly
            const expectedBreachRate = Math.round((breachedCount / totalCovenants) * 100 * 100) / 100;
            expect(report.report_data.breach_statistics.breach_rate).toBeCloseTo(expectedBreachRate, 2);

            // Property 3: Covenant counts must match
            expect(report.report_data.covenants_breached).toBe(breachedCount);
            expect(report.report_data.covenants_warning).toBe(warningCount);
            expect(report.report_data.covenants_compliant).toBe(compliantCount);
            expect(report.report_data.total_covenants).toBe(totalCovenants);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should calculate trend analysis correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            improvingCount: fc.integer({ min: 0, max: 15 }),
            stableCount: fc.integer({ min: 0, max: 15 }),
            deterioratingCount: fc.integer({ min: 0, max: 15 }),
          }),
          async ({ bankId, improvingCount, stableCount, deterioratingCount }) => {
            const totalCovenants = improvingCount + stableCount + deterioratingCount;
            if (totalCovenants === 0) return; // Skip empty case

            // Generate covenant health with specific trends
            const mockCovenantHealth: CovenantHealth[] = [
              ...Array.from({ length: improvingCount }, (_, i) => ({
                id: `improving-${i}`,
                covenant_id: `cov-i-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'compliant' as const,
                trend: 'improving' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: stableCount }, (_, i) => ({
                id: `stable-${i}`,
                covenant_id: `cov-s-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'compliant' as const,
                trend: 'stable' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: deterioratingCount }, (_, i) => ({
                id: `deteriorating-${i}`,
                covenant_id: `cov-d-${i}`,
                contract_id: 'contract-1',
                bank_id: bankId,
                status: 'warning' as const,
                trend: 'deteriorating' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
            ];

            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({
                  success: true,
                  data: [{ id: 'contract-1', bank_id: bankId, borrower_id: 'b1', contract_name: 'Test', principal_amount: 1000000, currency: 'USD', origination_date: '2024-01-01', maturity_date: '2027-01-01', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
                });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({ success: true, data: mockCovenantHealth });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({
                  success: true,
                  data: [{ id: 'b1', bank_id: bankId, legal_name: 'Test Borrower', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
                });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: false,
            });

            // Property 1: Trend counts must match input
            expect(report.report_data.trend_analysis.improving_covenants).toBe(improvingCount);
            expect(report.report_data.trend_analysis.stable_covenants).toBe(stableCount);
            expect(report.report_data.trend_analysis.deteriorating_covenants).toBe(deterioratingCount);

            // Property 2: Overall trend must be determined correctly
            let expectedTrend: 'improving' | 'stable' | 'deteriorating' = 'stable';
            if (deterioratingCount > improvingCount && deterioratingCount > stableCount) {
              expectedTrend = 'deteriorating';
            } else if (improvingCount > deterioratingCount && improvingCount > stableCount) {
              expectedTrend = 'improving';
            }
            expect(report.report_data.trend_analysis.overall_trend).toBe(expectedTrend);

            // Property 3: Trend sum must equal total covenants
            const trendSum = report.report_data.trend_analysis.improving_covenants +
              report.report_data.trend_analysis.stable_covenants +
              report.report_data.trend_analysis.deteriorating_covenants;
            expect(trendSum).toBe(totalCovenants);
          }
        ),
        { numRuns: 20 }
      );
    });


    test('should generate borrower risk profiles with valid scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            borrowerCount: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ bankId, borrowerCount }) => {
            // Generate borrowers
            const mockBorrowers: Borrower[] = Array.from({ length: borrowerCount }, (_, i) => ({
              id: `borrower-${i}`,
              bank_id: bankId,
              legal_name: `Borrower ${i + 1}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Generate contracts for each borrower
            const mockContracts: Contract[] = mockBorrowers.map((b, i) => ({
              id: `contract-${i}`,
              bank_id: bankId,
              borrower_id: b.id,
              contract_name: `Contract for ${b.legal_name}`,
              principal_amount: Math.fround(1000000 * (i + 1)),
              currency: 'USD',
              origination_date: '2024-01-01',
              maturity_date: '2027-01-01',
              status: i % 3 === 0 ? 'watch' : 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Generate covenant health for each contract
            const mockCovenantHealth: CovenantHealth[] = mockContracts.flatMap((c, i) => [
              {
                id: `health-${i}-1`,
                covenant_id: `cov-${i}-1`,
                contract_id: c.id,
                bank_id: bankId,
                status: i % 3 === 0 ? 'breached' : 'compliant' as const,
                trend: i % 3 === 0 ? 'deteriorating' : 'stable' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: `health-${i}-2`,
                covenant_id: `cov-${i}-2`,
                contract_id: c.id,
                bank_id: bankId,
                status: i % 2 === 0 ? 'warning' : 'compliant' as const,
                trend: 'stable' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({ success: true, data: mockContracts });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({ success: true, data: mockCovenantHealth });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({ success: true, data: mockBorrowers });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: false,
            });

            // Property 1: Must have risk profile for each borrower
            expect(report.report_data.borrower_risk_profiles.length).toBe(borrowerCount);

            // Property 2: Each profile must have valid risk score (0-10)
            report.report_data.borrower_risk_profiles.forEach(profile => {
              expect(profile.risk_score).toBeGreaterThanOrEqual(0);
              expect(profile.risk_score).toBeLessThanOrEqual(10);
            });

            // Property 3: Each profile must have valid covenant status
            report.report_data.borrower_risk_profiles.forEach(profile => {
              expect(['compliant', 'warning', 'breached']).toContain(profile.covenant_status);
            });

            // Property 4: Principal at risk must be non-negative
            report.report_data.borrower_risk_profiles.forEach(profile => {
              expect(profile.principal_at_risk).toBeGreaterThanOrEqual(0);
            });

            // Property 5: Borrower IDs must match input
            const profileBorrowerIds = report.report_data.borrower_risk_profiles.map(p => p.borrower_id);
            mockBorrowers.forEach(b => {
              expect(profileBorrowerIds).toContain(b.id);
            });
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should include AI-generated executive summary when requested', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (bankId) => {
            // Setup minimal mock data
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({
                  success: true,
                  data: [{
                    id: 'contract-1',
                    bank_id: bankId,
                    borrower_id: 'b1',
                    contract_name: 'Test',
                    principal_amount: 1000000,
                    currency: 'USD',
                    origination_date: '2024-01-01',
                    maturity_date: '2027-01-01',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }],
                });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({
                  success: true,
                  data: [{
                    id: 'health-1',
                    covenant_id: 'cov-1',
                    contract_id: 'contract-1',
                    bank_id: bankId,
                    status: 'compliant',
                    trend: 'stable',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }],
                });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({
                  success: true,
                  data: [{
                    id: 'b1',
                    bank_id: bankId,
                    legal_name: 'Test Borrower',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }],
                });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

            // Test with AI summary enabled (default behavior)
            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: true,
            });

            // Property 1: Executive summary must be present when AI is requested
            expect(report.report_data.executive_summary).toBeDefined();
            expect(typeof report.report_data.executive_summary).toBe('string');
            expect(report.report_data.executive_summary!.length).toBeGreaterThan(0);

            // Property 2: Key risks must be an array
            expect(Array.isArray(report.report_data.key_risks)).toBe(true);

            // Property 3: Recommendations must be an array
            expect(Array.isArray(report.report_data.recommendations)).toBe(true);

            // Property 4: Gemini should have been called for AI summary
            expect(mockGeminiService.analyzeCovenantRisk).toHaveBeenCalled();
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should store report with proper attribution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            reportType: fc.constantFrom('portfolio_summary', 'borrower_deep_dive', 'covenant_analysis'),
          }),
          async ({ bankId, reportType }) => {
            // Setup mock data
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('/api/contracts')) {
                return Promise.resolve({
                  success: true,
                  data: [{
                    id: 'contract-1',
                    bank_id: bankId,
                    borrower_id: 'b1',
                    contract_name: 'Test',
                    principal_amount: 1000000,
                    currency: 'USD',
                    origination_date: '2024-01-01',
                    maturity_date: '2027-01-01',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }],
                });
              }
              if (url.includes('/api/covenants/health')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('/api/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('/api/borrowers')) {
                return Promise.resolve({
                  success: true,
                  data: [{
                    id: 'b1',
                    bank_id: bankId,
                    legal_name: 'Test Borrower',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }],
                });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            mockApiService.post.mockResolvedValue({
              success: true,
              data: { id: 'stored-report-id', bank_id: bankId },
            });

            const input = {
              report_type: reportType as 'portfolio_summary' | 'borrower_deep_dive' | 'covenant_analysis',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              borrower_id: reportType === 'borrower_deep_dive' ? 'b1' : undefined,
              include_ai_summary: false,
            };

            const report = await reportService.generateReport(input);

            // Property 1: Report must have unique ID
            expect(report.id).toBeDefined();
            expect(typeof report.id).toBe('string');
            expect(report.id.length).toBeGreaterThan(0);

            // Property 2: Report type must match input
            expect(report.report_type).toBe(reportType);

            // Property 3: Report date must be set
            expect(report.report_date).toBeDefined();
            const reportDate = new Date(report.report_date);
            expect(reportDate.getTime()).not.toBeNaN();

            // Property 4: Created timestamp must be set
            expect(report.created_at).toBeDefined();
            const createdAt = new Date(report.created_at);
            expect(createdAt.getTime()).not.toBeNaN();

            // Property 5: API should be called to store report
            expect(mockApiService.post).toHaveBeenCalledWith(
              '/api/reports',
              expect.objectContaining({
                report_type: reportType,
              })
            );
          }
        ),
        { numRuns: 10 }
      );
    });


    test('should validate report data accuracy correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalContracts: fc.integer({ min: 0, max: 100 }),
            contractsAtRisk: fc.integer({ min: 0, max: 100 }),
            totalPrincipal: fc.float({ min: Math.fround(0), max: Math.fround(1000000000), noNaN: true }),
            totalCovenants: fc.integer({ min: 0, max: 200 }),
            breachRate: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          }),
          async ({ totalContracts, contractsAtRisk, totalPrincipal, totalCovenants, breachRate }) => {
            // Create report with potentially invalid data
            const report: GeneratedReport = {
              id: 'test-report',
              bank_id: 'bank-1',
              report_type: 'portfolio_summary',
              report_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              report_data: {
                total_contracts: totalContracts,
                contracts_at_risk: contractsAtRisk,
                total_principal: totalPrincipal,
                total_covenants: totalCovenants,
                covenants_breached: Math.floor(totalCovenants * 0.3),
                covenants_warning: Math.floor(totalCovenants * 0.2),
                covenants_compliant: totalCovenants - Math.floor(totalCovenants * 0.3) - Math.floor(totalCovenants * 0.2),
                breach_statistics: {
                  new_breaches: 0,
                  resolved_breaches: 0,
                  ongoing_breaches: Math.floor(totalCovenants * 0.3),
                  breach_rate: breachRate,
                },
                borrower_risk_profiles: [],
                trend_analysis: {
                  improving_covenants: 0,
                  stable_covenants: totalCovenants,
                  deteriorating_covenants: 0,
                  overall_trend: 'stable',
                },
              },
            };

            const validation = reportService.validateReportAccuracy(report);

            // Property 1: Should detect if contracts at risk exceeds total
            if (contractsAtRisk > totalContracts) {
              expect(validation.isValid).toBe(false);
              expect(validation.errors).toContain('Contracts at risk exceeds total contracts');
            }

            // Property 2: Should detect invalid breach rate
            if (!isFinite(breachRate) || breachRate < 0 || breachRate > 100) {
              expect(validation.errors.some(e => e.includes('Breach rate'))).toBe(true);
            }

            // Property 3: Should detect negative values
            if (totalContracts < 0) {
              expect(validation.errors).toContain('Total contracts cannot be negative');
            }
            if (totalPrincipal < 0) {
              expect(validation.errors).toContain('Total principal cannot be negative');
            }

            // Property 4: Valid data should pass validation
            if (
              totalContracts >= 0 &&
              contractsAtRisk >= 0 &&
              contractsAtRisk <= totalContracts &&
              totalPrincipal >= 0 &&
              totalCovenants >= 0 &&
              isFinite(breachRate) &&
              breachRate >= 0 &&
              breachRate <= 100
            ) {
              expect(validation.errors.length).toBe(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle empty data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (_bankId) => {
            // Mock empty responses
            mockApiService.get.mockResolvedValue({ success: true, data: [] });
            mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

            const report = await reportService.generateReport({
              report_type: 'portfolio_summary',
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              include_ai_summary: false,
            });

            // Property 1: Should return valid report structure
            expect(report).toBeDefined();
            expect(report.id).toBeDefined();

            // Property 2: Numeric fields should be 0
            expect(report.report_data.total_contracts).toBe(0);
            expect(report.report_data.contracts_at_risk).toBe(0);
            expect(report.report_data.total_principal).toBe(0);
            expect(report.report_data.total_covenants).toBe(0);

            // Property 3: Arrays should be empty
            expect(report.report_data.borrower_risk_profiles).toEqual([]);

            // Property 4: Breach statistics should be zeroed
            expect(report.report_data.breach_statistics.new_breaches).toBe(0);
            expect(report.report_data.breach_statistics.resolved_breaches).toBe(0);
            expect(report.report_data.breach_statistics.ongoing_breaches).toBe(0);
            expect(report.report_data.breach_statistics.breach_rate).toBe(0);

            // Property 5: Trend analysis should show stable with zeros
            expect(report.report_data.trend_analysis.improving_covenants).toBe(0);
            expect(report.report_data.trend_analysis.stable_covenants).toBe(0);
            expect(report.report_data.trend_analysis.deteriorating_covenants).toBe(0);
            expect(report.report_data.trend_analysis.overall_trend).toBe('stable');

            // Property 6: Report should still be complete
            const validation = reportService.validateReportCompleteness(report);
            expect(validation.isComplete).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should reject invalid date ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            startYear: fc.integer({ min: 2020, max: 2030 }),
            startMonth: fc.integer({ min: 1, max: 12 }),
            endYear: fc.integer({ min: 2020, max: 2030 }),
            endMonth: fc.integer({ min: 1, max: 12 }),
          }),
          async ({ startYear, startMonth, endYear, endMonth }) => {
            const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
            const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-28`;

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
              // Property: Should reject when start date is after end date
              await expect(
                reportService.generateReport({
                  report_type: 'portfolio_summary',
                  start_date: startDate,
                  end_date: endDate,
                })
              ).rejects.toThrow('Start date must be before end date');
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should require borrower_id for borrower_deep_dive reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasBorrowerId: fc.boolean(),
            borrowerId: fc.uuid(),
          }),
          async ({ hasBorrowerId, borrowerId }) => {
            if (!hasBorrowerId) {
              // Property: Should reject borrower_deep_dive without borrower_id
              await expect(
                reportService.generateReport({
                  report_type: 'borrower_deep_dive',
                  start_date: '2024-01-01',
                  end_date: '2024-12-31',
                })
              ).rejects.toThrow('Borrower ID is required for borrower deep dive reports');
            } else {
              // Setup mocks for valid request
              mockApiService.get.mockResolvedValue({ success: true, data: [] });
              mockApiService.post.mockResolvedValue({ success: true, data: { id: 'report-1' } });

              // Should not throw with borrower_id
              const report = await reportService.generateReport({
                report_type: 'borrower_deep_dive',
                start_date: '2024-01-01',
                end_date: '2024-12-31',
                borrower_id: borrowerId,
                include_ai_summary: false,
              });

              expect(report).toBeDefined();
              expect(report.report_type).toBe('borrower_deep_dive');
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
