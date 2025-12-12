/**
 * System Settings Component
 * Admin interface for configuring system-wide settings
 * Requirements: 9.1, 9.4
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, Building2, DollarSign, Database, Sparkles } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Select } from '@/components/common';
import { userService, SystemSettings as SystemSettingsType, DEFAULT_SYSTEM_SETTINGS } from '@/services/users';

interface SystemSettingsProps {
  canEdit?: boolean;
  onSave?: () => void;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
];

const SCHEDULE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const SystemSettings: React.FC<SystemSettingsProps> = ({ canEdit = true, onSave }) => {
  const [settings, setSettings] = useState<SystemSettingsType>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await userService.getSystemSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch system settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateSetting = <K extends keyof SystemSettingsType>(key: K, value: SystemSettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userService.updateSystemSettings(settings);
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save system settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center text-gray-500">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
          </div>
          {canEdit && hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-1 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Organization Settings */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
              <Building2 className="h-4 w-4" />
              Organization
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  value={settings.bank_name}
                  onChange={(e) => updateSetting('bank_name', e.target.value)}
                  placeholder="Enter bank name"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <Select
                  value={settings.default_currency}
                  onChange={(e) => updateSetting('default_currency', e.target.value)}
                  disabled={!canEdit}
                  options={CURRENCY_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* Covenant Monitoring Settings */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
              <DollarSign className="h-4 w-4" />
              Covenant Monitoring
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning Threshold (%)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.covenant_warning_threshold}
                  onChange={(e) => updateSetting('covenant_warning_threshold', parseInt(e.target.value) || 10)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Trigger warning when covenant is within this % of threshold
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Escalation (hours)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.alert_escalation_hours}
                  onChange={(e) => updateSetting('alert_escalation_hours', parseInt(e.target.value) || 24)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Escalate unacknowledged alerts after this many hours
                </p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
              <Database className="h-4 w-4" />
              Data Management
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention (days)
                </label>
                <Input
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.data_retention_days}
                  onChange={(e) => updateSetting('data_retention_days', parseInt(e.target.value) || 365)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-xs text-gray-500">
                  How long to retain historical data
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Generation Schedule
                </label>
                <Select
                  value={settings.report_generation_schedule}
                  onChange={(e) => updateSetting('report_generation_schedule', e.target.value as 'daily' | 'weekly' | 'monthly')}
                  disabled={!canEdit}
                  options={SCHEDULE_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* AI & Integration Settings */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
              <Sparkles className="h-4 w-4" />
              AI & Integrations
            </h4>
            <div className="space-y-3 pl-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enable_gemini_analysis}
                  onChange={(e) => updateSetting('enable_gemini_analysis', e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm text-gray-700">Enable Gemini AI Analysis</span>
                  <p className="text-xs text-gray-500">Use AI for covenant extraction and risk assessment</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enable_news_monitoring}
                  onChange={(e) => updateSetting('enable_news_monitoring', e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm text-gray-700">Enable News Monitoring</span>
                  <p className="text-xs text-gray-500">Monitor adverse events and news for borrowers</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemSettings;
