/**
 * Notification Preferences Component
 * Allows users to configure their notification settings
 * Requirements: 9.1
 */

import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertTriangle, FileText, Save } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Select } from '@/components/common';
import { userService, NotificationPreferences as NotificationPrefs, DEFAULT_NOTIFICATION_PREFERENCES } from '@/services/users';

interface NotificationPreferencesProps {
  onSave?: () => void;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low and above' },
  { value: 'medium', label: 'Medium and above' },
  { value: 'high', label: 'High and above' },
  { value: 'critical', label: 'Critical only' },
];

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ onSave }) => {
  const [preferences, setPreferences] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const prefs = await userService.getNotificationPreferences();
        setPreferences(prefs);
      } catch {
        // Silently use defaults - endpoint may not exist yet
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const updatePreference = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userService.updateNotificationPreferences(preferences);
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center text-gray-500">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
          </div>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-1 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Email Notifications */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
              <Mail className="h-4 w-4" />
              Email Notifications
            </h4>
            <div className="space-y-3 pl-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email_alerts}
                  onChange={(e) => updatePreference('email_alerts', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Receive alert notifications via email</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email_reports}
                  onChange={(e) => updatePreference('email_reports', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Receive report notifications via email</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email_covenant_warnings}
                  onChange={(e) => updatePreference('email_covenant_warnings', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Email me when covenants reach warning status</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.email_covenant_breaches}
                  onChange={(e) => updatePreference('email_covenant_breaches', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Email me when covenants are breached</span>
              </label>
            </div>
          </div>

          {/* In-App Notifications */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
              <Bell className="h-4 w-4" />
              In-App Notifications
            </h4>
            <div className="space-y-3 pl-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.in_app_alerts}
                  onChange={(e) => updatePreference('in_app_alerts', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Show in-app alert notifications</span>
              </label>
            </div>
          </div>

          {/* Alert Threshold */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
              <AlertTriangle className="h-4 w-4" />
              Alert Severity Threshold
            </h4>
            <div className="pl-6">
              <Select
                value={preferences.alert_severity_threshold}
                onChange={(e) => updatePreference('alert_severity_threshold', e.target.value as NotificationPrefs['alert_severity_threshold'])}
                className="w-64"
                options={SEVERITY_OPTIONS}
              />
              <p className="mt-1 text-xs text-gray-500">
                Only receive notifications for alerts at or above this severity level
              </p>
            </div>
          </div>

          {/* Digest Settings */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
              <FileText className="h-4 w-4" />
              Summary Digests
            </h4>
            <div className="space-y-3 pl-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.daily_digest}
                  onChange={(e) => updatePreference('daily_digest', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Receive daily activity digest</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.weekly_summary}
                  onChange={(e) => updatePreference('weekly_summary', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Receive weekly portfolio summary</span>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
