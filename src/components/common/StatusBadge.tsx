import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
    status: 'active' | 'closed' | 'default' | 'watch' | 'compliant' | 'warning' | 'breached';
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
    const statusConfig: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        closed: 'bg-gray-100 text-gray-800',
        default: 'bg-red-100 text-red-800',
        watch: 'bg-yellow-100 text-yellow-800',
        compliant: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        breached: 'bg-red-100 text-red-800',
    };

    return (
        <span
            className={clsx(
                'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize',
                statusConfig[status],
                className
            )}
        >
            {status}
        </span>
    );
};

export default StatusBadge;
