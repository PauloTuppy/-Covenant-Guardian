/**
 * Alert Detail Component
 * Displays detailed alert information with acknowledgment actions
 * Requirements: 4.1, 4.2, 4.4, 4.5 - Alert details and acknowledgment workflow
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  X, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingDown,
  User,
  Calendar,
  Target,
  ArrowUpCircle
} from 'lucide-react';
import clsx from 'clsx';
import type { Alert } from '@/types';
import AlertSeverityBadge from './AlertSeverityBadge';
import AlertStatusBadge from './AlertStatusBadge';
import { alertService } from '@/services/alerts';
import { useAuthStore } from '@/store/authStore';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
  onUpdate?: (updatedAlert: Alert) => void;
}

const AlertDetail: React.FC<AlertDetailProps> = ({ alert, onClose, onUpdate }) => {
  const user = useAuthStore((state) => state.user);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAcknowledge = async () => {
    if (!user?.id) return;
    
    setIsAcknowledging(true);
    setError(null);
    
    try {
      const updatedAlert = await alertService.acknowledgeAlert(alert.id, user.id, {
        resolution_notes: resolutionNotes || undefined,
      });
      onUpdate?.(updatedAlert);
    } catch (err) {
      setError('Failed to acknowledge alert. Please try again.');
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    setError(null);
    
    try {
      const updatedAlert = await alertService.resolveAlert(alert.id, resolutionNotes || undefined);
      onUpdate?.(updatedAlert);
    } catch (err) {
      setError('Failed to resolve alert. Please try again.');
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const getTimeSinceTriggered = () => {
    const triggered = new Date(alert.triggered_at);
    const now = new Date();
    const diffMs = now.getTime() - triggered.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertSeverityBadge severity={alert.severity} size="lg" />
              <AlertStatusBadge status={alert.status} size="lg" />
              {alert.status === 'escalated' && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <ArrowUpCircle className="h-3 w-3" />
                  Escalated
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{alert.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-700">{alert.description}</p>
          </div>

          {/* Alert Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Triggered</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(alert.triggered_at)}
                </p>
                <p className="text-xs text-gray-500">{getTimeSinceTriggered()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Alert Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {alert.alert_type.replace('_', ' ')}
                </p>
              </div>
            </div>

            {alert.trigger_metric_value !== undefined && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <TrendingDown className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Current Value</p>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.trigger_metric_value.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {alert.threshold_value !== undefined && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Target className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Threshold</p>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.threshold_value.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Acknowledgment Info */}
          {alert.acknowledged_at && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Acknowledged</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-green-700">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{alert.acknowledged_by || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(alert.acknowledged_at)}</span>
                </div>
              </div>
              {alert.resolution_notes && (
                <p className="mt-2 text-sm text-green-700">
                  Notes: {alert.resolution_notes}
                </p>
              )}
            </div>
          )}

          {/* Resolution Notes Input */}
          {(alert.status === 'new' || alert.status === 'escalated') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes (Optional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about how this alert was addressed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          
          {alert.status === 'new' && (
            <button
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className={clsx(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                'bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
            </button>
          )}
          
          {alert.status === 'escalated' && (
            <button
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className={clsx(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                'bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Escalated'}
            </button>
          )}
          
          {alert.status === 'acknowledged' && (
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className={clsx(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                'bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isResolving ? 'Resolving...' : 'Mark Resolved'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetail;
