'use client';

import { forwardRef } from 'react';

type Option = { value: string | number; label: string };

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: Option[];
  error?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options = [], className, children, ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-1 text-sm text-slate-600">
        {label ? (
          <span className="font-medium text-slate-700">
            {label}
            {required ? <span className="text-rose-500">*</span> : null}
          </span>
        ) : null}
        <select
          ref={ref}
          className={[
            'w-full appearance-none rounded-md border border-slate-200 px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : '',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {error ? <span className="text-xs text-rose-500">{error}</span> : null}
      </label>
    );
  },
);

Select.displayName = 'Select';

export default Select;
