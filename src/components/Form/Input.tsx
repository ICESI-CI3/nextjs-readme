'use client';

import { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className, error, required, ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-1 text-sm text-slate-600">
        {label ? (
          <span className="font-medium text-slate-700">
            {label}
            {required ? <span className="text-rose-500">*</span> : null}
          </span>
        ) : null}
        <input
          ref={ref}
          className={[
            'w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : '',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          required={required}
          {...props}
        />
        {error ? <span className="text-xs text-rose-500">{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = 'Input';

export default Input;
