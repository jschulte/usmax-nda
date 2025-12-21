import React, { useState, useEffect } from 'react';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import {
  FileText,
  PenLine,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  Send,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';
import { getDashboard, Dashboard as DashboardData, StaleNda, ExpiringNda, WaitingNda, RecentActivity } from '../../client/services/dashboardService';

// Union type for all items needing attention
type AttentionItem = (StaleNda & { reason: string; priority: 'high' | 'medium' | 'low'; itemType: 'stale' }) |
                     (ExpiringNda & { reason: string; priority: 'high' | 'medium' | 'low'; itemType: 'expiring' }) |
                     (WaitingNda & { reason: string; priority: 'high' | 'medium' | 'low'; itemType: 'waiting' });

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Load dashboard data on mount
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        toast.error('Failed to load dashboard', {
          description: 'Please refresh the page to try again.'
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

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

  // Calculate summary metrics from real data
  const activeCount = dashboardData?.metrics.activeNdas ?? 0;
  const expiringSoon = dashboardData?.metrics.expiringSoon ?? 0;
  const avgCycleTime = dashboardData?.metrics.averageCycleTimeDays ?? 0;

  // Flatten items needing attention into a single array with proper typing
  const flattenedItems: AttentionItem[] = React.useMemo(() => {
    if (!dashboardData?.itemsNeedingAttention) return [];

    const items: AttentionItem[] = [];

    // Add stale items
    for (const item of dashboardData.itemsNeedingAttention.stale) {
      const reason = item.staleReason === 'created_not_emailed'
        ? 'Created but not yet emailed'
        : 'Emailed with no response';
      const priority: 'high' | 'medium' | 'low' = item.staleDays > 30 ? 'high' : item.staleDays > 14 ? 'medium' : 'low';
      items.push({ ...item, reason, priority, itemType: 'stale' as const });
    }

    // Add expiring items
    for (const item of dashboardData.itemsNeedingAttention.expiring) {
      const reason = item.alertLevel === 'expired'
        ? 'Expired'
        : `Expires in ${item.daysUntilExpiration} days`;
      const priority: 'high' | 'medium' | 'low' = item.alertLevel === 'expired' || item.alertLevel === 'warning' ? 'high' : 'medium';
      items.push({ ...item, reason, priority, itemType: 'expiring' as const });
    }

    // Add waiting items
    for (const item of dashboardData.itemsNeedingAttention.waitingOnThirdParty) {
      const reason = `Waiting on third party for ${item.waitingDays} days`;
      const priority: 'high' | 'medium' | 'low' = item.waitingDays > 30 ? 'high' : item.waitingDays > 14 ? 'medium' : 'low';
      items.push({ ...item, reason, priority, itemType: 'waiting' as const });
    }

    // Sort by priority (high first)
    items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return items;
  }, [dashboardData]);

  // Count items by status/priority
  const pendingReviews = flattenedItems.filter(item => item.itemType === 'stale').length;
  const waitingForSignature = flattenedItems.filter(item => item.itemType === 'waiting').length;
  
  // Metrics data
  const metrics = [
    { label: 'Active NDAs', value: activeCount, icon: FileText, color: 'text-blue-600' },
    { label: 'Pending Reviews', value: pendingReviews, icon: PenLine, color: 'text-amber-600' },
    { label: 'Expiring Soon', value: expiringSoon, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Avg. Cycle Time', value: `${avgCycleTime} days`, icon: TrendingUp, color: 'text-green-600' }
  ];

  // Map activity type to icon
  const getActivityIcon = (activity: RecentActivity) => {
    const action = activity.action.toLowerCase();
    if (action.includes('sign') || action.includes('executed')) {
      return { Icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' };
    } else if (action.includes('email') || action.includes('sent')) {
      return { Icon: Send, bg: 'bg-blue-100', color: 'text-blue-600' };
    } else if (action.includes('comment') || action.includes('note')) {
      return { Icon: MessageSquare, bg: 'bg-purple-100', color: 'text-purple-600' };
    } else if (action.includes('create') || action.includes('draft')) {
      return { Icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600' };
    } else {
      return { Icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  // Recent activity data
  const recentActivity = (dashboardData?.recentActivity ?? []).map(activity => {
    const iconConfig = getActivityIcon(activity);
    return {
      id: activity.id,
      text: activity.description,
      user: activity.user?.name ?? 'Unknown User',
      time: formatTimeAgo(activity.timestamp),
      Icon: iconConfig.Icon,
      iconBg: iconConfig.bg,
      iconColor: iconConfig.color
    };
  });
  
  const handleTaskAction = (item: AttentionItem) => {
    navigate(`/nda/${item.id}`);
    toast.info('Opening NDA', {
      description: `Loading ${item.companyName}...`
    });
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const riskMap = {
      high: 'High' as const,
      medium: 'Medium' as const,
      low: 'Low' as const
    };
    return <Badge variant="risk" risk={riskMap[priority]}>{priority}</Badge>;
  };

  const getStaleBadge = (item: AttentionItem) => {
    if (item.itemType === 'stale') {
      const daysStale = item.staleDays;
      if (daysStale > 30) {
        return <Badge variant="risk" risk="High">{daysStale} days stale</Badge>;
      } else if (daysStale > 14) {
        return <Badge variant="risk" risk="Medium">{daysStale} days stale</Badge>;
      } else {
        return <Badge variant="info">{daysStale} days stale</Badge>;
      }
    }
    if (item.itemType === 'expiring') {
      if (item.alertLevel === 'expired') {
        return <Badge variant="risk" risk="High">Expired</Badge>;
      } else if (item.alertLevel === 'warning') {
        return <Badge variant="risk" risk="Medium">{item.daysUntilExpiration}d to expiry</Badge>;
      } else {
        return <Badge variant="info">{item.daysUntilExpiration}d to expiry</Badge>;
      }
    }
    if (item.itemType === 'waiting') {
      if (item.waitingDays > 30) {
        return <Badge variant="risk" risk="High">{item.waitingDays}d waiting</Badge>;
      } else if (item.waitingDays > 14) {
        return <Badge variant="risk" risk="Medium">{item.waitingDays}d waiting</Badge>;
      } else {
        return <Badge variant="info">{item.waitingDays}d waiting</Badge>;
      }
    }
    return null;
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="mb-2">Failed to Load Dashboard</h2>
            <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-[var(--color-text-secondary)]">Track your NDAs and stay on top of pending actions</p>
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
                  <p className="text-3xl">{metric.value}</p>
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
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.Icon;
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
          )}
        </Card>
        
        {/* Items Needing Attention */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2>Items Needing Attention</h2>
            <Button variant="subtle" size="sm" onClick={() => navigate('/ndas')}>View all</Button>
          </div>

          {flattenedItems.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>All caught up!</p>
              <p className="text-sm mt-1">No items need your attention right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flattenedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                  onClick={() => handleTaskAction(item)}
                >
                  <div className="flex-1 min-w-0 mb-3">
                    <p className="mb-2 font-medium">{item.companyName}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">NDA-{item.displayId} • {item.agencyGroupName}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="status" status={item.status as any}>{item.status}</Badge>
                      {getPriorityBadge(item.priority)}
                      {getStaleBadge(item)}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {item.reason}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskAction(item);
                    }}
                  >
                    View NDA
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}