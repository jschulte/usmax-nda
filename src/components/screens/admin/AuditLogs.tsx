import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  ArrowLeft,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  FileText,
  Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Badge } from '../../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

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

const mockAuditEvents: AuditEvent[] = [
  {
    id: 'ae-001',
    timestamp: '2025-12-08T10:30:15Z',
    event_type: 'nda_approved',
    actor: 'Sarah Johnson',
    actor_email: 'sarah.johnson@agency.gov',
    action: 'Approved NDA workflow step',
    resource_type: 'nda',
    resource_id: 'nda-2025-0145',
    resource_name: 'Vendor Access NDA - Tech Corp',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    details: {
      decision: 'approved',
      comments: 'Legal review complete',
      step_name: 'Legal Review'
    }
  },
  {
    id: 'ae-002',
    timestamp: '2025-12-08T10:15:42Z',
    event_type: 'user_login',
    actor: 'Michael Chen',
    actor_email: 'michael.chen@agency.gov',
    action: 'User logged in',
    resource_type: 'session',
    resource_id: 'sess-abc123',
    resource_name: 'User Session',
    ip_address: '192.168.1.87',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    details: {
      auth_method: 'ldap',
      mfa_verified: true
    }
  },
  {
    id: 'ae-003',
    timestamp: '2025-12-08T09:45:20Z',
    event_type: 'workflow_created',
    actor: 'Sarah Johnson',
    actor_email: 'sarah.johnson@agency.gov',
    action: 'Created new workflow',
    resource_type: 'workflow',
    resource_id: 'wf-005',
    resource_name: 'High-Value Contract Review',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    details: {
      steps: 5,
      rules: 3
    }
  },
  {
    id: 'ae-004',
    timestamp: '2025-12-08T09:30:10Z',
    event_type: 'nda_rejected',
    actor: 'James Wilson',
    actor_email: 'james.wilson@agency.gov',
    action: 'Rejected NDA workflow step',
    resource_type: 'nda',
    resource_id: 'nda-2025-0142',
    resource_name: 'Research Collaboration NDA',
    ip_address: '192.168.1.92',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'warning',
    details: {
      decision: 'rejected',
      comments: 'Missing required clauses',
      step_name: 'Legal Review'
    }
  },
  {
    id: 'ae-005',
    timestamp: '2025-12-08T09:15:33Z',
    event_type: 'user_login_failed',
    actor: 'unknown',
    actor_email: 'test@example.com',
    action: 'Failed login attempt',
    resource_type: 'session',
    resource_id: '',
    resource_name: 'Login Attempt',
    ip_address: '203.0.113.45',
    user_agent: 'curl/7.68.0',
    status: 'failure',
    details: {
      reason: 'invalid_credentials',
      attempt_count: 3
    }
  },
  {
    id: 'ae-006',
    timestamp: '2025-12-08T08:50:18Z',
    event_type: 'user_created',
    actor: 'Admin User',
    actor_email: 'admin@agency.gov',
    action: 'Created new user account',
    resource_type: 'user',
    resource_id: 'usr-789',
    resource_name: 'John Smith',
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    details: {
      email: 'john.smith@agency.gov',
      department: 'Legal',
      roles: ['legal_reviewer']
    }
  },
  {
    id: 'ae-007',
    timestamp: '2025-12-08T08:30:05Z',
    event_type: 'template_modified',
    actor: 'Sarah Johnson',
    actor_email: 'sarah.johnson@agency.gov',
    action: 'Modified NDA template',
    resource_type: 'template',
    resource_id: 'tmpl-003',
    resource_name: 'Mutual NDA Template',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    details: {
      changes: ['Updated liability clause', 'Added notice period'],
      version: 3
    }
  },
  {
    id: 'ae-008',
    timestamp: '2025-12-08T08:00:22Z',
    event_type: 'settings_changed',
    actor: 'Admin User',
    actor_email: 'admin@agency.gov',
    action: 'Updated security settings',
    resource_type: 'settings',
    resource_id: 'security',
    resource_name: 'Security Configuration',
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    details: {
      setting: 'session_timeout',
      old_value: '30',
      new_value: '60'
    }
  }
];

export function AuditLogs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEventType, setFilterEventType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const eventTypes = [
    'nda_created', 'nda_updated', 'nda_approved', 'nda_rejected', 'nda_executed',
    'workflow_created', 'workflow_modified', 'workflow_started', 'workflow_completed',
    'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_login_failed',
    'template_created', 'template_modified', 'settings_changed', 'role_assigned'
  ];

  const filteredEvents = mockAuditEvents.filter(event => {
    const matchesSearch = 
      event.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.resource_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.resource_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEventType = filterEventType === 'all' || event.event_type === filterEventType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    
    return matchesSearch && matchesEventType && matchesStatus;
  });

  const handleExport = () => {
    toast.success('Exporting audit logs', {
      description: 'Your audit log export will be downloaded shortly'
    });
  };

  const handleViewDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
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
          <Button variant="primary" icon={<Download className="w-5 h-5" />} onClick={handleExport}>
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Total Events (24h)</p>
              <p className="text-2xl">1,247</p>
            </div>
            <FileText className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Success Rate</p>
              <p className="text-2xl text-green-600">98.5%</p>
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
              <p className="text-2xl text-red-600">12</p>
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
              <p className="text-2xl">87</p>
            </div>
            <User className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </Card>
      </div>

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
              />
            </div>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
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
          <Select value={filterEventType} onValueChange={setFilterEventType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
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

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-secondary)]">No audit events found matching your filters</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {filteredEvents.length} of {mockAuditEvents.length} events
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Previous</Button>
            <Button variant="secondary" size="sm">Next</Button>
          </div>
        </div>
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
