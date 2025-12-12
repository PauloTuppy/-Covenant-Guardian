/**
 * CovenantTrendChart Component
 * Displays historical trend analysis for covenant health metrics
 * Requirements: 3.4 - Buffer percentage and trend analysis
 */

import React, { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { CovenantTrendData, TrendDirection } from '../../types';

interface CovenantTrendChartProps {
  trendData: CovenantTrendData;
  height?: number;
  showThreshold?: boolean;
  showTrendIndicator?: boolean;
}

interface TrendIndicatorProps {
  trend: TrendDirection;
  className?: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, className }) => {
  const config = {
    improving: {
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Improving',
    },
    stable: {
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      label: 'Stable',
    },
    deteriorating: {
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Deteriorating',
    },
  };

  const { icon: Icon, color, bgColor, label } = config[trend];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColor} ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, thresholdValue }) => {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0]?.value;
  const isAboveThreshold = thresholdValue !== undefined && value > thresholdValue;
  const isBelowThreshold = thresholdValue !== undefined && value < thresholdValue;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        Value: {typeof value === 'number' ? value.toFixed(2) : value}
      </p>
      {thresholdValue !== undefined && (
        <p className="text-xs text-gray-500 mt-1">
          Threshold: {thresholdValue.toFixed(2)}
        </p>
      )}
      {(isAboveThreshold || isBelowThreshold) && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          <span className="text-xs text-yellow-600">
            {Math.abs(((value - thresholdValue) / thresholdValue) * 100).toFixed(1)}% from threshold
          </span>
        </div>
      )}
    </div>
  );
};

const CovenantTrendChart: React.FC<CovenantTrendChartProps> = ({
  trendData,
  height = 200,
  showThreshold = true,
  showTrendIndicator = true,
}) => {
  const { covenant_name, data_points, threshold_value, current_status } = trendData;

  // Calculate trend direction from data points
  const calculatedTrend = useMemo((): TrendDirection => {
    if (data_points.length < 2) return 'stable';
    
    const values = data_points.map(d => d.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'improving' : 'deteriorating';
  }, [data_points]);

  // Format data for chart
  const chartData = useMemo(() => {
    return data_points.map(point => ({
      ...point,
      formattedDate: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
    }));
  }, [data_points]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const values = data_points.map(d => d.value);
    const allValues = showThreshold ? [...values, threshold_value] : values;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [data_points, threshold_value, showThreshold]);

  // Determine line color based on status
  const lineColor = useMemo(() => {
    switch (current_status) {
      case 'breached':
        return '#ef4444'; // red-500
      case 'warning':
        return '#f59e0b'; // amber-500
      default:
        return '#22c55e'; // green-500
    }
  }, [current_status]);

  if (data_points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">No historical data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{covenant_name}</h4>
          <p className="text-xs text-gray-500">Historical Trend Analysis</p>
        </div>
        {showTrendIndicator && <TrendIndicator trend={calculatedTrend} />}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${trendData.covenant_id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip thresholdValue={threshold_value} />} />
          
          {/* Threshold reference line */}
          {showThreshold && threshold_value !== undefined && (
            <ReferenceLine
              y={threshold_value}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: 'Threshold',
                position: 'right',
                fill: '#ef4444',
                fontSize: 10,
              }}
            />
          )}

          {/* Area under the line */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={`url(#gradient-${trendData.covenant_id})`}
          />

          {/* Main line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: lineColor }} />
          <span className="text-xs text-gray-500">Actual Value</span>
        </div>
        {showThreshold && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded bg-red-500" style={{ borderTop: '2px dashed #ef4444' }} />
            <span className="text-xs text-gray-500">Threshold</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CovenantTrendChart;
