/**
 * FinancialDataIngestion Component
 * Interface for adding financial data to borrowers
 * Requirements: 5.1, 5.2, 5.3 - Financial data ingestion and ratio calculation
 */

import React, { useState } from 'react';
import {
  Upload,
  DollarSign,
  Calendar,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import type { FinancialMetricsInput, Borrower } from '../../types';

interface FinancialDataIngestionProps {
  borrower: Borrower;
  onSubmit: (data: FinancialMetricsInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const PERIOD_TYPES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const DATA_SOURCES = [
  { value: 'manual_entry', label: 'Manual Entry' },
  { value: 'sec_filing', label: 'SEC Filing' },
  { value: 'company_report', label: 'Company Report' },
  { value: 'third_party', label: 'Third Party Provider' },
  { value: 'api_import', label: 'API Import' },
];

const FinancialDataIngestion: React.FC<FinancialDataIngestionProps> = ({
  borrower,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<FinancialMetricsInput>>({
    borrower_id: borrower.id,
    period_date: '',
    period_type: 'quarterly',
    source: 'manual_entry',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (field: keyof FinancialMetricsInput, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNumberInput = (field: keyof FinancialMetricsInput, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleInputChange(field, numValue as number);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.period_date) {
      newErrors.period_date = 'Period date is required';
    }

    if (!formData.period_type) {
      newErrors.period_type = 'Period type is required';
    }

    if (!formData.source) {
      newErrors.source = 'Data source is required';
    }

    // At least one financial metric should be provided
    const hasMetric =
      formData.debt_total !== undefined ||
      formData.ebitda !== undefined ||
      formData.revenue !== undefined ||
      formData.current_assets !== undefined ||
      formData.current_liabilities !== undefined;

    if (!hasMetric) {
      newErrors.general = 'At least one financial metric is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitStatus('idle');
      await onSubmit(formData as FinancialMetricsInput);
      setSubmitStatus('success');
      setSubmitMessage('Financial data saved successfully. Covenant health will be recalculated.');
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          borrower_id: borrower.id,
          period_date: '',
          period_type: 'quarterly',
          source: 'manual_entry',
        });
        setSubmitStatus('idle');
      }, 3000);
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to save financial data');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Add Financial Data</h3>
            <p className="text-sm text-gray-500">
              Enter financial metrics for {borrower.legal_name}
            </p>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">{submitMessage}</span>
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{submitMessage}</span>
            </div>
          )}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{errors.general}</span>
            </div>
          )}

          {/* Period Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Date *
              </label>
              <Input
                type="date"
                value={formData.period_date || ''}
                onChange={(e) => handleInputChange('period_date', e.target.value)}
                error={errors.period_date}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Type *
              </label>
              <Select
                value={formData.period_type || ''}
                onChange={(e) => handleInputChange('period_type', e.target.value as any)}
                options={PERIOD_TYPES}
                error={errors.period_type}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source *
              </label>
              <Select
                value={formData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                options={DATA_SOURCES}
                error={errors.source}
              />
            </div>
          </div>

          {/* Balance Sheet Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              Balance Sheet Items
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total Debt</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.debt_total ?? ''}
                  onChange={(e) => handleNumberInput('debt_total', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total Equity</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.equity_total ?? ''}
                  onChange={(e) => handleNumberInput('equity_total', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Assets</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.current_assets ?? ''}
                  onChange={(e) => handleNumberInput('current_assets', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Liabilities</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.current_liabilities ?? ''}
                  onChange={(e) => handleNumberInput('current_liabilities', e.target.value)}
                />
              </div>
            </div>
          </div>


          {/* Income Statement Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              Income Statement Items
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Revenue</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.revenue ?? ''}
                  onChange={(e) => handleNumberInput('revenue', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">EBITDA</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.ebitda ?? ''}
                  onChange={(e) => handleNumberInput('ebitda', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Net Income</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.net_income ?? ''}
                  onChange={(e) => handleNumberInput('net_income', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Interest Expense</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.interest_expense ?? ''}
                  onChange={(e) => handleNumberInput('interest_expense', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Cash Flow Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-gray-400" />
              Cash Flow Items
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Operating Cash Flow</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.operating_cash_flow ?? ''}
                  onChange={(e) => handleNumberInput('operating_cash_flow', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Capital Expenditure</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.capex ?? ''}
                  onChange={(e) => handleNumberInput('capex', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Calculated Ratios Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Automatic Ratio Calculation</h4>
                <p className="text-sm text-blue-700 mt-1">
                  The following ratios will be automatically calculated based on the data you provide:
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• <strong>Debt/EBITDA</strong> = Total Debt ÷ EBITDA</li>
                  <li>• <strong>Current Ratio</strong> = Current Assets ÷ Current Liabilities</li>
                  <li>• <strong>Interest Coverage</strong> = EBITDA ÷ Interest Expense</li>
                  <li>• <strong>Debt/Equity</strong> = Total Debt ÷ Total Equity</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 bg-gray-50">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Financial Data
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default FinancialDataIngestion;
