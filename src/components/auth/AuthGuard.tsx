/**
 * Authentication Guard Components
 * Components for protecting routes and UI elements based on authentication and authorization
 */

import React from 'react';
import { useAuth, usePermission, useRole } from '@/hooks/useAuth';
import { UserRole } from '@/types';

// ===== AUTHENTICATION GUARD =====

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Guard that requires authentication
 */
export function AuthGuard({ children, fallback, redirectTo = '/login' }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to login
    window.location.href = redirectTo;
    return null;
  }

  return <>{children}</>;
}

// ===== ROLE-BASED GUARD =====

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * Guard that requires specific role
 */
export function RoleGuard({ 
  children, 
  requiredRole, 
  fallback,
  showError = true 
}: RoleGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasRequiredRole = useRole(requiredRole);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  // Insufficient role
  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You need {requiredRole} role to access this content.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

// ===== PERMISSION-BASED GUARD =====

interface PermissionGuardProps {
  children: React.ReactNode;
  resource: string;
  action?: string;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * Guard that requires specific permission
 */
export function PermissionGuard({ 
  children, 
  resource, 
  action = 'read',
  fallback,
  showError = true 
}: PermissionGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasPermission = usePermission(resource, action);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  // Insufficient permission
  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showError) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Insufficient Permissions
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You don't have permission to {action} {resource}.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

// ===== BANK ACCESS GUARD =====

interface BankGuardProps {
  children: React.ReactNode;
  bankId?: string;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * Guard that requires access to specific bank
 */
export function BankGuard({ 
  children, 
  bankId,
  fallback,
  showError = true 
}: BankGuardProps) {
  const { isAuthenticated, isLoading, belongsToBank } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  // No bank ID provided - allow access
  if (!bankId) {
    return <>{children}</>;
  }

  // Check bank access
  if (!belongsToBank(bankId)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You don't have access to this bank's data.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

// ===== COMBINED GUARDS =====

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: { resource: string; action?: string };
  bankId?: string;
  fallback?: React.ReactNode;
}

/**
 * Combined guard for routes with multiple requirements
 */
export function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermission,
  bankId,
  fallback 
}: ProtectedRouteProps) {
  return (
    <AuthGuard fallback={fallback}>
      {requiredRole && (
        <RoleGuard requiredRole={requiredRole} fallback={fallback}>
          {requiredPermission && (
            <PermissionGuard 
              resource={requiredPermission.resource}
              action={requiredPermission.action}
              fallback={fallback}
            >
              <BankGuard bankId={bankId} fallback={fallback}>
                {children}
              </BankGuard>
            </PermissionGuard>
          )}
          {!requiredPermission && (
            <BankGuard bankId={bankId} fallback={fallback}>
              {children}
            </BankGuard>
          )}
        </RoleGuard>
      )}
      {!requiredRole && requiredPermission && (
        <PermissionGuard 
          resource={requiredPermission.resource}
          action={requiredPermission.action}
          fallback={fallback}
        >
          <BankGuard bankId={bankId} fallback={fallback}>
            {children}
          </BankGuard>
        </PermissionGuard>
      )}
      {!requiredRole && !requiredPermission && (
        <BankGuard bankId={bankId} fallback={fallback}>
          {children}
        </BankGuard>
      )}
    </AuthGuard>
  );
}

// ===== CONDITIONAL RENDERING HELPERS =====

interface ConditionalRenderProps {
  children: React.ReactNode;
  condition: boolean;
  fallback?: React.ReactNode;
}

/**
 * Simple conditional render component
 */
export function ConditionalRender({ children, condition, fallback }: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show content only if user has specific role
 */
export function ShowForRole({ children, role, fallback }: { 
  children: React.ReactNode; 
  role: UserRole; 
  fallback?: React.ReactNode; 
}) {
  const hasRole = useRole(role);
  return <ConditionalRender condition={hasRole} fallback={fallback}>{children}</ConditionalRender>;
}

/**
 * Show content only if user has specific permission
 */
export function ShowForPermission({ 
  children, 
  resource, 
  action = 'read', 
  fallback 
}: { 
  children: React.ReactNode; 
  resource: string; 
  action?: string; 
  fallback?: React.ReactNode; 
}) {
  const hasPermission = usePermission(resource, action);
  return <ConditionalRender condition={hasPermission} fallback={fallback}>{children}</ConditionalRender>;
}

// ===== EXPORT ALL GUARDS =====

export default AuthGuard;