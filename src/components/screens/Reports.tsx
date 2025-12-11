import React, { useState } from 'react';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import { Select } from '../ui/AppInput';
import { Download, Calendar, TrendingUp, TrendingDown, Building, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { mockNDAs } from '../../data/mockData';

const monthlyData = [
  { month: 'Jun', count: 8 },
  { month: 'Jul', count: 12 },
  { month: 'Aug', count: 15 },
  { month: 'Sep', count: 11 },
  { month: 'Oct', count: 18 },
  { month: 'Nov', count: 14 },
  { month: 'Dec', count: 9 }
];

const cycleTimeData = [
  { department: 'IT Services', avgDays: 12 },
  { department: 'Health Services', avgDays: 8 },
  { department: 'Infrastructure', avgDays: 16 },
  { department: 'Facilities', avgDays: 6 },
  { department: 'Security', avgDays: 20 }
];

const statusData = [
  { name: 'Executed', value: 45, color: '#059669' },
  { name: 'In review', value: 12, color: '#3b82f6' },
  { name: 'Waiting signature', value: 8, color: '#a855f7' },
  { name: 'Pending approval', value: 5, color: '#f59e0b' },
  { name: 'Draft', value: 3, color: '#6b7280' }
];

export function Reports() {
  const [dateRange, setDateRange] = useState('last-6-months');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Calculate expiring NDAs
  const expiringNDAs = mockNDAs.filter(nda => {
    if (!nda.expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(nda.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">Reports and Analytics</h1>
          <p className="text-[var(--color-text-secondary)]">Insights and metrics for NDA lifecycle management</p>
        </div>
        <Button variant="primary" icon={<Download className="w-5 h-5" />}>
          Export report
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
              { value: 'custom', label: 'Custom range' }
            ]}
            className="w-48"
          />
          
          <Select
            label="Department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Departments' },
              { value: 'it', label: 'IT Services' },
              { value: 'health', label: 'Health Services' },
              { value: 'infrastructure', label: 'Infrastructure' },
              { value: 'facilities', label: 'Facilities Management' }
            ]}
            className="w-48"
          />
          
          <Select
            label="NDA type"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'mutual', label: 'Mutual' },
              { value: 'one-way', label: 'One-way' },
              { value: 'visitor', label: 'Visitor' }
            ]}
            className="w-48"
          />
          
          <Select
            label="Risk level"
            options={[
              { value: 'all', label: 'All Risk Levels' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }
            ]}
            className="w-48"
          />
        </div>
      </Card>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total NDAs</p>
          <p className="text-3xl mb-2">73</p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
            <TrendingUp className="w-3 h-3" />
            <span>12% vs last period</span>
          </div>
        </Card>
        
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Avg. cycle time</p>
          <p className="text-3xl mb-2">14 <span className="text-lg text-[var(--color-text-secondary)]">days</span></p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
            <TrendingDown className="w-3 h-3" />
            <span>15% faster</span>
          </div>
        </Card>
        
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Active NDAs</p>
          <p className="text-3xl mb-2">45</p>
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
            <span>Currently executed</span>
          </div>
        </Card>
        
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">Expiring soon</p>
          <p className="text-3xl mb-2">{expiringNDAs.length}</p>
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1e3a8a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Average Cycle Time by Department */}
        <Card>
          <h3 className="mb-4">Average cycle time by department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cycleTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="department" tick={{ fill: '#6b7280', fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#6b7280' }} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="avgDays" fill="#0d9488" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* NDAs by Status */}
        <Card>
          <h3 className="mb-4">NDAs by status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4">Quick statistics</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Most common NDA type</p>
              <p className="text-xl">Mutual (42%)</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Avg. time in legal review</p>
              <p className="text-xl">5.2 days</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Approval rate</p>
              <p className="text-xl">94%</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">High-risk NDAs</p>
              <p className="text-xl">18 (25%)</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Busiest department</p>
              <p className="text-xl">IT Services</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Avg. counterparty response</p>
              <p className="text-xl">3.8 days</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Expiring NDAs Table */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3>NDAs expiring in next 90 days</h3>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} className="w-full sm:w-auto">
            Export list
          </Button>
        </div>
        
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  NDA Title
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Counterparty
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Expiry Date
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Days Until Expiry
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[var(--color-border)]">
              {expiringNDAs.map((nda) => {
                const daysUntilExpiry = Math.floor((new Date(nda.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={nda.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm">{nda.title}</td>
                    <td className="px-4 py-3 text-sm">{nda.counterparty}</td>
                    <td className="px-4 py-3 text-sm">{new Date(nda.expiryDate!).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="risk" risk={daysUntilExpiry <= 30 ? 'High' : daysUntilExpiry <= 60 ? 'Medium' : 'Low'}>
                        {daysUntilExpiry} days
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="status" status={nda.status}>{nda.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {expiringNDAs.map((nda) => {
            const daysUntilExpiry = Math.floor((new Date(nda.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div 
                key={nda.id}
                className="p-4 border border-[var(--color-border)] rounded-lg"
              >
                <div className="mb-3">
                  <p className="font-medium mb-1">{nda.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{nda.counterparty}</p>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Expires {new Date(nda.expiryDate!).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <Badge variant="risk" risk={daysUntilExpiry <= 30 ? 'High' : daysUntilExpiry <= 60 ? 'Medium' : 'Low'}>
                      {daysUntilExpiry} days remaining
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Badge variant="status" status={nda.status}>{nda.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}