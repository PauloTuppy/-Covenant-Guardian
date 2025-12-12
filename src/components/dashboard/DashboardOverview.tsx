import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Contract, CovenantHealth } from '../../types';
import { dashboardService } from '../../services/dashboard';
import { alertService } from '../../services/alerts';
import { apiService } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import Loading from '../common/Loading';
import PortfolioSummary from './PortfolioSummary';
import { AlertsInbox } from '../alerts';
import RiskMetrics from './RiskMetrics';
import RiskHeatmap from './RiskHeatmap';

// Dashboard summary type for this component
interface DashboardSummary {
    total_contracts: number;
    total_principal_usd: number;
    contracts_at_risk: number;
    critical_alerts: number;
    covenant_breakdown?: {
        compliant: number;
        warning: number;
        breached: number;
    };
}

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

const DashboardOverview: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const { setAlerts } = useAlertStore();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [covenantHealth, setCovenantHealth] = useState<CovenantHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user?.bank_id) return;

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);


            const [summaryRes, alertsRes, contractsRes, healthRes] = await Promise.all([
                dashboardService.getPortfolioSummary(),
                alertService.getAlerts({ status: 'new' }),
                apiService.get<Contract[]>('/contracts?status=active,watch,default&limit=50'),
                apiService.get<CovenantHealth[]>('/covenant_health'),
            ]);
            
            // Handle portfolio summary response
            if (summaryRes) {
                const healthBreakdown = await dashboardService.getCovenantHealthBreakdown();
                setSummary({
                    total_contracts: summaryRes.total_contracts || 0,
                    total_principal_usd: summaryRes.total_principal_usd || 0,
                    contracts_at_risk: (summaryRes.contracts_breached || 0) + (summaryRes.contracts_at_warning || 0),
                    critical_alerts: summaryRes.open_alerts_count || 0,
                    covenant_breakdown: {
                        compliant: healthBreakdown.compliant,
                        warning: healthBreakdown.warning,
                        breached: healthBreakdown.breached,
                    },
                });
            }

            // Handle alerts response
            if (Array.isArray(alertsRes)) {
                setLocalAlerts(alertsRes);
                setAlerts(alertsRes);
            }

            // Handle contracts for heatmap
            if (contractsRes.data) {
                setContracts(contractsRes.data);
            }

            // Handle covenant health for heatmap
            if (healthRes.data) {
                setCovenantHealth(healthRes.data);
            }

            setLastRefresh(new Date());
        } catch (err) {
            setError('Failed to load dashboard data. Ensure the backend is running.');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.bank_id, setAlerts]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh setup
    useEffect(() => {
        if (autoRefreshEnabled && user?.bank_id) {
            refreshIntervalRef.current = setInterval(() => {
                fetchData(true);
            }, AUTO_REFRESH_INTERVAL);
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [autoRefreshEnabled, user?.bank_id, fetchData]);

    const handleManualRefresh = () => {
        fetchData(true);
    };

    const handleContractClick = (contractId: string) => {
        window.location.href = `/contracts/${contractId}`;
    };

    if (loading) return <Loading />;


    return (
        <div className="space-y-6">
            {/* Header with refresh controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">
                        Welcome back, <span className="font-semibold">{user?.email || 'User'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Last refresh indicator */}
                    {lastRefresh && (
                        <span className="text-sm text-gray-500">
                            Updated: {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    
                    {/* Auto-refresh toggle */}
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefreshEnabled}
                            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        Auto-refresh
                    </label>
                    
                    {/* Manual refresh button */}
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {refreshing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
                    <div className="flex">
                        <span className="mr-2">⚠️</span>
                        {error}
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    label="Total Contracts"
                    value={summary?.total_contracts || 0}
                    icon="📋"
                />
                <SummaryCard
                    label="Total Principal"
                    value={`$${((summary?.total_principal_usd || 0) / 1000000).toFixed(1)}M`}
                    icon="💰"
                />
                <SummaryCard
                    label="At Risk"
                    value={summary?.contracts_at_risk || 0}
                    highlight={(summary?.contracts_at_risk || 0) > 0}
                    icon="⚠️"
                />
                <SummaryCard
                    label="Critical Alerts"
                    value={summary?.critical_alerts || 0}
                    highlight={(summary?.critical_alerts || 0) > 0}
                    icon="🚨"
                />
            </div>

            {/* Risk Heatmap - Full Width */}
            <RiskHeatmap
                contracts={contracts}
                covenantHealth={covenantHealth}
                onContractClick={handleContractClick}
            />

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <PortfolioSummary data={summary} />
                    <RiskMetrics data={summary} />
                </div>
                <div>
                    <AlertsInbox alerts={localAlerts} />
                </div>
            </div>
        </div>
    );
};


interface SummaryCardProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    icon?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    label,
    value,
    highlight,
    icon,
}) => (
    <div
        className={`rounded-lg p-6 shadow-sm transition-all hover:shadow-md ${highlight
                ? 'border-l-4 border-danger bg-red-50'
                : 'border border-gray-200 bg-white'
            }`}
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p
                    className={`mt-2 text-2xl font-bold ${highlight ? 'text-danger' : 'text-gray-900'
                        }`}
                >
                    {value}
                </p>
            </div>
            {icon && <span className="text-3xl opacity-80">{icon}</span>}
        </div>
    </div>
);

export default DashboardOverview;
