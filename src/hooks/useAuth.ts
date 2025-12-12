/**
 * Authentication React Hooks
 * Custom hooks for managing authentication state and authorization in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth';
import { AuthUtils } from '@/utils/authorization';
import { 
  AuthUser, 
  LoginCredentials, 
  UserRole 
} from '@/types';

// ===== AUTHENTICATION HOOK =====

interface UseAuthReturn {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  getCurrentUser: () => Promise<AuthUser>;
  
  // Authorization helpers
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canAccess: (resource: string, action?: string) => boolean;
  belongsToBank: (bankId: string) => boolean;
  
  // Utility
  isAdmin: () => boolean;
  isAnalyst: () => boolean;
  getUserDisplayName: () => string;
  getCurrentBankId: () => string | null;
}

/**
 * Main authentication hook
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState(() => authService.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setState);
    return unsubscribe;
  }, []);

  // Memoized action functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    return authService.login(credentials);
  }, []);

  const logout = useCallback(async () => {
    return authService.logout();
  }, []);

  const refreshToken = useCallback(async () => {
    return authService.refreshToken();
  }, []);

  const getCurrentUser = useCallback(async () => {
    return authService.getCurrentUser();
  }, []);

  const hasRole = useCallback((role: UserRole) => {
    return authService.hasRole(role);
  }, []);

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    return authService.hasAnyRole(roles);
  }, []);

  const canAccess = useCallback((resource: string, action: string = 'read') => {
    return authService.canAccess(resource, action);
  }, []);

  const belongsToBank = useCallback((bankId: string) => {
    return authService.belongsToBank(bankId);
  }, []);

  const isAdmin = useCallback(() => {
    return authService.isAdmin();
  }, []);

  const isAnalyst = useCallback(() => {
    return authService.isAnalyst();
  }, []);

  const getUserDisplayName = useCallback(() => {
    return authService.getUserDisplayName();
  }, []);

  const getCurrentBankId = useCallback(() => {
    return authService.getCurrentBankId();
  }, []);

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    
    // Actions
    login,
    logout,
    refreshToken,
    getCurrentUser,
    
    // Authorization
    hasRole,
    hasAnyRole,
    canAccess,
    belongsToBank,
    
    // Utility
    isAdmin,
    isAnalyst,
    getUserDisplayName,
    getCurrentBankId,
  };
}

// ===== PERMISSION HOOKS =====

/**
 * Hook for checking specific permission
 */
export function usePermission(resource: string, action: string = 'read'): boolean {
  const { user } = useAuth();
  return AuthUtils.hasPermission(user, resource, action);
}

/**
 * Hook for checking multiple permissions (any)
 */
export function useAnyPermission(
  permissions: Array<{ resource: string; action: string }>
): boolean {
  const { user } = useAuth();
  return AuthUtils.hasAnyPermission(user, permissions);
}

/**
 * Hook for checking multiple permissions (all)
 */
export function useAllPermissions(
  permissions: Array<{ resource: string; action: string }>
): boolean {
  const { user } = useAuth();
  return AuthUtils.hasAllPermissions(user, permissions);
}

/**
 * Hook for role-based access
 */
export function useRole(requiredRole: UserRole): boolean {
  const { hasRole } = useAuth();
  return hasRole(requiredRole);
}

/**
 * Hook for bank-specific resource access
 */
export function useBankAccess(bankId?: string): boolean {
  const { user } = useAuth();
  
  if (!bankId || !user) {
    return false;
  }
  
  return AuthUtils.canAccessBankResource(user, bankId);
}

// ===== RESOURCE-SPECIFIC HOOKS =====

/**
 * Hook for contract permissions
 */
export function useContractPermissions(contractBankId?: string) {
  const { user } = useAuth();
  
  return {
    canView: AuthUtils.ContractAuth.canView(user, contractBankId),
    canCreate: AuthUtils.ContractAuth.canCreate(user),
    canUpdate: AuthUtils.ContractAuth.canUpdate(user, contractBankId),
    canDelete: AuthUtils.ContractAuth.canDelete(user, contractBankId),
  };
}

/**
 * Hook for covenant permissions
 */
export function useCovenantPermissions(covenantBankId?: string) {
  const { user } = useAuth();
  
  return {
    canView: AuthUtils.CovenantAuth.canView(user, covenantBankId),
    canCreate: AuthUtils.CovenantAuth.canCreate(user),
    canUpdate: AuthUtils.CovenantAuth.canUpdate(user, covenantBankId),
    canDelete: AuthUtils.CovenantAuth.canDelete(user, covenantBankId),
  };
}

/**
 * Hook for alert permissions
 */
export function useAlertPermissions(alertBankId?: string) {
  const { user } = useAuth();
  
  return {
    canView: AuthUtils.AlertAuth.canView(user, alertBankId),
    canAcknowledge: AuthUtils.AlertAuth.canAcknowledge(user, alertBankId),
    canResolve: AuthUtils.AlertAuth.canResolve(user, alertBankId),
  };
}

/**
 * Hook for user management permissions
 */
export function useUserManagementPermissions(targetUserBankId?: string) {
  const { user } = useAuth();
  
  return {
    canViewUsers: AuthUtils.UserAuth.canViewUsers(user),
    canCreateUsers: AuthUtils.UserAuth.canCreateUsers(user),
    canUpdateUser: AuthUtils.UserAuth.canUpdateUser(user, targetUserBankId),
    canDeleteUser: AuthUtils.UserAuth.canDeleteUser(user, targetUserBankId),
  };
}

// ===== AUTHENTICATION GUARDS =====

/**
 * Hook that redirects to login if not authenticated
 */
export function useRequireAuth(): UseAuthReturn {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login';
    }
  }, [auth.isAuthenticated, auth.isLoading]);
  
  return auth;
}

/**
 * Hook that checks for required role
 */
export function useRequireRole(requiredRole: UserRole): UseAuthReturn {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !auth.hasRole(requiredRole)) {
      // Redirect to unauthorized page or show error
      console.error(`Access denied: ${requiredRole} role required`);
      // You might want to redirect to an unauthorized page
    }
  }, [auth.isAuthenticated, auth.isLoading, requiredRole, auth.hasRole]);
  
  return auth;
}

/**
 * Hook that checks for required permission
 */
export function useRequirePermission(resource: string, action: string = 'read'): UseAuthReturn {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !auth.canAccess(resource, action)) {
      console.error(`Access denied: ${action} permission on ${resource} required`);
    }
  }, [auth.isAuthenticated, auth.isLoading, resource, action, auth.canAccess]);
  
  return auth;
}

// ===== SESSION MANAGEMENT HOOKS =====

/**
 * Hook for automatic token refresh
 */
export function useTokenRefresh(refreshInterval: number = 30 * 60 * 1000) { // 30 minutes
  const { refreshToken, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Token refresh will handle logout on failure
      }
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken, refreshInterval]);
}

/**
 * Hook for session timeout warning
 */
export function useSessionTimeout(
  warningTime: number = 5 * 60 * 1000, // 5 minutes
  onWarning?: () => void,
  onTimeout?: () => void
) {
  const { isAuthenticated, logout } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    let warningTimer: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    
    const resetTimers = () => {
      clearTimeout(warningTimer);
      clearTimeout(timeoutTimer);
      
      // Set warning timer
      warningTimer = setTimeout(() => {
        onWarning?.();
      }, warningTime);
      
      // Set timeout timer
      timeoutTimer = setTimeout(() => {
        onTimeout?.();
        logout();
      }, warningTime + 5 * 60 * 1000); // 5 minutes after warning
    };
    
    // Reset timers on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const resetOnActivity = () => resetTimers();
    
    events.forEach(event => {
      document.addEventListener(event, resetOnActivity, true);
    });
    
    // Initial timer setup
    resetTimers();
    
    return () => {
      clearTimeout(warningTimer);
      clearTimeout(timeoutTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetOnActivity, true);
      });
    };
  }, [isAuthenticated, warningTime, onWarning, onTimeout, logout]);
}

// ===== EXPORT ALL HOOKS =====

export default useAuth;