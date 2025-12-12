import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Local interface for dashboard summary data
interface DashboardSummaryData {
    total_contracts: number;
    total_principal_usd: number;
    contracts_at_risk: number;
    critical_alerts?: number;
    covenant_breakdown?: {
        compliant: number;
        warning: number;
        breached: number;
    };
}

interface PortfolioSummaryProps {
    data: DashboardSummaryData | null;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ data }) => {
    if (!data) return null;

    const chartData = [
        { name: 'Compliant', value: data.covenant_breakdown?.compliant || 0, color: '#208082' }, // primary
        { name: 'Warning', value: data.covenant_breakdown?.warning || 0, color: '#e67f61' }, // accent
        { name: 'Breached', value: data.covenant_breakdown?.breached || 0, color: '#c0152f' }, // danger
    ];

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Portfolio Summary</h2>

            <div className="flex flex-col md:flex-row items-center justify-around h-64">
                <div className="w-full md:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 mt-4 md:mt-0 space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Total Principal</p>
                        <p className="text-2xl font-bold text-gray-900">${(data.total_principal_usd / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500">Contracts</p>
                            <p className="text-xl font-bold text-gray-900">{data.total_contracts}</p>
                        </div>
                        <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-medium text-red-600">High Risk</p>
                            <p className="text-xl font-bold text-red-700">{data.contracts_at_risk}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioSummary;
