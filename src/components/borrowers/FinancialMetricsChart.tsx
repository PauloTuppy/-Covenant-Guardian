/**
 * FinancialMetricsChart Component
 * Displays financial metrics trend visualization
 * Requirements: 5.1, 5.4, 5.5 - Financial data tracking and trend analysis
 */

import React, { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import type { FinancialMetrics, TrendDirection } from '../../types';

interface FinancialMetricsChartProps {
  data: FinancialMetrics[];
  metrics?: ('debt_to_ebitda' | 'current_ratio' | 'interest_coverage' | 'revenue' | 'ebitda')[];
  height?: number;
  showTrend?: boolean;
  title?: string;
}

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  format: (value: number) => string;
  type: 'line' | 'bar';
}

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  debt_to_ebitda: {
    key: 'debt_to_ebitda',
    label: 'Debt/EBITDA',
    color: '#3b82f6',
    format: (v) => `${v.toFixed(2)}x`,
    type: 'line',
  },
  current_ratio: {
    key: 'current_ratio',
    label: 'Current Ratio',
    color: '#22c55e',
    format: (v) => `${v.toFixed(2)}x`,
    type: 'line',
  },
  interest_coverage: {
    key: 'interest_coverage',
    label: 'Interest Coverage',
    color: '#f59e0b',
    format: (v) => `${v.toFixed(2)}x`,
    type: 'line',
  },
  revenue: {
    key: 'revenue',
    label: 'Revenue',
    color: '#8b5cf6',
    format: (v) => `$${(v / 1000000).toFixed(1)}M`,
    type: 'bar',
  },
  ebitda: {
    key: 'ebitda',
    label: 'EBITDA',
    color: '#06b6d4',
    format: (v) => `$${(v / 1000000).toFixed(1)}M`,
    type: 'bar',
  },
};

const TrendIndicator: React.FC<{ trend: TrendDirection; metric: string }> = ({ trend, metric }) => {
  const config = {
    improving: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    stable: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50' },
    deteriorating: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  };

  const { icon: Icon, color, bg } = config[trend];

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${bg}`}>
      <Icon className={`h-3 w-3 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{metric}</span>
    </div>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => {
          const config = METRIC_CONFIGS[entry.dataKey];
          return (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{config?.label || entry.dataKey}</span>
              </span>
              <span className="font-medium text-gray-900">
                {config?.format(entry.value) || entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FinancialMetricsChart: React.FC<FinancialMetricsChartProps> = ({
  data,
  metrics = ['debt_to_ebitda', 'current_ratio', 'interest_coverage'],
  height = 300,
  showTrend = true,
  title = 'Financial Metrics Trend',
}) => {
  // Format data for chart
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime())
      .map((item) => ({
        ...item,
        formattedDate: new Date(item.period_date).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
      }));
  }, [data]);

  // Calculate trends for each metric
  const trends = useMemo(() => {
    const result: Record<string, TrendDirection> = {};
    
    if (chartData.length < 2) {
      metrics.forEach(m => result[m] = 'stable');
      return result;
    }

    metrics.forEach((metric) => {
      const values = chartData
        .map((d) => d[metric as keyof FinancialMetrics] as number)
        .filter((v) => v !== undefined && v !== null);

      if (values.length < 2) {
        result[metric] = 'stable';
        return;
      }

      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const changePercent = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;

      // For debt_to_ebitda, lower is better (so reverse the logic)
      const isLowerBetter = metric === 'debt_to_ebitda';
      
      if (Math.abs(changePercent) < 5) {
        result[metric] = 'stable';
      } else if (isLowerBetter) {
        result[metric] = changePercent < 0 ? 'improving' : 'deteriorating';
      } else {
        result[metric] = changePercent > 0 ? 'improving' : 'deteriorating';
      }
    });

    return result;
  }, [chartData, metrics]);

  // Get active metric configs
  const activeConfigs = metrics.map((m) => METRIC_CONFIGS[m]).filter(Boolean);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2 text-gray-300" />
            <p>No financial data available</p>
            <p className="text-sm text-gray-400 mt-1">Add financial metrics to see trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {showTrend && (
          <div className="flex items-center gap-2">
            {metrics.map((metric) => (
              <TrendIndicator
                key={metric}
                trend={trends[metric]}
                metric={METRIC_CONFIGS[metric]?.label || metric}
              />
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-sm text-gray-600">
                  {METRIC_CONFIGS[value]?.label || value}
                </span>
              )}
            />
            {activeConfigs.map((config) =>
              config.type === 'bar' ? (
                <Bar
                  key={config.key}
                  dataKey={config.key}
                  fill={config.color}
                  opacity={0.8}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  key={config.key}
                  type="monotone"
                  dataKey={config.key}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FinancialMetricsChart;
