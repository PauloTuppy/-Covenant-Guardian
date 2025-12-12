/**
 * Authentication Service
 * Handles JWT-based authentication, role-based access control, and user session management
 */

import { apiService } from './api';
import { 
  LoginCredentials, 
  AuthUser, 
  AuthResponse, 
  UserRole,
  ApiResponse 
} from '@/types';
import { API_ENDPOINTS, ERROR_CODES } from '@/config/api';

// ===== AUTHENTICATION STATE =====

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  // ===== STATE MANAGEMENT =====

  /**
   * Subscribe to authentication state changes
   */
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current authentication state
   */
  public getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  // ===== AUTHENTICATION METHODS =====

  /**
   * Login with email and password
   */
  public async login(credentials: LoginCredentials): Promise<AuthUser> {
    this.setState({ isLoading: true });

    try {
      const response: ApiResponse<AuthResponse> = await apiService.post(
        API_ENDPOINTS.auth.login,
        credentials
      );

      if (!response.success || !response.data) {
        throw new Error('Login failed: Invalid response');
      }

      const { user, auth_token, refresh_token } = response.data;

      // Store tokens
      this.setTokens(auth_token, refresh_token);
      
      // Set bank context for multi-tenant isolation
      apiService.setBankId(user.bank_id);

      // Update state
      this.setState({
        user,
        token: auth_token,
        refreshToken: refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Store in localStorage for persistence
      this.saveToStorage();

      return user;
    } catch (error) {
      this.setState({ isLoading: false });
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  public async logout(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      // Call logout endpoint if authenticated
      if (this.state.isAuthenticated) {
        await apiService.post(API_ENDPOINTS.auth.logout);
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear all authentication data
      this.clearSession();
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<string> {
    if (!this.state.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response: ApiResponse<AuthResponse> = await apiService.post(
        API_ENDPOINTS.auth.refresh,
        { refresh_token: this.state.refreshToken }
      );

      if (!response.success || !response.data) {
        throw new Error('Token refresh failed');
      }

      const { auth_token, refresh_token } = response.data;

      // Update tokens
      this.setTokens(auth_token, refresh_token);
      
      this.setState({
        token: auth_token,
        refreshToken: refresh_token,
      });

      this.saveToStorage();

      return auth_token;
    } catch (error) {
      // If refresh fails, clear session
      this.clearSession();
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  public async getCurrentUser(): Promise<AuthUser> {
    if (!this.state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const response: ApiResponse<AuthUser> = await apiService.get(API_ENDPOINTS.auth.me);

      if (!response.success || !response.data) {
        throw new Error('Failed to get user profile');
      }

      // Update user in state
      this.setState({ user: response.data });
      this.saveToStorage();

      return response.data;
    } catch (error) {
      // If getting user fails, might be token issue
      if (error.response?.status === 401) {
        this.clearSession();
      }
      throw error;
    }
  }

  // ===== AUTHORIZATION METHODS =====

  /**
   * Check if user has required role
   */
  public hasRole(requiredRole: UserRole): boolean {
    if (!this.state.user) {
      return false;
    }

    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      analyst: 2,
      admin: 3,
    };

    const userLevel = roleHierarchy[this.state.user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has any of the required roles
   */
  public hasAnyRole(roles: UserRole[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Check if user belongs to specific bank
   */
  public belongsToBank(bankId: string): boolean {
    return this.state.user?.bank_id === bankId;
  }

  /**
   * Check if user can access resource
   */
  public canAccess(resource: string, action: string = 'read'): boolean {
    if (!this.state.user) {
      return false;
    }

    const { role } = this.state.user;

    // Define permissions matrix
    const permissions: Record<UserRole, Record<string, string[]>> = {
      viewer: {
        contracts: ['read'],
        covenants: ['read'],
        alerts: ['read'],
        reports: ['read'],
        dashboard: ['read'],
      },
      analyst: {
        contracts: ['read', 'create', 'update'],
        covenants: ['read', 'create', 'update'],
        alerts: ['read', 'acknowledge'],
        reports: ['read', 'create'],
        dashboard: ['read'],
        'financial-metrics': ['read', 'create'],
      },
      admin: {
        contracts: ['read', 'create', 'update', 'delete'],
        covenants: ['read', 'create', 'update', 'delete'],
        alerts: ['read', 'acknowledge', 'resolve', 'delete'],
        reports: ['read', 'create', 'update', 'delete'],
        dashboard: ['read'],
        'financial-metrics': ['read', 'create', 'update', 'delete'],
        users: ['read', 'create', 'update', 'delete'],
        'audit-logs': ['read'],
      },
    };

    const resourcePermissions = permissions[role]?.[resource];
    return resourcePermissions?.includes(action) || false;
  }

  // ===== TOKEN MANAGEMENT =====

  /**
   * Set authentication tokens
   */
  private setTokens(authToken: string, refreshToken?: string): void {
    apiService.setTokens(authToken, refreshToken);
  }

  /**
   * Clear authentication session
   */
  private clearSession(): void {
    // Clear API service tokens
    apiService.clearTokens();
    apiService.clearBankId();

    // Clear state
    this.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Clear storage
    this.clearStorage();
  }

  // ===== PERSISTENCE =====

  /**
   * Load authentication data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedAuth = localStorage.getItem('auth_state');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        // Validate stored data
        if (authData.user && authData.token) {
          this.setState({
            user: authData.user,
            token: authData.token,
            refreshToken: authData.refreshToken,
            isAuthenticated: true,
          });

          // Set tokens in API service
          this.setTokens(authData.token, authData.refreshToken);
          
          // Set bank context
          if (authData.user.bank_id) {
            apiService.setBankId(authData.user.bank_id);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load auth state from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Save authentication data to localStorage
   */
  private saveToStorage(): void {
    try {
      const authData = {
        user: this.state.user,
        token: this.state.token,
        refreshToken: this.state.refreshToken,
      };
      localStorage.setItem('auth_state', JSON.stringify(authData));
    } catch (error) {
      console.warn('Failed to save auth state to storage:', error);
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem('auth_state');
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if current session is valid
   */
  public isSessionValid(): boolean {
    return this.state.isAuthenticated && !!this.state.user && !!this.state.token;
  }

  /**
   * Get current user
   */
  public getCurrentUserSync(): AuthUser | null {
    return this.state.user;
  }

  /**
   * Get current bank ID
   */
  public getCurrentBankId(): string | null {
    return this.state.user?.bank_id || null;
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is analyst or higher
   */
  public isAnalyst(): boolean {
    return this.hasRole('analyst');
  }

  /**
   * Get user display name
   */
  public getUserDisplayName(): string {
    if (!this.state.user) {
      return 'Unknown User';
    }
    
    return this.state.user.bank_name || this.state.user.email;
  }

  /**
   * Validate bank access for multi-tenant operations
   */
  public validateBankAccess(resourceBankId: string): boolean {
    const currentBankId = this.getCurrentBankId();
    
    if (!currentBankId) {
      return false;
    }

    return currentBankId === resourceBankId;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;