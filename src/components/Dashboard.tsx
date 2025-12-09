import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { 
  FileCheck, 
  Clock, 
  TrendingUp, 
  FileSignature,
  AlertCircle,
  CheckCircle2,
  User
} from 'lucide-react';

export function Dashboard() {
  const summaryCards = [
    { label: 'Pending Reviews', value: '12', trend: '+3 this week', icon: FileCheck, color: 'blue' },
    { label: 'Waiting for Signature', value: '8', trend: '2 overdue', icon: FileSignature, color: 'amber' },
    { label: 'NDAs Expiring Soon', value: '5', trend: 'Next 30 days', icon: AlertCircle, color: 'red' },
    { label: 'Avg Cycle Time', value: '4.2d', trend: '-0.8d vs last month', icon: Clock, color: 'teal' }
  ];

  const myTasks = [
    {
      id: 1,
      title: 'Vendor XYZ Corp - Software License NDA',
      type: 'Review NDA',
      dueDate: 'Due today',
      status: 'review',
      urgent: true
    },
    {
      id: 2,
      title: 'Research Partner - Data Sharing Agreement',
      type: 'Approve',
      dueDate: '2 days left',
      status: 'pending',
      urgent: false
    },
    {
      id: 3,
      title: 'Facility Visitor - ABC Inc',
      type: 'Provide details',
      dueDate: '5 days left',
      status: 'draft',
      urgent: false
    },
    {
      id: 4,
      title: 'Cloud Services NDA - Tech Solutions',
      type: 'Sign',
      dueDate: 'Due tomorrow',
      status: 'pending',
      urgent: true
    }
  ];

  const recentActivity = [
    {
      id: 1,
      event: 'Vendor X NDA signed by Counterparty',
      actor: 'External Party',
      time: '2 hours ago',
      type: 'signature'
    },
    {
      id: 2,
      event: 'Legal approved NDA for Project Y',
      actor: 'Sarah Johnson',
      time: '5 hours ago',
      type: 'approval'
    },
    {
      id: 3,
      event: 'New NDA request submitted',
      actor: 'Mike Chen',
      time: '1 day ago',
      type: 'request'
    },
    {
      id: 4,
      event: 'NDA template updated - Mutual v2.1',
      actor: 'Legal Team',
      time: '2 days ago',
      type: 'update'
    },
    {
      id: 5,
      event: 'Security review completed',
      actor: 'Security Team',
      time: '3 days ago',
      type: 'review'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Welcome back, Jane. Here's what's happening today.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{card.label}</p>
                  <h2 className="mt-2">{card.value}</h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{card.trend}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${card.color}-50`}>
                  <Icon size={20} className={`text-${card.color}-600`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>My Tasks</h3>
              <Badge color="info">{myTasks.length} tasks</Badge>
            </div>
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm">{task.title}</h4>
                      {task.urgent && (
                        <Badge color="high">Urgent</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span>{task.type}</span>
                      <span>•</span>
                      <span className={task.urgent ? 'text-red-600' : ''}>{task.dueDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={task.status}>{task.status}</Badge>
                    <Button variant="secondary" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <h3 className="mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {index !== recentActivity.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-px bg-[var(--color-border)]"></div>
                  )}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {activity.type === 'signature' && <FileSignature size={14} className="text-teal-600" />}
                        {activity.type === 'approval' && <CheckCircle2 size={14} className="text-green-600" />}
                        {activity.type === 'request' && <FileCheck size={14} className="text-blue-600" />}
                        {activity.type === 'update' && <TrendingUp size={14} className="text-purple-600" />}
                        {activity.type === 'review' && <User size={14} className="text-indigo-600" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.event}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        {activity.actor} • {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
