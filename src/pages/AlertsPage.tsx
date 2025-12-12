/**
 * Alerts Page
 * Main page for alert management with filtering, sorting, and acknowledgment
 * Requirements: 4.1, 4.2, 4.4, 4.5 - Alert management interface
 */

import React, { useCallback } from 'react';
import { AlertsInbox } from '../components/alerts';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertStore } from '../store/alertStore';
import Loading from '../components/common/Loading';
import type { Alert } from '../types';

const AlertsPage: React.FC = () => {
    const { alerts, loading, error, refetch } = useAlerts();
    const updateAlert = useAlertStore((state) => state.updateAlert);

    const handleAlertUpdate = useCallback((updatedAlert: Alert) => {
        updateAlert(updatedAlert.id, updatedAlert);
    }, [updateAlert]);

    if (loading && alerts.length === 0) return <Loading />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Alerts Center</h1>
                    <p className="text-gray-500 mt-1">
                        Monitor and manage covenant alerts across your portfolio
                    </p>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Alerts Inbox with filtering and sorting */}
            <AlertsInbox 
                alerts={alerts} 
                onRefresh={refetch}
                onAlertUpdate={handleAlertUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default AlertsPage;
