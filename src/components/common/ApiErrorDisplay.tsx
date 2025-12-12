/**
 * ApiErrorDisplay Component
 * Displays API errors with user-friendly messages and retry options
 * Requirements: 1.2, 2.5 - API error handling with user-friendly messages
 */

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react';
import Button from './Button';
import { ErrorMessageConfig } from '@/utils/errorMessages';

interface ApiErrorDisplayProps {
  /** Error configuration with title and message */
  error: ErrorMessageConfig | null;
  /** Whether the error is retryable */
  isRetryable?: boolean;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as inline or block */
  inline?: boolean;
}

const ApiErrorDisplay: React.FC<ApiErrorDisplayProps> = ({
  error,
  isRetryable = true,
  onRetry,
  isRetrying = false,
  className = '',
  size = 'md',
  inline = false,
}) => {
  if (!error) return null;

  // Determine icon based on error type
  const getIcon = () => {
    const title = error.title.toLowerCase();
    if (title.includes('connection') || title.includes('network')) {
      return WifiOff;
    }
    if (title.includes('server') || title.includes('service')) {
      return ServerCrash;
    }
    if (title.includes('access') || title.includes('permission') || title.includes('auth')) {
      return ShieldAlert;
    }
    return AlertCircle;
  };

  const Icon = getIcon();

  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'h-4 w-4',
      title: 'text-sm',
      message: 'text-xs',
      button: 'text-xs px-2 py-1',
    },
    md: {
      container: 'p-4',
      icon: 'h-5 w-5',
      title: 'text-base',
      message: 'text-sm',
      button: 'text-sm px-3 py-1.5',
    },
    lg: {
      container: 'p-6',
      icon: 'h-6 w-6',
      title: 'text-lg',
      message: 'text-base',
      button: 'text-base px-4 py-2',
    },
  };

  const classes = sizeClasses[size];

  if (inline) {
    return (
      <div
        className={`flex items-center gap-2 text-red-600 ${className}`}
        role="alert"
      >
        <Icon className={classes.icon} />
        <span className={classes.message}>{error.message}</span>
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="text-red-700 hover:text-red-800 underline ml-1"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg ${classes.container} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="p-2 bg-red-100 rounded-full">
            <Icon className={`${classes.icon} text-red-600`} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-red-800 ${classes.title}`}>
            {error.title}
          </h4>
          <p className={`text-red-700 mt-1 ${classes.message}`}>
            {error.message}
          </p>
          {error.action && (
            <p className={`text-red-600 mt-1 ${classes.message} italic`}>
              {error.action}
            </p>
          )}
          {isRetryable && onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiErrorDisplay;

/**
 * Compact error message for form fields
 */
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <p className={`text-sm text-red-600 mt-1 flex items-center gap-1 ${className}`}>
      <AlertCircle className="h-3 w-3" />
      {error}
    </p>
  );
};

/**
 * Error summary for forms with multiple errors
 */
interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  className = '',
}) => {
  const errorList = Object.entries(errors);

  if (errorList.length === 0) return null;

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h4>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
            {errorList.map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
