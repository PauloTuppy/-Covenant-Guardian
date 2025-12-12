import { useEffect, useState, useCallback } from 'react';

import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useContractStore } from '../store/contractStore';
import { Contract } from '../types';

interface UseContractsOptions {
    page?: number;
    limit?: number;
    status?: string;
}

export const useContracts = (options?: UseContractsOptions) => {
    const user = useAuthStore((state) => state.user);
    const { contracts, loading, error, setContracts, setLoading, setError } =
        useContractStore();
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            
            // Build query params
            const params = new URLSearchParams();
            if (options?.page) params.append('page', String(options.page));
            if (options?.limit) params.append('limit', String(options.limit));
            if (options?.status) params.append('status', options.status);
            if (user?.bank_id) params.append('bank_id', user.bank_id);
            
            const queryString = params.toString();
            const url = queryString ? `/contracts?${queryString}` : '/contracts';
            
            const response = await apiService.get<Contract[]>(url);
            
            if (response.data && Array.isArray(response.data)) {
                setContracts(response.data);
                setTotal(response.pagination?.total || response.data.length);
                setPages(response.pagination?.totalPages || 1);
            } else {
                // Fallback if API structure is different or empty
                setContracts([]);
            }
        } catch (err) {
            setError('Failed to fetch contracts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user?.bank_id, options?.page, options?.limit, options?.status, setContracts, setLoading, setError]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    return { contracts, loading, error, total, pages, refetch: fetchContracts };
};
