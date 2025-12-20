import React from 'react';
import type { RiskLevel, NDAStatus } from '../../types';
import type { NdaStatus } from '../../client/services/ndaService';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'risk' | 'type' | 'info' | 'default' | 'success' | 'warning' | 'error';
  status?: NDAStatus | NdaStatus;
  risk?: RiskLevel;
  className?: string;
}

export function Badge({ children, variant = 'default', status, risk, className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs';

  let colorStyles = 'bg-gray-100 text-gray-700';

  if (variant === 'status' && status) {
    // Map backend status values to colors
    const statusColors: Record<string, string> = {
      // Frontend legacy statuses
      'Draft': 'bg-gray-100 text-gray-700',
      'In legal review': 'bg-blue-100 text-blue-700',
      'Pending approval': 'bg-[var(--color-warning-light)] text-yellow-800',
      'Waiting for signature': 'bg-purple-100 text-purple-700',
      'Executed': 'bg-[var(--color-success-light)] text-green-800',
      'Expired': 'bg-gray-200 text-gray-600',
      'Terminated': 'bg-red-100 text-red-700',
      'Rejected': 'bg-[var(--color-danger-light)] text-red-700',
      // Backend API statuses
      'CREATED': 'bg-gray-100 text-gray-700',
      'EMAILED': 'bg-blue-100 text-blue-700',
      'IN_REVISION': 'bg-purple-100 text-purple-700',
      'FULLY_EXECUTED': 'bg-[var(--color-success-light)] text-green-800',
      'INACTIVE': 'bg-gray-200 text-gray-600',
      'CANCELLED': 'bg-red-100 text-red-700'
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

  if (variant === 'success') {
    colorStyles = 'bg-[var(--color-success-light)] text-green-800';
  }

  if (variant === 'warning') {
    colorStyles = 'bg-[var(--color-warning-light)] text-yellow-800';
  }

  if (variant === 'error') {
    colorStyles = 'bg-[var(--color-danger-light)] text-red-700';
  }
  
  return (
    <span className={`${baseStyles} ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
