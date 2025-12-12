/**
 * Contract Management Service
 * Handles contract lifecycle, document processing, and covenant extraction
 */

import { apiService } from './api';
import { covenantExtractionService } from './covenantExtraction';
import { API_ENDPOINTS } from '@/config/api';
import type {
  Contract,
  ContractCreateInput,
  ContractFilters,
  PaginatedResponse,
  CovenantExtractionResult,
  ApiResponse,
} from '@/types';

export class ContractService {
  /**
   * Create a new contract
   * Validates input data and triggers covenant extraction if document provided
   */
  async createContract(contractData: ContractCreateInput): Promise<Contract> {
    // Validate required fields
    this.validateContractInput(contractData);

    const formData = new FormData();
    
    // Add contract metadata
    formData.append('borrower_id', contractData.borrower_id);
    formData.append('contract_name', contractData.contract_name);
    formData.append('principal_amount', contractData.principal_amount.toString());
    formData.append('currency', contractData.currency);
    formData.append('origination_date', contractData.origination_date);
    formData.append('maturity_date', contractData.maturity_date);
    
    // Add optional fields
    if (contractData.contract_number) {
      formData.append('contract_number', contractData.contract_number);
    }
    if (contractData.interest_rate !== undefined && contractData.interest_rate !== null) {
      formData.append('interest_rate', contractData.interest_rate.toString());
    }
    if (contractData.raw_document_text) {
      formData.append('raw_document_text', contractData.raw_document_text);
    }
    
    // Add document file if provided
    if (contractData.document_file) {
      formData.append('document_file', contractData.document_file);
    }

    const response = await apiService.post<Contract>(
      API_ENDPOINTS.contracts.create,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create contract');
    }

    const contract = response.data;

    // Queue covenant extraction if document text is provided
    if (contractData.raw_document_text) {
      try {
        await covenantExtractionService.queueExtraction(
          contract.id,
          contractData.raw_document_text,
          'normal'
        );
      } catch (error) {
        console.warn('Failed to queue covenant extraction:', error);
        // Don't fail contract creation if extraction queueing fails
      }
    }

    return contract;
  }

  /**
   * Get paginated list of contracts with filtering
   */
  async getContracts(
    filters: ContractFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Contract>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters
    if (filters.status) params.append('status', filters.status);
    if (filters.borrower_id) params.append('borrower_id', filters.borrower_id);
    if (filters.search) params.append('search', filters.search);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.principal_min) params.append('principal_min', filters.principal_min.toString());
    if (filters.principal_max) params.append('principal_max', filters.principal_max.toString());

    const response = await apiService.get<PaginatedResponse<Contract>>(
      `${API_ENDPOINTS.contracts.list}?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch contracts');
    }

    return response.data;
  }

  /**
   * Get detailed contract information with covenants
   */
  async getContractById(contractId: string): Promise<Contract> {
    const response = await apiService.get<Contract>(
      API_ENDPOINTS.contracts.get(contractId)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Contract not found');
    }

    return response.data;
  }

  /**
   * Update contract information
   */
  async updateContract(
    contractId: string,
    updates: Partial<ContractCreateInput>
  ): Promise<Contract> {
    const response = await apiService.put<Contract>(
      API_ENDPOINTS.contracts.update(contractId),
      updates
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update contract');
    }

    return response.data;
  }

  /**
   * Delete a contract (soft delete)
   */
  async deleteContract(contractId: string): Promise<void> {
    const response = await apiService.delete(
      API_ENDPOINTS.contracts.delete(contractId)
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete contract');
    }
  }

  /**
   * Upload contract document and trigger covenant extraction
   */
  async uploadContractDocument(
    contractId: string,
    file: File,
    extractCovenants = true
  ): Promise<{ upload_success: boolean; extraction_queued: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extract_covenants', extractCovenants.toString());

    const response = await apiService.post<{
      upload_success: boolean;
      extraction_queued: boolean;
    }>(
      `${API_ENDPOINTS.contracts.upload}/${contractId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to upload document');
    }

    return response.data;
  }

  /**
   * Get covenant extraction status for a contract
   */
  async getCovenantExtractionStatus(contractId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress_percentage: number;
    extracted_covenants_count: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  }> {
    // First check local extraction service
    const localStatus = await covenantExtractionService.getContractExtractionStatus(contractId);
    
    if (localStatus) {
      return {
        status: localStatus.status,
        progress_percentage: localStatus.progress_percentage,
        extracted_covenants_count: localStatus.extracted_covenants_count,
        error_message: localStatus.error_message,
        started_at: localStatus.started_at,
        completed_at: localStatus.completed_at,
      };
    }

    // Fallback to API if not found locally
    try {
      const response = await apiService.get<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress_percentage: number;
        extracted_covenants_count: number;
        error_message?: string;
        started_at?: string;
        completed_at?: string;
      }>(API_ENDPOINTS.covenants.extractionStatus(contractId));

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to get extraction status');
      }

      return response.data;
    } catch (error) {
      // Return default status if no extraction found
      return {
        status: 'completed',
        progress_percentage: 100,
        extracted_covenants_count: 0,
      };
    }
  }

  /**
   * Get contract summary statistics
   */
  async getContractStats(): Promise<{
    total_contracts: number;
    active_contracts: number;
    total_principal_usd: number;
    contracts_by_status: Record<string, number>;
    recent_contracts: Contract[];
  }> {
    const response = await apiService.get<{
      total_contracts: number;
      active_contracts: number;
      total_principal_usd: number;
      contracts_by_status: Record<string, number>;
      recent_contracts: Contract[];
    }>('/contracts/stats');

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get contract statistics');
    }

    return response.data;
  }

  /**
   * Validate contract input data
   */
  private validateContractInput(contractData: ContractCreateInput): void {
    const errors: string[] = [];

    // Required field validation
    if (!contractData.borrower_id?.trim()) {
      errors.push('Borrower ID is required');
    }

    if (!contractData.contract_name?.trim()) {
      errors.push('Contract name is required');
    }

    if (!contractData.principal_amount || contractData.principal_amount <= 0) {
      errors.push('Principal amount must be greater than 0');
    }

    if (!contractData.currency?.trim()) {
      errors.push('Currency is required');
    }

    if (!contractData.origination_date) {
      errors.push('Origination date is required');
    }

    if (!contractData.maturity_date) {
      errors.push('Maturity date is required');
    }

    // Date validation
    if (contractData.origination_date && contractData.maturity_date) {
      const originationDate = new Date(contractData.origination_date);
      const maturityDate = new Date(contractData.maturity_date);

      if (maturityDate <= originationDate) {
        errors.push('Maturity date must be after origination date');
      }
    }

    // Interest rate validation
    if (contractData.interest_rate !== undefined) {
      if (contractData.interest_rate < 0 || contractData.interest_rate > 100) {
        errors.push('Interest rate must be between 0 and 100');
      }
    }

    // Currency validation (basic)
    if (contractData.currency && !/^[A-Z]{3}$/.test(contractData.currency)) {
      errors.push('Currency must be a valid 3-letter ISO code (e.g., USD, EUR)');
    }

    // Principal amount validation
    if (contractData.principal_amount > 1000000000000) { // 1 trillion limit
      errors.push('Principal amount exceeds maximum allowed value');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Search contracts by text
   */
  async searchContracts(
    query: string,
    filters: Omit<ContractFilters, 'search'> = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Contract>> {
    return this.getContracts(
      { ...filters, search: query },
      page,
      limit
    );
  }

  /**
   * Get contracts expiring soon
   */
  async getExpiringContracts(
    daysAhead = 90,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Contract>> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return this.getContracts(
      {
        status: 'active',
        date_to: endDate.toISOString().split('T')[0],
      },
      page,
      limit
    );
  }

  /**
   * Bulk update contract status
   */
  async bulkUpdateContractStatus(
    contractIds: string[],
    status: 'active' | 'closed' | 'default' | 'watch'
  ): Promise<{ updated_count: number; failed_ids: string[] }> {
    const response = await apiService.post<{
      updated_count: number;
      failed_ids: string[];
    }>('/contracts/bulk-update-status', {
      contract_ids: contractIds,
      status,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to bulk update contracts');
    }

    return response.data;
  }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;