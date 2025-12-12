/**
 * useAlerts Hook
 * Fetches and manages alert data with polling support
 * Requirements: 4.1, 4.2, 4.4, 4.5 - Alert management
 */

import { useEffect, useCallback } from 'react';
import { alertService } from '../services/alerts';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';
import type { AlertFilters } from '../types';

interface UseAlertsOptions {
    status?: string;
    severity?: string;
    limit?: number;
    pollInterval?: number; // in milliseconds, default 30000
    enablePolling?: boolean;
}

export const useAlerts = (options?: UseAlertsOptions) => {
    const user = useAuthStore((state) => state.user);
    const { alerts, loading, error, setAlerts, setLoading, setError } =
        useAlertStore();

    const fetchAlerts = useCallback(async () => {
        if (!user?.bank_id) return;

        try {
            setLoading(true);
            
            // Build filters from options
            const filters: AlertFilters = {};
            if (options?.status && options.status !== 'all') {
                filters.status = options.status as AlertFilters['status'];
            }
            if (options?.severity && options.severity !== 'all') {
                filters.severity = options.severity as AlertFilters['severity'];
            }
            
            const fetchedAlerts = await alertService.getAlerts(filters);
            setAlerts(fetchedAlerts);
            setError(null);
        } catch (err) {
            setError('Failed to fetch alerts');
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.bank_id, options?.status, options?.severity, setAlerts, setLoading, setError]);

    useEffect(() => {
        fetchAlerts();
        
        // Poll for new alerts (default every 30 seconds)
        const enablePolling = options?.enablePolling !== false;
        const pollInterval = options?.pollInterval || 30000;
        
        if (enablePolling) {
            const interval = setInterval(fetchAlerts, pollInterval);
            return () => clearInterval(interval);
        }
    }, [fetchAlerts, options?.enablePolling, options?.pollInterval]);

    return { alerts, loading, error, refetch: fetchAlerts };
};
