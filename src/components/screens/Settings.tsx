import React, { useEffect, useState } from 'react';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Mail, Save, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  getPreferences,
  updatePreferences,
  type NotificationPreferences,
} from '../../client/services/notificationService';

export function Settings() {
  const [activeTab, setActiveTab] = useState('preferences');

  // Notification Preferences
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>({
    onNdaCreated: true,
    onNdaEmailed: true,
    onDocumentUploaded: true,
    onStatusChanged: true,
    onFullyExecuted: true,
  });
  const [notificationLoading, setNotificationLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true;
    getPreferences()
      .then((data) => {
        if (isMounted) {
          setNotificationSettings(data.preferences);
        }
      })
      .catch(() => {
        toast.error('Failed to load notification preferences');
      })
      .finally(() => {
        if (isMounted) {
          setNotificationLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSavePreferences = () => {
    toast.success('Preferences saved', {
      description: 'Your settings have been updated successfully'
    });
  };

  const handleSaveNotifications = async () => {
    try {
      const result = await updatePreferences(notificationSettings);
      setNotificationSettings(result.preferences);
      toast.success('Notification settings saved', {
        description: 'Your notification preferences have been updated'
      });
    } catch (error) {
      toast.error('Failed to save notification preferences', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    }
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

            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Choose which NDA events trigger notifications.
            </p>

            {notificationLoading ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Loading preferences...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">NDA Created</span>
                  <Switch
                    checked={notificationSettings.onNdaCreated}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, onNdaCreated: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                  <span className="text-sm">NDA Emailed</span>
                  <Switch
                    checked={notificationSettings.onNdaEmailed}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, onNdaEmailed: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                  <span className="text-sm">Document Uploaded</span>
                  <Switch
                    checked={notificationSettings.onDocumentUploaded}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, onDocumentUploaded: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                  <span className="text-sm">Status Changed</span>
                  <Switch
                    checked={notificationSettings.onStatusChanged}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, onStatusChanged: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
                  <span className="text-sm">Fully Executed</span>
                  <Switch
                    checked={notificationSettings.onFullyExecuted}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({ ...prev, onFullyExecuted: checked }))
                    }
                  />
                </div>
              </div>
            )}
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
