import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';

const Header: React.FC = () => {
    const { user, logout } = useAuthStore();
    const alerts = useAlertStore((state) =>
        state.alerts.filter((a) => a.status === 'new')
    );

    const criticalCount = alerts.filter(
        (a) => a.severity === 'critical'
    ).length;

    return (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto flex h-16 items-center justify-between px-6">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary"></div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Covenant Guardian
                    </h1>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Alerts Bell */}
                    <button className="relative rounded-lg p-2 hover:bg-gray-100">
                        <Bell className="h-5 w-5 text-gray-600" />
                        {criticalCount > 0 && (
                            <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
                                {criticalCount}
                            </span>
                        )}
                    </button>

                    {/* User Menu */}
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{user?.email || 'Demo User'}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role || 'Analyst'}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="rounded-lg p-2 hover:bg-gray-100"
                        >
                            <LogOut className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
