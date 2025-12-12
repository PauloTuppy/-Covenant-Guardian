/**
 * Core API Service Layer
 * Handles HTTP requests, authentication, error handling, and retry logic
 * Enhanced with rate limiting and security headers
 * Requirements: 9.1, 10.1, 10.4
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  HTTP_STATUS, 
  ERROR_CODES, 
  XANO_CONFIG,
  ApiResponse, 
  ApiError 
} from '@/config/api';
import { rateLimiter, getConfigTypeFromUrl, RateLimitError } from '@/utils/rateLimiter';
import { SECURITY_HEADERS, logSecurityViolation } from '@/utils/security';
import { queryMonitor } from '@/utils/queryOptimizer';

class ApiService {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...XANO_CONFIG.headers,
        ...SECURITY_HEADERS,
      },
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token, rate limiting, and security headers
    this.client.interceptors.request.use(
      (config) => {
        const url = config.url || '';
        const configType = getConfigTypeFromUrl(url);
        
        // Check rate limit before making request
        if (!rateLimiter.isAllowed(url, configType)) {
          const info = rateLimiter.getRateLimitInfo(url, configType);
          logSecurityViolation('rate_limit', { url, info });
          throw new RateLimitError(
            `Rate limit exceeded for ${url}. Try again in ${Math.ceil(info.resetIn / 1000)} seconds.`,
            info
          );
        }
        
        // Record the request
        rateLimiter.recordRequest(url, configType);
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp for request timing
        config.headers['X-Request-Time'] = Date.now().toString();
        
        // Add bank context for multi-tenant isolation
        const bankId = this.getBankIdFromStorage();
        if (bankId) {
          config.headers['X-Bank-ID'] = bankId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors, token refresh, and performance monitoring
    this.client.interceptors.response.use(
      (response) => {
        // Record successful request metrics
        const requestTime = response.config.headers?.['X-Request-Time'];
        if (requestTime) {
          const duration = Date.now() - parseInt(requestTime as string, 10);
          queryMonitor.record({
            endpoint: response.config.url || '',
            duration,
            timestamp: Date.now(),
            cached: false,
            size: JSON.stringify(response.data).length,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Log security-related errors
        if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
          logSecurityViolation('unauthorized', {
            url: originalRequest.url,
            status: error.response.status,
          });
        }

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAuthToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Handle API errors and convert to standardized format
   */
  private handleApiError(error: AxiosError): ApiError {
    const response = error.response;
    
    if (response?.data && typeof response.data === 'object' && 'error' in response.data) {
      // Xano error format
      return response.data.error as ApiError;
    }

    // Fallback error handling
    switch (response?.status) {
      case HTTP_STATUS.BAD_REQUEST:
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: (response.data as any)?.message || error.message,
          timestamp: new Date().toISOString(),
        };
      
      case HTTP_STATUS.UNAUTHORIZED:
        return {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        };
      
      case HTTP_STATUS.FORBIDDEN:
        return {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
        };
      
      case HTTP_STATUS.NOT_FOUND:
        return {
          code: ERROR_CODES.CONTRACT_NOT_FOUND, // Generic not found
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
        };
      
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: (response.data as any)?.message || error.message,
          timestamp: new Date().toISOString(),
        };
      
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return {
          code: ERROR_CODES.GEMINI_API_ERROR, // External service error
          message: 'External service unavailable',
          timestamp: new Date().toISOString(),
        };
      
      default:
        return {
          code: ERROR_CODES.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          details: error.message,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Generic request method with retry logic
   * Handles both Xano's direct array responses and wrapped ApiResponse format
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.client.request({
        method,
        url,
        data,
        ...config,
      });

      // Handle Xano's response format - it returns data directly, not wrapped
      const responseData = response.data;
      
      // If response is already in ApiResponse format, return as-is
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        return responseData as ApiResponse<T>;
      }
      
      // Xano returns arrays directly or objects - wrap in ApiResponse format
      return {
        success: true,
        data: responseData as T,
      };
    } catch (error) {
      // Retry logic for network errors
      if (
        retryCount < API_CONFIG.retryAttempts &&
        this.shouldRetry(error as AxiosError)
      ) {
        await this.delay(API_CONFIG.retryDelay * Math.pow(2, retryCount));
        return this.request(method, url, data, config, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT'
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Token management
   */
  public setTokens(authToken: string, refreshToken?: string): void {
    this.authToken = authToken;
    this.refreshToken = refreshToken || null;
    
    localStorage.setItem(XANO_CONFIG.authTokenKey, authToken);
    if (refreshToken) {
      localStorage.setItem(XANO_CONFIG.refreshTokenKey, refreshToken);
    }
  }

  public clearTokens(): void {
    this.authToken = null;
    this.refreshToken = null;
    
    localStorage.removeItem(XANO_CONFIG.authTokenKey);
    localStorage.removeItem(XANO_CONFIG.refreshTokenKey);
  }

  private loadTokensFromStorage(): void {
    this.authToken = localStorage.getItem(XANO_CONFIG.authTokenKey);
    this.refreshToken = localStorage.getItem(XANO_CONFIG.refreshTokenKey);
  }

  private async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post(API_ENDPOINTS.auth.refresh, {
      refresh_token: this.refreshToken,
    });

    const { auth_token, refresh_token } = response.data.data;
    this.setTokens(auth_token, refresh_token);
  }

  /**
   * Bank context management for multi-tenant isolation
   */
  public setBankId(bankId: string): void {
    localStorage.setItem('bankId', bankId);
  }

  public getBankIdFromStorage(): string | null {
    return localStorage.getItem('bankId');
  }

  public clearBankId(): void {
    localStorage.removeItem('bankId');
  }

  /**
   * Public HTTP methods
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  /**
   * File upload method
   */
  public async upload<T>(
    url: string, 
    file: File, 
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    return this.request<T>('POST', url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;