/**
 * API Configuration for Covenant Guardian
 * Handles Xano API integration and environment-specific settings
 */

import { ENV } from './env';

export const API_CONFIG = {
  baseURL: ENV.API_BASE_URL,
  environment: ENV.ENVIRONMENT,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// API Endpoints structure
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },

  // Contract Management
  contracts: {
    list: '/contracts',
    create: '/contracts',
    get: (id: string) => `/contracts/${id}`,
    update: (id: string) => `/contracts/${id}`,
    delete: (id: string) => `/contracts/${id}`,
    upload: '/contracts/upload',
  },

  // Covenant Operations
  covenants: {
    list: '/covenants',
    get: (id: string) => `/covenants/${id}`,
    update: (id: string) => `/covenants/${id}`,
    health: '/covenant_health', // Xano endpoint name
    healthById: (id: string) => `/covenants/${id}`, // Get single covenant
    extractionStatus: (contractId: string) => `/contracts/${contractId}/covenants/extraction-status`,
  },

  // Alert Management
  alerts: {
    list: '/alerts', // Xano endpoint name
    get: (id: string) => `/alerts/${id}`,
    acknowledge: (id: string) => `/alerts/${id}/acknowledge`,
    resolve: (id: string) => `/alerts/${id}/resolve`,
  },

  // Financial Data
  financialMetrics: {
    ingest: '/financial-metrics/ingest',
    get: (borrowerId: string) => `/borrowers/${borrowerId}/financials`,
    ratios: (borrowerId: string) => `/borrowers/${borrowerId}/ratios`,
  },

  // Borrower Management
  borrowers: {
    list: '/borrowers',
    create: '/borrowers',
    get: (id: string) => `/borrowers/${id}`,
    update: (id: string) => `/borrowers/${id}`,
  },

  // Dashboard & Analytics
  dashboard: {
    portfolioSummary: '/portfolio_summary', // Xano endpoint name
    riskMetrics: '/covenant_health', // Use covenant_health for risk metrics
    alerts: '/alerts', // Xano endpoint name
  },

  // Reports
  reports: {
    generate: '/reports/generate',
    list: '/reports',
    get: (id: string) => `/reports/${id}`,
    download: (id: string) => `/reports/${id}/download`,
  },

  // Adverse Events
  adverseEvents: {
    list: '/adverse-events',
    create: '/adverse-events',
    get: (id: string) => `/adverse-events/${id}`,
  },

  // Xano Integration
  xano: {
    covenantExtraction: {
      queue: '/xano/covenant-extraction/queue',
      jobs: (id: string) => `/xano/covenant-extraction/jobs/${id}`,
      immediate: '/xano/covenant-extraction/immediate',
      health: '/xano/covenant-extraction/health',
      stats: '/xano/covenant-extraction/queue/stats',
    },
    riskAnalysis: {
      covenant: '/xano/risk-analysis/covenant',
      adverseEvent: '/xano/risk-analysis/adverse-event',
    },
    covenants: {
      byContract: (contractId: string) => `/xano/covenants/by-contract/${contractId}`,
      storeExtracted: '/xano/covenants/store-extracted',
    },
  },

  // User Management
  users: {
    list: '/users',
    create: '/users',
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
  },

  // Audit Logs
  auditLogs: {
    list: '/audit-logs',
    get: (id: string) => `/audit-logs/${id}`,
  },

  // AI Agents
  agents: {
    covenantAnalysis: {
      run: '/agent/covenant-analysis-agent/run',
    },
    tools: {
      getCovenantData: (contractId: string | number) => `/get_covenant_data?contract_id=${contractId}`,
    },
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error codes for business logic
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Contract errors
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  INVALID_CONTRACT_DATA: 'INVALID_CONTRACT_DATA',
  CONTRACT_UPLOAD_FAILED: 'CONTRACT_UPLOAD_FAILED',

  // Covenant errors
  COVENANT_EXTRACTION_FAILED: 'COVENANT_EXTRACTION_FAILED',
  COVENANT_NOT_FOUND: 'COVENANT_NOT_FOUND',
  INVALID_COVENANT_THRESHOLD: 'INVALID_COVENANT_THRESHOLD',

  // Financial data errors
  FINANCIAL_DATA_INVALID: 'FINANCIAL_DATA_INVALID',
  FINANCIAL_API_UNAVAILABLE: 'FINANCIAL_API_UNAVAILABLE',
  STALE_FINANCIAL_DATA: 'STALE_FINANCIAL_DATA',

  // Alert errors
  ALERT_NOT_FOUND: 'ALERT_NOT_FOUND',
  ALERT_ALREADY_ACKNOWLEDGED: 'ALERT_ALREADY_ACKNOWLEDGED',

  // Multi-tenant errors
  CROSS_TENANT_ACCESS_DENIED: 'CROSS_TENANT_ACCESS_DENIED',
  BANK_NOT_FOUND: 'BANK_NOT_FOUND',

  // External service errors
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  NEWS_API_ERROR: 'NEWS_API_ERROR',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
    request_id?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  request_id?: string;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Filter parameters for different endpoints
export interface ContractFilters extends PaginationParams {
  status?: 'active' | 'closed' | 'default' | 'watch';
  borrower_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface AlertFilters extends PaginationParams {
  status?: 'new' | 'acknowledged' | 'resolved' | 'escalated';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  alert_type?: 'warning' | 'critical' | 'breach' | 'reporting_due';
  contract_id?: string;
  covenant_id?: string;
}

export interface CovenantFilters extends PaginationParams {
  contract_id?: string;
  covenant_type?: 'financial' | 'operational' | 'reporting' | 'other';
  status?: 'compliant' | 'warning' | 'breached';
}

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_PBT: ENV.ENABLE_PBT,
  ENABLE_AUDIT_LOGS: ENV.ENABLE_AUDIT_LOGS,
  ENABLE_MULTI_TENANT: ENV.ENABLE_MULTI_TENANT,
} as const;

// Development helpers
export const isDevelopment = API_CONFIG.environment === 'development';
export const isProduction = API_CONFIG.environment === 'production';
export const isStaging = API_CONFIG.environment === 'staging';

// Xano-specific configuration
export const XANO_CONFIG = {
  // Xano uses different authentication patterns
  authTokenKey: 'authToken',
  refreshTokenKey: 'refreshToken',
  
  // Xano-specific headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Xano workspace configuration
  workspaceId: ENV.XANO_WORKSPACE_ID,
  
  // API versioning (if Xano supports it)
  apiVersion: 'v1',
} as const;