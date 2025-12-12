/**
 * Alert Severity Badge Component
 * Displays severity indicators with appropriate color coding
 * Requirements: 4.1, 4.2 - Alert severity classification
 */

import React from 'react';
import clsx from 'clsx';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface AlertSeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const severityConfig = {
  critical: {
    icon: XCircle,
    label: 'Critical',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    iconColor: 'text-red-600',
    dotColor: 'bg-red-500',
  },
  high: {
    icon: AlertCircle,
    label: 'High',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    iconColor: 'text-orange-600',
    dotColor: 'bg-orange-500',
  },
  medium: {
    icon: AlertTriangle,
    label: 'Medium',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    iconColor: 'text-yellow-600',
    dotColor: 'bg-yellow-500',
  },
  low: {
    icon: Info,
    label: 'Low',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    iconColor: 'text-blue-600',
    dotColor: 'bg-blue-500',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'h-3 w-3',
    dot: 'h-1.5 w-1.5',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-xs',
    icon: 'h-4 w-4',
    dot: 'h-2 w-2',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'h-5 w-5',
    dot: 'h-2.5 w-2.5',
  },
};

const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}) => {
  // Defensive check for undefined or invalid severity
  const config = severityConfig[severity] || severityConfig.medium;
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  // Return fallback if severity is completely invalid
  if (!severity || !severityConfig[severity]) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-gray-100 text-gray-600 border-gray-300">
        <Info className="h-4 w-4 text-gray-500" />
        Unknown
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeStyles.padding,
        sizeStyles.text,
        className
      )}
    >
      {showIcon && <Icon className={clsx(sizeStyles.icon, config.iconColor)} />}
      {showLabel && config.label}
      {!showIcon && !showLabel && (
        <span className={clsx('rounded-full', config.dotColor, sizeStyles.dot)} />
      )}
    </span>
  );
};

export default AlertSeverityBadge;
