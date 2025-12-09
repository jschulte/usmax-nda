import React, { useState } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';
import { Search, Filter, Plus, MoreVertical } from 'lucide-react';

interface Request {
  id: number;
  title: string;
  counterparty: string;
  type: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: string;
  createdDate: string;
  lastUpdated: string;
}

interface RequestsListProps {
  onNewRequest: () => void;
  onViewDetail: (id: number) => void;
}

export function RequestsList({ onNewRequest, onViewDetail }: RequestsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const requests: Request[] = [
    {
      id: 1,
      title: 'Vendor XYZ Corp - Software License NDA',
      counterparty: 'XYZ Corp',
      type: 'Mutual',
      riskLevel: 'medium',
      status: 'review',
      createdDate: '2025-12-01',
      lastUpdated: '2025-12-07'
    },
    {
      id: 2,
      title: 'Research Partner - Data Sharing Agreement',
      counterparty: 'University Research Lab',
      type: 'One-way',
      riskLevel: 'high',
      status: 'pending',
      createdDate: '2025-11-28',
      lastUpdated: '2025-12-06'
    },
    {
      id: 3,
      title: 'Facility Visitor - ABC Inc',
      counterparty: 'ABC Inc',
      type: 'Visitor',
      riskLevel: 'low',
      status: 'draft',
      createdDate: '2025-12-05',
      lastUpdated: '2025-12-05'
    },
    {
      id: 4,
      title: 'Cloud Services NDA - Tech Solutions',
      counterparty: 'Tech Solutions Ltd',
      type: 'Mutual',
      riskLevel: 'medium',
      status: 'executed',
      createdDate: '2025-11-15',
      lastUpdated: '2025-12-01'
    },
    {
      id: 5,
      title: 'Consulting Services Agreement',
      counterparty: 'Strategic Advisors',
      type: 'One-way',
      riskLevel: 'low',
      status: 'approved',
      createdDate: '2025-11-20',
      lastUpdated: '2025-11-30'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Requests</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage all NDA requests</p>
        </div>
        <Button onClick={onNewRequest}>
          <Plus size={18} />
          Request new NDA
        </Button>
      </div>

      <Card>
        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" size={18} />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Filter size={16} />
              Status
            </Button>
            <Button variant="secondary" size="sm">
              <Filter size={16} />
              Type
            </Button>
            <Button variant="secondary" size="sm">
              <Filter size={16} />
              Risk Level
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Request Title</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Counterparty</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Type</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Risk Level</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Status</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Created</th>
                <th className="text-left py-3 px-4 text-sm text-[var(--color-text-secondary)]">Last Updated</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr 
                  key={request.id} 
                  className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onViewDetail(request.id)}
                >
                  <td className="py-3 px-4 text-sm">{request.title}</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{request.counterparty}</td>
                  <td className="py-3 px-4">
                    <Badge color="mutual">{request.type}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={request.riskLevel}>{request.riskLevel}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={request.status}>{request.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{request.createdDate}</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{request.lastUpdated}</td>
                  <td className="py-3 px-4">
                    <button 
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle menu
                      }}
                    >
                      <MoreVertical size={16} className="text-[var(--color-text-secondary)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing 1-5 of 5 requests
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled>Previous</Button>
            <Button variant="secondary" size="sm" disabled>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
