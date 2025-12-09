import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'risk' | 'type' | 'info';
  color?: string;
  className?: string;
}

export function Badge({ children, variant = 'info', color, className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs';
  
  const getColorClasses = () => {
    if (color) {
      const colorMap: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700',
        review: 'bg-blue-100 text-blue-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        pending: 'bg-amber-100 text-amber-700',
        executed: 'bg-teal-100 text-teal-700',
        expired: 'bg-gray-100 text-gray-600',
        low: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700',
        mutual: 'bg-blue-100 text-blue-700',
        'one-way': 'bg-purple-100 text-purple-700',
        visitor: 'bg-indigo-100 text-indigo-700'
      };
      return colorMap[color.toLowerCase()] || 'bg-gray-100 text-gray-700';
    }
    return 'bg-gray-100 text-gray-700';
  };
  
  return (
    <span className={`${baseClasses} ${getColorClasses()} ${className}`}>
      {children}
    </span>
  );
}
