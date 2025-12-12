/**
 * ReportView Component
 * Displays generated report content with all sections
 * Feature: covenant-guardian
 * Requirements: 8.1, 8.2, 8.4
 */

import React from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Share2,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, Badge, Button } from '../common';
import { GeneratedReport } from '../../services/reports';

interface ReportViewProps {
  report: GeneratedReport;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
  onShare?: () => void;
  onPrint?: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({
  report,
  onExport,
  onShare,
  onPrint,
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['summary', 'portfolio', 'covenants', 'risks', 'recommendations'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const data = report.report_data;

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'deteriorating':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'breached':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const reportTypeLabels: Record<string, string> = {
    portfolio_summary: 'Portfolio Summary Report',
    borrower_deep_dive: 'Borrower Deep Dive Report',
    covenant_analysis: 'Covenant Analysis Report',
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {reportTypeLabels[report.report_type] || 'Risk Report'}
              </h2>
              <p className="text-sm text-gray-500">
                Generated on {formatDate(report.report_date)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Report ID: {report.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <div className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => onExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => onExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => onExport('json')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={onShare}
              >
                Share
              </Button>
            )}
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={onPrint}
              >
                Print
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Executive Summary */}
      <CollapsibleSection
        title="Executive Summary"
        isExpanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
      >
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-line">
            {data.executive_summary || 'No executive summary available.'}
          </p>
        </div>
      </CollapsibleSection>

      {/* Portfolio Overview */}
      <CollapsibleSection
        title="Portfolio Overview"
        isExpanded={expandedSections.has('portfolio')}
        onToggle={() => toggleSection('portfolio')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Contracts"
            value={data.total_contracts}
            icon="📋"
          />
          <StatCard
            label="Total Principal"
            value={formatCurrency(data.total_principal)}
            icon="💰"
          />
          <StatCard
            label="Contracts at Risk"
            value={data.contracts_at_risk}
            highlight={data.contracts_at_risk > 0}
            icon="⚠️"
          />
          <StatCard
            label="Breach Rate"
            value={`${data.breach_statistics.breach_rate.toFixed(1)}%`}
            highlight={data.breach_statistics.breach_rate > 10}
            icon="📊"
          />
        </div>
      </CollapsibleSection>

      {/* Covenant Status */}
      <CollapsibleSection
        title="Covenant Status"
        isExpanded={expandedSections.has('covenants')}
        onToggle={() => toggleSection('covenants')}
      >
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Compliant</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {data.covenants_compliant}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800">Warning</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">
                {data.covenants_warning}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">Breached</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {data.covenants_breached}
              </p>
            </div>
          </div>

          {/* Breach statistics */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Breach Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">New Breaches</span>
                <p className="font-semibold text-gray-900">
                  {data.breach_statistics.new_breaches}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Resolved</span>
                <p className="font-semibold text-gray-900">
                  {data.breach_statistics.resolved_breaches}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Ongoing</span>
                <p className="font-semibold text-gray-900">
                  {data.breach_statistics.ongoing_breaches}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Breach Rate</span>
                <p className="font-semibold text-gray-900">
                  {data.breach_statistics.breach_rate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Trend analysis */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Trend Analysis</h4>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  {data.trend_analysis.improving_covenants} Improving
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {data.trend_analysis.stable_covenants} Stable
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-600">
                  {data.trend_analysis.deteriorating_covenants} Deteriorating
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Overall Trend:</span>
              <Badge className={
                data.trend_analysis.overall_trend === 'improving'
                  ? 'bg-green-100 text-green-800'
                  : data.trend_analysis.overall_trend === 'deteriorating'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }>
                {data.trend_analysis.overall_trend}
              </Badge>
              {getTrendIcon(data.trend_analysis.overall_trend)}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Borrower Risk Profiles */}
      {data.borrower_risk_profiles.length > 0 && (
        <CollapsibleSection
          title="Borrower Risk Profiles"
          isExpanded={expandedSections.has('borrowers')}
          onToggle={() => toggleSection('borrowers')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Borrower</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Risk Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Principal at Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.borrower_risk_profiles.map((profile, index) => (
                  <tr key={profile.borrower_id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {profile.borrower_name}
                    </td>
                    <td className="py-3 px-4">
                      <RiskScoreIndicator score={profile.risk_score} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.covenant_status)}`}>
                        {profile.covenant_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(profile.principal_at_risk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {/* Key Risks */}
      {data.key_risks && data.key_risks.length > 0 && (
        <CollapsibleSection
          title="Key Risks"
          isExpanded={expandedSections.has('risks')}
          onToggle={() => toggleSection('risks')}
        >
          <ul className="space-y-2">
            {data.key_risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-800">{risk}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <CollapsibleSection
          title="Recommendations"
          isExpanded={expandedSections.has('recommendations')}
          onToggle={() => toggleSection('recommendations')}
        >
          <ul className="space-y-2">
            {data.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-800">{rec}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
}) => (
  <Card padding="none">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {isExpanded ? (
        <ChevronUp className="h-5 w-5 text-gray-400" />
      ) : (
        <ChevronDown className="h-5 w-5 text-gray-400" />
      )}
    </button>
    {isExpanded && (
      <div className="px-4 pb-4 border-t border-gray-100 pt-4">
        {children}
      </div>
    )}
  </Card>
);

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, highlight }) => (
  <div className={`p-4 rounded-lg ${highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-gray-500">{label}</span>
      {icon && <span className="text-lg">{icon}</span>}
    </div>
    <p className={`text-xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>
      {value}
    </p>
  </div>
);

// Risk Score Indicator Component
interface RiskScoreIndicatorProps {
  score: number;
}

const RiskScoreIndicator: React.FC<RiskScoreIndicatorProps> = ({ score }) => {
  const getColor = () => {
    if (score <= 3) return 'bg-green-500';
    if (score <= 6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700">{score.toFixed(1)}</span>
    </div>
  );
};

export default ReportView;
