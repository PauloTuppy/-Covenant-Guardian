/**
 * Performance Monitor Component
 * Displays performance metrics and optimization status
 * Requirements: 9.1, 10.1, 10.4
 */

import React, { useState, useEffect } from 'react';
import { queryMonitor, queryCache } from '@/utils/queryOptimizer';
import { rateLimiter } from '@/utils/rateLimiter';

interface PerformanceMetrics {
  totalQueries: number;
  avgDuration: number;
  cacheHitRate: number;
  slowQueries: number;
  cacheSize: number;
}

interface RateLimitStatus {
  endpoint: string;
  remaining: number;
  isBlocked: boolean;
}

export const PerformanceMonitor: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalQueries: 0,
    avgDuration: 0,
    cacheHitRate: 0,
    slowQueries: 0,
    cacheSize: 0,
  });
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const updateMetrics = () => {
      const summary = queryMonitor.getSummary();
      const cacheStats = queryCache.getStats();

      setMetrics({
        totalQueries: summary.totalQueries,
        avgDuration: Math.round(summary.avgDuration),
        cacheHitRate: Math.round(summary.cacheHitRate * 100),
        slowQueries: summary.slowQueries,
        cacheSize: cacheStats.size,
      });

      // Update rate limit status for common endpoints
      const endpoints = ['/api/contracts', '/api/alerts', '/api/dashboard'];
      const status = endpoints.map(endpoint => ({
        endpoint,
        remaining: rateLimiter.getRemainingRequests(endpoint, 'api'),
        isBlocked: rateLimiter.isBlocked(endpoint),
      }));
      setRateLimitStatus(status);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        {isExpanded ? '▼ Performance' : '▲ Performance'}
      </button>

      {isExpanded && (
        <div className="absolute bottom-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance Metrics</h3>

          <div className="space-y-3">
            {/* Query Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Total Queries</div>
                <div className="font-semibold text-gray-900">{metrics.totalQueries}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Avg Duration</div>
                <div className="font-semibold text-gray-900">{metrics.avgDuration}ms</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Cache Hit Rate</div>
                <div className={`font-semibold ${metrics.cacheHitRate > 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {metrics.cacheHitRate}%
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Slow Queries</div>
                <div className={`font-semibold ${metrics.slowQueries > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.slowQueries}
                </div>
              </div>
            </div>

            {/* Cache Status */}
            <div className="border-t pt-2">
              <div className="text-xs text-gray-500 mb-1">Cache Status</div>
              <div className="flex items-center justify-between text-xs">
                <span>Entries: {metrics.cacheSize}/100</span>
                <button
                  onClick={() => {
                    queryCache.clear();
                    setMetrics(prev => ({ ...prev, cacheSize: 0 }));
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Clear Cache
                </button>
              </div>
            </div>

            {/* Rate Limit Status */}
            <div className="border-t pt-2">
              <div className="text-xs text-gray-500 mb-1">Rate Limits</div>
              <div className="space-y-1">
                {rateLimitStatus.map(status => (
                  <div key={status.endpoint} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[150px]">{status.endpoint}</span>
                    <span className={status.isBlocked ? 'text-red-600' : 'text-green-600'}>
                      {status.isBlocked ? 'Blocked' : `${status.remaining} left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-2 flex justify-end space-x-2">
              <button
                onClick={() => {
                  queryMonitor.clear();
                  setMetrics({
                    totalQueries: 0,
                    avgDuration: 0,
                    cacheHitRate: 0,
                    slowQueries: 0,
                    cacheSize: metrics.cacheSize,
                  });
                }}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Reset Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
