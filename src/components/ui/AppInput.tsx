import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm mb-1.5 text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-md bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helperText}</p>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function TextArea({ label, error, helperText, className = '', ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm mb-1.5 text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2 border rounded-md bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helperText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export function Select({ label, error, options, children, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm mb-1.5 text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border rounded-md bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        } ${className}`}
        {...props}
      >
        {children ? children : options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
