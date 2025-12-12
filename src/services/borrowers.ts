/**
 * Borrower Service
 * Handles borrower management and data retrieval
 * Requirements: 5.1, 6.1 - Financial data and adverse event tracking
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/config/api';
import type {
  Borrower,
  BorrowerCreateInput,
  Contract,
  FinancialMetrics,
  AdverseEvent,
  PaginatedResponse,
} from '@/types';

export interface BorrowerFilters {
  search?: string;
  industry?: string;
  country?: string;
  credit_rating?: string;
}

export interface BorrowerWithDetails extends Borrower {
  contracts?: Contract[];
  latest_financials?: FinancialMetrics | null;
  recent_events?: AdverseEvent[];
  risk_summary?: {
    total_exposure: number;
    active_contracts: number;
    at_risk_contracts: number;
    avg_event_risk: number;
  };
}

class BorrowerService {
  /**
   * Get all borrowers with optional filtering
   */
  async getBorrowers(
    filters: BorrowerFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Borrower>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.country) params.append('country', filters.country);
    if (filters.credit_rating) params.append('credit_rating', filters.credit_rating);

    const response = await apiService.get<PaginatedResponse<Borrower>>(
      `${API_ENDPOINTS.borrowers.list}?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch borrowers');
    }

    return response.data;
  }

  /**
   * Get a single borrower by ID
   */
  async getBorrower(borrowerId: string): Promise<Borrower> {
    const response = await apiService.get<Borrower>(
      API_ENDPOINTS.borrowers.get(borrowerId)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Borrower not found');
    }

    return response.data;
  }

  /**
   * Get borrower with all related details (contracts, financials, events)
   */
  async getBorrowerWithDetails(borrowerId: string): Promise<BorrowerWithDetails> {
    // Fetch borrower and related data in parallel
    const [borrower, contracts, financials, events] = await Promise.all([
      this.getBorrower(borrowerId),
      this.getBorrowerContracts(borrowerId),
      this.getLatestFinancials(borrowerId),
      this.getRecentEvents(borrowerId),
    ]);

    // Calculate risk summary
    const riskSummary = this.calculateRiskSummary(contracts, events);

    return {
      ...borrower,
      contracts,
      latest_financials: financials,
      recent_events: events,
      risk_summary: riskSummary,
    };
  }

  /**
   * Create a new borrower
   */
  async createBorrower(data: BorrowerCreateInput): Promise<Borrower> {
    const response = await apiService.post<Borrower>(
      API_ENDPOINTS.borrowers.create,
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create borrower');
    }

    return response.data;
  }

  /**
   * Update a borrower
   */
  async updateBorrower(
    borrowerId: string,
    data: Partial<BorrowerCreateInput>
  ): Promise<Borrower> {
    const response = await apiService.put<Borrower>(
      API_ENDPOINTS.borrowers.update(borrowerId),
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update borrower');
    }

    return response.data;
  }

  /**
   * Get contracts for a borrower
   */
  async getBorrowerContracts(borrowerId: string): Promise<Contract[]> {
    const response = await apiService.get<Contract[]>(
      `${API_ENDPOINTS.contracts.list}?borrower_id=${borrowerId}`
    );

    return response.data || [];
  }

  /**
   * Get latest financial metrics for a borrower
   */
  async getLatestFinancials(borrowerId: string): Promise<FinancialMetrics | null> {
    try {
      const response = await apiService.get<FinancialMetrics[]>(
        `${API_ENDPOINTS.financialMetrics.get(borrowerId)}?limit=1`
      );

      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get financial history for a borrower
   */
  async getFinancialHistory(
    borrowerId: string,
    periods = 8
  ): Promise<FinancialMetrics[]> {
    const response = await apiService.get<FinancialMetrics[]>(
      `${API_ENDPOINTS.financialMetrics.get(borrowerId)}?limit=${periods}`
    );

    return response.data || [];
  }

  /**
   * Get recent adverse events for a borrower
   */
  async getRecentEvents(
    borrowerId: string,
    limit = 10
  ): Promise<AdverseEvent[]> {
    try {
      const response = await apiService.get<AdverseEvent[]>(
        `${API_ENDPOINTS.adverseEvents.list}?borrower_id=${borrowerId}&limit=${limit}`
      );

      return response.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Calculate risk summary for a borrower
   */
  private calculateRiskSummary(
    contracts: Contract[],
    events: AdverseEvent[]
  ): BorrowerWithDetails['risk_summary'] {
    const totalExposure = contracts.reduce((sum, c) => sum + c.principal_amount, 0);
    const activeContracts = contracts.filter((c) => c.status === 'active').length;
    const atRiskContracts = contracts.filter(
      (c) => c.status === 'watch' || c.status === 'default'
    ).length;

    const avgEventRisk =
      events.length > 0
        ? events.reduce((sum, e) => sum + (e.risk_score || 0), 0) / events.length
        : 0;

    return {
      total_exposure: totalExposure,
      active_contracts: activeContracts,
      at_risk_contracts: atRiskContracts,
      avg_event_risk: avgEventRisk,
    };
  }

  /**
   * Search borrowers by name or ticker
   */
  async searchBorrowers(query: string, limit = 10): Promise<Borrower[]> {
    const response = await apiService.get<Borrower[]>(
      `${API_ENDPOINTS.borrowers.list}?search=${encodeURIComponent(query)}&limit=${limit}`
    );

    return response.data || [];
  }

  /**
   * Get borrowers with high risk
   */
  async getHighRiskBorrowers(): Promise<BorrowerWithDetails[]> {
    const response = await apiService.get<Borrower[]>(
      `${API_ENDPOINTS.borrowers.list}?risk_level=high`
    );

    const borrowers = response.data || [];
    
    // Fetch details for each high-risk borrower
    const detailedBorrowers = await Promise.all(
      borrowers.map((b) => this.getBorrowerWithDetails(b.id))
    );

    return detailedBorrowers;
  }

  /**
   * Get borrowers needing financial data update
   */
  async getBorrowersNeedingUpdate(daysThreshold = 90): Promise<Borrower[]> {
    const response = await apiService.get<Borrower[]>(
      `${API_ENDPOINTS.borrowers.list}?stale_data_days=${daysThreshold}`
    );

    return response.data || [];
  }
}

export const borrowerService = new BorrowerService();
export default borrowerService;
