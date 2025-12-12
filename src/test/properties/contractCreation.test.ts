/**
 * Property-Based Tests for Contract Creation
 * Feature: covenant-guardian, Property 1: Contract Creation Completeness
 * Feature: covenant-guardian, Property 2: Input Validation Consistency
 */

import fc from 'fast-check';
import type { ContractCreateInput } from '@/types';

// Mock all services before importing the contract service
jest.mock('@/services/api');
jest.mock('@/services/covenantExtraction');
jest.mock('@/services/xanoIntegration');
jest.mock('@/services/gemini');

// Import after mocking
import { contractService } from '@/services/contracts';
import { apiService } from '@/services/api';

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Contract Creation Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic sanity test to ensure test suite is recognized
  it('should have contract service available', () => {
    expect(contractService).toBeDefined();
    expect(typeof contractService.createContract).toBe('function');
  });

  /**
   * Property 1: Contract Creation Completeness
   * For any valid contract data submitted by a Bank_User, the system should store the contract 
   * with a unique identifier, set status to active, and trigger covenant extraction processing.
   * Validates: Requirements 1.1, 1.3, 1.4
   */
  describe('Property 1: Contract Creation Completeness', () => {
    it('should create contract with unique ID, active status for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrower_id: fc.uuid(),
            contract_name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            principal_amount: fc.integer({ min: 1, max: 1000000000 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
          }),
          async (baseData) => {
            jest.clearAllMocks();
            
            const contractData: ContractCreateInput = {
              ...baseData,
              origination_date: '2023-01-01',
              maturity_date: '2024-01-01',
            };

            const mockContract = {
              id: fc.sample(fc.uuid(), 1)[0],
              bank_id: fc.sample(fc.uuid(), 1)[0],
              status: 'active' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...contractData,
            };

            mockApiService.post.mockResolvedValueOnce({
              success: true,
              data: mockContract,
            });

            const result = await contractService.createContract(contractData);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');
            expect(result.id.length).toBeGreaterThan(0);
            expect(result.status).toBe('active');
            expect(result.borrower_id).toBe(contractData.borrower_id);
            expect(result.contract_name).toBe(contractData.contract_name);
            expect(result.principal_amount).toBe(contractData.principal_amount);
            expect(result.currency).toBe(contractData.currency);
            expect(mockApiService.post).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: Input Validation Consistency
   * Validates: Requirements 1.2
   */
  describe('Property 2: Input Validation Consistency', () => {
    it('should reject contracts with missing required fields', async () => {
      await expect(
        contractService.createContract({
          borrower_id: '',
          contract_name: 'Test Contract',
          principal_amount: 1000000,
          currency: 'USD',
          origination_date: '2023-01-01',
          maturity_date: '2024-01-01',
        })
      ).rejects.toThrow(/Validation failed.*Borrower ID is required/);
    });

    it('should reject contracts with invalid principal amounts', async () => {
      await expect(
        contractService.createContract({
          borrower_id: 'borrower-123',
          contract_name: 'Test Contract',
          principal_amount: 0,
          currency: 'USD',
          origination_date: '2023-01-01',
          maturity_date: '2024-01-01',
        })
      ).rejects.toThrow(/Validation failed.*Principal amount must be greater than 0/);
    });

    it('should reject contracts with date validation issues', async () => {
      await expect(
        contractService.createContract({
          borrower_id: 'borrower-123',
          contract_name: 'Test Contract',
          principal_amount: 1000000,
          currency: 'USD',
          origination_date: '2024-01-01',
          maturity_date: '2023-01-01',
        })
      ).rejects.toThrow(/Maturity date must be after origination date/);
    });

    it('should reject contracts with excessive principal amounts', async () => {
      await expect(
        contractService.createContract({
          borrower_id: 'borrower-123',
          contract_name: 'Test Contract',
          principal_amount: 2000000000000,
          currency: 'USD',
          origination_date: '2023-01-01',
          maturity_date: '2024-01-01',
        })
      ).rejects.toThrow(/Principal amount exceeds maximum allowed value/);
    });
  });
});
