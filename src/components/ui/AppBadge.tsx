import React from 'react';
import type { RiskLevel, NDAStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'risk' | 'type' | 'info' | 'default';
  status?: NDAStatus;
  risk?: RiskLevel;
  className?: string;
}

export function Badge({ children, variant = 'default', status, risk, className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs';
  
  let colorStyles = 'bg-gray-100 text-gray-700';
  
  if (variant === 'status' && status) {
    const statusColors: Record<NDAStatus, string> = {
      'Draft': 'bg-gray-100 text-gray-700',
      'In legal review': 'bg-blue-100 text-blue-700',
      'Pending approval': 'bg-[var(--color-warning-light)] text-yellow-800',
      'Waiting for signature': 'bg-purple-100 text-purple-700',
      'Executed': 'bg-[var(--color-success-light)] text-green-800',
      'Expired': 'bg-gray-200 text-gray-600',
      'Terminated': 'bg-red-100 text-red-700',
      'Rejected': 'bg-[var(--color-danger-light)] text-red-700'
    };
    colorStyles = statusColors[status] || colorStyles;
  }
  
  if (variant === 'risk' && risk) {
    const riskColors: Record<RiskLevel, string> = {
      'Low': 'bg-[var(--color-success-light)] text-green-800',
      'Medium': 'bg-[var(--color-warning-light)] text-yellow-800',
      'High': 'bg-[var(--color-danger-light)] text-red-700'
    };
    colorStyles = riskColors[risk] || colorStyles;
  }
  
  if (variant === 'type') {
    colorStyles = 'bg-[var(--color-secondary-light)] text-teal-800';
  }
  
  if (variant === 'info') {
    colorStyles = 'bg-[var(--color-primary-light)] text-blue-800';
  }
  
  return (
    <span className={`${baseStyles} ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
