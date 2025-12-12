/**
 * Alerts Inbox Component
 * Main alert management interface with filtering, sorting, and actions
 * Requirements: 4.1, 4.2, 4.4, 4.5 - Alert management with filtering and sorting
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Filter, 
  SortAsc, 
  SortDesc, 
  RefreshCw,
  Bell,
  Search,
  X
} from 'lucide-react';
import clsx from 'clsx';
import type { Alert } from '@/types';
import AlertListItem from './AlertListItem';
import AlertDetail from './AlertDetail';
import AlertSeverityBadge from './AlertSeverityBadge';
import { alertService } from '@/services/alerts';
import { useAuthStore } from '@/store/authStore';

interface AlertsInboxProps {
  alerts: Alert[];
  onRefresh?: () => void;
  onAlertUpdate?: (alert: Alert) => void;
  isLoading?: boolean;
}

type SortField = 'triggered_at' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder = { escalated: 0, new: 1, acknowledged: 2, resolved: 3 };

const AlertsInbox: React.FC<AlertsInboxProps> = ({
  alerts,
  onRefresh,
  onAlertUpdate,
  isLoading = false,
}) => {
  const user = useAuthStore((state) => state.user);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('triggered_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Detail modal state
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  // Acknowledging state
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      result = result.filter(a => a.severity === severityFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.contract?.contract_name?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'triggered_at':
          comparison = new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime();
          break;
        case 'severity':
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'status':
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [alerts, statusFilter, severityFilter, searchQuery, sortField, sortOrder]);

  // Alert counts by status
  const alertCounts = useMemo(() => ({
    all: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    escalated: alerts.filter(a => a.status === 'escalated').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  }), [alerts]);

  // Alert counts by severity
  const severityCounts = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  }), [alerts]);

  const handleQuickAcknowledge = useCallback(async (alertId: string) => {
    if (!user?.id) return;
    
    setAcknowledgingId(alertId);
    try {
      const updatedAlert = await alertService.acknowledgeAlert(alertId, user.id);
      onAlertUpdate?.(updatedAlert);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setAcknowledgingId(null);
    }
  }, [user?.id, onAlertUpdate]);

  const handleAlertUpdate = useCallback((updatedAlert: Alert) => {
    onAlertUpdate?.(updatedAlert);
    setSelectedAlert(updatedAlert);
  }, [onAlertUpdate]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSeverityFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || severityFilter !== 'all' || searchQuery.trim();

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">
                {[statusFilter !== 'all', severityFilter !== 'all', searchQuery.trim()].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {['all', 'new', 'escalated', 'acknowledged', 'resolved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={clsx(
                      'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                      statusFilter === status
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    <span className="ml-1 text-xs opacity-70">
                      ({alertCounts[status as keyof typeof alertCounts] || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Severity
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                    severityFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  )}
                >
                  All
                </button>
                {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setSeverityFilter(severity)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                      severityFilter === severity
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <AlertSeverityBadge severity={severity} size="sm" showLabel={false} showIcon={false} />
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    <span className="text-xs opacity-70">({severityCounts[severity]})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">Sort by:</span>
        {[
          { field: 'triggered_at' as SortField, label: 'Date' },
          { field: 'severity' as SortField, label: 'Severity' },
          { field: 'status' as SortField, label: 'Status' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded transition-colors',
              sortField === field
                ? 'text-primary font-medium'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {label}
            {sortField === field && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        Showing {filteredAlerts.length} of {alerts.length} alerts
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No alerts found</h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'All caught up! No alerts at this time.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary hover:text-primary/80 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertListItem
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedAlert(alert)}
              onQuickAcknowledge={
                alert.status === 'new' 
                  ? () => handleQuickAcknowledge(alert.id) 
                  : undefined
              }
              isAcknowledging={acknowledgingId === alert.id}
            />
          ))}
        </div>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdate={handleAlertUpdate}
        />
      )}
    </div>
  );
};

export default AlertsInbox;
