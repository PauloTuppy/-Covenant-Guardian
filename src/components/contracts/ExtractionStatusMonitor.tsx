/**
 * ExtractionStatusMonitor Component
 * Displays and monitors the status of covenant extraction for a contract
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, RefreshCw, FileSearch } from 'lucide-react';
import Button from '../common/Button';
import { contractService } from '../../services/contracts';

interface ExtractionStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress_percentage: number;
    extracted_covenants_count: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
}

interface ExtractionStatusMonitorProps {
    contractId: string;
    onExtractionComplete?: (covenantCount: number) => void;
    compact?: boolean;
}

const ExtractionStatusMonitor: React.FC<ExtractionStatusMonitorProps> = ({
    contractId,
    onExtractionComplete,
    compact = false,
}) => {
    const [status, setStatus] = useState<ExtractionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pollingActive, setPollingActive] = useState(false);

    // Fetch extraction status
    const fetchStatus = useCallback(async () => {
        try {
            const extractionStatus = await contractService.getCovenantExtractionStatus(contractId);
            setStatus(extractionStatus);
            setError(null);

            // Check if extraction is complete
            if (extractionStatus.status === 'completed') {
                setPollingActive(false);
                onExtractionComplete?.(extractionStatus.extracted_covenants_count);
            } else if (extractionStatus.status === 'failed') {
                setPollingActive(false);
            } else if (extractionStatus.status === 'pending' || extractionStatus.status === 'processing') {
                setPollingActive(true);
            }
        } catch (err) {
            console.error('Failed to fetch extraction status:', err);
            setError('Failed to fetch extraction status');
            setPollingActive(false);
        } finally {
            setLoading(false);
        }
    }, [contractId, onExtractionComplete]);

    // Initial fetch and polling
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Polling effect
    useEffect(() => {
        if (!pollingActive) return;

        const pollInterval = setInterval(() => {
            fetchStatus();
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [pollingActive, fetchStatus]);

    // Handle manual refresh
    const handleRefresh = useCallback(() => {
        setLoading(true);
        fetchStatus();
    }, [fetchStatus]);

    // Get status icon
    const getStatusIcon = () => {
        if (!status) return <Clock className="h-5 w-5 text-gray-400" />;
        
        switch (status.status) {
            case 'pending':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'processing':
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <FileSearch className="h-5 w-5 text-gray-400" />;
        }
    };

    // Get status text
    const getStatusText = () => {
        if (!status) return 'No extraction data';
        
        switch (status.status) {
            case 'pending':
                return 'Extraction queued';
            case 'processing':
                return `Extracting covenants... ${status.progress_percentage}%`;
            case 'completed':
                return `Extracted ${status.extracted_covenants_count} covenant${status.extracted_covenants_count !== 1 ? 's' : ''}`;
            case 'failed':
                return status.error_message || 'Extraction failed';
            default:
                return 'Unknown status';
        }
    };

    // Get status color class
    const getStatusColorClass = () => {
        if (!status) return 'bg-gray-100 text-gray-700';
        
        switch (status.status) {
            case 'pending':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'processing':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'completed':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'failed':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    // Compact view
    if (compact) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${getStatusColorClass()}`}>
                {getStatusIcon()}
                <span>{getStatusText()}</span>
                {(status?.status === 'pending' || status?.status === 'processing') && (
                    <button
                        onClick={handleRefresh}
                        className="p-0.5 hover:bg-black/5 rounded"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div className={`rounded-lg border p-4 ${getStatusColorClass()}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    {getStatusIcon()}
                    <div>
                        <h4 className="font-medium">Covenant Extraction</h4>
                        <p className="text-sm mt-0.5">{getStatusText()}</p>
                        
                        {/* Progress bar for processing status */}
                        {status?.status === 'processing' && (
                            <div className="mt-3 w-48">
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div 
                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${status.progress_percentage}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Timestamps */}
                        {status?.started_at && (
                            <p className="text-xs mt-2 opacity-75">
                                Started: {new Date(status.started_at).toLocaleString()}
                            </p>
                        )}
                        {status?.completed_at && (
                            <p className="text-xs opacity-75">
                                Completed: {new Date(status.completed_at).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Refresh button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    isLoading={loading}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    Refresh
                </Button>
            </div>

            {/* Error details */}
            {status?.status === 'failed' && status.error_message && (
                <div className="mt-3 p-3 bg-red-100 rounded text-sm">
                    <p className="font-medium">Error Details:</p>
                    <p className="mt-1">{status.error_message}</p>
                </div>
            )}

            {/* Success message with covenant count */}
            {status?.status === 'completed' && status.extracted_covenants_count > 0 && (
                <div className="mt-3 p-3 bg-green-100 rounded text-sm">
                    <p>
                        Successfully extracted {status.extracted_covenants_count} covenant
                        {status.extracted_covenants_count !== 1 ? 's' : ''} from the contract document.
                        Review them below to ensure accuracy.
                    </p>
                </div>
            )}

            {/* No covenants found message */}
            {status?.status === 'completed' && status.extracted_covenants_count === 0 && (
                <div className="mt-3 p-3 bg-yellow-100 rounded text-sm">
                    <p>
                        No covenants were automatically extracted from the document. 
                        You can add covenants manually using the form below.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ExtractionStatusMonitor;
