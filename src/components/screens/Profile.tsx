import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  Key,
  Activity,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  ip_address: string;
  location: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'login',
    description: 'Logged in to system',
    timestamp: '2025-12-08T10:30:00Z',
    ip_address: '192.168.1.105',
    location: 'Washington, DC'
  },
  {
    id: '2',
    type: 'nda_approved',
    description: 'Approved NDA-2025-0145',
    timestamp: '2025-12-08T10:15:00Z',
    ip_address: '192.168.1.105',
    location: 'Washington, DC'
  },
  {
    id: '3',
    type: 'workflow_created',
    description: 'Created new workflow: High-Value Contract Review',
    timestamp: '2025-12-08T09:45:00Z',
    ip_address: '192.168.1.105',
    location: 'Washington, DC'
  },
  {
    id: '4',
    type: 'login',
    description: 'Logged in to system',
    timestamp: '2025-12-07T14:20:00Z',
    ip_address: '192.168.1.87',
    location: 'Washington, DC'
  },
  {
    id: '5',
    type: 'template_modified',
    description: 'Updated Mutual NDA Template',
    timestamp: '2025-12-07T11:30:00Z',
    ip_address: '192.168.1.87',
    location: 'Washington, DC'
  }
];

export function Profile() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@agency.gov',
    username: 'sarah.johnson',
    phone: '+1 (202) 555-0143',
    department: 'Legal',
    job_title: 'Senior Legal Counsel',
    employee_id: 'EMP-2024-0156',
    manager: 'David Williams',
    start_date: '2024-01-15',
    roles: ['Legal Reviewer', 'Admin'],
    bio: 'Experienced legal professional specializing in contract review and compliance for government agencies.'
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [editForm, setEditForm] = useState({ ...profileData });

  const handleEdit = () => {
    setEditForm({ ...profileData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditForm({ ...profileData });
    setIsEditing(false);
  };

  const handleSave = () => {
    setProfileData({ ...editForm });
    setIsEditing(false);
    toast.success('Profile updated', {
      description: 'Your profile information has been saved successfully'
    });
  };

  const handleChangePassword = () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Validation error', {
        description: 'Please fill in all password fields'
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Validation error', {
        description: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.new_password.length < 12) {
      toast.error('Validation error', {
        description: 'Password must be at least 12 characters long'
      });
      return;
    }

    toast.success('Password changed', {
      description: 'Your password has been updated successfully'
    });
    setShowPasswordDialog(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <User className="w-4 h-4" />;
      case 'nda_approved':
      case 'nda_rejected':
        return <Shield className="w-4 h-4" />;
      case 'workflow_created':
      case 'template_modified':
        return <Edit className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2">My Profile</h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage your personal information and account settings
            </p>
          </div>
          {activeTab === 'overview' && !isEditing && (
            <Button variant="primary" icon={<Edit className="w-4 h-4" />} onClick={handleEdit}>
              Edit Profile
            </Button>
          )}
          {activeTab === 'overview' && isEditing && (
            <div className="flex gap-2">
              <Button variant="secondary" icon={<X className="w-4 h-4" />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-12 h-12 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="mb-1">{profileData.full_name}</h2>
                <p className="text-[var(--color-text-secondary)]">{profileData.job_title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{profileData.department} Department</p>
              </div>
              <div className="flex gap-2">
                {profileData.roles.map(role => (
                  <Badge key={role} variant="default">{role}</Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm">{profileData.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm">Joined {formatDate(profileData.start_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={isEditing ? editForm.full_name : profileData.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={isEditing ? editForm.email : profileData.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={isEditing ? editForm.phone : profileData.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={isEditing ? editForm.bio : profileData.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  className={`w-full px-3 py-2 border border-[var(--color-border)] rounded-md mt-1 ${!isEditing ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Employment Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={profileData.job_title}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={profileData.employee_id}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    value={profileData.manager}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  value={formatDate(profileData.start_date)}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Roles & Permissions</h3>
            <div className="space-y-3">
              {profileData.roles.map((role, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                    <div>
                      <p className="font-medium">{role}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {role === 'Legal Reviewer' && 'Review and approve NDAs, manage templates'}
                        {role === 'Admin' && 'Full system access and configuration'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Password & Authentication</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Last changed 45 days ago
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-green-600">Enabled</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Active Sessions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-blue-50 border-blue-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Current Session</p>
                    <Badge variant="default" className="bg-blue-600">Active</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Windows • Chrome • Washington, DC
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    IP: 192.168.1.105 • Last active: Just now
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
                <div>
                  <p className="font-medium mb-1">Mobile Session</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    iPhone • Safari • Washington, DC
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    IP: 192.168.1.87 • Last active: 2 hours ago
                  </p>
                </div>
                <Button variant="subtle" size="sm">
                  Revoke
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Security Recommendations</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-900">Strong password</p>
                  <p className="text-sm text-green-700">Your password meets all security requirements</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-900">Two-factor authentication enabled</p>
                  <p className="text-sm text-green-700">Your account has an extra layer of security</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-900">Password expiring soon</p>
                  <p className="text-sm text-amber-700">Your password will expire in 45 days. Consider changing it soon.</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <h3 className="mb-4">Recent Activity</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Your recent account activity and system events
            </p>

            <div className="space-y-3">
              {mockActivities.map(activity => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-1">{activity.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTimestamp(activity.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {activity.ip_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {activity.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button variant="secondary" size="sm">
                Load More Activity
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Choose a strong password to keep your account secure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Minimum 12 characters with uppercase, lowercase, numbers, and special characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
