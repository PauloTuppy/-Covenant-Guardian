/**
 * User Management Service
 * Handles user CRUD operations, role management, and notification preferences
 * Requirements: 9.1, 9.4, 9.5
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/config/api';
import { BankUser, UserRole, AuditLog, PaginatedResponse, PaginationParams } from '@/types';

// ===== USER TYPES =====

export interface UserCreateInput {
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
}

export interface UserUpdateInput {
  email?: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export interface UserProfile extends BankUser {
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  last_login?: string;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  email_reports: boolean;
  email_covenant_warnings: boolean;
  email_covenant_breaches: boolean;
  in_app_alerts: boolean;
  alert_severity_threshold: 'low' | 'medium' | 'high' | 'critical';
  daily_digest: boolean;
  weekly_summary: boolean;
}

export interface UserFilters extends PaginationParams {
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export interface AuditLogFilters extends PaginationParams {
  action?: string;
  table_name?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface SystemSettings {
  bank_name: string;
  default_currency: string;
  covenant_warning_threshold: number;
  alert_escalation_hours: number;
  data_retention_days: number;
  enable_gemini_analysis: boolean;
  enable_news_monitoring: boolean;
  report_generation_schedule: 'daily' | 'weekly' | 'monthly';
}

// ===== DEFAULT VALUES =====

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_alerts: true,
  email_reports: true,
  email_covenant_warnings: true,
  email_covenant_breaches: true,
  in_app_alerts: true,
  alert_severity_threshold: 'medium',
  daily_digest: false,
  weekly_summary: true,
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  bank_name: '',
  default_currency: 'USD',
  covenant_warning_threshold: 10,
  alert_escalation_hours: 24,
  data_retention_days: 365,
  enable_gemini_analysis: true,
  enable_news_monitoring: true,
  report_generation_schedule: 'weekly',
};

// ===== USER SERVICE =====

class UserService {
  /**
   * Get list of users with optional filtering
   */
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<UserProfile>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.role) params.append('role', filters.role);
      if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.order) params.append('order', filters.order);
    }

    const url = `${API_ENDPOINTS.users.list}?${params.toString()}`;
    const response = await apiService.get<PaginatedResponse<UserProfile>>(url);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch users');
    }
    
    return response.data;
  }

  /**
   * Get single user by ID
   */
  async getUser(userId: string): Promise<UserProfile> {
    const response = await apiService.get<UserProfile>(API_ENDPOINTS.users.get(userId));
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch user');
    }
    
    return response.data;
  }

  /**
   * Create new user
   */
  async createUser(input: UserCreateInput): Promise<UserProfile> {
    const response = await apiService.post<UserProfile>(API_ENDPOINTS.users.create, input);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to create user');
    }
    
    return response.data;
  }

  /**
   * Update existing user
   */
  async updateUser(userId: string, input: UserUpdateInput): Promise<UserProfile> {
    const response = await apiService.put<UserProfile>(API_ENDPOINTS.users.update(userId), input);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to update user');
    }
    
    return response.data;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const response = await apiService.delete(`${API_ENDPOINTS.users.list}/${userId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
    return this.updateUser(userId, { role });
  }

  /**
   * Get current user's notification preferences
   * Returns defaults if endpoint not available (404)
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await apiService.get<NotificationPreferences>('/users/me/notifications');
      
      if (!response.success || !response.data) {
        // Return defaults if no data
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
      
      return response.data;
    } catch (error) {
      // Silently return defaults if endpoint doesn't exist (404)
      // This allows the app to work without the notifications endpoint
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Update current user's notification preferences
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiService.put<NotificationPreferences>('/users/me/notifications', preferences);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to update notification preferences');
    }
    
    return response.data;
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.action) params.append('action', filters.action);
      if (filters.table_name) params.append('table_name', filters.table_name);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.order) params.append('order', filters.order);
    }

    const url = `${API_ENDPOINTS.auditLogs.list}?${params.toString()}`;
    const response = await apiService.get<PaginatedResponse<AuditLog>>(url);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch audit logs');
    }
    
    return response.data;
  }

  /**
   * Get single audit log entry
   */
  async getAuditLog(logId: string): Promise<AuditLog> {
    const response = await apiService.get<AuditLog>(API_ENDPOINTS.auditLogs.get(logId));
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch audit log');
    }
    
    return response.data;
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await apiService.get<SystemSettings>('/settings/system');
    
    if (!response.success || !response.data) {
      return DEFAULT_SYSTEM_SETTINGS;
    }
    
    return response.data;
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await apiService.put<SystemSettings>('/settings/system', settings);
    
    if (!response.success || !response.data) {
      throw new Error('Failed to update system settings');
    }
    
    return response.data;
  }
}

export const userService = new UserService();
export default userService;
