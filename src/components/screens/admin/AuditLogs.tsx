import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Input } from '../../ui/AppInput';
import {
  ArrowLeft,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  FileText,
  Eye,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Label } from '../../ui/label';
import {
  listAuditLogs,
  exportAuditLogs,
  type AuditLogEntry,
  type ListAuditLogsResponse
} from '../../../client/services/auditService';

// Map backend AuditLogEntry to display format
interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
  details: any;
}

function mapAuditLogToEvent(log: AuditLogEntry): AuditEvent {
  const userName = log.user
    ? `${log.user.firstName} ${log.user.lastName}`
    : 'System';
  const userEmail = log.user?.email || 'system@agency.gov';

  return {
    id: log.id,
    timestamp: log.createdAt,
    event_type: log.action,
    actor: userName,
    actor_email: userEmail,
    action: formatAction(log.action),
    resource_type: log.entityType,
    resource_id: log.entityId || '',
    resource_name: formatResourceName(log.entityType, log.details),
    ip_address: log.ipAddress || 'N/A',
    user_agent: log.userAgent || 'N/A',
    status: determineStatus(log.action, log.details),
    details: log.details || {}
  };
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatResourceName(entityType: string, details?: Record<string, unknown>): string {
  if (details?.name) return String(details.name);
  if (details?.title) return String(details.title);
  if (details?.companyName) return String(details.companyName);
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

function determineStatus(action: string, details?: Record<string, unknown>): 'success' | 'failure' | 'warning' {
  if (action.includes('failed') || action.includes('rejected') || action.includes('error')) {
    return 'failure';
  }
  if (action.includes('pending') || action.includes('warning')) {
    return 'warning';
  }
  return 'success';
}

export function AuditLogs() {
  const navigate = useNavigate();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterEntityType, setFilterEntityType] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const pageSize = 20;

  // Available filters from backend
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);

  // UI state
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return { startDate: today.toISOString(), endDate: now.toISOString() };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday.toISOString(), endDate: today.toISOString() };
      }
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { startDate: weekAgo.toISOString(), endDate: now.toISOString() };
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { startDate: monthAgo.toISOString(), endDate: now.toISOString() };
      }
      case 'custom':
        return {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined
        };
      default:
        return {};
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateRange();
      const response = await listAuditLogs({
        page: currentPage,
        limit: pageSize,
        action: filterEventType !== 'all' ? filterEventType : undefined,
        entityType: filterEntityType !== 'all' ? filterEntityType : undefined,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      });

      const mappedEvents = response.auditLogs.map(mapAuditLogToEvent);
      setAuditEvents(mappedEvents);
      setTotalPages(response.pagination.totalPages);
      setTotalEvents(response.pagination.total);

      // Update available filters
      if (response.filters.availableActions.length > 0) {
        setAvailableActions(response.filters.availableActions);
      }
      if (response.filters.availableEntityTypes.length > 0) {
        setAvailableEntityTypes(response.filters.availableEntityTypes);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      toast.error('Failed to load audit logs', {
        description: err instanceof Error ? err.message : 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, filterEventType, filterEntityType, dateRange, customStartDate, customEndDate]);

  // Client-side search filtering (applies to current page results)
  const filteredEvents = auditEvents.filter(event => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      event.actor.toLowerCase().includes(query) ||
      event.action.toLowerCase().includes(query) ||
      event.resource_name.toLowerCase().includes(query) ||
      event.resource_id.toLowerCase().includes(query) ||
      event.actor_email.toLowerCase().includes(query)
    );
  });

  const handleExport = async () => {
    try {
      setExporting(true);

      const dateFilter = getDateRange();
      const blob = await exportAuditLogs({
        action: filterEventType !== 'all' ? filterEventType : undefined,
        entityType: filterEntityType !== 'all' ? filterEntityType : undefined,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        format: 'csv'
      });

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Audit logs exported', {
        description: 'Your export has been downloaded successfully'
      });
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : 'Failed to export audit logs'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: AuditEvent['status']) => {
    const statusMap = {
      success: 'Executed',
      failure: 'Rejected',
      warning: 'In legal review'
    };
    return statusMap[status];
  };

  // Calculate stats from current data
  const stats = {
    totalEvents: totalEvents,
    successRate: auditEvents.length > 0
      ? ((auditEvents.filter(e => e.status === 'success').length / auditEvents.length) * 100).toFixed(1)
      : '0.0',
    failedLogins: auditEvents.filter(e => e.event_type.includes('login') && e.status === 'failure').length,
    activeUsers: new Set(auditEvents.map(e => e.actor_email)).size
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="subtle" 
          size="sm" 
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/administration')}
          className="mb-4"
        >
          Back to Administration
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2">Audit Logs</h1>
            <p className="text-[var(--color-text-secondary)]">
              View system activity and audit trails
            </p>
          </div>
          <Button
            variant="primary"
            icon={exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            onClick={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting...' : 'Export Logs'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total Events</p>
              <p className="text-2xl">{loading ? '...' : stats.totalEvents.toLocaleString()}</p>
            </div>
            <FileText className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Success Rate</p>
              <p className="text-2xl text-green-600">{loading ? '...' : `${stats.successRate}%`}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Failed Logins</p>
              <p className="text-2xl text-red-600">{loading ? '...' : stats.failedLogins}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Active Users</p>
              <p className="text-2xl">{loading ? '...' : stats.activeUsers}</p>
            </div>
            <User className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load audit logs</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={fetchAuditLogs}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Search logs by user, action, or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
          <Select value={dateRange} onValueChange={setDateRange} disabled={loading}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEventType} onValueChange={setFilterEventType} disabled={loading}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {availableActions.map(type => (
                <SelectItem key={type} value={type}>
                  {formatAction(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEntityType} onValueChange={setFilterEntityType} disabled={loading}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {availableEntityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mb-3" />
            <p className="text-[var(--color-text-secondary)]">Loading audit logs...</p>
          </div>
        )}

        {/* Audit Log Table */}
        {!loading && (
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-sm">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm">User</th>
                  <th className="text-left py-3 px-4 text-sm">Event</th>
                  <th className="text-left py-3 px-4 text-sm">Resource</th>
                  <th className="text-left py-3 px-4 text-sm">IP Address</th>
                  <th className="text-left py-3 px-4 text-sm">Status</th>
                  <th className="text-right py-3 px-4 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                <tr key={event.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <span className="text-sm">{formatTimestamp(event.timestamp)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm font-medium">{event.actor}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{event.actor_email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm">{event.action}</p>
                      <code className="text-xs text-[var(--color-text-muted)] bg-gray-100 px-1 py-0.5 rounded">
                        {event.event_type}
                      </code>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm">{event.resource_name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {event.resource_type}: {event.resource_id}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-mono">{event.ip_address}</span>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="status" status={getStatusBadge(event.status)}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      variant="subtle"
                      size="sm"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => handleViewDetails(event)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {!loading && (
          <div className="md:hidden space-y-3">
            {filteredEvents.map(event => (
            <div 
              key={event.id}
              className="p-4 border border-[var(--color-border)] rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium mb-1">{event.actor}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">{event.actor_email}</p>
                  <p className="text-sm">{event.action}</p>
                </div>
                <Badge variant="status" status={getStatusBadge(event.status)}>
                  {event.status}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">{formatTimestamp(event.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{event.resource_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="font-mono text-xs">{event.ip_address}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <code className="text-xs text-[var(--color-text-muted)] bg-gray-100 px-2 py-1 rounded">
                  {event.event_type}
                </code>
                <Button
                  variant="subtle"
                  size="sm"
                  icon={<Eye className="w-4 h-4" />}
                  onClick={() => handleViewDetails(event)}
                >
                  Details
                </Button>
              </div>
            </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)]">No audit events found matching your filters</p>
            {(searchQuery || filterEventType !== 'all' || filterEntityType !== 'all') && (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterEventType('all');
                  setFilterEntityType('all');
                }}
                className="mt-3"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredEvents.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalEvents)} of {totalEvents.toLocaleString()} events
              {searchQuery && ` (filtered to ${filteredEvents.length})`}
            </p>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-[var(--color-text-secondary)] mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit event
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Event ID</Label>
                  <p className="font-mono text-sm">{selectedEvent.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Timestamp</Label>
                  <p className="text-sm">{formatTimestamp(selectedEvent.timestamp)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Actor</Label>
                  <p className="text-sm">{selectedEvent.actor}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{selectedEvent.actor_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Status</Label>
                  <Badge variant="status" status={getStatusBadge(selectedEvent.status)} className="mt-1">
                    {selectedEvent.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-[var(--color-text-secondary)]">Event Type</Label>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-1">
                  {selectedEvent.event_type}
                </code>
              </div>

              <div>
                <Label className="text-xs text-[var(--color-text-secondary)]">Action</Label>
                <p className="text-sm mt-1">{selectedEvent.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Resource Type</Label>
                  <p className="text-sm mt-1">{selectedEvent.resource_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">Resource ID</Label>
                  <p className="text-sm font-mono mt-1">{selectedEvent.resource_id}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-[var(--color-text-secondary)]">Resource Name</Label>
                <p className="text-sm mt-1">{selectedEvent.resource_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">IP Address</Label>
                  <p className="text-sm font-mono mt-1">{selectedEvent.ip_address}</p>
                </div>
                <div>
                  <Label className="text-xs text-[var(--color-text-secondary)]">User Agent</Label>
                  <p className="text-xs mt-1 break-all">{selectedEvent.user_agent}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-[var(--color-text-secondary)]">Event Details</Label>
                <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}