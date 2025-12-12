/**
 * BorrowerDetailPage
 * Full page view for borrower details with financial data and events
 * Requirements: 5.1, 6.1, 6.3 - Financial data tracking and adverse event monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  BorrowerProfile,
  FinancialMetricsChart,
  NewsTimeline,
  FinancialDataIngestion,
} from '../components/borrowers';
import { Card, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';
import { borrowerService, BorrowerWithDetails } from '../services/borrowers';
import { financialDataService } from '../services/financialData';
import type { FinancialMetrics, FinancialMetricsInput, AdverseEvent } from '../types';

const BorrowerDetailPage: React.FC = () => {
  const { borrowerId } = useParams<{ borrowerId: string }>();
  const navigate = useNavigate();

  const [borrowerData, setBorrowerData] = useState<BorrowerWithDetails | null>(null);
  const [financialHistory, setFinancialHistory] = useState<FinancialMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch borrower data
  const fetchBorrowerData = useCallback(async () => {
    if (!borrowerId) return;

    try {
      setError(null);
      const [details, history] = await Promise.all([
        borrowerService.getBorrowerWithDetails(borrowerId),
        borrowerService.getFinancialHistory(borrowerId, 12),
      ]);

      setBorrowerData(details);
      setFinancialHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load borrower data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [borrowerId]);

  useEffect(() => {
    fetchBorrowerData();
  }, [fetchBorrowerData]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBorrowerData();
  };

  // Handle contract click
  const handleContractClick = (contractId: string) => {
    if (contractId) {
      navigate(`/contracts/${contractId}`);
    } else {
      navigate(`/contracts?borrower_id=${borrowerId}`);
    }
  };

  // Handle financial data submission
  const handleFinancialDataSubmit = async (data: FinancialMetricsInput) => {
    setIsSubmitting(true);
    try {
      await financialDataService.ingestFinancialData(data);
      setShowIngestionModal(false);
      // Refresh data after submission
      await fetchBorrowerData();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle event click
  const handleEventClick = (event: AdverseEvent) => {
    // Could open a modal or navigate to event detail
    console.log('Event clicked:', event);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error || !borrowerData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Borrower not found'}
            </h2>
            <p className="text-gray-500 mb-6">
              Unable to load borrower information. Please try again.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {borrowerData.legal_name}
                </h1>
                <p className="text-sm text-gray-500">Borrower Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIngestionModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Financial Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Borrower Profile */}
        <BorrowerProfile
          borrower={borrowerData}
          contracts={borrowerData.contracts}
          latestFinancials={borrowerData.latest_financials}
          recentEvents={borrowerData.recent_events}
          onContractClick={handleContractClick}
          onViewFinancials={() => {
            // Scroll to financial chart
            document.getElementById('financial-chart')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onViewEvents={() => {
            // Scroll to events timeline
            document.getElementById('events-timeline')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Financial Metrics Chart */}
        <div id="financial-chart">
          <FinancialMetricsChart
            data={financialHistory}
            metrics={['debt_to_ebitda', 'current_ratio', 'interest_coverage']}
            height={350}
            title="Financial Metrics Trend"
          />
        </div>

        {/* Revenue and EBITDA Chart */}
        {financialHistory.some(f => f.revenue || f.ebitda) && (
          <FinancialMetricsChart
            data={financialHistory}
            metrics={['revenue', 'ebitda']}
            height={300}
            title="Revenue & EBITDA"
            showTrend={false}
          />
        )}

        {/* News Timeline */}
        <div id="events-timeline">
          <NewsTimeline
            events={borrowerData.recent_events || []}
            maxItems={10}
            showRiskScore={true}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* Financial Data Ingestion Modal */}
      <Modal
        isOpen={showIngestionModal}
        onClose={() => setShowIngestionModal(false)}
        title="Add Financial Data"
        size="lg"
      >
        <FinancialDataIngestion
          borrower={borrowerData}
          onSubmit={handleFinancialDataSubmit}
          onCancel={() => setShowIngestionModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default BorrowerDetailPage;
