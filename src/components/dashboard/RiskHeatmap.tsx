import React, { useMemo } from 'react';
import clsx from 'clsx';
import type { Contract, CovenantHealth } from '@/types';

interface RiskHeatmapProps {
  contracts: Contract[];
  covenantHealth?: CovenantHealth[];
  onContractClick?: (contractId: string) => void;
}

interface HeatmapCell {
  contractId: string;
  contractName: string;
  borrowerName?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  covenantCount: number;
  breachedCount: number;
  warningCount: number;
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  contracts,
  covenantHealth = [],
  onContractClick,
}) => {
  const heatmapData = useMemo(() => {
    return contracts.map((contract): HeatmapCell => {
      // Get covenant health for this contract
      const contractCovenants = covenantHealth.filter(
        (ch) => ch.contract_id === contract.id
      );

      const breachedCount = contractCovenants.filter(
        (ch) => ch.status === 'breached'
      ).length;
      const warningCount = contractCovenants.filter(
        (ch) => ch.status === 'warning'
      ).length;
      const covenantCount = contractCovenants.length;

      // Calculate risk score (0-100)
      let riskScore = 0;
      if (covenantCount > 0) {
        riskScore = ((breachedCount * 100) + (warningCount * 50)) / covenantCount;
      }

      // Also factor in contract status
      if (contract.status === 'default') riskScore = Math.max(riskScore, 90);
      if (contract.status === 'watch') riskScore = Math.max(riskScore, 60);

      // Determine risk level
      let riskLevel: HeatmapCell['riskLevel'] = 'low';
      if (riskScore >= 75) riskLevel = 'critical';
      else if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 25) riskLevel = 'medium';

      return {
        contractId: contract.id,
        contractName: contract.contract_name,
        borrowerName: contract.borrower?.legal_name,
        riskLevel,
        riskScore: Math.round(riskScore),
        covenantCount,
        breachedCount,
        warningCount,
      };
    });
  }, [contracts, covenantHealth]);


  // Sort by risk score descending
  const sortedData = useMemo(() => {
    return [...heatmapData].sort((a, b) => b.riskScore - a.riskScore);
  }, [heatmapData]);

  const getRiskColor = (level: HeatmapCell['riskLevel']) => {
    switch (level) {
      case 'critical':
        return 'bg-red-600 hover:bg-red-700';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-yellow-400 hover:bg-yellow-500';
      case 'low':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-300';
    }
  };

  const getRiskTextColor = (level: HeatmapCell['riskLevel']) => {
    switch (level) {
      case 'critical':
      case 'high':
        return 'text-white';
      case 'medium':
        return 'text-gray-900';
      case 'low':
        return 'text-white';
      default:
        return 'text-gray-700';
    }
  };

  if (contracts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Risk Heatmap</h2>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No contracts to display
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Risk Heatmap</h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-400"></div>
            <span className="text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span className="text-gray-600">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-600"></div>
            <span className="text-gray-600">Critical</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {sortedData.map((cell) => (
          <button
            key={cell.contractId}
            onClick={() => onContractClick?.(cell.contractId)}
            className={clsx(
              'p-3 rounded-lg transition-all duration-200 text-left',
              getRiskColor(cell.riskLevel),
              getRiskTextColor(cell.riskLevel),
              onContractClick && 'cursor-pointer'
            )}
            title={`${cell.contractName}\nRisk Score: ${cell.riskScore}%\nCovenants: ${cell.covenantCount}\nBreached: ${cell.breachedCount}\nWarning: ${cell.warningCount}`}
          >
            <div className="font-medium text-sm truncate">
              {cell.contractName}
            </div>
            {cell.borrowerName && (
              <div className="text-xs opacity-80 truncate">
                {cell.borrowerName}
              </div>
            )}
            <div className="mt-1 text-xs font-bold">
              {cell.riskScore}%
            </div>
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded bg-green-50">
          <span className="block text-lg font-bold text-green-700">
            {sortedData.filter((d) => d.riskLevel === 'low').length}
          </span>
          <span className="text-xs text-green-600">Low Risk</span>
        </div>
        <div className="p-2 rounded bg-yellow-50">
          <span className="block text-lg font-bold text-yellow-700">
            {sortedData.filter((d) => d.riskLevel === 'medium').length}
          </span>
          <span className="text-xs text-yellow-600">Medium</span>
        </div>
        <div className="p-2 rounded bg-orange-50">
          <span className="block text-lg font-bold text-orange-700">
            {sortedData.filter((d) => d.riskLevel === 'high').length}
          </span>
          <span className="text-xs text-orange-600">High</span>
        </div>
        <div className="p-2 rounded bg-red-50">
          <span className="block text-lg font-bold text-red-700">
            {sortedData.filter((d) => d.riskLevel === 'critical').length}
          </span>
          <span className="text-xs text-red-600">Critical</span>
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmap;
