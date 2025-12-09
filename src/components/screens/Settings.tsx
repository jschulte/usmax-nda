import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Bell,
  Moon,
  Globe,
  Mail,
  MessageSquare,
  Calendar,
  Eye,
  Save,
  Download,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function Settings() {
  const [activeTab, setActiveTab] = useState('preferences');

  // Notification Preferences
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    taskAssigned: true,
    taskCompleted: false,
    taskOverdue: true,
    ndaApproved: true,
    ndaRejected: true,
    ndaExecuted: true,
    workflowCompleted: true,
    commentMentions: true,
    weeklyDigest: true,
    monthlyReport: false
  });

  // Display Preferences
  const [displaySettings, setDisplaySettings] = useState({
    theme: 'light',
    compactView: false,
    showAvatars: true,
    animationsEnabled: true,
    tableRowHeight: 'comfortable'
  });

  // Regional Settings
  const [regionalSettings, setRegionalSettings] = useState({
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'sunday',
    language: 'en-US'
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    emailDigest: 'daily',
    emailFrequency: 'immediate',
    includeDetails: true,
    batchNotifications: false
  });

  const handleSavePreferences = () => {
    toast.success('Preferences saved', {
      description: 'Your settings have been updated successfully'
    });
  };

  const handleSaveNotifications = () => {
    toast.success('Notification settings saved', {
      description: 'Your notification preferences have been updated'
    });
  };

  const handleExportData = () => {
    toast.success('Data export started', {
      description: 'Your data export will be emailed to you shortly'
    });
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion', {
      description: 'Please contact your administrator to delete your account'
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Settings</h1>
        <p className="text-[var(--color-text-secondary)]">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="data">Data & Privacy</TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>Display Preferences</h3>
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Save className="w-4 h-4" />}
                onClick={handleSavePreferences}
              >
                Save Changes
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select value={displaySettings.theme} onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, theme: value }))}>
                  <SelectTrigger id="theme" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Choose your preferred color theme
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Compact View</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Reduce spacing and padding for more content
                  </p>
                </div>
                <Switch
                  checked={displaySettings.compactView}
                  onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, compactView: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Show User Avatars</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Display profile pictures throughout the app
                  </p>
                </div>
                <Switch
                  checked={displaySettings.showAvatars}
                  onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, showAvatars: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Enable Animations</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Smooth transitions and visual effects
                  </p>
                </div>
                <Switch
                  checked={displaySettings.animationsEnabled}
                  onCheckedChange={(checked) => setDisplaySettings(prev => ({ ...prev, animationsEnabled: checked }))}
                />
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <Label htmlFor="table-row-height">Table Row Height</Label>
                <Select value={displaySettings.tableRowHeight} onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, tableRowHeight: value }))}>
                  <SelectTrigger id="table-row-height" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Regional Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={regionalSettings.timezone} onValueChange={(value) => setRegionalSettings(prev => ({ ...prev, timezone: value }))}>
                  <SelectTrigger id="timezone" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select value={regionalSettings.dateFormat} onValueChange={(value) => setRegionalSettings(prev => ({ ...prev, dateFormat: value }))}>
                    <SelectTrigger id="date-format" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/08/2025)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (08/12/2025)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-08)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select value={regionalSettings.timeFormat} onValueChange={(value) => setRegionalSettings(prev => ({ ...prev, timeFormat: value }))}>
                    <SelectTrigger id="time-format" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
                      <SelectItem value="24h">24-hour (15:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-day">First Day of Week</Label>
                  <Select value={regionalSettings.firstDayOfWeek} onValueChange={(value) => setRegionalSettings(prev => ({ ...prev, firstDayOfWeek: value }))}>
                    <SelectTrigger id="first-day" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={regionalSettings.language} onValueChange={(value) => setRegionalSettings(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger id="language" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-US">Español</SelectItem>
                      <SelectItem value="fr-FR">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>Notification Preferences</h3>
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveNotifications}
              >
                Save Changes
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <Label>In-App Notifications</Label>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Show notifications in the application
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.inAppNotifications}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, inAppNotifications: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Event Notifications</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Choose which events trigger notifications
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Task assigned to me</span>
                <Switch
                  checked={notificationSettings.taskAssigned}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskAssigned: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">Task completed</span>
                <Switch
                  checked={notificationSettings.taskCompleted}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskCompleted: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">Task overdue</span>
                <Switch
                  checked={notificationSettings.taskOverdue}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskOverdue: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">NDA approved</span>
                <Switch
                  checked={notificationSettings.ndaApproved}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, ndaApproved: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">NDA rejected</span>
                <Switch
                  checked={notificationSettings.ndaRejected}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, ndaRejected: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">NDA executed</span>
                <Switch
                  checked={notificationSettings.ndaExecuted}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, ndaExecuted: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">Workflow completed</span>
                <Switch
                  checked={notificationSettings.workflowCompleted}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, workflowCompleted: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                <span className="text-sm">Comment mentions (@username)</span>
                <Switch
                  checked={notificationSettings.commentMentions}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, commentMentions: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Digest & Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Activity Digest</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Receive a weekly summary of your activity
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyDigest}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, weeklyDigest: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Monthly Report</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Receive a monthly report of NDAs and tasks
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.monthlyReport}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, monthlyReport: checked }))}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Email Delivery</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-frequency">Email Frequency</Label>
                <Select value={emailSettings.emailFrequency} onValueChange={(value) => setEmailSettings(prev => ({ ...prev, emailFrequency: value }))}>
                  <SelectTrigger id="email-frequency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate (as they happen)</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  How often you receive email notifications
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <Label htmlFor="email-digest">Digest Schedule</Label>
                <Select value={emailSettings.emailDigest} onValueChange={(value) => setEmailSettings(prev => ({ ...prev, emailDigest: value }))}>
                  <SelectTrigger id="email-digest" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (8:00 AM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (1:00 PM)</SelectItem>
                    <SelectItem value="evening">Evening (5:00 PM)</SelectItem>
                    <SelectItem value="daily">Daily Summary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  When to send digest emails
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Include Full Details</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Include complete information in email notifications
                  </p>
                </div>
                <Switch
                  checked={emailSettings.includeDetails}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, includeDetails: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Batch Similar Notifications</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Group similar notifications together
                  </p>
                </div>
                <Switch
                  checked={emailSettings.batchNotifications}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, batchNotifications: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-blue-900 mb-1">Email Preview</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Emails are sent from <strong>nda-system@agency.gov</strong>
                </p>
                <Button variant="secondary" size="sm">
                  Send Test Email
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Data & Privacy Tab */}
        <TabsContent value="data" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Data Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Download a copy of your data and activity
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleExportData}>
                  Export Data
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <div>
                    <p className="font-medium">Privacy Settings</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Control who can see your information
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Activity & Storage</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">NDAs Created</span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Tasks Completed</span>
                  <span className="font-medium">147</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Comments Posted</span>
                  <span className="font-medium">89</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Used</span>
                  <span className="font-medium">2.3 GB</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-red-200">
            <h3 className="mb-4 text-red-900">Danger Zone</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Delete Account</p>
                    <p className="text-sm text-red-700">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
