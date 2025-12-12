/**
 * Toast Component
 * Toast notification container and individual toast items
 */

import React from 'react';
import clsx from 'clsx';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  type,
  title,
  message,
  onDismiss,
}) => {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 border-green-200',
      iconColor: 'text-green-500',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-800',
      textColor: 'text-yellow-700',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      textColor: 'text-blue-700',
    },
  };

  const { icon: Icon, bg, iconColor, titleColor, textColor } = config[type];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300',
        bg
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', titleColor)}>{title}</p>
        {message && (
          <p className={clsx('text-sm mt-1', textColor)}>{message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={clsx(
          'flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors',
          textColor
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export { ToastContainer, ToastItem };
export default ToastContainer;
