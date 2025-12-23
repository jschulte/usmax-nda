/**
 * DateRangeShortcuts Component Tests
 * Story H-1 Task 15.3: Test for date range shortcut calculations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeShortcuts } from '../DateRangeShortcuts';

describe('DateRangeShortcuts', () => {
  const mockOnSelect = vi.fn();

  // Use a fixed date for consistent testing
  const FIXED_DATE = new Date('2024-06-15T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all shortcut buttons', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('This quarter')).toBeInTheDocument();
    expect(screen.getByText('This year')).toBeInTheDocument();
  });

  it('calculates Today correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('Today'));

    expect(mockOnSelect).toHaveBeenCalledWith('2024-06-15', '2024-06-15');
  });

  it('calculates Yesterday correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('Yesterday'));

    expect(mockOnSelect).toHaveBeenCalledWith('2024-06-14', '2024-06-14');
  });

  it('calculates Last 7 days correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('Last 7 days'));

    // June 15 - 6 days = June 9 (inclusive of today)
    expect(mockOnSelect).toHaveBeenCalledWith('2024-06-09', '2024-06-15');
  });

  it('calculates Last 30 days correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('Last 30 days'));

    // June 15 - 29 days = May 17 (inclusive of today)
    expect(mockOnSelect).toHaveBeenCalledWith('2024-05-17', '2024-06-15');
  });

  it('calculates Last 90 days correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('Last 90 days'));

    // June 15 - 89 days = March 18 (inclusive of today)
    expect(mockOnSelect).toHaveBeenCalledWith('2024-03-18', '2024-06-15');
  });

  it('calculates This month correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('This month'));

    // June 1 to June 30
    expect(mockOnSelect).toHaveBeenCalledWith('2024-06-01', '2024-06-30');
  });

  it('calculates This quarter correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('This quarter'));

    // Q2: April 1 to June 30
    expect(mockOnSelect).toHaveBeenCalledWith('2024-04-01', '2024-06-30');
  });

  it('calculates This year correctly', () => {
    render(<DateRangeShortcuts onSelect={mockOnSelect} />);

    fireEvent.click(screen.getByText('This year'));

    // January 1 to December 31
    expect(mockOnSelect).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DateRangeShortcuts onSelect={mockOnSelect} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('Edge cases', () => {
    it('handles month boundaries correctly for Last 7 days', () => {
      // Test from July 3
      vi.setSystemTime(new Date('2024-07-03T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('Last 7 days'));

      // July 3 - 6 days = June 27 (crosses month boundary)
      expect(mockOnSelect).toHaveBeenCalledWith('2024-06-27', '2024-07-03');
    });

    it('handles Q1 correctly', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('This quarter'));

      // Q1: January 1 to March 31
      expect(mockOnSelect).toHaveBeenCalledWith('2024-01-01', '2024-03-31');
    });

    it('handles Q3 correctly', () => {
      vi.setSystemTime(new Date('2024-08-15T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('This quarter'));

      // Q3: July 1 to September 30
      expect(mockOnSelect).toHaveBeenCalledWith('2024-07-01', '2024-09-30');
    });

    it('handles Q4 correctly', () => {
      vi.setSystemTime(new Date('2024-11-15T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('This quarter'));

      // Q4: October 1 to December 31
      expect(mockOnSelect).toHaveBeenCalledWith('2024-10-01', '2024-12-31');
    });

    it('handles February in leap year correctly', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('This month'));

      // February 2024 (leap year) has 29 days
      expect(mockOnSelect).toHaveBeenCalledWith('2024-02-01', '2024-02-29');
    });

    it('handles year boundary for Last 90 days', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      render(<DateRangeShortcuts onSelect={mockOnSelect} />);
      fireEvent.click(screen.getByText('Last 90 days'));

      // Jan 15 - 89 days = Oct 18, 2023 (crosses year boundary)
      expect(mockOnSelect).toHaveBeenCalledWith('2023-10-18', '2024-01-15');
    });
  });
});
