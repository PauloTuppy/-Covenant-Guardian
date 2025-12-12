/**
 * Rate Limiter Utility
 * Client-side rate limiting for API requests
 * Requirements: 9.1, 10.1, 10.4
 */

// ===== RATE LIMITER CONFIGURATION =====

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitState {
  requests: number[];
  blockedUntil: number | null;
}

// Default rate limit configurations by endpoint type
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  auth: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000, // 5 minutes block after exceeding
  },
  // Standard API endpoints
  api: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    blockDurationMs: 60000, // 1 minute block
  },
  // Heavy operations (reports, exports)
  heavy: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    blockDurationMs: 120000, // 2 minutes block
  },
  // AI/Gemini operations
  ai: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    blockDurationMs: 180000, // 3 minutes block
  },
};

// ===== RATE LIMITER CLASS =====

class RateLimiter {
  private states: Map<string, RateLimitState> = new Map();
  private storageKey = 'rate_limit_states';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Check if request is allowed under rate limit
   */
  public isAllowed(endpoint: string, configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'): boolean {
    const config = RATE_LIMIT_CONFIGS[configType];
    const state = this.getState(endpoint);
    const now = Date.now();

    // Check if currently blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      return false;
    }

    // Clear block if expired
    if (state.blockedUntil && now >= state.blockedUntil) {
      state.blockedUntil = null;
    }

    // Clean old requests outside the window
    state.requests = state.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    // Check if under limit
    return state.requests.length < config.maxRequests;
  }

  /**
   * Record a request
   */
  public recordRequest(endpoint: string, configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'): void {
    const config = RATE_LIMIT_CONFIGS[configType];
    const state = this.getState(endpoint);
    const now = Date.now();

    // Clean old requests
    state.requests = state.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    // Add new request
    state.requests.push(now);

    // Check if limit exceeded and should block
    if (state.requests.length >= config.maxRequests && config.blockDurationMs) {
      state.blockedUntil = now + config.blockDurationMs;
    }

    this.setState(endpoint, state);
    this.saveToStorage();
  }

  /**
   * Get remaining requests in current window
   */
  public getRemainingRequests(endpoint: string, configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'): number {
    const config = RATE_LIMIT_CONFIGS[configType];
    const state = this.getState(endpoint);
    const now = Date.now();

    // Clean old requests
    const activeRequests = state.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxRequests - activeRequests.length);
  }

  /**
   * Get time until rate limit resets
   */
  public getResetTime(endpoint: string, configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'): number {
    const config = RATE_LIMIT_CONFIGS[configType];
    const state = this.getState(endpoint);
    const now = Date.now();

    // If blocked, return block end time
    if (state.blockedUntil && now < state.blockedUntil) {
      return state.blockedUntil - now;
    }

    // Find oldest request in window
    const oldestRequest = state.requests
      .filter(timestamp => now - timestamp < config.windowMs)
      .sort((a, b) => a - b)[0];

    if (!oldestRequest) return 0;

    return Math.max(0, (oldestRequest + config.windowMs) - now);
  }

  /**
   * Check if endpoint is currently blocked
   */
  public isBlocked(endpoint: string): boolean {
    const state = this.getState(endpoint);
    const now = Date.now();
    return state.blockedUntil !== null && now < state.blockedUntil;
  }

  /**
   * Get block remaining time in ms
   */
  public getBlockRemainingTime(endpoint: string): number {
    const state = this.getState(endpoint);
    const now = Date.now();
    
    if (!state.blockedUntil || now >= state.blockedUntil) {
      return 0;
    }
    
    return state.blockedUntil - now;
  }

  /**
   * Clear rate limit state for endpoint
   */
  public clearEndpoint(endpoint: string): void {
    this.states.delete(endpoint);
    this.saveToStorage();
  }

  /**
   * Clear all rate limit states
   */
  public clearAll(): void {
    this.states.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get rate limit info for display
   */
  public getRateLimitInfo(endpoint: string, configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'): {
    remaining: number;
    resetIn: number;
    isBlocked: boolean;
    blockRemainingTime: number;
  } {
    return {
      remaining: this.getRemainingRequests(endpoint, configType),
      resetIn: this.getResetTime(endpoint, configType),
      isBlocked: this.isBlocked(endpoint),
      blockRemainingTime: this.getBlockRemainingTime(endpoint),
    };
  }

  // ===== PRIVATE METHODS =====

  private getState(endpoint: string): RateLimitState {
    if (!this.states.has(endpoint)) {
      this.states.set(endpoint, { requests: [], blockedUntil: null });
    }
    return this.states.get(endpoint)!;
  }

  private setState(endpoint: string, state: RateLimitState): void {
    this.states.set(endpoint, state);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.states = new Map(Object.entries(data));
      }
    } catch {
      this.states = new Map();
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, RateLimitState> = {};
      this.states.forEach((state, key) => {
        data[key] = state;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Storage might be full, clear old data
      this.clearAll();
    }
  }
}

// ===== RATE LIMIT MIDDLEWARE =====

/**
 * Create rate-limited fetch wrapper
 */
export function createRateLimitedFetch(
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): (url: string, options?: RequestInit) => Promise<Response> {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const endpoint = new URL(url, window.location.origin).pathname;
    
    if (!rateLimiter.isAllowed(endpoint, configType)) {
      const info = rateLimiter.getRateLimitInfo(endpoint, configType);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(info.resetIn / 1000)} seconds.`,
        info
      );
    }
    
    rateLimiter.recordRequest(endpoint, configType);
    return fetch(url, options);
  };
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public readonly rateLimitInfo: {
    remaining: number;
    resetIn: number;
    isBlocked: boolean;
    blockRemainingTime: number;
  };

  constructor(message: string, info: RateLimitError['rateLimitInfo']) {
    super(message);
    this.name = 'RateLimitError';
    this.rateLimitInfo = info;
  }
}

/**
 * Determine rate limit config type from URL
 */
export function getConfigTypeFromUrl(url: string): keyof typeof RATE_LIMIT_CONFIGS {
  const path = url.toLowerCase();
  
  if (path.includes('/auth/')) return 'auth';
  if (path.includes('/reports/') || path.includes('/export')) return 'heavy';
  if (path.includes('/gemini') || path.includes('/extraction')) return 'ai';
  
  return 'api';
}

// ===== EXPORT SINGLETON =====

export const rateLimiter = new RateLimiter();

export default rateLimiter;
