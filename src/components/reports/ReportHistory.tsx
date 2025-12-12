/**
 * ReportHistory Component
 * Displays list of previously generated reports with management options
 * Feature: covenant-guardian
 * Requirements: 8.4
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Trash2,
  Eye,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Select, EmptyState, Loading } from '../common';
import { reportService } from '../../services/reports';
import type { RiskReport } from '../../types';

interface ReportHistoryProps {
  onViewReport: (reportId: string) => void;
  onExportReport?: (reportId: string, format: 'pdf' | 'csv' | 'json') => void;
  refreshTrigger?: number;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({
  onViewReport,
  onExportReport,
  refreshTrigger,
}) => {
  const [reports, setReports] = useState<RiskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, [refreshTrigger]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.listReports({
        report_type: filterType || undefined,
        limit: 100,
      });
      setReports(data);
    } catch (err) {
      setError('Failed to load report history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    setDeletingId(reportId);
    try {
      const success = await reportService.deleteReport(reportId);
      if (success) {
        setReports(reports.filter(r => r.id !== reportId));
      } else {
        setError('Failed to delete report');
      }
    } catch (err) {
      setError('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const reportTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'portfolio_summary', label: 'Portfolio Summary' },
    { value: 'borrower_deep_dive', label: 'Borrower Deep Dive' },
    { value: 'covenant_analysis', label: 'Covenant Analysis' },
  ];

  const reportTypeLabels: Record<string, string> = {
    portfolio_summary: 'Portfolio Summary',
    borrower_deep_dive: 'Borrower Deep Dive',
    covenant_analysis: 'Covenant Analysis',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter reports based on search and type
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchQuery === '' || 
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === '' || report.report_type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>Report History</CardHeader>
        <CardContent>
          <Loading />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="font-semibold text-gray-900">Report History</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              className="w-full sm:w-48"
            />
            <Select
              options={reportTypeOptions}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-gray-400" />}
          title="No reports found"
          description={
            searchQuery || filterType
              ? "Try adjusting your search or filter criteria"
              : "Generate your first report to see it here"
          }
        />
      ) : (
        <>
          <div className="divide-y divide-gray-200">
            {paginatedReports.map((report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {reportTypeLabels[report.report_type] || report.report_type}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(report.report_date)}
                        </span>
                        {report.total_contracts !== undefined && (
                          <span>{report.total_contracts} contracts</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewReport(report.id)}
                      leftIcon={<Eye className="h-4 w-4" />}
                    >
                      View
                    </Button>
                    {onExportReport && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onExportReport(report.id, 'pdf')}
                        leftIcon={<Download className="h-4 w-4" />}
                      >
                        Export
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      isLoading={deletingId === report.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Report summary stats */}
                {(report.total_principal || report.covenants_breached !== undefined) && (
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pl-14">
                    {report.total_principal !== undefined && (
                      <span>
                        Principal: ${(report.total_principal / 1000000).toFixed(1)}M
                      </span>
                    )}
                    {report.covenants_breached !== undefined && (
                      <span className={report.covenants_breached > 0 ? 'text-red-600' : ''}>
                        Breached: {report.covenants_breached}
                      </span>
                    )}
                    {report.covenants_warning !== undefined && (
                      <span className={report.covenants_warning > 0 ? 'text-amber-600' : ''}>
                        Warning: {report.covenants_warning}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                {filteredReports.length} reports
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ReportHistory;
