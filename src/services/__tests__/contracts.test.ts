/**
 * Unit Tests for Contract Service
 * Tests specific functionality and error handling scenarios
 */

import { contractService } from '../contracts';
import { apiService } from '../api';
import { ContractCreateInput, Contract } from '@/types';

// Mock the API service
jest.mock('../api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContract', () => {
    const validContractData: ContractCreateInput = {
      borrower_id: 'borrower-123',
      contract_name: 'Test Contract',
      principal_amount: 1000000,
      currency: 'USD',
      origination_date: '2023-01-01',
      maturity_date: '2024-01-01',
      interest_rate: 5.5,
    };

    it('should create contract successfully with valid data', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'contract-123',
          bank_id: 'bank-123',
          status: 'active',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          ...validContractData,
        } as Contract,
      };

      mockApiService.post.mockResolvedValueOnce(mockResponse);

      const result = await contractService.createContract(validContractData);

      expect(result).toEqual(mockResponse.data);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/contracts',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
    });

    it('should include document file in FormData when provided', async () => {
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' });
      const contractWithFile = { ...validContractData, document_file: file };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'contract-123', ...validContractData } as Contract,
      });

      await contractService.createContract(contractWithFile);

      const formData = mockApiService.post.mock.calls[0][1] as FormData;
      expect(formData.get('document_file')).toBe(file);
    });

    it('should throw error when API returns failure', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contract data',
          timestamp: '2023-01-01T00:00:00Z',
        },
      });

      await expect(contractService.createContract(validContractData))
        .rejects.toThrow('Invalid contract data');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validContractData, borrower_id: '' };

      await expect(contractService.createContract(invalidData))
        .rejects.toThrow('Validation failed: Borrower ID is required');
    });

    it('should validate date order', async () => {
      const invalidData = {
        ...validContractData,
        origination_date: '2024-01-01',
        maturity_date: '2023-01-01',
      };

      await expect(contractService.createContract(invalidData))
        .rejects.toThrow('Maturity date must be after origination date');
    });

    it('should validate interest rate range', async () => {
      const invalidData = { ...validContractData, interest_rate: -5 };

      await expect(contractService.createContract(invalidData))
        .rejects.toThrow('Interest rate must be between 0 and 100');
    });

    it('should validate currency format', async () => {
      const invalidData = { ...validContractData, currency: 'INVALID' };

      await expect(contractService.createContract(invalidData))
        .rejects.toThrow('Currency must be a valid 3-letter ISO code');
    });

    it('should validate principal amount limits', async () => {
      const invalidData = { ...validContractData, principal_amount: 0 };

      await expect(contractService.createContract(invalidData))
        .rejects.toThrow('Principal amount must be greater than 0');

      const tooLargeData = { ...validContractData, principal_amount: 2000000000000 };

      await expect(contractService.createContract(tooLargeData))
        .rejects.toThrow('Principal amount exceeds maximum allowed value');
    });
  });

  describe('getContracts', () => {
    it('should fetch contracts with default pagination', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      };

      mockApiService.get.mockResolvedValueOnce(mockResponse);

      const result = await contractService.getContracts();

      expect(result).toEqual(mockResponse.data);
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/contracts?page=1&limit=20'
      );
    });

    it('should apply filters correctly', async () => {
      const filters = {
        status: 'active' as const,
        borrower_id: 'borrower-123',
        search: 'test contract',
        date_from: '2023-01-01',
        date_to: '2023-12-31',
        principal_min: 100000,
        principal_max: 1000000,
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      });

      await contractService.getContracts(filters, 1, 10);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/contracts?page=1&limit=10&status=active&borrower_id=borrower-123&search=test')
      );
    });

    it('should throw error when API fails', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection failed',
          timestamp: '2023-01-01T00:00:00Z',
        },
      });

      await expect(contractService.getContracts())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getContractById', () => {
    it('should fetch contract by ID successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        contract_name: 'Test Contract',
        status: 'active',
      } as Contract;

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockContract,
      });

      const result = await contractService.getContractById('contract-123');

      expect(result).toEqual(mockContract);
      expect(mockApiService.get).toHaveBeenCalledWith('/contracts/contract-123');
    });

    it('should throw error when contract not found', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          timestamp: '2023-01-01T00:00:00Z',
        },
      });

      await expect(contractService.getContractById('nonexistent'))
        .rejects.toThrow('Contract not found');
    });
  });

  describe('updateContract', () => {
    it('should update contract successfully', async () => {
      const updates = { contract_name: 'Updated Contract' };
      const mockUpdatedContract = {
        id: 'contract-123',
        contract_name: 'Updated Contract',
        status: 'active',
      } as Contract;

      mockApiService.put.mockResolvedValueOnce({
        success: true,
        data: mockUpdatedContract,
      });

      const result = await contractService.updateContract('contract-123', updates);

      expect(result).toEqual(mockUpdatedContract);
      expect(mockApiService.put).toHaveBeenCalledWith(
        '/contracts/contract-123',
        updates
      );
    });

    it('should throw error when update fails', async () => {
      mockApiService.put.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          timestamp: '2023-01-01T00:00:00Z',
        },
      });

      await expect(contractService.updateContract('contract-123', {}))
        .rejects.toThrow('Invalid update data');
    });
  });

  describe('deleteContract', () => {
    it('should delete contract successfully', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: true,
      });

      await expect(contractService.deleteContract('contract-123'))
        .resolves.not.toThrow();

      expect(mockApiService.delete).toHaveBeenCalledWith('/contracts/contract-123');
    });

    it('should throw error when delete fails', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          timestamp: '2023-01-01T00:00:00Z',
        },
      });

      await expect(contractService.deleteContract('nonexistent'))
        .rejects.toThrow('Contract not found');
    });
  });

  describe('uploadContractDocument', () => {
    it('should upload document successfully', async () => {
      const file = new File(['content'], 'contract.pdf');
      const mockResponse = {
        upload_success: true,
        extraction_queued: true,
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await contractService.uploadContractDocument('contract-123', file);

      expect(result).toEqual(mockResponse);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/contracts/upload/contract-123',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
    });

    it('should handle extraction flag correctly', async () => {
      const file = new File(['content'], 'contract.pdf');

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { upload_success: true, extraction_queued: false },
      });

      await contractService.uploadContractDocument('contract-123', file, false);

      const formData = mockApiService.post.mock.calls[0][1] as FormData;
      expect(formData.get('extract_covenants')).toBe('false');
    });
  });

  describe('getCovenantExtractionStatus', () => {
    it('should fetch extraction status successfully', async () => {
      const mockStatus = {
        status: 'completed' as const,
        progress_percentage: 100,
        extracted_covenants_count: 5,
        completed_at: '2023-01-01T00:00:00Z',
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      });

      const result = await contractService.getCovenantExtractionStatus('contract-123');

      expect(result).toEqual(mockStatus);
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/contracts/contract-123/covenants/extraction-status'
      );
    });
  });

  describe('searchContracts', () => {
    it('should search contracts with query', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await contractService.searchContracts('test query');

      expect(result).toEqual(mockResponse);
      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/contracts?page=1&limit=20&search=test')
      );
    });
  });

  describe('getExpiringContracts', () => {
    it('should fetch expiring contracts', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      await contractService.getExpiringContracts(30);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/contracts\?page=1&limit=20&status=active&date_to=\d{4}-\d{2}-\d{2}/)
      );
    });
  });

  describe('bulkUpdateContractStatus', () => {
    it('should bulk update contract status', async () => {
      const mockResponse = {
        updated_count: 2,
        failed_ids: [],
      };

      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await contractService.bulkUpdateContractStatus(
        ['contract-1', 'contract-2'],
        'closed'
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/contracts/bulk-update-status',
        {
          contract_ids: ['contract-1', 'contract-2'],
          status: 'closed',
        }
      );
    });
  });

  describe('getContractStats', () => {
    it('should fetch contract statistics', async () => {
      const mockStats = {
        total_contracts: 100,
        active_contracts: 85,
        total_principal_usd: 50000000,
        contracts_by_status: {
          active: 85,
          closed: 10,
          watch: 5,
        },
        recent_contracts: [],
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const result = await contractService.getContractStats();

      expect(result).toEqual(mockStats);
      expect(mockApiService.get).toHaveBeenCalledWith('/contracts/stats');
    });
  });
});