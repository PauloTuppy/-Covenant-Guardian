/**
 * CovenantMonitoringPanel Component
 * Main panel for covenant monitoring with health cards, trends, and management
 * Requirements: 3.1, 3.4, 3.5 - Covenant health monitoring interface
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  Filter,
  BarChart3,
  Grid,
  List,
  RefreshCw,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Covenant, CovenantCreateInput, CovenantStatus } from '../../types';
import CovenantHealthCard from './CovenantHealthCard';
import CovenantTrendChart from './CovenantTrendChart';
import CovenantEditModal from './CovenantEditModal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

interface CovenantMonitoringPanelProps {
  covenants: Covenant[];
  onCovenantUpdate?: (covenantId: string, data: Partial<CovenantCreateInput>) => Promise<void>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type ViewMode = 'grid' | 'list' | 'chart';
type FilterStatus = 'all' | CovenantStatus;
type SortOption = 'status' | 'name' | 'type' | 'buffer' | 'trend';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'warning', label: 'Warning' },
  { value: 'breached', label: 'Breached' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'status', label: 'Sort by Status' },
  { value: 'name', label: 'Sort by Name' },
  { value: 'type', label: 'Sort by Type' },
  { value: 'buffer', label: 'Sort by Buffer' },
  { value: 'trend', label: 'Sort by Trend' },
];

const CovenantMonitoringPanel: React.FC<CovenantMonitoringPanelProps> = ({
  covenants,
  onCovenantUpdate,
  onRefresh,
  isLoading = false,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCovenant, setEditingCovenant] = useState<Covenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    const result = {
      total: covenants.length,
      compliant: 0,
      warning: 0,
      breached: 0,
      improving: 0,
      stable: 0,
      deteriorating: 0,
    };

    covenants.forEach((covenant) => {
      const status = covenant.health?.status || 'compliant';
      const trend = covenant.health?.trend || 'stable';

      if (status === 'compliant') result.compliant++;
      else if (status === 'warning') result.warning++;
      else if (status === 'breached') result.breached++;

      if (trend === 'improving') result.improving++;
      else if (trend === 'stable') result.stable++;
      else if (trend === 'deteriorating') result.deteriorating++;
    });

    return result;
  }, [covenants]);

  // Filter and sort covenants
  const filteredCovenants = useMemo(() => {
    let result = [...covenants];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.covenant_name.toLowerCase().includes(query) ||
          c.metric_name?.toLowerCase().includes(query) ||
          c.covenant_type.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter((c) => (c.health?.status || 'compliant') === filterStatus);
    }

    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter((c) => c.covenant_type === filterType);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'status': {
          const statusOrder = { breached: 0, warning: 1, compliant: 2 };
          const statusA = a.health?.status || 'compliant';
          const statusB = b.health?.status || 'compliant';
          return statusOrder[statusA] - statusOrder[statusB];
        }
        case 'name':
          return a.covenant_name.localeCompare(b.covenant_name);
        case 'type':
          return a.covenant_type.localeCompare(b.covenant_type);
        case 'buffer': {
          const bufferA = a.health?.buffer_percentage ?? 100;
          const bufferB = b.health?.buffer_percentage ?? 100;
          return bufferA - bufferB;
        }
        case 'trend': {
          const trendOrder = { deteriorating: 0, stable: 1, improving: 2 };
          const trendA = a.health?.trend || 'stable';
          const trendB = b.health?.trend || 'stable';
          return trendOrder[trendA] - trendOrder[trendB];
        }
        default:
          return 0;
      }
    });

    return result;
  }, [covenants, searchQuery, filterStatus, filterType, sortBy]);

  // Generate trend data for chart view
  const trendDataList = useMemo(() => {
    return filteredCovenants
      .filter((c) => c.health)
      .map((covenant) => ({
        covenant_id: covenant.id,
        covenant_name: covenant.covenant_name,
        data_points: generateMockTrendData(covenant),
        threshold_value: covenant.threshold_value || 0,
        current_status: covenant.health?.status || 'compliant',
      }));
  }, [filteredCovenants]);

  // Handle covenant edit
  const handleEdit = useCallback((covenant: Covenant) => {
    setEditingCovenant(covenant);
  }, []);

  const handleSave = useCallback(
    async (covenantId: string, data: Partial<CovenantCreateInput>) => {
      if (!onCovenantUpdate) return;

      setIsSaving(true);
      try {
        await onCovenantUpdate(covenantId, data);
        setEditingCovenant(null);
      } finally {
        setIsSaving(false);
      }
    },
    [onCovenantUpdate]
  );

  // Export functionality
  const handleExport = useCallback(() => {
    const exportData = filteredCovenants.map((c) => ({
      name: c.covenant_name,
      type: c.covenant_type,
      status: c.health?.status || 'N/A',
      current_value: c.health?.last_reported_value || 'N/A',
      threshold: `${c.operator} ${c.threshold_value}`,
      buffer: c.health?.buffer_percentage ? `${c.health.buffer_percentage.toFixed(1)}%` : 'N/A',
      trend: c.health?.trend || 'N/A',
    }));

    const csv = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `covenant-health-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredCovenants]);

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Activity className="h-5 w-5" />}
          color="gray"
        />
        <StatCard
          label="Compliant"
          value={stats.compliant}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Warning"
          value={stats.warning}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          label="Breached"
          value={stats.breached}
          icon={<XCircle className="h-5 w-5" />}
          color="red"
        />
        <StatCard label="Improving" value={stats.improving} color="green" small />
        <StatCard label="Stable" value={stats.stable} color="gray" small />
        <StatCard label="Deteriorating" value={stats.deteriorating} color="red" small />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search covenants..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                options={STATUS_OPTIONS}
                className="w-32"
              />
            </div>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={TYPE_OPTIONS}
              className="w-32"
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              options={SORT_OPTIONS}
              className="w-36"
            />
          </div>

          {/* View Mode & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
                }`}
                title="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${
                  viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`p-1.5 rounded ${
                  viewMode === 'chart' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'
                }`}
                title="Chart view"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                isLoading={isLoading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredCovenants.length === 0 ? (
        <EmptyState searchQuery={searchQuery} filterStatus={filterStatus} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCovenants.map((covenant) => (
            <CovenantHealthCard
              key={covenant.id}
              covenant={covenant}
              onEdit={onCovenantUpdate ? handleEdit : undefined}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <CovenantListView
          covenants={filteredCovenants}
          onEdit={onCovenantUpdate ? handleEdit : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trendDataList.map((trendData) => (
            <CovenantTrendChart key={trendData.covenant_id} trendData={trendData} height={180} />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <CovenantEditModal
        isOpen={!!editingCovenant}
        onClose={() => setEditingCovenant(null)}
        covenant={editingCovenant}
        onSave={handleSave}
        isLoading={isSaving}
      />
    </div>
  );
};

// Helper Components
interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  color: 'gray' | 'green' | 'yellow' | 'red';
  small?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, small }) => {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  if (small) {
    return (
      <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

interface EmptyStateProps {
  searchQuery: string;
  filterStatus: FilterStatus;
}

const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, filterStatus }) => (
  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-500 mb-2">
      {searchQuery || filterStatus !== 'all'
        ? 'No covenants match your filters'
        : 'No covenants to monitor'}
    </p>
    <p className="text-sm text-gray-400">
      {searchQuery || filterStatus !== 'all'
        ? 'Try adjusting your search or filter criteria'
        : 'Upload a contract to extract covenants automatically'}
    </p>
  </div>
);

interface CovenantListViewProps {
  covenants: Covenant[];
  onEdit?: (covenant: Covenant) => void;
}

const CovenantListView: React.FC<CovenantListViewProps> = ({ covenants, onEdit }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Covenant
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Current
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Threshold
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Buffer
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
          {onEdit && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {covenants.map((covenant) => (
          <tr key={covenant.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900">{covenant.covenant_name}</p>
              <p className="text-xs text-gray-500">{covenant.metric_name}</p>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 capitalize">{covenant.covenant_type}</td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  covenant.health?.status === 'breached'
                    ? 'bg-red-100 text-red-700'
                    : covenant.health?.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {covenant.health?.status || 'N/A'}
              </span>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {covenant.health?.last_reported_value?.toFixed(2) || 'N/A'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {covenant.operator} {covenant.threshold_value?.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {covenant.health?.buffer_percentage?.toFixed(1)}%
            </td>
            <td className="px-4 py-3 text-sm capitalize text-gray-600">
              {covenant.health?.trend || 'N/A'}
            </td>
            {onEdit && (
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(covenant)}>
                  Edit
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Helper function to generate mock trend data for demonstration
function generateMockTrendData(covenant: Covenant) {
  const points = [];
  const baseValue = covenant.health?.last_reported_value || covenant.threshold_value || 3;
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i * 3);
    const variance = (Math.random() - 0.5) * baseValue * 0.3;
    points.push({
      date: date.toISOString(),
      value: Math.max(0, baseValue + variance),
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    });
  }

  return points;
}

export default CovenantMonitoringPanel;
