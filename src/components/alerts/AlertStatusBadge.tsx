/**
 * Alert Status Badge Component
 * Displays alert status with escalation indicators
 * Requirements: 4.4, 4.5 - Alert acknowledgment and escalation status
 */

import React from 'react';
import clsx from 'clsx';
import { CheckCircle, Clock, ArrowUpCircle, CheckCheck } from 'lucide-react';

interface AlertStatusBadgeProps {
  status: 'new' | 'acknowledged' | 'resolved' | 'escalated';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  new: {
    icon: Clock,
    label: 'New',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  acknowledged: {
    icon: CheckCircle,
    label: 'Acknowledged',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
  },
  resolved: {
    icon: CheckCheck,
    label: 'Resolved',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
  },
  escalated: {
    icon: ArrowUpCircle,
    label: 'Escalated',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-500',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'h-3 w-3',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-xs',
    icon: 'h-4 w-4',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'h-5 w-5',
  },
};

const AlertStatusBadge: React.FC<AlertStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className,
}) => {
  // Defensive check for undefined or invalid status
  const config = statusConfig[status] || statusConfig.new;
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  // Return fallback if status is completely invalid
  if (!status || !statusConfig[status]) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border bg-gray-50 text-gray-500 border-gray-200">
        <Clock className="h-4 w-4 text-gray-400" />
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
      {config.label}
    </span>
  );
};

export default AlertStatusBadge;
