/**
 * Property-Based Tests for Portfolio Dashboard
 * Feature: covenant-guardian, Property 11: Dashboard Data Completeness
 */

import fc from 'fast-check';
import { dashboardService } from '@/services/dashboard';
import { apiService } from '@/services/api';
import type {
  DashboardData,
  PortfolioSummary,
  RiskMetrics,
  Contract,
  Alert,
  CovenantHealth,
} from '@/types';

// Mock the services
jest.mock('@/services/api');

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Portfolio Dashboard Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 11: Dashboard Data Completeness
   * For any Portfolio_Dashboard access, the system should display total contracts, 
   * principal amounts, risk summaries, covenant breakdown by compliance status, 
   * and highlight highest-risk contracts with real-time data.
   * Validates: Requirements 7.1, 7.2, 7.3, 7.5
   */
  describe('Property 11: Dashboard Data Completeness', () => {
    test('should return complete dashboard data with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            bankName: fc.string({ minLength: 3, maxLength: 50 }),
            totalContracts: fc.integer({ min: 0, max: 1000 }),
            totalPrincipal: fc.float({ min: Math.fround(0), max: Math.fround(1000000000) }),
            contractsBreached: fc.integer({ min: 0, max: 100 }),
            contractsAtWarning: fc.integer({ min: 0, max: 100 }),
            openAlertsCount: fc.integer({ min: 0, max: 500 }),
            portfolioRiskScore: fc.float({ min: Math.fround(0), max: Math.fround(10) }),
            highRiskContracts: fc.integer({ min: 0, max: 100 }),
            trendingDeteriorating: fc.integer({ min: 0, max: 50 }),
            upcomingChecks: fc.integer({ min: 0, max: 200 }),
            overdueReports: fc.integer({ min: 0, max: 50 }),
          }),
          async ({
            bankId, bankName, totalContracts, totalPrincipal,
            contractsBreached, contractsAtWarning, openAlertsCount,
            portfolioRiskScore, highRiskContracts, trendingDeteriorating,
            upcomingChecks, overdueReports
          }) => {
            // Mock portfolio summary
            const mockPortfolioSummary: PortfolioSummary = {
              bank_id: bankId,
              bank_name: bankName,
              total_contracts: totalContracts,
              total_principal_usd: totalPrincipal,
              contracts_breached: contractsBreached,
              contracts_at_warning: contractsAtWarning,
              open_alerts_count: openAlertsCount,
            };

            // Mock risk metrics
            const mockRiskMetrics: RiskMetrics = {
              portfolio_risk_score: portfolioRiskScore,
              high_risk_contracts: highRiskContracts,
              trending_deteriorating: trendingDeteriorating,
              upcoming_covenant_checks: upcomingChecks,
              overdue_reports: overdueReports,
            };

            // Mock covenant health data
            const mockCovenantHealth: CovenantHealth[] = [
              { id: '1', covenant_id: '1', contract_id: '1', bank_id: bankId, status: 'compliant', trend: 'stable', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: '2', covenant_id: '2', contract_id: '1', bank_id: bankId, status: 'warning', trend: 'deteriorating', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: '3', covenant_id: '3', contract_id: '2', bank_id: bankId, status: 'breached', trend: 'deteriorating', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            ];

            // Mock alerts
            const mockAlerts: Alert[] = [
              {
                id: fc.sample(fc.uuid(), 1)[0],
                covenant_id: '1',
                contract_id: '1',
                bank_id: bankId,
                alert_type: 'warning',
                severity: 'medium',
                title: 'Test Alert',
                description: 'Test description',
                status: 'new',
                triggered_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];

            // Mock contracts
            const mockContracts: Contract[] = [
              {
                id: fc.sample(fc.uuid(), 1)[0],
                bank_id: bankId,
                borrower_id: fc.sample(fc.uuid(), 1)[0],
                contract_name: 'Test Contract',
                principal_amount: 1000000,
                currency: 'USD',
                origination_date: '2024-01-01',
                maturity_date: '2027-01-01',
                status: 'watch',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];

            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('portfolio-summary')) {
                return Promise.resolve({ success: true, data: mockPortfolioSummary });
              }
              if (url.includes('risk-metrics')) {
                return Promise.resolve({ success: true, data: mockRiskMetrics });
              }
              if (url.includes('covenants/health')) {
                return Promise.resolve({ success: true, data: mockCovenantHealth });
              }
              if (url.includes('dashboard/alerts')) {
                return Promise.resolve({ success: true, data: mockAlerts });
              }
              if (url.includes('contracts')) {
                return Promise.resolve({ success: true, data: mockContracts });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            const dashboardData = await dashboardService.getDashboardData();

            // Property 1: Portfolio summary must be present with required fields
            expect(dashboardData.portfolio_summary).toBeDefined();
            expect(dashboardData.portfolio_summary.total_contracts).toBe(totalContracts);
            expect(dashboardData.portfolio_summary.total_principal_usd).toBe(totalPrincipal);
            expect(dashboardData.portfolio_summary.bank_id).toBe(bankId);

            // Property 2: Risk metrics must be present
            expect(dashboardData.risk_metrics).toBeDefined();
            expect(dashboardData.risk_metrics.portfolio_risk_score).toBe(portfolioRiskScore);
            expect(dashboardData.risk_metrics.high_risk_contracts).toBe(highRiskContracts);

            // Property 3: Covenant health breakdown must be present
            expect(dashboardData.covenant_health_breakdown).toBeDefined();
            expect(dashboardData.covenant_health_breakdown.total_covenants).toBeGreaterThanOrEqual(0);
            expect(dashboardData.covenant_health_breakdown.compliance_rate).toBeGreaterThanOrEqual(0);
            expect(dashboardData.covenant_health_breakdown.compliance_rate).toBeLessThanOrEqual(100);

            // Property 4: Recent alerts must be an array
            expect(Array.isArray(dashboardData.recent_alerts)).toBe(true);

            // Property 5: Top risk contracts must be an array
            expect(Array.isArray(dashboardData.top_risk_contracts)).toBe(true);

            // Property 6: Validate completeness
            const validation = dashboardService.validateDashboardCompleteness(dashboardData);
            expect(validation.isComplete).toBe(true);
            expect(validation.missingFields.length).toBe(0);
          }
        ),
        { numRuns: 15 }
      );
    });


    test('should calculate covenant health breakdown correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            compliantCount: fc.integer({ min: 0, max: 50 }),
            warningCount: fc.integer({ min: 0, max: 30 }),
            breachedCount: fc.integer({ min: 0, max: 20 }),
          }),
          async ({ bankId, compliantCount, warningCount, breachedCount }) => {
            // Generate covenant health data based on counts
            const mockCovenantHealth: CovenantHealth[] = [
              ...Array.from({ length: compliantCount }, (_, i) => ({
                id: `compliant-${i}`,
                covenant_id: `cov-${i}`,
                contract_id: `con-${i}`,
                bank_id: bankId,
                status: 'compliant' as const,
                trend: 'stable' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: warningCount }, (_, i) => ({
                id: `warning-${i}`,
                covenant_id: `cov-w-${i}`,
                contract_id: `con-w-${i}`,
                bank_id: bankId,
                status: 'warning' as const,
                trend: 'deteriorating' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              ...Array.from({ length: breachedCount }, (_, i) => ({
                id: `breached-${i}`,
                covenant_id: `cov-b-${i}`,
                contract_id: `con-b-${i}`,
                bank_id: bankId,
                status: 'breached' as const,
                trend: 'deteriorating' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
            ];

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockCovenantHealth,
            });

            const breakdown = await dashboardService.getCovenantHealthBreakdown();
            const totalCovenants = compliantCount + warningCount + breachedCount;

            // Property 1: Total covenants must match sum of all statuses
            expect(breakdown.total_covenants).toBe(totalCovenants);

            // Property 2: Individual counts must match
            expect(breakdown.compliant).toBe(compliantCount);
            expect(breakdown.warning).toBe(warningCount);
            expect(breakdown.breached).toBe(breachedCount);

            // Property 3: Compliance rate must be calculated correctly
            const expectedComplianceRate = totalCovenants > 0
              ? (compliantCount / totalCovenants) * 100
              : 100;
            expect(breakdown.compliance_rate).toBeCloseTo(expectedComplianceRate, 2);

            // Property 4: Compliance rate must be between 0 and 100
            expect(breakdown.compliance_rate).toBeGreaterThanOrEqual(0);
            expect(breakdown.compliance_rate).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should return empty dashboard data when no data exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (_bankId) => {
            // Mock empty responses
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('portfolio-summary')) {
                return Promise.resolve({ success: true, data: null });
              }
              if (url.includes('risk-metrics')) {
                return Promise.resolve({ success: true, data: null });
              }
              if (url.includes('covenants/health')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('dashboard/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('contracts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            const dashboardData = await dashboardService.getDashboardData();

            // Property 1: Portfolio summary should have default values
            expect(dashboardData.portfolio_summary).toBeDefined();
            expect(dashboardData.portfolio_summary.total_contracts).toBe(0);
            expect(dashboardData.portfolio_summary.total_principal_usd).toBe(0);

            // Property 2: Risk metrics should have default values
            expect(dashboardData.risk_metrics).toBeDefined();
            expect(dashboardData.risk_metrics.portfolio_risk_score).toBe(0);

            // Property 3: Covenant health breakdown should show 100% compliance (no covenants)
            expect(dashboardData.covenant_health_breakdown.total_covenants).toBe(0);
            expect(dashboardData.covenant_health_breakdown.compliance_rate).toBe(100);

            // Property 4: Arrays should be empty but defined
            expect(Array.isArray(dashboardData.recent_alerts)).toBe(true);
            expect(dashboardData.recent_alerts.length).toBe(0);
            expect(Array.isArray(dashboardData.top_risk_contracts)).toBe(true);
            expect(dashboardData.top_risk_contracts.length).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should highlight highest-risk contracts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            contractCount: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ bankId, contractCount }) => {
            // Generate contracts with varying risk levels
            const mockContracts: Contract[] = Array.from({ length: contractCount }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              bank_id: bankId,
              borrower_id: fc.sample(fc.uuid(), 1)[0],
              contract_name: `Contract ${i + 1}`,
              principal_amount: 1000000 * (i + 1),
              currency: 'USD',
              origination_date: '2024-01-01',
              maturity_date: '2027-01-01',
              status: i % 3 === 0 ? 'watch' : i % 3 === 1 ? 'default' : 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            // Mock returns limited results (simulating API limit)
            const limitedContracts = mockContracts.slice(0, 5);
            mockApiService.get.mockResolvedValue({
              success: true,
              data: limitedContracts,
            });

            const topRiskContracts = await dashboardService.getTopRiskContracts(5);

            // Property 1: Should return contracts
            expect(Array.isArray(topRiskContracts)).toBe(true);

            // Property 2: Should not exceed limit
            expect(topRiskContracts.length).toBeLessThanOrEqual(5);

            // Property 3: Each contract should have required fields
            topRiskContracts.forEach(contract => {
              expect(contract.id).toBeDefined();
              expect(contract.bank_id).toBe(bankId);
              expect(contract.contract_name).toBeDefined();
              expect(contract.principal_amount).toBeGreaterThan(0);
              expect(contract.status).toBeDefined();
            });
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should refresh dashboard data with real-time updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            initialContracts: fc.integer({ min: 5, max: 20 }),
            updatedContracts: fc.integer({ min: 5, max: 25 }),
          }),
          async ({ bankId, initialContracts, updatedContracts }) => {
            let callCount = 0;

            mockApiService.get.mockImplementation((url: string) => {
              callCount++;
              
              // Return different data on refresh
              const contractCount = callCount <= 5 ? initialContracts : updatedContracts;
              
              if (url.includes('portfolio-summary')) {
                return Promise.resolve({
                  success: true,
                  data: {
                    bank_id: bankId,
                    bank_name: 'Test Bank',
                    total_contracts: contractCount,
                    total_principal_usd: contractCount * 1000000,
                    contracts_breached: 0,
                    contracts_at_warning: 0,
                    open_alerts_count: 0,
                  },
                });
              }
              if (url.includes('risk-metrics')) {
                return Promise.resolve({
                  success: true,
                  data: {
                    portfolio_risk_score: 5,
                    high_risk_contracts: 0,
                    trending_deteriorating: 0,
                    upcoming_covenant_checks: 0,
                    overdue_reports: 0,
                  },
                });
              }
              if (url.includes('covenants/health')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('dashboard/alerts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              if (url.includes('contracts')) {
                return Promise.resolve({ success: true, data: [] });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            // Get initial data
            const initialData = await dashboardService.getDashboardData();
            expect(initialData.portfolio_summary.total_contracts).toBe(initialContracts);

            // Refresh data
            const refreshedData = await dashboardService.refreshDashboard();

            // Property 1: Refreshed data should be returned
            expect(refreshedData).toBeDefined();
            expect(refreshedData.portfolio_summary).toBeDefined();

            // Property 2: Data should reflect updates
            expect(refreshedData.portfolio_summary.total_contracts).toBe(updatedContracts);

            // Property 3: All required fields should still be present
            const validation = dashboardService.validateDashboardCompleteness(refreshedData);
            expect(validation.isComplete).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should calculate portfolio risk score correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            compliantCount: fc.integer({ min: 0, max: 50 }),
            warningCount: fc.integer({ min: 0, max: 30 }),
            breachedCount: fc.integer({ min: 0, max: 20 }),
          }),
          async ({ bankId, compliantCount, warningCount, breachedCount }) => {
            const totalCovenants = compliantCount + warningCount + breachedCount;

            // Mock contracts
            mockApiService.get.mockImplementation((url: string) => {
              if (url.includes('contracts')) {
                return Promise.resolve({
                  success: true,
                  data: [{ id: '1', bank_id: bankId, status: 'active' }],
                });
              }
              if (url.includes('covenants/health')) {
                const healthData: CovenantHealth[] = [
                  ...Array.from({ length: compliantCount }, (_, i) => ({
                    id: `c-${i}`,
                    covenant_id: `cov-${i}`,
                    contract_id: '1',
                    bank_id: bankId,
                    status: 'compliant' as const,
                    trend: 'stable' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })),
                  ...Array.from({ length: warningCount }, (_, i) => ({
                    id: `w-${i}`,
                    covenant_id: `cov-w-${i}`,
                    contract_id: '1',
                    bank_id: bankId,
                    status: 'warning' as const,
                    trend: 'deteriorating' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })),
                  ...Array.from({ length: breachedCount }, (_, i) => ({
                    id: `b-${i}`,
                    covenant_id: `cov-b-${i}`,
                    contract_id: '1',
                    bank_id: bankId,
                    status: 'breached' as const,
                    trend: 'deteriorating' as const,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })),
                ];
                return Promise.resolve({ success: true, data: healthData });
              }
              return Promise.resolve({ success: true, data: [] });
            });

            const riskScore = await dashboardService.calculatePortfolioRiskScore();

            // Property 1: Risk score must be between 0 and 10
            expect(riskScore).toBeGreaterThanOrEqual(0);
            expect(riskScore).toBeLessThanOrEqual(10);

            // Property 2: Higher breach/warning rates should result in higher risk
            if (totalCovenants > 0) {
              const breachRate = breachedCount / totalCovenants;
              
              // If all compliant, risk should be 0
              if (breachedCount === 0 && warningCount === 0) {
                expect(riskScore).toBe(0);
              }
              
              // If high breach rate, risk should be high
              if (breachRate > 0.5) {
                expect(riskScore).toBeGreaterThan(5);
              }
            }

            // Property 3: Empty portfolio should have 0 risk
            if (totalCovenants === 0) {
              expect(riskScore).toBe(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should validate dashboard data completeness correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasPortfolioSummary: fc.boolean(),
            hasRiskMetrics: fc.boolean(),
            hasCovenantBreakdown: fc.boolean(),
            hasAlerts: fc.boolean(),
            hasTopContracts: fc.boolean(),
          }),
          async ({ hasPortfolioSummary, hasRiskMetrics, hasCovenantBreakdown, hasAlerts, hasTopContracts }) => {
            const dashboardData: Partial<DashboardData> = {};

            if (hasPortfolioSummary) {
              dashboardData.portfolio_summary = {
                bank_id: 'test',
                bank_name: 'Test Bank',
                total_contracts: 10,
                total_principal_usd: 1000000,
                contracts_breached: 0,
                contracts_at_warning: 0,
                open_alerts_count: 0,
              };
            }

            if (hasRiskMetrics) {
              dashboardData.risk_metrics = {
                portfolio_risk_score: 5,
                high_risk_contracts: 0,
                trending_deteriorating: 0,
                upcoming_covenant_checks: 0,
                overdue_reports: 0,
              };
            }

            if (hasCovenantBreakdown) {
              dashboardData.covenant_health_breakdown = {
                total_covenants: 10,
                compliant: 8,
                warning: 1,
                breached: 1,
                compliance_rate: 80,
              };
            }

            if (hasAlerts) {
              dashboardData.recent_alerts = [];
            }

            if (hasTopContracts) {
              dashboardData.top_risk_contracts = [];
            }

            const validation = dashboardService.validateDashboardCompleteness(
              dashboardData as DashboardData
            );

            // Property 1: Should be complete only if all fields are present
            const expectedComplete = hasPortfolioSummary && hasRiskMetrics && 
              hasCovenantBreakdown && hasAlerts && hasTopContracts;
            expect(validation.isComplete).toBe(expectedComplete);

            // Property 2: Missing fields should be identified
            if (!hasPortfolioSummary) {
              expect(validation.missingFields).toContain('portfolio_summary');
            }
            if (!hasRiskMetrics) {
              expect(validation.missingFields).toContain('risk_metrics');
            }
            if (!hasCovenantBreakdown) {
              expect(validation.missingFields).toContain('covenant_health_breakdown');
            }
            if (!hasAlerts) {
              expect(validation.missingFields).toContain('recent_alerts');
            }
            if (!hasTopContracts) {
              expect(validation.missingFields).toContain('top_risk_contracts');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
