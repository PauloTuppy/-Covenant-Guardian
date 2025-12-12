/**
 * Alert List Item Component
 * Individual alert row with severity indicators and quick actions
 * Requirements: 4.1, 4.2, 4.4, 4.5 - Alert display with severity and status
 */

import React from 'react';
import { format } from 'date-fns';
import { ChevronRight, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { Alert } from '@/types';
import AlertSeverityBadge from './AlertSeverityBadge';
import AlertStatusBadge from './AlertStatusBadge';

interface AlertListItemProps {
  alert: Alert;
  onClick: () => void;
  onQuickAcknowledge?: () => void;
  isAcknowledging?: boolean;
}

const severityBorderColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

const AlertListItem: React.FC<AlertListItemProps> = ({
  alert,
  onClick,
  onQuickAcknowledge,
  isAcknowledging,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch {
      return dateString;
    }
  };

  const getTimeAgo = () => {
    const triggered = new Date(alert.triggered_at);
    const now = new Date();
    const diffMs = now.getTime() - triggered.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  return (
    <div
      className={clsx(
        'group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg',
        'border-l-4 hover:shadow-md transition-all cursor-pointer',
        severityBorderColors[alert.severity] || 'border-l-gray-300'
      )}
      onClick={onClick}
    >
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertSeverityBadge severity={alert.severity} size="sm" />
          <AlertStatusBadge status={alert.status} size="sm" />
        </div>
        
        <h3 className="font-medium text-gray-900 truncate mb-1">
          {alert.title}
        </h3>
        
        <p className="text-sm text-gray-500 truncate">
          {alert.description}
        </p>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(alert.triggered_at)}
          </span>
          <span className="text-gray-300">•</span>
          <span>{getTimeAgo()}</span>
          {alert.contract && (
            <>
              <span className="text-gray-300">•</span>
              <span className="truncate max-w-[150px]">
                {alert.contract.contract_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {alert.status === 'new' && onQuickAcknowledge && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAcknowledge();
            }}
            disabled={isAcknowledging}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              'bg-gray-100 text-gray-700 hover:bg-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isAcknowledging ? '...' : 'Ack'}
          </button>
        )}
        
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </div>
  );
};

export default AlertListItem;
