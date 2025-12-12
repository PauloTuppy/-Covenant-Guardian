/**
 * CovenantEditModal Component
 * Modal for editing and managing covenant parameters
 * Requirements: 3.1, 3.4 - Covenant health monitoring and management
 */

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { Save, X, AlertCircle } from 'lucide-react';
import type { Covenant, CovenantCreateInput } from '../../types';

interface CovenantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  covenant: Covenant | null;
  onSave: (covenantId: string, data: Partial<CovenantCreateInput>) => Promise<void>;
  isLoading?: boolean;
}

interface FormErrors {
  covenant_name?: string;
  threshold_value?: string;
  metric_name?: string;
  check_frequency?: string;
}

const COVENANT_TYPES = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
];

const OPERATORS = [
  { value: '<', label: 'Less than (<)' },
  { value: '<=', label: 'Less than or equal (≤)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '>=', label: 'Greater than or equal (≥)' },
  { value: '=', label: 'Equal to (=)' },
  { value: '!=', label: 'Not equal to (≠)' },
];

const CHECK_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'on_demand', label: 'On Demand' },
];

const COMMON_METRICS = [
  { value: 'debt_to_ebitda', label: 'Debt to EBITDA' },
  { value: 'debt_to_equity', label: 'Debt to Equity' },
  { value: 'current_ratio', label: 'Current Ratio' },
  { value: 'interest_coverage', label: 'Interest Coverage' },
  { value: 'roe', label: 'Return on Equity (ROE)' },
  { value: 'roa', label: 'Return on Assets (ROA)' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'net_income', label: 'Net Income' },
  { value: 'ebitda', label: 'EBITDA' },
  { value: 'custom', label: 'Custom Metric' },
];

const CovenantEditModal: React.FC<CovenantEditModalProps> = ({
  isOpen,
  onClose,
  covenant,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<CovenantCreateInput>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [customMetric, setCustomMetric] = useState('');

  // Initialize form data when covenant changes
  useEffect(() => {
    if (covenant) {
      const isCustomMetric = !COMMON_METRICS.some(m => m.value === covenant.metric_name);
      setFormData({
        covenant_name: covenant.covenant_name,
        covenant_type: covenant.covenant_type,
        metric_name: isCustomMetric ? 'custom' : covenant.metric_name,
        operator: covenant.operator,
        threshold_value: covenant.threshold_value,
        threshold_unit: covenant.threshold_unit,
        check_frequency: covenant.check_frequency,
        covenant_clause: covenant.covenant_clause,
      });
      if (isCustomMetric && covenant.metric_name) {
        setCustomMetric(covenant.metric_name);
      }
    }
  }, [covenant]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.covenant_name?.trim()) {
      newErrors.covenant_name = 'Covenant name is required';
    }

    if (formData.threshold_value === undefined || formData.threshold_value === null) {
      newErrors.threshold_value = 'Threshold value is required';
    } else if (isNaN(Number(formData.threshold_value))) {
      newErrors.threshold_value = 'Threshold must be a valid number';
    }

    if (!formData.metric_name) {
      newErrors.metric_name = 'Metric is required';
    } else if (formData.metric_name === 'custom' && !customMetric.trim()) {
      newErrors.metric_name = 'Custom metric name is required';
    }

    if (!formData.check_frequency) {
      newErrors.check_frequency = 'Check frequency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !covenant) return;

    const dataToSave = {
      ...formData,
      metric_name: formData.metric_name === 'custom' ? customMetric : formData.metric_name,
    };

    await onSave(covenant.id, dataToSave);
  };

  const handleInputChange = (field: keyof CovenantCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!covenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Covenant" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Covenant Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Covenant Name *
          </label>
          <Input
            value={formData.covenant_name || ''}
            onChange={(e) => handleInputChange('covenant_name', e.target.value)}
            placeholder="e.g., Maximum Debt to EBITDA Ratio"
            error={errors.covenant_name}
          />
        </div>

        {/* Covenant Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Covenant Type
          </label>
          <Select
            value={formData.covenant_type || 'financial'}
            onChange={(e) => handleInputChange('covenant_type', e.target.value)}
            options={COVENANT_TYPES}
          />
        </div>

        {/* Metric Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric *
          </label>
          <Select
            value={formData.metric_name || ''}
            onChange={(e) => handleInputChange('metric_name', e.target.value)}
            options={COMMON_METRICS}
            error={errors.metric_name}
          />
          {formData.metric_name === 'custom' && (
            <Input
              className="mt-2"
              value={customMetric}
              onChange={(e) => setCustomMetric(e.target.value)}
              placeholder="Enter custom metric name"
            />
          )}
        </div>

        {/* Threshold Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operator
            </label>
            <Select
              value={formData.operator || '<='}
              onChange={(e) => handleInputChange('operator', e.target.value)}
              options={OPERATORS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Threshold Value *
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.threshold_value ?? ''}
              onChange={(e) => handleInputChange('threshold_value', parseFloat(e.target.value))}
              placeholder="e.g., 3.5"
              error={errors.threshold_value}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <Input
              value={formData.threshold_unit || ''}
              onChange={(e) => handleInputChange('threshold_unit', e.target.value)}
              placeholder="e.g., x, %, $M"
            />
          </div>
        </div>

        {/* Check Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check Frequency *
          </label>
          <Select
            value={formData.check_frequency || 'quarterly'}
            onChange={(e) => handleInputChange('check_frequency', e.target.value)}
            options={CHECK_FREQUENCIES}
            error={errors.check_frequency}
          />
        </div>

        {/* Covenant Clause */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Covenant Clause (Original Text)
          </label>
          <textarea
            value={formData.covenant_clause || ''}
            onChange={(e) => handleInputChange('covenant_clause', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            placeholder="Paste the original covenant clause text from the contract..."
          />
        </div>

        {/* AI Extraction Notice */}
        {covenant.gemini_extracted && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">AI-Extracted Covenant</p>
              <p className="text-blue-600 mt-0.5">
                This covenant was automatically extracted by Gemini AI. Please verify the details are accurate.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            leftIcon={<X className="h-4 w-4" />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CovenantEditModal;
