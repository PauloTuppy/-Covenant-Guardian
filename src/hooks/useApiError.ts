/**
 * useApiError Hook
 * Handles API errors with user-friendly messages and toast notifications
 * Requirements: 1.2, 2.5 - API error handling with user-friendly messages
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/store/uiStore';
import {
  getErrorFromApiError,
  getErrorFromHttpStatus,
  getNetworkErrorMessage,
  ErrorMessageConfig,
} from '@/utils/errorMessages';
import { isRetryableError } from '@/utils/retry';

export interface ApiErrorState {
  hasError: boolean;
  error: ErrorMessageConfig | null;
  originalError: any | null;
  isRetryable: boolean;
}

export interface UseApiErrorResult {
  /** Current error state */
  errorState: ApiErrorState;
  /** Handle an error and optionally show toast */
  handleError: (error: any, showToast?: boolean) => ErrorMessageConfig;
  /** Clear the current error */
  clearError: () => void;
  /** Show error as toast notification */
  showErrorToast: (error: any) => void;
  /** Check if an error is retryable */
  checkRetryable: (error: any) => boolean;
}

/**
 * Hook for handling API errors with user-friendly messages
 */
export function useApiError(): UseApiErrorResult {
  const toast = useToast();
  const [errorState, setErrorState] = useState<ApiErrorState>({
    hasError: false,
    error: null,
    originalError: null,
    isRetryable: false,
  });

  /**
   * Parse error and return user-friendly message
   */
  const parseError = useCallback((error: any): ErrorMessageConfig => {
    // Handle axios/fetch errors with response
    if (error.response) {
      const { status, data } = error.response;
      
      // Check if response has our API error format
      if (data?.error) {
        return getErrorFromApiError(data.error);
      }
      
      // Fall back to HTTP status code
      return getErrorFromHttpStatus(status);
    }

    // Handle network errors
    if (error.message && (
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('timeout')
    )) {
      return getNetworkErrorMessage(error);
    }

    // Handle our custom API error format
    if (error.code) {
      return getErrorFromApiError(error);
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        title: 'Error',
        message: error.message,
        retryable: true,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        title: 'Error',
        message: error,
        retryable: true,
      };
    }

    // Default fallback
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      retryable: true,
    };
  }, []);

  /**
   * Handle an error and update state
   */
  const handleError = useCallback((error: any, showToast = false): ErrorMessageConfig => {
    const errorConfig = parseError(error);
    const retryable = isRetryableError(error);

    setErrorState({
      hasError: true,
      error: errorConfig,
      originalError: error,
      isRetryable: retryable,
    });

    if (showToast) {
      toast.error(errorConfig.title, errorConfig.message);
    }

    return errorConfig;
  }, [parseError, toast]);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      originalError: null,
      isRetryable: false,
    });
  }, []);

  /**
   * Show error as toast notification
   */
  const showErrorToast = useCallback((error: any) => {
    const errorConfig = parseError(error);
    toast.error(errorConfig.title, errorConfig.message);
  }, [parseError, toast]);

  /**
   * Check if an error is retryable
   */
  const checkRetryable = useCallback((error: any): boolean => {
    return isRetryableError(error);
  }, []);

  return {
    errorState,
    handleError,
    clearError,
    showErrorToast,
    checkRetryable,
  };
}

/**
 * Hook for async operations with built-in error handling
 */
export interface UseAsyncOperationOptions {
  /** Show toast on error */
  showToastOnError?: boolean;
  /** Show toast on success */
  showToastOnSuccess?: boolean;
  /** Success message */
  successMessage?: string;
  /** Success title */
  successTitle?: string;
}

export interface UseAsyncOperationResult<T> {
  /** Execute the async operation */
  execute: (...args: any[]) => Promise<T | undefined>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ErrorMessageConfig | null;
  /** Clear error */
  clearError: () => void;
  /** Data from successful operation */
  data: T | null;
}

export function useAsyncOperation<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationResult<T> {
  const {
    showToastOnError = true,
    showToastOnSuccess = false,
    successMessage,
    successTitle = 'Success',
  } = options;

  const toast = useToast();
  const { handleError, clearError, errorState } = useApiError();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T | undefined> => {
    setIsLoading(true);
    clearError();

    try {
      const result = await asyncFn(...args);
      setData(result);

      if (showToastOnSuccess && successMessage) {
        toast.success(successTitle, successMessage);
      }

      return result;
    } catch (error) {
      handleError(error, showToastOnError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, clearError, handleError, showToastOnError, showToastOnSuccess, successMessage, successTitle, toast]);

  return {
    execute,
    isLoading,
    error: errorState.error,
    clearError,
    data,
  };
}

export default useApiError;
