/**
 * CovenantHealthCard Component
 * Displays covenant health status with indicators and AI insights
 * Requirements: 3.1, 3.4 - Covenant health monitoring with status indicators
 */

import React, { useState } from 'react';
import { 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Edit2, 
    ChevronDown, 
    ChevronUp,
    Calendar,
    AlertTriangle,
    Sparkles
} from 'lucide-react';
import { Covenant } from '../../types';
import StatusBadge from '../common/StatusBadge';
import GeminiRiskAssessment from './GeminiRiskAssessment';

interface CovenantHealthCardProps {
    covenant: Covenant;
    onEdit?: (covenant: Covenant) => void;
    showExpandedView?: boolean;
}

const CovenantHealthCard: React.FC<CovenantHealthCardProps> = ({ 
    covenant, 
    onEdit,
    showExpandedView = false 
}) => {
    const [isExpanded, setIsExpanded] = useState(showExpandedView);
    const health = covenant.health;
    
    if (!health) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-900">{covenant.covenant_name}</h3>
                        <p className="text-xs text-gray-500">{covenant.check_frequency} • {covenant.covenant_type}</p>
                    </div>
                </div>
                <div className="text-center py-4 text-gray-400 text-sm">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No health data available
                </div>
            </div>
        );
    }

    const getTrendIcon = () => {
        switch (health.trend) {
            case 'improving':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'deteriorating':
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-gray-400" />;
        }
    };

    const getTrendColor = () => {
        switch (health.trend) {
            case 'improving':
                return 'text-green-600 bg-green-50';
            case 'deteriorating':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusColor = () => {
        switch (health.status) {
            case 'breached':
                return 'border-red-200 bg-red-50/30';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50/30';
            default:
                return 'border-gray-200';
        }
    };

    const getBufferBarColor = () => {
        if (health.status === 'breached') return 'bg-red-500';
        if (health.status === 'warning') return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const formatValue = (value?: number) => {
        if (value === undefined || value === null) return 'N/A';
        return value.toFixed(2);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={`bg-white rounded-lg border ${getStatusColor()} p-5 hover:shadow-md transition-all`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{covenant.covenant_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 capitalize">{covenant.check_frequency}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500 capitalize">{covenant.covenant_type}</span>
                        {covenant.gemini_extracted && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-purple-500 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    AI
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {health.status && <StatusBadge status={health.status} />}
                    {onEdit && (
                        <button
                            onClick={() => onEdit(covenant)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit covenant"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Current Value */}
            <div className="mb-4">
                <div className="flex items-end gap-2 mb-1">
                    <span className="text-2xl font-bold text-gray-900">
                        {formatValue(health.last_reported_value)}
                    </span>
                    {covenant.threshold_unit && (
                        <span className="text-sm text-gray-500 mb-1">{covenant.threshold_unit}</span>
                    )}
                    <div className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span className="text-xs font-medium capitalize">{health.trend}</span>
                    </div>
                </div>
                <div className="text-xs text-gray-500">
                    Threshold: {covenant.operator} {formatValue(covenant.threshold_value)} {covenant.threshold_unit}
                </div>
            </div>

            {/* Buffer Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Buffer from Threshold</span>
                    <span className="font-medium">
                        {health.buffer_percentage !== undefined 
                            ? `${health.buffer_percentage.toFixed(1)}%` 
                            : 'N/A'}
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${getBufferBarColor()}`}
                        style={{ 
                            width: `${Math.min(Math.max(health.buffer_percentage || 0, 0), 100)}%` 
                        }}
                    />
                </div>
            </div>

            {/* Days to Breach Warning */}
            {health.days_to_breach !== undefined && health.days_to_breach > 0 && health.days_to_breach < 90 && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-orange-50 rounded-lg border border-orange-100">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-orange-700">
                        Estimated {health.days_to_breach} days to potential breach
                    </span>
                </div>
            )}

            {/* AI Insight (Compact) */}
            {health.gemini_risk_assessment && !isExpanded && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-700 text-xs leading-relaxed line-clamp-2">
                                {health.gemini_risk_assessment}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
                {isExpanded ? (
                    <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                    </>
                ) : (
                    <>
                        <ChevronDown className="h-4 w-4" />
                        Show Details
                    </>
                )}
            </button>

            {/* Expanded View */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Full AI Risk Assessment */}
                    <GeminiRiskAssessment health={health} />

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-500 mb-1">Last Reported</p>
                            <p className="font-medium text-gray-900">
                                {formatDate(health.last_reported_date)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-500 mb-1">Next Check</p>
                            <p className="font-medium text-gray-900 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(covenant.next_check_date)}
                            </p>
                        </div>
                    </div>

                    {/* Covenant Clause */}
                    {covenant.covenant_clause && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Original Clause</p>
                            <p className="text-xs text-gray-700 italic leading-relaxed">
                                "{covenant.covenant_clause}"
                            </p>
                        </div>
                    )}

                    {/* Recommended Action */}
                    {health.recommended_action && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-blue-600 font-medium mb-1">Recommended Action</p>
                            <p className="text-xs text-blue-800">{health.recommended_action}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CovenantHealthCard;
