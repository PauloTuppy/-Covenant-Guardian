import React from 'react';
import clsx from 'clsx';

// Local interface for dashboard summary data
interface DashboardSummaryData {
    total_contracts: number;
    total_principal_usd: number;
    contracts_at_risk: number;
    critical_alerts?: number;
    open_alerts?: number;
    covenant_breakdown?: {
        compliant: number;
        warning: number;
        breached: number;
    };
}

interface RiskMetricsProps {
    data: DashboardSummaryData | null;
}

const RiskMetrics: React.FC<RiskMetricsProps> = ({ data }) => {
    if (!data) return null;

    const covenantBreakdown = data.covenant_breakdown || { compliant: 0, warning: 0, breached: 0 };
    const totalCovenants = covenantBreakdown.compliant + covenantBreakdown.warning + covenantBreakdown.breached;

    // Calculate percentages
    const compliantPct = totalCovenants > 0 ? (covenantBreakdown.compliant / totalCovenants) * 100 : 0;
    const warningPct = totalCovenants > 0 ? (covenantBreakdown.warning / totalCovenants) * 100 : 0;
    const breachedPct = totalCovenants > 0 ? (covenantBreakdown.breached / totalCovenants) * 100 : 0;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Risk Metrics</h2>

            <div className="space-y-6">
                {/* Metric Bars */}
                <MetricBar
                    label="Compliant Covenants"
                    value={covenantBreakdown.compliant}
                    colorClass="bg-primary"
                    percentage={compliantPct}
                />
                <MetricBar
                    label="At Risk (Warning)"
                    value={covenantBreakdown.warning}
                    colorClass="bg-accent"
                    percentage={warningPct}
                />
                <MetricBar
                    label="Breached Covenants"
                    value={covenantBreakdown.breached}
                    colorClass="bg-danger"
                    percentage={breachedPct}
                />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                    <span className="block text-2xl font-bold text-gray-900">{totalCovenants}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Covenants</span>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50">
                    <span className="block text-2xl font-bold text-gray-900">{data.open_alerts || data.critical_alerts || 0}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Active Alerts</span>
                </div>
            </div>
        </div>
    );
};

interface MetricBarProps {
    label: string;
    value: number;
    colorClass: string;
    percentage: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, colorClass, percentage }) => (
    <div>
        <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className={clsx("h-2.5 rounded-full transition-all duration-500", colorClass)}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    </div>
);

export default RiskMetrics;
