import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <input
        className={`px-3 py-2 border border-[var(--color-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[var(--color-text-secondary)]">{helperText}</span>
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
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <textarea
        className={`px-3 py-2 border border-[var(--color-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[var(--color-text-secondary)]">{helperText}</span>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <select
        className={`px-3 py-2 border border-[var(--color-border)] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
