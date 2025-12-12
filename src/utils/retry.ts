/**
 * Retry Mechanism Utilities
 * Provides retry logic for failed operations with exponential backoff
 * Requirements: 1.2, 2.5 - Build retry mechanisms for failed operations
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Callback called before each retry */
  onRetry?: (error: any, attempt: number, delay: number) => void;
  /** Callback called when all retries are exhausted */
  onMaxRetriesReached?: (error: any) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onMaxRetriesReached'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Calculate delay for a given attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        if (opts.onMaxRetriesReached) {
          opts.onMaxRetriesReached(error);
        }
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      if (opts.onRetry) {
        opts.onRetry(error, attempt, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Determine if an error is retryable based on common patterns
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
    return true;
  }

  // Timeout errors are retryable
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (error.response?.status >= 500) {
    return true;
  }

  // Rate limiting (429) is retryable
  if (error.response?.status === 429) {
    return true;
  }

  // Specific error codes that are retryable
  const retryableCodes = [
    'GEMINI_API_ERROR',
    'NEWS_API_ERROR',
    'FINANCIAL_API_UNAVAILABLE',
    'DATABASE_ERROR',
  ];
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  return false;
}

/**
 * Create a retry wrapper with preset options
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}

/**
 * Retry wrapper specifically for API calls
 */
export const retryApiCall = createRetryWrapper({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  shouldRetry: isRetryableError,
});

/**
 * Retry wrapper for critical operations (more attempts, longer delays)
 */
export const retryCriticalOperation = createRetryWrapper({
  maxAttempts: 5,
  initialDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: isRetryableError,
});

/**
 * Hook-friendly retry state manager
 */
export interface RetryState {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
  lastError: any | null;
  nextRetryIn: number | null;
}

export interface UseRetryResult<T> {
  execute: () => Promise<T>;
  reset: () => void;
  state: RetryState;
}

/**
 * Create a retry executor with state tracking
 * Useful for UI components that need to show retry status
 */
export function createRetryExecutor<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): {
  execute: () => Promise<T>;
  getState: () => RetryState;
  reset: () => void;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let state: RetryState = {
    isRetrying: false,
    attempt: 0,
    maxAttempts: opts.maxAttempts,
    lastError: null,
    nextRetryIn: null,
  };

  const reset = () => {
    state = {
      isRetrying: false,
      attempt: 0,
      maxAttempts: opts.maxAttempts,
      lastError: null,
      nextRetryIn: null,
    };
  };

  const execute = async (): Promise<T> => {
    reset();
    state.isRetrying = true;

    try {
      return await withRetry(fn, {
        ...opts,
        onRetry: (error, attempt, delay) => {
          state.attempt = attempt;
          state.lastError = error;
          state.nextRetryIn = delay;
          opts.onRetry?.(error, attempt, delay);
        },
        onMaxRetriesReached: (error) => {
          state.lastError = error;
          state.isRetrying = false;
          opts.onMaxRetriesReached?.(error);
        },
      });
    } finally {
      state.isRetrying = false;
      state.nextRetryIn = null;
    }
  };

  return {
    execute,
    getState: () => ({ ...state }),
    reset,
  };
}

/**
 * Debounced retry - prevents rapid retry attempts
 */
export function createDebouncedRetry<T>(
  fn: () => Promise<T>,
  debounceMs: number = 500,
  options: RetryOptions = {}
): () => Promise<T> {
  let lastCallTime = 0;
  let pendingPromise: Promise<T> | null = null;

  return async (): Promise<T> => {
    const now = Date.now();
    
    // If called too quickly, return the pending promise
    if (pendingPromise && now - lastCallTime < debounceMs) {
      return pendingPromise;
    }

    lastCallTime = now;
    pendingPromise = withRetry(fn, options);

    try {
      return await pendingPromise;
    } finally {
      pendingPromise = null;
    }
  };
}
