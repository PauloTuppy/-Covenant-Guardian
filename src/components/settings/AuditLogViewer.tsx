/**
 * Audit Log Viewer Component
 * Displays system audit logs for compliance and security monitoring
 * Requirements: 9.5
 */

import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Select, Badge, Modal } from '@/components/common';
import { AuditLog } from '@/types';
import { userService, AuditLogFilters } from '@/services/users';

interface AuditLogViewerProps {
  maxHeight?: string;
}

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'success',
  LOGOUT: 'default',
  ACCESS: 'warning',
  EXPORT: 'info',
};

const TABLE_OPTIONS = [
  { value: '', label: 'All Tables' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'covenants', label: 'Covenants' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'users', label: 'Users' },
  { value: 'reports', label: 'Reports' },
  { value: 'financial_metrics', label: 'Financial Metrics' },
];

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ maxHeight = '600px' }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const filters: AuditLogFilters = {
        page,
        limit,
      };
      if (searchQuery) filters.action = searchQuery;
      if (tableFilter) filters.table_name = tableFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      
      const response = await userService.getAuditLogs(filters);
      setLogs(response.data);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, tableFilter, dateFrom, dateTo]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string): 'success' | 'info' | 'warning' | 'danger' | 'default' => {
    const upperAction = action.toUpperCase();
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
      if (upperAction.includes(key)) return color;
    }
    return 'default';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            <Badge variant="gray">{total} entries</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={tableFilter}
            onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
            className="w-40"
            options={TABLE_OPTIONS}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-40"
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-40"
            placeholder="To date"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Filter className="mr-1 h-4 w-4" />
            Apply
          </Button>
        </div>

        {/* Logs table */}
        <div style={{ maxHeight, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Table</th>
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm hover:bg-gray-50">
                    <td className="py-3 text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3">
                      <Badge variant={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-700">
                      {log.table_name || '-'}
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="text-gray-900">{log.user_email || 'System'}</p>
                        {log.ip_address && (
                          <p className="text-xs text-gray-500">{log.ip_address}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Timestamp</p>
                <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Action</p>
                <Badge variant={getActionColor(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Table</p>
                <p className="font-medium">{selectedLog.table_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Record ID</p>
                <p className="font-medium font-mono text-sm">{selectedLog.record_id || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="font-medium">{selectedLog.user_email || 'System'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IP Address</p>
                <p className="font-medium font-mono text-sm">{selectedLog.ip_address || '-'}</p>
              </div>
            </div>
            
            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Changes</p>
                <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default AuditLogViewer;
