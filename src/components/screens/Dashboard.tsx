import React from 'react';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import { 
  Clock, 
  FileText, 
  PenLine, 
  TrendingUp,
  CheckCircle,
  MessageSquare,
  Send,
  AlertCircle
} from 'lucide-react';
import { mockTasks, mockActivities, mockNDAs } from '../../data/mockData';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';

export function Dashboard() {
  const navigate = useNavigate();
  
  // Helper function - define before use
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };
  
  // Calculate summary metrics
  const pendingReviews = mockNDAs.filter(nda => nda.status === 'In legal review').length;
  const waitingForSignature = mockNDAs.filter(nda => nda.status === 'Waiting for signature').length;
  const expiringSoon = mockNDAs.filter(nda => {
    if (!nda.expiryDate) return false;
    const daysUntilExpiry = Math.floor((new Date(nda.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  }).length;
  const avgCycleTime = 14; // Mock value
  
  // Metrics data
  const metrics = [
    { label: 'Pending Reviews', value: pendingReviews, icon: FileText, color: 'text-blue-600', change: 12 },
    { label: 'Waiting for Signature', value: waitingForSignature, icon: PenLine, color: 'text-amber-600', change: -5 },
    { label: 'Expiring Soon', value: expiringSoon, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Avg. Cycle Time', value: `${avgCycleTime} days`, icon: TrendingUp, color: 'text-green-600', change: 8 }
  ];
  
  // Recent activity data
  const recentActivity = mockActivities.map(activity => ({
    id: activity.id,
    text: activity.action,
    user: activity.actor,
    time: formatTimeAgo(activity.timestamp),
    icon: activity.icon === 'CheckCircle' ? CheckCircle : activity.icon === 'Check' ? CheckCircle : activity.icon === 'Send' ? Send : activity.icon === 'MessageSquare' ? MessageSquare : FileText,
    iconBg: activity.icon === 'CheckCircle' || activity.icon === 'Check' ? 'bg-green-100' : activity.icon === 'Send' ? 'bg-blue-100' : 'bg-gray-100',
    iconColor: activity.icon === 'CheckCircle' || activity.icon === 'Check' ? 'text-green-600' : activity.icon === 'Send' ? 'text-blue-600' : 'text-gray-600'
  }));
  
  const handleTaskAction = (task: any) => {
    if (task.type === 'Review NDA') {
      navigate(`/nda/${task.ndaId}`);
      toast.info('Opening NDA for review', {
        description: `Loading ${task.ndaTitle}...`
      });
    } else if (task.type === 'Approve') {
      navigate(`/nda/${task.ndaId}`);
      toast.info('Opening NDA for approval', {
        description: `Loading ${task.ndaTitle}...`
      });
    } else {
      navigate(`/nda/${task.ndaId}`);
    }
  };
  
  const handleTaskToggle = (taskId: string) => {
    toast.success('Task completed', {
      description: 'The task has been marked as complete.'
    });
  };
  
  const getActivityIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      CheckCircle: <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />,
      Check: <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />,
      Send: <Send className="w-4 h-4 text-blue-600" />,
      FileText: <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />,
      MessageSquare: <MessageSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
    };
    return icons[iconName] || <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />;
  };
  
  const getDueDateChip = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return <Badge variant="risk" risk="High">Overdue</Badge>;
    } else if (daysUntil === 0) {
      return <Badge variant="risk" risk="High">Due today</Badge>;
    } else if (daysUntil <= 2) {
      return <Badge variant="risk" risk="Medium">{daysUntil} {daysUntil === 1 ? 'day' : 'days'} left</Badge>;
    } else {
      return <Badge variant="info">Due {new Date(dueDate).toLocaleDateString()}</Badge>;
    }
  };
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-[var(--color-text-secondary)]">Welcome back, Sarah Johnson</p>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">{metric.label}</p>
                  <p className="text-3xl mb-2">{metric.value}</p>
                  {metric.change && (
                    <p className={`text-sm ${
                      metric.change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                    }`}>
                      {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}% from last month
                    </p>
                  )}
                </div>
                <Icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </Card>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2>Recent Activity</h2>
            <Button variant="subtle" size="sm">View All</Button>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-4 pb-4 border-b border-[var(--color-border)] last:border-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.iconBg}`}>
                    <Icon className={`w-5 h-5 ${activity.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mb-1">{activity.text}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        
        {/* My Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2>My Tasks</h2>
            <Button variant="subtle" size="sm">View all</Button>
          </div>
          
          <div className="space-y-3">
            {mockTasks.map((task) => (
              <div 
                key={task.id}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                onClick={() => handleTaskAction(task)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded mt-1 flex-shrink-0" 
                    onChange={(e) => {
                      e.stopPropagation();
                      handleTaskToggle(task.id);
                    }} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="mb-2">{task.ndaTitle}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="info">{task.type}</Badge>
                      {getDueDateChip(task.dueDate)}
                      <Badge variant="status" status={task.status as any}>{task.status}</Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskAction(task);
                  }}
                >
                  {task.type === 'Review NDA' ? 'Review' : task.type === 'Approve' ? 'Approve' : 'Action'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}