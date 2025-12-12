/**
 * User-Friendly Error Messages
 * Maps API error codes to human-readable messages
 * Requirements: 1.2, 2.5 - Error handling with user-friendly messages
 */

import { ERROR_CODES } from '@/config/api';

export interface ErrorMessageConfig {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
}

/**
 * Map of error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // Authentication errors
  [ERROR_CODES.INVALID_CREDENTIALS]: {
    title: 'Login Failed',
    message: 'The email or password you entered is incorrect. Please try again.',
    action: 'Check your credentials and try again',
    retryable: true,
  },
  [ERROR_CODES.TOKEN_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    action: 'Log in again',
    retryable: false,
  },
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action. Contact your administrator if you need access.',
    retryable: false,
  },

  // Contract errors
  [ERROR_CODES.CONTRACT_NOT_FOUND]: {
    title: 'Contract Not Found',
    message: 'The contract you are looking for could not be found. It may have been deleted or you may not have access.',
    retryable: false,
  },
  [ERROR_CODES.INVALID_CONTRACT_DATA]: {
    title: 'Invalid Contract Data',
    message: 'Some of the contract information is invalid. Please review the form and correct any errors.',
    action: 'Review and correct the form',
    retryable: true,
  },
  [ERROR_CODES.CONTRACT_UPLOAD_FAILED]: {
    title: 'Upload Failed',
    message: 'We could not upload your contract document. Please check the file and try again.',
    action: 'Try uploading again',
    retryable: true,
  },

  // Covenant errors
  [ERROR_CODES.COVENANT_EXTRACTION_FAILED]: {
    title: 'Covenant Extraction Failed',
    message: 'We could not automatically extract covenants from the document. You can add covenants manually or try uploading a clearer document.',
    action: 'Add covenants manually or retry',
    retryable: true,
  },
  [ERROR_CODES.COVENANT_NOT_FOUND]: {
    title: 'Covenant Not Found',
    message: 'The covenant you are looking for could not be found.',
    retryable: false,
  },
  [ERROR_CODES.INVALID_COVENANT_THRESHOLD]: {
    title: 'Invalid Threshold',
    message: 'The covenant threshold value is invalid. Please enter a valid number.',
    action: 'Enter a valid threshold value',
    retryable: true,
  },

  // Financial data errors
  [ERROR_CODES.FINANCIAL_DATA_INVALID]: {
    title: 'Invalid Financial Data',
    message: 'The financial data you entered contains errors. Please review and correct the values.',
    action: 'Review and correct the data',
    retryable: true,
  },
  [ERROR_CODES.FINANCIAL_API_UNAVAILABLE]: {
    title: 'Financial Data Service Unavailable',
    message: 'We are unable to fetch financial data at the moment. Please try again later.',
    action: 'Try again later',
    retryable: true,
  },
  [ERROR_CODES.STALE_FINANCIAL_DATA]: {
    title: 'Outdated Financial Data',
    message: 'The financial data may be outdated. Consider updating with more recent figures.',
    action: 'Update financial data',
    retryable: false,
  },

  // Alert errors
  [ERROR_CODES.ALERT_NOT_FOUND]: {
    title: 'Alert Not Found',
    message: 'The alert you are looking for could not be found.',
    retryable: false,
  },
  [ERROR_CODES.ALERT_ALREADY_ACKNOWLEDGED]: {
    title: 'Already Acknowledged',
    message: 'This alert has already been acknowledged by another user.',
    retryable: false,
  },

  // Multi-tenant errors
  [ERROR_CODES.CROSS_TENANT_ACCESS_DENIED]: {
    title: 'Access Denied',
    message: 'You do not have access to this resource. It belongs to a different organization.',
    retryable: false,
  },
  [ERROR_CODES.BANK_NOT_FOUND]: {
    title: 'Organization Not Found',
    message: 'Your organization could not be found. Please contact support.',
    retryable: false,
  },

  // External service errors
  [ERROR_CODES.GEMINI_API_ERROR]: {
    title: 'AI Service Unavailable',
    message: 'Our AI analysis service is temporarily unavailable. Some features may be limited.',
    action: 'Try again later',
    retryable: true,
  },
  [ERROR_CODES.NEWS_API_ERROR]: {
    title: 'News Service Unavailable',
    message: 'We could not fetch the latest news. Please try again later.',
    action: 'Try again later',
    retryable: true,
  },

  // System errors
  [ERROR_CODES.DATABASE_ERROR]: {
    title: 'System Error',
    message: 'A system error occurred. Our team has been notified. Please try again.',
    action: 'Try again',
    retryable: true,
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    title: 'Validation Error',
    message: 'Please check your input and correct any errors.',
    action: 'Review and correct the form',
    retryable: true,
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Try again',
    retryable: true,
  },
};

/**
 * Default error message for unknown errors
 */
const DEFAULT_ERROR: ErrorMessageConfig = {
  title: 'Error',
  message: 'An unexpected error occurred. Please try again.',
  action: 'Try again',
  retryable: true,
};

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(errorCode: string): ErrorMessageConfig {
  return ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
}

/**
 * Get user-friendly error message from API error object
 */
export function getErrorFromApiError(error: {
  code?: string;
  message?: string;
  details?: string;
}): ErrorMessageConfig {
  if (error.code && ERROR_MESSAGES[error.code]) {
    const config = ERROR_MESSAGES[error.code];
    // If API provides more specific details, append them
    if (error.details) {
      return {
        ...config,
        message: `${config.message} ${error.details}`,
      };
    }
    return config;
  }

  // Fallback to API message if available
  if (error.message) {
    return {
      title: 'Error',
      message: error.message,
      retryable: true,
    };
  }

  return DEFAULT_ERROR;
}

/**
 * HTTP status code to user-friendly message
 */
export function getErrorFromHttpStatus(status: number): ErrorMessageConfig {
  switch (status) {
    case 400:
      return {
        title: 'Invalid Request',
        message: 'The request was invalid. Please check your input and try again.',
        retryable: true,
      };
    case 401:
      return {
        title: 'Authentication Required',
        message: 'Please log in to continue.',
        retryable: false,
      };
    case 403:
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        retryable: false,
      };
    case 404:
      return {
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        retryable: false,
      };
    case 408:
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
        action: 'Try again',
        retryable: true,
      };
    case 422:
      return {
        title: 'Validation Error',
        message: 'Please check your input and correct any errors.',
        retryable: true,
      };
    case 429:
      return {
        title: 'Too Many Requests',
        message: 'You have made too many requests. Please wait a moment and try again.',
        action: 'Wait and try again',
        retryable: true,
      };
    case 500:
      return {
        title: 'Server Error',
        message: 'A server error occurred. Our team has been notified.',
        action: 'Try again later',
        retryable: true,
      };
    case 502:
    case 503:
    case 504:
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again later.',
        action: 'Try again later',
        retryable: true,
      };
    default:
      return DEFAULT_ERROR;
  }
}

/**
 * Network error messages
 */
export function getNetworkErrorMessage(error: Error): ErrorMessageConfig {
  if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'Check connection and retry',
      retryable: true,
    };
  }

  if (error.message.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete. Please try again.',
      action: 'Try again',
      retryable: true,
    };
  }

  return DEFAULT_ERROR;
}
