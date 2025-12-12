/**
 * GeminiRiskAssessment Component
 * Displays AI-powered risk assessment from Gemini
 * Requirements: 3.5 - Gemini AI risk assessment and recommended actions
 */

import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Shield,
  Clock
} from 'lucide-react';
import type { RiskAssessment, CovenantHealth } from '../../types';

interface GeminiRiskAssessmentProps {
  health: CovenantHealth;
  riskAssessment?: RiskAssessment;
  compact?: boolean;
}

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({ score, size = 'md' }) => {
  // Score is 1-10, where 1 is lowest risk and 10 is highest
  const normalizedScore = Math.max(1, Math.min(10, score));
  const percentage = (normalizedScore / 10) * 100;
  
  const getColor = () => {
    if (normalizedScore <= 3) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Low Risk' };
    if (normalizedScore <= 6) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Medium Risk' };
    if (normalizedScore <= 8) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'High Risk' };
    return { bg: 'bg-red-500', text: 'text-red-600', label: 'Critical Risk' };
  };

  const { text, label } = getColor();

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-20 h-20', text: 'text-xl', label: 'text-xs' },
    lg: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm' },
  };

  const { container, text: textSize, label: labelSize } = sizeClasses[size];

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${container}`}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.83} 283`}
            className={text}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${textSize} ${text}`}>{normalizedScore}</span>
        </div>
      </div>
      <span className={`mt-1 font-medium ${labelSize} ${text}`}>{label}</span>
    </div>
  );
};

const GeminiRiskAssessment: React.FC<GeminiRiskAssessmentProps> = ({
  health,
  riskAssessment,
  compact = false,
}) => {
  // Parse risk assessment from health data if not provided separately
  const assessment = riskAssessment || {
    risk_score: health.status === 'breached' ? 9 : health.status === 'warning' ? 6 : 3,
    risk_factors: [],
    recommended_actions: health.recommended_action ? [health.recommended_action] : [],
    assessment_summary: health.gemini_risk_assessment || 'No AI assessment available',
    confidence_level: 0.8,
  };

  const getTrendIcon = () => {
    switch (health.trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'deteriorating':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendLabel = () => {
    switch (health.trend) {
      case 'improving':
        return 'Improving';
      case 'deteriorating':
        return 'Deteriorating';
      default:
        return 'Stable';
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-100">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-purple-700 mb-1">AI Risk Assessment</p>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
              {assessment.assessment_summary}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <h3 className="font-semibold text-white">Gemini AI Risk Assessment</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Risk Score and Trend */}
        <div className="flex items-center justify-between">
          <RiskScoreGauge score={assessment.risk_score} size="md" />
          
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              {getTrendIcon()}
              <span className="text-sm font-medium text-gray-700">{getTrendLabel()}</span>
            </div>
            {health.buffer_percentage !== undefined && (
              <p className="text-xs text-gray-500">
                Buffer: {health.buffer_percentage.toFixed(1)}%
              </p>
            )}
            {health.days_to_breach !== undefined && health.days_to_breach > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ~{health.days_to_breach} days to potential breach
              </p>
            )}
          </div>
        </div>

        {/* Assessment Summary */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {assessment.assessment_summary}
          </p>
          {assessment.confidence_level && (
            <p className="text-xs text-gray-400 mt-2">
              Confidence: {(assessment.confidence_level * 100).toFixed(0)}%
            </p>
          )}
        </div>

        {/* Risk Factors */}
        {assessment.risk_factors && assessment.risk_factors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="text-sm font-medium text-gray-700">Risk Factors</h4>
            </div>
            <ul className="space-y-1">
              {assessment.risk_factors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-orange-400 mt-1">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {assessment.recommended_actions && assessment.recommended_actions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-medium text-gray-700">Recommended Actions</h4>
            </div>
            <ul className="space-y-2">
              {assessment.recommended_actions.map((action, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg p-2"
                >
                  <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-blue-800">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${
              health.status === 'compliant' ? 'text-green-500' :
              health.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-700 capitalize">
              {health.status} Status
            </span>
          </div>
          {health.last_calculated && (
            <span className="text-xs text-gray-400">
              Updated: {new Date(health.last_calculated).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeminiRiskAssessment;
