/**
 * Authorization Utilities
 * Helper functions and middleware for role-based access control and permission validation
 */

import { authService } from '@/services/auth';
import { UserRole, AuthUser } from '@/types';

// ===== PERMISSION DEFINITIONS =====

export interface Permission {
  resource: string;
  action: string;
  condition?: (user: AuthUser, context?: any) => boolean;
}

export interface RolePermissions {
  [key: string]: Permission[];
}

// Define base permissions for each role
const VIEWER_PERMISSIONS: Permission[] = [
  { resource: 'contracts', action: 'read' },
  { resource: 'covenants', action: 'read' },
  { resource: 'alerts', action: 'read' },
  { resource: 'reports', action: 'read' },
  { resource: 'dashboard', action: 'read' },
  { resource: 'borrowers', action: 'read' },
  { resource: 'financial-metrics', action: 'read' },
];

const ANALYST_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  // Additional analyst permissions
  { resource: 'contracts', action: 'create' },
  { resource: 'contracts', action: 'update' },
  { resource: 'covenants', action: 'create' },
  { resource: 'covenants', action: 'update' },
  { resource: 'alerts', action: 'acknowledge' },
  { resource: 'reports', action: 'create' },
  { resource: 'financial-metrics', action: 'create' },
  { resource: 'financial-metrics', action: 'update' },
  { resource: 'borrowers', action: 'create' },
  { resource: 'borrowers', action: 'update' },
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...ANALYST_PERMISSIONS,
  // Additional admin permissions
  { resource: 'contracts', action: 'delete' },
  { resource: 'covenants', action: 'delete' },
  { resource: 'alerts', action: 'resolve' },
  { resource: 'alerts', action: 'delete' },
  { resource: 'reports', action: 'update' },
  { resource: 'reports', action: 'delete' },
  { resource: 'financial-metrics', action: 'delete' },
  { resource: 'borrowers', action: 'delete' },
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  { resource: 'audit-logs', action: 'read' },
  { resource: 'system-settings', action: 'read' },
  { resource: 'system-settings', action: 'update' },
];

// Define comprehensive permission matrix
export const PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: VIEWER_PERMISSIONS,
  analyst: ANALYST_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

// ===== AUTHORIZATION FUNCTIONS =====

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthUser | null,
  resource: string,
  action: string,
  context?: any
): boolean {
  if (!user) {
    return false;
  }

  const userPermissions = PERMISSIONS[user.role] || [];
  
  return userPermissions.some(permission => {
    const resourceMatch = permission.resource === resource;
    const actionMatch = permission.action === action;
    const conditionMatch = !permission.condition || permission.condition(user, context);
    
    return resourceMatch && actionMatch && conditionMatch;
  });
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: AuthUser | null,
  permissions: Array<{ resource: string; action: string }>
): boolean {
  if (!user) {
    return false;
  }

  return permissions.some(({ resource, action }) => 
    hasPermission(user, resource, action)
  );
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: AuthUser | null,
  permissions: Array<{ resource: string; action: string }>
): boolean {
  if (!user) {
    return false;
  }

  return permissions.every(({ resource, action }) => 
    hasPermission(user, resource, action)
  );
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return PERMISSIONS[role] || [];
}

/**
 * Check if user can access bank-specific resource
 */
export function canAccessBankResource(
  user: AuthUser | null,
  resourceBankId: string
): boolean {
  if (!user) {
    return false;
  }

  return user.bank_id === resourceBankId;
}

// ===== AUTHORIZATION DECORATORS/GUARDS =====

/**
 * Authorization guard for API calls
 */
export function requireAuth(): boolean {
  return authService.isSessionValid();
}

/**
 * Role-based authorization guard
 */
export function requireRole(requiredRole: UserRole): boolean {
  const user = authService.getCurrentUserSync();
  return user ? authService.hasRole(requiredRole) : false;
}

/**
 * Permission-based authorization guard
 */
export function requirePermission(resource: string, action: string): boolean {
  const user = authService.getCurrentUserSync();
  return hasPermission(user, resource, action);
}

/**
 * Bank access authorization guard
 */
export function requireBankAccess(bankId: string): boolean {
  return authService.validateBankAccess(bankId);
}

// ===== AUTHORIZATION MIDDLEWARE =====

/**
 * Create authorization middleware for API requests
 */
export function createAuthMiddleware() {
  return {
    /**
     * Check authentication before API call
     */
    beforeRequest: (config: any) => {
      if (!requireAuth()) {
        throw new Error('Authentication required');
      }
      return config;
    },

    /**
     * Handle authentication errors in response
     */
    onError: (error: any) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        authService.logout();
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        // Insufficient permissions
        console.warn('Access denied:', error.response.data);
      }
      throw error;
    },
  };
}

// ===== RESOURCE-SPECIFIC AUTHORIZATION =====

/**
 * Contract-specific authorization
 */
export const ContractAuth = {
  canView: (user: AuthUser | null, contractBankId?: string): boolean => {
    return hasPermission(user, 'contracts', 'read') && 
           (!contractBankId || canAccessBankResource(user, contractBankId));
  },

  canCreate: (user: AuthUser | null): boolean => {
    return hasPermission(user, 'contracts', 'create');
  },

  canUpdate: (user: AuthUser | null, contractBankId?: string): boolean => {
    return hasPermission(user, 'contracts', 'update') && 
           (!contractBankId || canAccessBankResource(user, contractBankId));
  },

  canDelete: (user: AuthUser | null, contractBankId?: string): boolean => {
    return hasPermission(user, 'contracts', 'delete') && 
           (!contractBankId || canAccessBankResource(user, contractBankId));
  },
};

/**
 * Covenant-specific authorization
 */
export const CovenantAuth = {
  canView: (user: AuthUser | null, covenantBankId?: string): boolean => {
    return hasPermission(user, 'covenants', 'read') && 
           (!covenantBankId || canAccessBankResource(user, covenantBankId));
  },

  canCreate: (user: AuthUser | null): boolean => {
    return hasPermission(user, 'covenants', 'create');
  },

  canUpdate: (user: AuthUser | null, covenantBankId?: string): boolean => {
    return hasPermission(user, 'covenants', 'update') && 
           (!covenantBankId || canAccessBankResource(user, covenantBankId));
  },

  canDelete: (user: AuthUser | null, covenantBankId?: string): boolean => {
    return hasPermission(user, 'covenants', 'delete') && 
           (!covenantBankId || canAccessBankResource(user, covenantBankId));
  },
};

/**
 * Alert-specific authorization
 */
export const AlertAuth = {
  canView: (user: AuthUser | null, alertBankId?: string): boolean => {
    return hasPermission(user, 'alerts', 'read') && 
           (!alertBankId || canAccessBankResource(user, alertBankId));
  },

  canAcknowledge: (user: AuthUser | null, alertBankId?: string): boolean => {
    return hasPermission(user, 'alerts', 'acknowledge') && 
           (!alertBankId || canAccessBankResource(user, alertBankId));
  },

  canResolve: (user: AuthUser | null, alertBankId?: string): boolean => {
    return hasPermission(user, 'alerts', 'resolve') && 
           (!alertBankId || canAccessBankResource(user, alertBankId));
  },
};

/**
 * User management authorization
 */
export const UserAuth = {
  canViewUsers: (user: AuthUser | null): boolean => {
    return hasPermission(user, 'users', 'read');
  },

  canCreateUsers: (user: AuthUser | null): boolean => {
    return hasPermission(user, 'users', 'create');
  },

  canUpdateUser: (user: AuthUser | null, targetUserBankId?: string): boolean => {
    return hasPermission(user, 'users', 'update') && 
           (!targetUserBankId || canAccessBankResource(user, targetUserBankId));
  },

  canDeleteUser: (user: AuthUser | null, targetUserBankId?: string): boolean => {
    return hasPermission(user, 'users', 'delete') && 
           (!targetUserBankId || canAccessBankResource(user, targetUserBankId));
  },
};

/**
 * Audit log authorization
 */
export const AuditAuth = {
  canViewAuditLogs: (user: AuthUser | null): boolean => {
    return hasPermission(user, 'audit-logs', 'read');
  },

  canViewBankAuditLogs: (user: AuthUser | null, bankId: string): boolean => {
    return hasPermission(user, 'audit-logs', 'read') && 
           canAccessBankResource(user, bankId);
  },
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get user-friendly permission description
 */
export function getPermissionDescription(resource: string, action: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    contracts: {
      read: 'View contracts',
      create: 'Create new contracts',
      update: 'Edit contracts',
      delete: 'Delete contracts',
    },
    covenants: {
      read: 'View covenants',
      create: 'Create new covenants',
      update: 'Edit covenants',
      delete: 'Delete covenants',
    },
    alerts: {
      read: 'View alerts',
      acknowledge: 'Acknowledge alerts',
      resolve: 'Resolve alerts',
      delete: 'Delete alerts',
    },
    users: {
      read: 'View users',
      create: 'Create new users',
      update: 'Edit users',
      delete: 'Delete users',
    },
  };

  return descriptions[resource]?.[action] || `${action} ${resource}`;
}

/**
 * Get all permissions for display
 */
export function getAllPermissionsForRole(role: UserRole): Array<{
  resource: string;
  action: string;
  description: string;
}> {
  const permissions = getRolePermissions(role);
  
  return permissions.map(permission => ({
    resource: permission.resource,
    action: permission.action,
    description: getPermissionDescription(permission.resource, permission.action),
  }));
}

/**
 * Check if role hierarchy allows access
 */
export function isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    analyst: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// ===== EXPORT AUTHORIZATION UTILITIES =====

export const AuthUtils = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessBankResource,
  requireAuth,
  requireRole,
  requirePermission,
  requireBankAccess,
  createAuthMiddleware,
  getPermissionDescription,
  getAllPermissionsForRole,
  isRoleHigherOrEqual,
};

export default AuthUtils;