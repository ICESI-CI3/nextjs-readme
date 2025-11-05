'use client';

import { useEffect } from 'react';

export type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onDismiss?: () => void;
};

const typeStyles: Record<NonNullable<ToastProps['type']>, string> = {
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  error: 'bg-rose-100 text-rose-700 border border-rose-200',
  info: 'bg-sky-100 text-sky-700 border border-sky-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const Toast = ({ message, type = 'info', duration = 4000, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-md px-4 py-2 text-sm shadow-sm ${typeStyles[type]}`}
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold uppercase text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      ) : null}
    </div>
  );
};

export default Toast;
