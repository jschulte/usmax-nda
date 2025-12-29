/**
 * Date Range Shortcuts Component
 * Story H-1 Task 12: Quick date range selection
 *
 * Provides predefined date range buttons for common time periods
 */

import React from 'react';
import { Button } from './AppButton';

interface DateRangeShortcutsProps {
  onSelect: (from: string, to: string) => void;
  className?: string;
}

// Helper functions for date calculations
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0); // Last day of current month
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfQuarter(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfQuarter(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3 + 3, 0); // Last day of quarter
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfYear(date: Date): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfYear(date: Date): Date {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
}

interface DateShortcut {
  label: string;
  getDates: () => { from: Date; to: Date };
}

// Reduced to 6 most common shortcuts for cleaner UI
const shortcuts: DateShortcut[] = [
  {
    label: 'Today',
    getDates: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 days',
    getDates: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    getDates: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This month',
    getDates: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'This quarter',
    getDates: () => ({
      from: startOfQuarter(new Date()),
      to: endOfQuarter(new Date()),
    }),
  },
  {
    label: 'This year',
    getDates: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
];

export function DateRangeShortcuts({ onSelect, className = '' }: DateRangeShortcutsProps) {
  const handleSelect = (shortcut: DateShortcut) => {
    const { from, to } = shortcut.getDates();
    onSelect(formatDate(from), formatDate(to));
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.label}
          type="button"
          onClick={() => handleSelect(shortcut)}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
                     bg-[var(--color-bg-secondary)] text-[var(--color-text)]
                     hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-primary)]
                     transition-colors cursor-pointer border border-transparent
                     hover:border-[var(--color-border)]"
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  );
}

export default DateRangeShortcuts;
