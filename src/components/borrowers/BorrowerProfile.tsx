/**
 * BorrowerProfile Component
 * Displays borrower details with contract listings
 * Requirements: 5.1, 6.1, 6.3 - Financial data tracking and adverse event monitoring
 */

import React from 'react';
import {
  Building2,
  Globe,
  TrendingUp,
  FileText,
  AlertTriangle,
  DollarSign,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import Loading from '../common/Loading';
import type { Borrower, Contract, FinancialMetrics, AdverseEvent } from '../../types';

interface BorrowerProfileProps {
  borrower: Borrower;
  contracts?: Contract[];
  latestFinancials?: FinancialMetrics | null;
  recentEvents?: AdverseEvent[];
  onContractClick?: (contractId: string) => void;
  onViewFinancials?: () => void;
  onViewEvents?: () => void;
  isLoading?: boolean;
}

const BorrowerProfile: React.FC<BorrowerProfileProps> = ({
  borrower,
  contracts = [],
  latestFinancials,
  recentEvents = [],
  onContractClick,
  onViewFinancials,
  onViewEvents,
  isLoading = false,
}) => {
  // Calculate portfolio metrics
  const portfolioMetrics = React.useMemo(() => {
    const totalPrincipal = contracts.reduce((sum, c) => sum + c.principal_amount, 0);
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const atRiskContracts = contracts.filter(c => c.status === 'watch' || c.status === 'default').length;
    
    return {
      totalPrincipal,
      activeContracts,
      atRiskContracts,
      totalContracts: contracts.length,
    };
  }, [contracts]);

  // Calculate risk level based on events
  const riskLevel = React.useMemo(() => {
    if (recentEvents.length === 0) return 'low';
    const avgRisk = recentEvents.reduce((sum, e) => sum + (e.risk_score || 0), 0) / recentEvents.length;
    if (avgRisk >= 7) return 'high';
    if (avgRisk >= 4) return 'medium';
    return 'low';
  }, [recentEvents]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Borrower Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{borrower.legal_name}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {borrower.ticker_symbol && (
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {borrower.ticker_symbol}
                    </span>
                  )}
                  {borrower.industry && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      {borrower.industry}
                    </span>
                  )}
                  {borrower.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      {borrower.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {borrower.credit_rating && (
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Credit Rating</span>
                <span className="text-xl font-bold text-gray-900">{borrower.credit_rating}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Exposure</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(portfolioMetrics.totalPrincipal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Contracts</p>
                <p className="text-lg font-bold text-gray-900">
                  {portfolioMetrics.activeContracts} / {portfolioMetrics.totalContracts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                portfolioMetrics.atRiskContracts > 0 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-gray-50 text-gray-600'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">At Risk</p>
                <p className="text-lg font-bold text-gray-900">
                  {portfolioMetrics.atRiskContracts} contracts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                riskLevel === 'high' ? 'bg-red-50 text-red-600' :
                riskLevel === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                'bg-green-50 text-green-600'
              }`}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk Level</p>
                <p className={`text-lg font-bold capitalize ${
                  riskLevel === 'high' ? 'text-red-600' :
                  riskLevel === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {riskLevel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contracts List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Contracts</h3>
            </div>
            <span className="text-sm text-gray-500">{contracts.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No contracts found for this borrower
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contracts.slice(0, 5).map((contract) => (
                  <div
                    key={contract.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onContractClick?.(contract.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {contract.contract_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: contract.currency || 'USD',
                              maximumFractionDigits: 0,
                            }).format(contract.principal_amount)}
                          </span>
                          <span>•</span>
                          <span>
                            Matures {new Date(contract.maturity_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={contract.status} />
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
                {contracts.length > 5 && (
                  <div className="p-4 text-center">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => onContractClick?.('')}
                    >
                      View all {contracts.length} contracts
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Financial Summary</h3>
            </div>
            {onViewFinancials && (
              <button
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={onViewFinancials}
              >
                View Details
              </button>
            )}
          </CardHeader>
          <CardContent>
            {latestFinancials ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium text-gray-900">
                    {new Date(latestFinancials.period_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {latestFinancials.debt_to_ebitda !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Debt/EBITDA</p>
                      <p className="text-lg font-bold text-gray-900">
                        {latestFinancials.debt_to_ebitda.toFixed(2)}x
                      </p>
                    </div>
                  )}
                  {latestFinancials.current_ratio !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Current Ratio</p>
                      <p className="text-lg font-bold text-gray-900">
                        {latestFinancials.current_ratio.toFixed(2)}x
                      </p>
                    </div>
                  )}
                  {latestFinancials.interest_coverage !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Interest Coverage</p>
                      <p className="text-lg font-bold text-gray-900">
                        {latestFinancials.interest_coverage.toFixed(2)}x
                      </p>
                    </div>
                  )}
                  {latestFinancials.data_confidence !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Data Confidence</p>
                      <p className="text-lg font-bold text-gray-900">
                        {(latestFinancials.data_confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No financial data available</p>
                {onViewFinancials && (
                  <button
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    onClick={onViewFinancials}
                  >
                    Add financial data
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Adverse Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">Recent Events</h3>
            </div>
            {onViewEvents && (
              <button
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={onViewEvents}
              >
                View All
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          event.event_type === 'credit_rating_downgrade' ? 'bg-red-100 text-red-700' :
                          event.event_type === 'regulatory' ? 'bg-orange-100 text-orange-700' :
                          event.event_type === 'litigation' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">{event.headline}</p>
                    </div>
                    {event.risk_score !== undefined && (
                      <div className={`ml-4 px-2 py-1 rounded text-xs font-bold ${
                        event.risk_score >= 7 ? 'bg-red-100 text-red-700' :
                        event.risk_score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Risk: {event.risk_score}/10
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BorrowerProfile;
