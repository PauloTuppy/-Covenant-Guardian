/**
 * Query Optimizer Utilities
 * Database query optimization, caching, and performance monitoring
 * Requirements: 9.1, 10.1, 10.4
 */

// ===== QUERY CACHE =====

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 100;

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
    };
  }
}

export const queryCache = new QueryCache();

// ===== QUERY OPTIMIZATION HELPERS =====

/**
 * Generate optimized cache key from query parameters
 */
export function generateCacheKey(
  endpoint: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}

/**
 * Batch multiple IDs into optimized query
 */
export function batchIds(ids: string[], batchSize: number = 50): string[][] {
  const batches: string[][] = [];
  
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Debounce function for search queries
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Throttle function for frequent updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}

// ===== PAGINATION OPTIMIZATION =====

export interface PaginationConfig {
  page: number;
  limit: number;
  total?: number;
}

/**
 * Calculate optimal page size based on viewport
 */
export function calculateOptimalPageSize(
  rowHeight: number = 48,
  headerHeight: number = 64,
  footerHeight: number = 64
): number {
  const viewportHeight = window.innerHeight;
  const availableHeight = viewportHeight - headerHeight - footerHeight;
  const optimalRows = Math.floor(availableHeight / rowHeight);
  
  // Clamp between 10 and 100
  return Math.max(10, Math.min(100, optimalRows));
}

/**
 * Generate pagination metadata
 */
export function generatePaginationMeta(config: PaginationConfig): {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPages: number;
  startIndex: number;
  endIndex: number;
} {
  const { page, limit, total = 0 } = config;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit - 1, total - 1);
  
  return {
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    totalPages,
    startIndex,
    endIndex,
  };
}

// ===== QUERY PERFORMANCE MONITORING =====

interface QueryMetrics {
  endpoint: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  size?: number;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private maxMetrics: number = 1000;

  /**
   * Record query execution
   */
  record(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get average query duration by endpoint
   */
  getAverageDuration(endpoint?: string): number {
    const filtered = endpoint
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filtered.length === 0) return 0;
    
    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * Get slow queries (above threshold)
   */
  getSlowQueries(thresholdMs: number = 1000): QueryMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const cached = this.metrics.filter(m => m.cached).length;
    return cached / this.metrics.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalQueries: number;
    avgDuration: number;
    cacheHitRate: number;
    slowQueries: number;
  } {
    return {
      totalQueries: this.metrics.length,
      avgDuration: this.getAverageDuration(),
      cacheHitRate: this.getCacheHitRate(),
      slowQueries: this.getSlowQueries().length,
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

export const queryMonitor = new QueryPerformanceMonitor();

// ===== OPTIMIZED FETCH WRAPPER =====

interface FetchOptions extends RequestInit {
  cache?: boolean;
  cacheTtl?: number;
  timeout?: number;
}

/**
 * Optimized fetch with caching and monitoring
 */
export async function optimizedFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { cache = true, cacheTtl = 60000, timeout = 30000, ...fetchOptions } = options;
  const cacheKey = generateCacheKey(url, fetchOptions);
  const startTime = Date.now();
  
  // Check cache first
  if (cache && fetchOptions.method !== 'POST') {
    const cached = queryCache.get<T>(cacheKey);
    if (cached) {
      queryMonitor.record({
        endpoint: url,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        cached: true,
      });
      return cached;
    }
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache successful GET requests
    if (cache && fetchOptions.method !== 'POST') {
      queryCache.set(cacheKey, data, cacheTtl);
    }
    
    queryMonitor.record({
      endpoint: url,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      cached: false,
      size: JSON.stringify(data).length,
    });
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    queryMonitor.record({
      endpoint: url,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      cached: false,
    });
    
    throw error;
  }
}

// ===== DATABASE INDEX RECOMMENDATIONS =====

/**
 * Get recommended indexes for common query patterns
 */
export function getRecommendedIndexes(): string[] {
  return [
    // Multi-tenant composite indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_bank_status_date ON contracts(bank_id, status, created_at DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_bank_contract_type ON covenants(bank_id, contract_id, covenant_type)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_bank_status_severity_date ON alerts(bank_id, status, severity, triggered_at DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenant_health_bank_status ON covenant_health(bank_id, status, last_calculated DESC)',
    
    // Financial data indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_borrower_period ON financial_metrics(borrower_id, period_date DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adverse_events_borrower_risk ON adverse_events(borrower_id, risk_score DESC, event_date DESC)',
    
    // Dashboard query indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_borrower_principal ON contracts(borrower_id, principal_amount) WHERE status = \'active\'',
    
    // Audit log indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_bank_action_date ON audit_logs(bank_id, action, created_at DESC)',
    
    // Partial indexes for common filters
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_new ON alerts(bank_id, triggered_at DESC) WHERE status = \'new\'',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_covenants_breached ON covenant_health(bank_id, covenant_id) WHERE status = \'breached\'',
  ];
}

/**
 * Get query optimization suggestions
 */
export function getQueryOptimizationSuggestions(): string[] {
  return [
    'Use LIMIT with OFFSET for pagination instead of fetching all records',
    'Add covering indexes for frequently accessed columns',
    'Use materialized views for complex aggregations',
    'Implement connection pooling for database connections',
    'Use prepared statements to avoid SQL parsing overhead',
    'Consider partitioning large tables by date or bank_id',
    'Use EXPLAIN ANALYZE to identify slow query patterns',
    'Implement read replicas for heavy read workloads',
  ];
}

// ===== EXPORT =====

export const QueryOptimizer = {
  queryCache,
  queryMonitor,
  generateCacheKey,
  batchIds,
  debounce,
  throttle,
  calculateOptimalPageSize,
  generatePaginationMeta,
  optimizedFetch,
  getRecommendedIndexes,
  getQueryOptimizationSuggestions,
};

export default QueryOptimizer;
