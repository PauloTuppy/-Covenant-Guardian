/**
 * ReportGenerator Component
 * Allows users to generate new risk reports with period selection
 * Feature: covenant-guardian
 * Requirements: 8.1, 8.2
 */

import React, { useState } from 'react';
import { FileText, Calendar, Loader2, Building2 } from 'lucide-react';
import { Button, Select, Input, Card, CardHeader, CardContent } from '../common';
import { reportService, ReportGenerationInput, GeneratedReport } from '../../services/reports';

interface ReportGeneratorProps {
  onReportGenerated: (report: GeneratedReport) => void;
  borrowers?: Array<{ id: string; legal_name: string }>;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  onReportGenerated,
  borrowers = [],
}) => {
  const [reportType, setReportType] = useState<ReportGenerationInput['report_type']>('portfolio_summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default dates (last 30 days)
  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const reportTypeOptions = [
    { value: 'portfolio_summary', label: 'Portfolio Summary' },
    { value: 'borrower_deep_dive', label: 'Borrower Deep Dive' },
    { value: 'covenant_analysis', label: 'Covenant Analysis' },
  ];

  const borrowerOptions = [
    { value: '', label: 'Select a borrower...' },
    ...borrowers.map(b => ({ value: b.id, label: b.legal_name })),
  ];

  const handleGenerate = async () => {
    setError(null);

    // Validation
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    if (reportType === 'borrower_deep_dive' && !borrowerId) {
      setError('Please select a borrower for deep dive reports');
      return;
    }

    setIsGenerating(true);

    try {
      const input: ReportGenerationInput = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        include_ai_summary: includeAiSummary,
      };

      if (reportType === 'borrower_deep_dive') {
        input.borrower_id = borrowerId;
      }

      const report = await reportService.generateReport(input);
      onReportGenerated(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const getQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <Card className="w-full">
      <CardHeader action={<FileText className="h-5 w-5 text-gray-400" />}>
        Generate New Report
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Report Type Selection */}
          <Select
            label="Report Type"
            options={reportTypeOptions}
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportGenerationInput['report_type'])}
            fullWidth
          />

          {/* Borrower Selection (for deep dive) */}
          {reportType === 'borrower_deep_dive' && (
            <div className="space-y-1">
              <Select
                label="Borrower"
                options={borrowerOptions}
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                fullWidth
              />
              {borrowers.length === 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  No borrowers available
                </p>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Report Period
            </label>
            
            {/* Quick date range buttons */}
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => getQuickDateRange(7)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => getQuickDateRange(30)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => getQuickDateRange(90)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                Last 90 days
              </button>
              <button
                type="button"
                onClick={() => getQuickDateRange(365)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                Last year
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                leftIcon={<Calendar className="h-4 w-4" />}
                fullWidth
              />
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                leftIcon={<Calendar className="h-4 w-4" />}
                fullWidth
              />
            </div>
          </div>

          {/* AI Summary Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAiSummary}
              onChange={(e) => setIncludeAiSummary(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm text-gray-700">
              Include AI-generated executive summary
            </span>
          </label>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            leftIcon={isGenerating ? undefined : <FileText className="h-4 w-4" />}
            fullWidth
            size="lg"
          >
            {isGenerating ? 'Generating Report...' : 'Generate Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;
