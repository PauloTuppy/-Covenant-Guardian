/**
 * Settings Page
 * Main settings interface with tabs for different configuration sections
 * Requirements: 9.1, 9.4, 9.5
 */

import React, { useState } from 'react';
import { User, Users, Bell, History, Settings, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth';
import {
  UserProfile,
  UserManagement,
  NotificationPreferences,
  AuditLogViewer,
  SystemSettings,
} from '@/components/settings';

type SettingsTab = 'profile' | 'users' | 'notifications' | 'audit' | 'system';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  requiredRole?: 'admin' | 'analyst' | 'viewer';
  adminOnly?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
  { id: 'audit', label: 'Audit Logs', icon: History, adminOnly: true },
  { id: 'system', label: 'System Settings', icon: Settings, adminOnly: true },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const isAdmin = user?.role === 'admin';
  const canManageUsers = authService.canAccess('users', 'read');
  const canViewAuditLogs = authService.canAccess('audit-logs', 'read');

  // Filter tabs based on user permissions
  const visibleTabs = TABS.filter(tab => {
    if (tab.adminOnly && !isAdmin) return false;
    return true;
  });

  // Create a mock AuthUser for the UserProfile component
  const authUser = user ? {
    id: user.id,
    email: user.email,
    role: user.role,
    bank_id: user.bank_id,
    bank_name: 'Your Organization', // This would come from the actual user data
  } : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return authUser ? (
          <UserProfile user={authUser} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            Please log in to view your profile
          </div>
        );

      case 'notifications':
        return <NotificationPreferences />;

      case 'users':
        if (!canManageUsers) {
          return (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to manage users.
              </p>
            </div>
          );
        }
        return (
          <UserManagement
            canCreate={authService.canAccess('users', 'create')}
            canEdit={authService.canAccess('users', 'update')}
            canDelete={authService.canAccess('users', 'delete')}
          />
        );

      case 'audit':
        if (!canViewAuditLogs) {
          return (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to view audit logs.
              </p>
            </div>
          );
        }
        return <AuditLogViewer />;

      case 'system':
        return (
          <SystemSettings
            canEdit={isAdmin}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <nav className="w-56 flex-shrink-0">
          <ul className="space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                    {tab.adminOnly && (
                      <span className={clsx(
                        'ml-auto text-xs px-1.5 py-0.5 rounded',
                        isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                      )}>
                        Admin
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
