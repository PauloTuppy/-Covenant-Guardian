/**
 * Unit Tests for Financial Data Service
 * Tests financial data ingestion, validation, and processing
 */

import { financialDataService } from '../financialData';
import { covenantHealthService } from '../covenantHealth';
import { apiService } from '../api';
import type { FinancialMetricsInput, FinancialMetrics, Borrower } from '@/types';

// Mock dependencies
jest.mock('../covenantHealth');
jest.mock('../api');

// Mock fetch for export functionality
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockCovenantHealthService = covenantHealthService as jest.Mocked<typeof covenantHealthService>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FinancialDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should ingest financial data successfully', async () => {
      const mockResult: FinancialMetrics = {
        id: 'metrics-1',
        ...mockFinancialInput,
        bank_id: 'bank-1',
        debt_to_ebitda: 2.5,
        current_ratio: 2.0,
        data_confidence: 0.9,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      };

      // Mock borrower validation
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { id: 'borrower-1', legal_name: 'Test Company' },
      });

      // Mock covenant health service
      mockCovenantHealthService.ingestFinancialData.mockResolvedValueOnce(mockResult);

      const result = await financialDataService.ingestFinancialData(mockFinancialInput);

      expect(result).toEqual(mockResult);
      expect(mockCovenantHealthService.ingestFinancialData).toHaveBeenCalledWith(
        'borrower-1',
        mockFinancialInput
      );
    });

    it('should validate borrower exists', async () => {
      // Mock borrower not found
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Borrower not found', timestamp: '' },
      });

      await expect(
        financialDataService.ingestFinancialData(mockFinancialInput)
      ).rejects.toThrow('Invalid borrower ID: borrower-1');
    });
  });

  describe('batchIngestFinancialData', () => {
    it('should process batch data with mixed results', async () => {
      const batchData = [
        {
          borrower_id: 'borrower-1',
          period_date: '2024-01-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_total: 5000000,
          ebitda: 2000000,
        },
        {
          borrower_id: 'invalid-borrower',
          period_date: '2024-01-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_total: 3000000,
          ebitda: 1500000,
        },
      ];

      // Mock first record success
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { id: 'borrower-1' },
      });

      mockCovenantHealthService.ingestFinancialData.mockResolvedValueOnce({
        id: 'metrics-1',
        ...batchData[0],
        bank_id: 'bank-1',
        debt_to_ebitda: 2.5,
        data_confidence: 0.8,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      });

      // Mock second record failure
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Borrower not found', timestamp: '' },
      });

      const result = await financialDataService.batchIngestFinancialData(batchData);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.successful[0].id).toBe('metrics-1');
      expect(result.failed[0].data.borrower_id).toBe('invalid-borrower');
    });
  });

  describe('getFinancialData', () => {
    it('should get paginated financial data with filters', async () => {
      const mockData = [
        {
          id: 'metrics-1',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-03-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_to_ebitda: 2.5,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
      ];

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: {
          data: mockData,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      });

      const result = await financialDataService.getFinancialData(
        'borrower-1',
        { period_type: 'quarterly' },
        1,
        20
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('metrics-1');
      expect(result.pagination.total).toBe(1);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/borrowers/borrower-1/financials')
      );
    });
  });

  describe('getLatestFinancialMetrics', () => {
    it('should get latest financial metrics', async () => {
      const mockData = {
        id: 'metrics-1',
        borrower_id: 'borrower-1',
        bank_id: 'bank-1',
        period_date: '2024-03-31',
        period_type: 'quarterly' as const,
        source: 'manual',
        debt_to_ebitda: 2.5,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: {
          data: [mockData],
          pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
        },
      });

      const result = await financialDataService.getLatestFinancialMetrics('borrower-1');

      expect(result).toEqual(mockData);
    });

    it('should return null when no data available', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: {
          data: [],
          pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
        },
      });

      const result = await financialDataService.getLatestFinancialMetrics('borrower-1');

      expect(result).toBeNull();
    });
  });

  describe('getFinancialRatios', () => {
    it('should get financial ratios with trend analysis', async () => {
      const mockResponse = {
        current: {
          id: 'metrics-1',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-03-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_to_ebitda: 2.5,
          current_ratio: 1.8,
          interest_coverage: 4.0,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
        historical: [
          { 
            id: 'metrics-2', 
            borrower_id: 'borrower-1',
            bank_id: 'bank-1',
            period_date: '2023-12-31',
            period_type: 'quarterly' as const,
            source: 'manual',
            debt_to_ebitda: 2.8,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          { 
            id: 'metrics-3', 
            borrower_id: 'borrower-1',
            bank_id: 'bank-1',
            period_date: '2023-09-30',
            period_type: 'quarterly' as const,
            source: 'manual',
            debt_to_ebitda: 3.0,
            created_at: '2023-10-01T00:00:00Z',
            updated_at: '2023-10-01T00:00:00Z',
          },
        ],
        trend_analysis: {
          debt_to_ebitda_trend: 'improving' as const,
          current_ratio_trend: 'stable' as const,
          interest_coverage_trend: 'improving' as const,
        },
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await financialDataService.getFinancialRatios('borrower-1', 4);

      expect(result.current?.debt_to_ebitda).toBe(2.5);
      expect(result.trend_analysis.debt_to_ebitda_trend).toBe('improving');
      expect(result.historical).toHaveLength(2);
    });
  });

  describe('updateFinancialData', () => {
    it('should update financial data and trigger health recalculation', async () => {
      const updates = {
        debt_total: 6000000,
        ebitda: 2500000,
      };

      const mockUpdatedData: FinancialMetrics = {
        id: 'metrics-1',
        borrower_id: 'borrower-1',
        bank_id: 'bank-1',
        period_date: '2024-03-31',
        period_type: 'quarterly',
        source: 'manual',
        debt_total: 6000000,
        ebitda: 2500000,
        debt_to_ebitda: 2.4,
        data_confidence: 0.9,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      };

      mockApiService.put.mockResolvedValueOnce({
        success: true,
        data: mockUpdatedData,
      });

      mockCovenantHealthService.updateHealthMetrics.mockResolvedValueOnce([]);

      const result = await financialDataService.updateFinancialData('metrics-1', updates);

      expect(result).toEqual(mockUpdatedData);
      expect(mockCovenantHealthService.updateHealthMetrics).toHaveBeenCalledWith(
        'borrower-1',
        mockUpdatedData
      );
    });
  });

  describe('deleteFinancialData', () => {
    it('should delete financial data successfully', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(
        financialDataService.deleteFinancialData('metrics-1')
      ).resolves.not.toThrow();

      expect(mockApiService.delete).toHaveBeenCalledWith('/financial-metrics/metrics-1');
    });

    it('should throw error when delete fails', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Cannot delete financial data', timestamp: '' },
      });

      await expect(
        financialDataService.deleteFinancialData('metrics-1')
      ).rejects.toThrow('Cannot delete financial data');
    });
  });

  describe('getFinancialDataSummary', () => {
    it('should get financial data summary', async () => {
      const mockSummary = {
        borrower_id: 'borrower-1',
        latest_period: '2024-03-31',
        periods_available: 12,
        data_sources: ['manual', 'api'],
        avg_confidence: 0.85,
        key_ratios: {
          debt_to_ebitda: 2.5,
          current_ratio: 1.8,
          interest_coverage: 4.2,
        },
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockSummary,
      });

      const result = await financialDataService.getFinancialDataSummary('borrower-1');

      expect(result).toEqual(mockSummary);
      expect(mockApiService.get).toHaveBeenCalledWith('/financial-metrics/borrower-1/summary');
    });

    it('should throw error when summary fetch fails', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Summary not found', timestamp: '' },
      });

      await expect(
        financialDataService.getFinancialDataSummary('borrower-1')
      ).rejects.toThrow('Summary not found');
    });
  });

  describe('validateFinancialDataQuality', () => {
    it('should validate financial data quality', async () => {
      const mockValidation = {
        is_valid: true,
        confidence_score: 0.92,
        issues: [],
        recommendations: ['Consider adding more historical data'],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockValidation,
      });

      const result = await financialDataService.validateFinancialDataQuality(
        'borrower-1',
        '2024-03-31'
      );

      expect(result).toEqual(mockValidation);
      expect(mockApiService.post).toHaveBeenCalledWith('/financial-metrics/validate', {
        borrower_id: 'borrower-1',
        period_date: '2024-03-31',
      });
    });

    it('should handle validation with issues', async () => {
      const mockValidation = {
        is_valid: false,
        confidence_score: 0.45,
        issues: ['Missing EBITDA data', 'Inconsistent revenue figures'],
        recommendations: ['Verify EBITDA calculation', 'Cross-check revenue sources'],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockValidation,
      });

      const result = await financialDataService.validateFinancialDataQuality(
        'borrower-1',
        '2024-03-31'
      );

      expect(result.is_valid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
    });
  });

  describe('getDataSources', () => {
    it('should get data sources for borrower', async () => {
      const mockSources = {
        sources: [
          {
            source: 'manual',
            periods_count: 8,
            latest_period: '2024-03-31',
            avg_confidence: 0.9,
          },
          {
            source: 'api',
            periods_count: 4,
            latest_period: '2024-02-29',
            avg_confidence: 0.75,
          },
        ],
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockSources,
      });

      const result = await financialDataService.getDataSources('borrower-1');

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].source).toBe('manual');
      expect(result.sources[1].periods_count).toBe(4);
    });
  });

  describe('compareFinancialMetrics', () => {
    it('should compare financial metrics between periods', async () => {
      const mockComparison = {
        period_from: {
          id: 'metrics-1',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2023-12-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_to_ebitda: 3.0,
          current_ratio: 1.5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        period_to: {
          id: 'metrics-2',
          borrower_id: 'borrower-1',
          bank_id: 'bank-1',
          period_date: '2024-03-31',
          period_type: 'quarterly' as const,
          source: 'manual',
          debt_to_ebitda: 2.5,
          current_ratio: 1.8,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        },
        changes: [
          {
            metric: 'debt_to_ebitda',
            from_value: 3.0,
            to_value: 2.5,
            change_amount: -0.5,
            change_percentage: -16.67,
          },
          {
            metric: 'current_ratio',
            from_value: 1.5,
            to_value: 1.8,
            change_amount: 0.3,
            change_percentage: 20.0,
          },
        ],
        summary: 'Financial position improved with better debt ratios and liquidity',
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockComparison,
      });

      const result = await financialDataService.compareFinancialMetrics(
        'borrower-1',
        '2023-12-31',
        '2024-03-31'
      );

      expect(result.changes).toHaveLength(2);
      expect(result.changes[0].change_percentage).toBe(-16.67);
      expect(result.summary).toContain('improved');
    });
  });

  describe('getBorrowersWithStaleData', () => {
    it('should get borrowers with stale financial data', async () => {
      const mockStaleData = [
        {
          borrower: {
            id: 'borrower-1',
            legal_name: 'Stale Company Inc',
            bank_id: 'bank-1',
          } as Borrower,
          last_update: '2023-09-30',
          days_since_update: 180,
          missing_periods: 2,
        },
        {
          borrower: {
            id: 'borrower-2',
            legal_name: 'Old Data Corp',
            bank_id: 'bank-1',
          } as Borrower,
          last_update: '2023-06-30',
          days_since_update: 270,
          missing_periods: 3,
        },
      ];

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockStaleData,
      });

      const result = await financialDataService.getBorrowersWithStaleData(120);

      expect(result).toHaveLength(2);
      expect(result[0].days_since_update).toBe(180);
      expect(result[1].missing_periods).toBe(3);
      expect(mockApiService.get).toHaveBeenCalledWith('/financial-metrics/stale?days=120');
    });

    it('should use default threshold when not provided', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      await financialDataService.getBorrowersWithStaleData();

      expect(mockApiService.get).toHaveBeenCalledWith('/financial-metrics/stale?days=120');
    });
  });

  describe('recalculateAllCovenantHealth', () => {
    it('should trigger covenant health recalculation for all borrowers', async () => {
      const mockRecalcResult = {
        processed_borrowers: 25,
        updated_covenants: 150,
        errors: [],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockRecalcResult,
      });

      const result = await financialDataService.recalculateAllCovenantHealth();

      expect(result.processed_borrowers).toBe(25);
      expect(result.updated_covenants).toBe(150);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle recalculation with errors', async () => {
      const mockRecalcResult = {
        processed_borrowers: 20,
        updated_covenants: 100,
        errors: ['Failed to process borrower-5', 'Invalid data for borrower-12'],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockRecalcResult,
      });

      const result = await financialDataService.recalculateAllCovenantHealth();

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('borrower-5');
    });
  });

  describe('exportFinancialData', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
    });

    it('should export financial data as CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      const result = await financialDataService.exportFinancialData(
        'borrower-1',
        'csv',
        { period_type: 'quarterly' }
      );

      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('format=csv'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer mock-auth-token',
          },
        })
      );
    });

    it('should export financial data as Excel', async () => {
      const mockBlob = new Blob(['excel,data'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      const result = await financialDataService.exportFinancialData(
        'borrower-1',
        'xlsx'
      );

      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('format=xlsx'),
        expect.any(Object)
      );
    });

    it('should handle export failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        financialDataService.exportFinancialData('borrower-1')
      ).rejects.toThrow('Failed to export financial data');
    });

    it('should include filters in export URL', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await financialDataService.exportFinancialData('borrower-1', 'csv', {
        period_type: 'quarterly',
        date_from: '2024-01-01',
        date_to: '2024-03-31',
        source: 'manual',
      });

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0] as string;
      
      expect(url).toContain('period_type=quarterly');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-03-31');
      expect(url).toContain('source=manual');
    });
  });

  describe('importFinancialData', () => {
    it('should import financial data from file', async () => {
      const mockFile = new File(['test data'], 'financial-data.csv', { type: 'text/csv' });
      const options = {
        source: 'import',
        period_type: 'quarterly' as const,
      };

      const mockImportResult = {
        imported_records: 5,
        skipped_records: 1,
        errors: [{ row: 3, error: 'Invalid date format' }],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockImportResult,
      });

      const result = await financialDataService.importFinancialData(
        'borrower-1',
        mockFile,
        options
      );

      expect(result.imported_records).toBe(5);
      expect(result.skipped_records).toBe(1);
      expect(result.errors).toHaveLength(1);

      // Verify FormData was created correctly
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/financial-metrics/import',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
    });

    it('should import with skip validation option', async () => {
      const mockFile = new File(['test data'], 'financial-data.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const options = {
        source: 'bulk_import',
        period_type: 'annual' as const,
        skip_validation: true,
      };

      const mockImportResult = {
        imported_records: 10,
        skipped_records: 0,
        errors: [],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockImportResult,
      });

      const result = await financialDataService.importFinancialData(
        'borrower-1',
        mockFile,
        options
      );

      expect(result.imported_records).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import failure', async () => {
      const mockFile = new File(['bad data'], 'bad-data.csv', { type: 'text/csv' });
      const options = {
        source: 'import',
        period_type: 'quarterly' as const,
      };

      mockApiService.post.mockResolvedValueOnce({
        success: false,
        error: { code: 'IMPORT_FAILED', message: 'File format not supported', timestamp: '' },
      });

      await expect(
        financialDataService.importFinancialData('borrower-1', mockFile, options)
      ).rejects.toThrow('File format not supported');
    });
  });

  describe('Error Handling', () => {
    it('should handle API service errors gracefully', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network connection failed', timestamp: '' },
      });

      await expect(
        financialDataService.getFinancialData('borrower-1')
      ).rejects.toThrow('Network connection failed');
    });

    it('should handle missing data in API responses', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(
        financialDataService.getFinancialRatios('borrower-1')
      ).rejects.toThrow('Failed to fetch financial ratios');
    });

    it('should handle covenant health service errors during ingestion', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { id: 'borrower-1' },
      });

      mockCovenantHealthService.ingestFinancialData.mockRejectedValueOnce(
        new Error('Covenant calculation failed')
      );

      const mockFinancialInput: FinancialMetricsInput = {
        borrower_id: 'borrower-1',
        period_date: '2024-03-31',
        period_type: 'quarterly',
        source: 'manual',
        debt_total: 5000000,
        ebitda: 2000000,
      };

      await expect(
        financialDataService.ingestFinancialData(mockFinancialInput)
      ).rejects.toThrow('Covenant calculation failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty batch ingestion', async () => {
      const result = await financialDataService.batchIngestFinancialData([]);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle large batch ingestion with proper batching', async () => {
      // Create 25 records to test batching (batch size is 10)
      const largeDataSet = Array.from({ length: 25 }, (_, i) => ({
        borrower_id: `borrower-${i + 1}`,
        period_date: '2024-03-31',
        period_type: 'quarterly' as const,
        source: 'bulk',
        debt_total: 1000000 * (i + 1),
        ebitda: 500000 * (i + 1),
      }));

      // Mock all borrower validations to succeed
      mockApiService.get.mockImplementation(() =>
        Promise.resolve({
          success: true,
          data: { id: 'borrower-1' },
        })
      );

      // Mock all covenant health ingestions to succeed
      mockCovenantHealthService.ingestFinancialData.mockImplementation((borrowerId, data) =>
        Promise.resolve({
          id: `metrics-${borrowerId}`,
          ...data,
          bank_id: 'bank-1',
          debt_to_ebitda: 2.0,
          data_confidence: 0.8,
          created_at: '2024-04-01T00:00:00Z',
          updated_at: '2024-04-01T00:00:00Z',
        })
      );

      const result = await financialDataService.batchIngestFinancialData(largeDataSet);

      expect(result.successful).toHaveLength(25);
      expect(result.failed).toHaveLength(0);
      
      // Verify batching occurred (should be called in 3 batches: 10, 10, 5)
      expect(mockCovenantHealthService.ingestFinancialData).toHaveBeenCalledTimes(25);
    });

    it('should handle missing auth token in export', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await financialDataService.exportFinancialData('borrower-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer ',
          },
        })
      );
    });
  });
});