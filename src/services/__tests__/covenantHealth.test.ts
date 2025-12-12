/**
 * Unit Tests for Covenant Health Service
 * Tests covenant health calculations, trend analysis, and financial data processing
 */

import { covenantHealthService } from '../covenantHealth';
import { apiService } from '../api';
import { geminiService } from '../gemini';
import type { Covenant, FinancialMetrics, FinancialMetricsInput } from '@/types';

// Mock dependencies
jest.mock('../api');
jest.mock('../gemini');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

describe('CovenantHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCovenantHealth', () => {
    const mockCovenant: Covenant = {
      id: 'covenant-1',
      contract_id: 'contract-1',
      bank_id: 'bank-1',
      covenant_name: 'Debt to EBITDA Ratio',
      covenant_type: 'financial',
      metric_name: 'debt_to_ebitda',
      operator: '<=',
      threshold_value: 3.0,
      threshold_unit: 'ratio',
      check_frequency: 'quarterly',
      reporting_deadline_days: 45,
      gemini_extracted: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      contract: {
        id: 'contract-1',
        bank_id: 'bank-1',
        borrower_id: 'borrower-1',
        contract_name: 'Test Contract',
        principal_amount: 1000000,
        currency: 'USD',
        origination_date: '2024-01-01',
        maturity_date: '2027-01-01',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        borrower: {
          id: 'borrower-1',
          bank_id: 'bank-1',
          legal_name: 'Test Company',
          industry: 'Technology',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    };

    const mockFinancialData: FinancialMetrics = {
      id: 'metrics-1',
      borrower_id: 'borrower-1',
      bank_id: 'bank-1',
      period_date: '2024-03-31',
      period_type: 'quarterly',
      source: 'manual',
      debt_total: 5000000,
      ebitda: 2000000,
      debt_to_ebitda: 2.5,
      data_confidence: 0.9,
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-04-01T00:00:00Z',
    };

    it('should calculate covenant health for compliant covenant', async () => {
      // Mock API responses
      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockCovenant,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockFinancialData],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [mockFinancialData],
        });

      mockGeminiService.analyzeCovenantRisk.mockResolvedValueOnce({
        risk_score: 3,
        risk_factors: ['Moderate debt levels'],
        recommended_actions: ['Continue monitoring'],
        assessment_summary: 'Covenant is compliant with good buffer',
        confidence_level: 0.8,
      });

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'health-1',
          covenant_id: 'covenant-1',
          contract_id: 'contract-1',
          bank_id: 'bank-1',
          last_reported_value: 2.5,
          threshold_value: 3.0,
          status: 'compliant',
          buffer_percentage: 16.67,
          trend: 'stable',
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
      });

      const result = await covenantHealthService.calculateCovenantHealth('covenant-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('compliant');
      expect(result.last_reported_value).toBe(2.5);
      expect(result.threshold_value).toBe(3.0);
      expect(mockGeminiService.analyzeCovenantRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          covenant_name: 'Debt to EBITDA Ratio',
          current_value: 2.5,
          threshold_value: 3.0,
        }),
        expect.objectContaining({
          borrower_name: 'Test Company',
          industry: 'Technology',
        })
      );
    });

    it('should calculate covenant health for breached covenant', async () => {
      const breachedFinancialData = {
        ...mockFinancialData,
        debt_to_ebitda: 3.5, // Above threshold of 3.0
      };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockCovenant,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [breachedFinancialData],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [breachedFinancialData],
        });

      mockGeminiService.analyzeCovenantRisk.mockResolvedValueOnce({
        risk_score: 8,
        risk_factors: ['Covenant breach', 'High debt levels'],
        recommended_actions: ['Immediate review', 'Request action plan'],
        assessment_summary: 'Covenant is breached and requires attention',
        confidence_level: 0.9,
      });

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'health-1',
          covenant_id: 'covenant-1',
          status: 'breached',
          last_reported_value: 3.5,
        },
      });

      const result = await covenantHealthService.calculateCovenantHealth('covenant-1');

      expect(result.status).toBe('breached');
      expect(result.last_reported_value).toBe(3.5);
    });

    it('should handle missing financial data gracefully', async () => {
      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockCovenant,
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
        });

      mockGeminiService.analyzeCovenantRisk.mockResolvedValueOnce({
        risk_score: 5,
        risk_factors: ['No financial data available'],
        recommended_actions: ['Obtain financial data'],
        assessment_summary: 'Unable to assess due to missing data',
        confidence_level: 0.1,
      });

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'health-1',
          covenant_id: 'covenant-1',
          status: 'compliant',
          last_reported_value: 0,
        },
      });

      const result = await covenantHealthService.calculateCovenantHealth('covenant-1');

      expect(result.status).toBe('compliant');
      expect(result.last_reported_value).toBe(0);
    });
  });

  describe('ingestFinancialData', () => {
    const mockFinancialInput: FinancialMetricsInput = {
      borrower_id: 'borrower-1',
      period_date: '2024-03-31',
      period_type: 'quarterly',
      source: 'manual',
      debt_total: 5000000,
      ebitda: 2000000,
      revenue: 10000000,
      net_income: 1000000,
      equity_total: 8000000,
      current_assets: 3000000,
      current_liabilities: 1500000,
    };

    it('should ingest financial data and calculate ratios', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'metrics-1',
          ...mockFinancialInput,
          debt_to_ebitda: 2.5,
          current_ratio: 2.0,
          roe: 12.5,
          data_confidence: 0.9,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
      });

      // Mock covenant retrieval for recalculation
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await covenantHealthService.ingestFinancialData(
        'borrower-1',
        mockFinancialInput
      );

      expect(result).toBeDefined();
      expect(result.debt_to_ebitda).toBe(2.5);
      expect(result.current_ratio).toBe(2.0);
      expect(result.roe).toBe(12.5);
      expect(result.data_confidence).toBe(0.9);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/financial-metrics/ingest',
        expect.objectContaining({
          ...mockFinancialInput,
          debt_to_ebitda: 2.5,
          current_ratio: 2.0,
          roe: 12.5,
          data_confidence: expect.any(Number),
        })
      );
    });

    it('should validate financial data input', async () => {
      const invalidInput = {
        ...mockFinancialInput,
        borrower_id: '', // Missing required field
        debt_total: -1000, // Negative value
      };

      await expect(
        covenantHealthService.ingestFinancialData('borrower-1', invalidInput)
      ).rejects.toThrow('Validation failed');
    });

    it('should calculate financial ratios correctly', async () => {
      const testData = {
        ...mockFinancialInput,
        debt_total: 6000000,
        ebitda: 2000000,
        equity_total: 10000000,
        current_assets: 4000000,
        current_liabilities: 2000000,
        net_income: 1500000,
        interest_expense: 500000,
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'metrics-1',
          ...testData,
          debt_to_ebitda: 3.0, // 6M / 2M
          debt_to_equity: 0.6, // 6M / 10M
          current_ratio: 2.0, // 4M / 2M
          interest_coverage: 4.0, // 2M / 0.5M
          roe: 15.0, // (1.5M / 10M) * 100
          roa: 37.5, // (1.5M / 4M) * 100
          data_confidence: expect.any(Number),
        },
      });

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await covenantHealthService.ingestFinancialData('borrower-1', testData);

      expect(result.debt_to_ebitda).toBe(3.0);
      expect(result.debt_to_equity).toBe(0.6);
      expect(result.current_ratio).toBe(2.0);
      expect(result.interest_coverage).toBe(4.0);
      expect(result.roe).toBe(15.0);
      expect(result.roa).toBe(37.5);
    });
  });

  describe('analyzeTrends', () => {
    const mockCovenant: Covenant = {
      id: 'covenant-1',
      contract_id: 'contract-1',
      bank_id: 'bank-1',
      covenant_name: 'Debt to EBITDA Ratio',
      covenant_type: 'financial',
      metric_name: 'debt_to_ebitda',
      operator: '<=',
      threshold_value: 3.0,
      check_frequency: 'quarterly',
      reporting_deadline_days: 45,
      gemini_extracted: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      contract: {
        id: 'contract-1',
        bank_id: 'bank-1',
        borrower_id: 'borrower-1',
        contract_name: 'Test Contract',
        principal_amount: 1000000,
        currency: 'USD',
        origination_date: '2024-01-01',
        maturity_date: '2027-01-01',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        borrower: {
          id: 'borrower-1',
          bank_id: 'bank-1',
          legal_name: 'Test Company',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    };

    it.skip('should analyze improving trend', async () => {
      const historicalData: FinancialMetrics[] = [
        {
          id: '1',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-01-31',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 3.5,
          data_confidence: 0.8,
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: '2',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-02-29',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 3.0,
          data_confidence: 0.8,
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
        {
          id: '3',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-03-31',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 2.5,
          data_confidence: 0.9,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
      ];

      // Mock getCovenantById
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockCovenant,
      });
      
      // Mock getHistoricalFinancialData
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: historicalData,
      });

      const result = await covenantHealthService.analyzeTrends('covenant-1', 3);

      expect(result.trend).toBe('improving');
      expect(result.trend_data).toHaveLength(3);
      expect(result.trend_data[0].value).toBe(3.5);
      expect(result.trend_data[1].value).toBe(3.0);
      expect(result.trend_data[2].value).toBe(2.5);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it.skip('should analyze deteriorating trend', async () => {
      const historicalData: FinancialMetrics[] = [
        {
          id: '1',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-01-31',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 2.0,
          data_confidence: 0.8,
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: '2',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-02-29',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 2.5,
          data_confidence: 0.8,
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
        {
          id: '3',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-03-31',
          period_type: 'quarterly',
          source: 'manual',
          debt_to_ebitda: 3.2,
          data_confidence: 0.9,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
      ];

      // Mock getCovenantById
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockCovenant,
      });
      
      // Mock getHistoricalFinancialData
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: historicalData,
      });

      const result = await covenantHealthService.analyzeTrends('covenant-1', 3);

      expect(result.trend).toBe('deteriorating');
      expect(result.trend_data).toHaveLength(3);
    });

    it.skip('should handle insufficient data for trend analysis', async () => {
      // Mock getCovenantById
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockCovenant,
      });
      
      // Mock getHistoricalFinancialData with empty array
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: [] as FinancialMetrics[],
      });

      const result = await covenantHealthService.analyzeTrends('covenant-1', 4);

      expect(result.trend).toBe('stable');
      expect(result.trend_data).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('updateHealthMetrics', () => {
    it.skip('should update health metrics for all borrower covenants', async () => {
      const mockCovenants = [
        {
          id: 'covenant-1',
          contract_id: 'contract-1',
          bank_id: 'bank-1',
          covenant_name: 'Debt to EBITDA',
          covenant_type: 'financial' as const,
          metric_name: 'debt_to_ebitda',
          operator: '<=' as const,
          threshold_value: 3.0,
          check_frequency: 'quarterly' as const,
          reporting_deadline_days: 45,
          gemini_extracted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'covenant-2',
          contract_id: 'contract-1',
          bank_id: 'bank-1',
          covenant_name: 'Current Ratio',
          covenant_type: 'financial' as const,
          metric_name: 'current_ratio',
          operator: '>=' as const,
          threshold_value: 1.25,
          check_frequency: 'quarterly' as const,
          reporting_deadline_days: 45,
          gemini_extracted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockFinancialData: FinancialMetrics = {
        id: 'metrics-1',
        borrower_id: 'borrower-1',
        bank_id: 'bank-1',
        period_date: '2024-03-31',
        period_type: 'quarterly',
        source: 'manual',
        debt_to_ebitda: 2.5,
        current_ratio: 1.5,
        data_confidence: 0.9,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      };

      // Mock getting covenants for borrower
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockCovenants,
      });

      // Mock individual covenant health calculations
      for (const covenant of mockCovenants) {
        // Mock covenant retrieval
        mockApiService.get.mockResolvedValueOnce({
          success: true,
          data: {
            ...covenant,
            contract: {
              id: 'contract-1',
              borrower_id: 'borrower-1',
              borrower: { legal_name: 'Test Company' },
            },
          },
        });

        // Mock financial data retrieval
        mockApiService.get.mockResolvedValueOnce({
          success: true,
          data: [mockFinancialData],
        });

        // Mock historical data for trend analysis
        mockApiService.get.mockResolvedValueOnce({
          success: true,
          data: [mockFinancialData],
        });

        // Mock AI risk assessment
        mockGeminiService.analyzeCovenantRisk.mockResolvedValueOnce({
          risk_score: 3,
          risk_factors: [],
          recommended_actions: [],
          assessment_summary: 'Compliant',
          confidence_level: 0.8,
        });

        // Mock saving covenant health
        mockApiService.post.mockResolvedValueOnce({
          success: true,
          data: {
            id: `health-${covenant.id}`,
            covenant_id: covenant.id,
            status: 'compliant',
          },
        });
      }

      const result = await covenantHealthService.updateHealthMetrics(
        'borrower-1',
        mockFinancialData
      );

      expect(result).toHaveLength(2);
      expect(result[0].covenant_id).toBe('covenant-1');
      expect(result[1].covenant_id).toBe('covenant-2');
    });
  });
});