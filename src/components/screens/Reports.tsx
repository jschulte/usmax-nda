import React, { useState, useEffect } from 'react';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import { Select } from '../ui/AppInput';
import { Download, Calendar, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getReportData,
  exportReport,
  getDateRangeMonths,
  type ReportData
} from '../../client/services/reportService';

export function Reports() {
  const [dateRange, setDateRange] = useState('last-6-months');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load report data
  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const months = getDateRangeMonths(dateRange);
      const filters: any = {};

      const data = await getReportData(months, filters);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportReport({});
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load reports</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { metrics, monthlyVolume, statusDistribution, agencyBreakdown, cycleTime } = reportData;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">Reports and Analytics</h1>
          <p className="text-[var(--color-text-secondary)]">Insights and metrics for NDA lifecycle management</p>
        </div>
        <Button
          variant="primary"
          icon={exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export report'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: 'last-30-days', label: 'Last 30 days' },
              { value: 'last-3-months', label: 'Last 3 months' },
              { value: 'last-6-months', label: 'Last 6 months' },
              { value: 'last-year', label: 'Last year' },
            ]}
            className="w-48"
          />

          <Button
            variant="secondary"
            onClick={loadReportData}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total NDAs</p>
          <p className="text-3xl mb-2">{metrics.totalNdas}</p>
          {metrics.changeVsPrevious && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.changeVsPrevious.total}% vs last period</span>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Avg. cycle time</p>
          <p className="text-3xl mb-2">
            {metrics.avgCycleTime} <span className="text-lg text-[var(--color-text-secondary)]">days</span>
          </p>
          {metrics.changeVsPrevious && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <TrendingDown className="w-3 h-3" />
              <span>{metrics.changeVsPrevious.cycleTime}% faster</span>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Active NDAs</p>
          <p className="text-3xl mb-2">{metrics.activeNdas}</p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
            <span>Currently executed</span>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Expiring soon</p>
          <p className="text-3xl mb-2">{metrics.expiringSoon}</p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
            <Calendar className="w-3 h-3" />
            <span>Next 90 days</span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* NDAs Created Per Month */}
        <Card>
          <h3 className="mb-4">NDAs created per month</h3>
          {monthlyVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1e3a8a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--color-text-secondary)]">
              <p>No data available for the selected period</p>
            </div>
          )}
        </Card>

        {/* Average Cycle Time by Agency */}
        <Card>
          <h3 className="mb-4">Average cycle time by agency</h3>
          {cycleTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cycleTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="agency"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis tick={{ fill: '#6b7280' }} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avgDays" fill="#0d9488" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--color-text-secondary)]">
              <p>No executed NDAs to calculate cycle time</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* NDAs by Status */}
        <Card>
          <h3 className="mb-4">NDAs by status</h3>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--color-text-secondary)]">
              <p>No data available</p>
            </div>
          )}
        </Card>

        {/* Agency Breakdown */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4">NDAs by agency</h3>
          {agencyBreakdown.length > 0 ? (
            <div className="space-y-3">
              {agencyBreakdown.slice(0, 8).map((item, index) => {
                const total = agencyBreakdown.reduce((sum, i) => sum + i.count, 0);
                const percentage = Math.round((item.count / total) * 100);

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--color-text-secondary)]">{item.agency}</span>
                      <span className="text-sm font-medium">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {agencyBreakdown.length > 8 && (
                <p className="text-xs text-[var(--color-text-secondary)] text-center mt-4">
                  And {agencyBreakdown.length - 8} more agencies
                </p>
              )}
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--color-text-secondary)]">
              <p>No data available</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="mb-8">
        <h3 className="mb-4">Quick statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Most active agency</p>
            <p className="text-xl">
              {agencyBreakdown.length > 0 ? agencyBreakdown[0].agency : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Total agencies</p>
            <p className="text-xl">{agencyBreakdown.length}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Fastest cycle time</p>
            <p className="text-xl">
              {cycleTime.length > 0
                ? `${Math.min(...cycleTime.map(c => c.avgDays))} days`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Slowest cycle time</p>
            <p className="text-xl">
              {cycleTime.length > 0
                ? `${Math.max(...cycleTime.map(c => c.avgDays))} days`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Executed rate</p>
            <p className="text-xl">
              {metrics.totalNdas > 0
                ? `${Math.round((metrics.activeNdas / metrics.totalNdas) * 100)}%`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Data period</p>
            <p className="text-xl">
              {dateRange === 'last-30-days' && '30 days'}
              {dateRange === 'last-3-months' && '3 months'}
              {dateRange === 'last-6-months' && '6 months'}
              {dateRange === 'last-year' && '1 year'}
            </p>
          </div>
        </div>
      </Card>

      {/* Note about expiring NDAs */}
      {metrics.expiringSoon > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3 text-yellow-800">
            <Calendar className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Expiring NDAs</p>
              <p className="text-sm mt-1">
                {metrics.expiringSoon} NDA{metrics.expiringSoon !== 1 ? 's' : ''} will expire in the next 90 days.
                Review them in the <a href="/ndas" className="underline">NDAs list</a>.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
