import { create } from 'zustand';
import { Alert } from '../types';

interface AlertStore {
    alerts: Alert[];
    loading: boolean;
    error: string | null;

    setAlerts: (alerts: Alert[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addAlert: (alert: Alert) => void;
    updateAlert: (id: string, alert: Partial<Alert>) => void;
    removeAlert: (id: string) => void;
    filterByStatus: (status: string) => Alert[];
    filterBySeverity: (severity: string) => Alert[];
    countBySeverity: () => Record<string, number>;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
    alerts: [],
    loading: false,
    error: null,

    setAlerts: (alerts) => set({ alerts }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addAlert: (alert) =>
        set((state) => ({ alerts: [alert, ...state.alerts] })),

    updateAlert: (id, updates) =>
        set((state) => ({
            alerts: state.alerts.map((a) =>
                a.id === id ? { ...a, ...updates } : a
            ),
        })),

    removeAlert: (id) =>
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        })),

    filterByStatus: (status) =>
        get().alerts.filter((a) => a.status === status),

    filterBySeverity: (severity) =>
        get().alerts.filter((a) => a.severity === severity),

    countBySeverity: () => {
        const alerts = get().alerts;
        return {
            critical: alerts.filter((a) => a.severity === 'critical').length,
            high: alerts.filter((a) => a.severity === 'high').length,
            medium: alerts.filter((a) => a.severity === 'medium').length,
            low: alerts.filter((a) => a.severity === 'low').length,
        };
    },
}));
