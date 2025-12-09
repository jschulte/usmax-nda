import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquare,
  Save,
  Plus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Textarea } from '../../ui/textarea';
import { Input } from '../../ui/Input';

interface NotificationTemplate {
  id: string;
  name: string;
  event: string;
  subject: string;
  enabled: boolean;
}

const mockTemplates: NotificationTemplate[] = [
  {
    id: 't1',
    name: 'Task Assigned',
    event: 'task_assigned',
    subject: 'New Task: {{task_name}}',
    enabled: true
  },
  {
    id: 't2',
    name: 'NDA Approved',
    event: 'nda_approved',
    subject: 'NDA {{nda_number}} has been approved',
    enabled: true
  },
  {
    id: 't3',
    name: 'NDA Rejected',
    event: 'nda_rejected',
    subject: 'NDA {{nda_number}} has been rejected',
    enabled: true
  },
  {
    id: 't4',
    name: 'Deadline Approaching',
    event: 'deadline_approaching',
    subject: 'Reminder: Task {{task_name}} due soon',
    enabled: true
  },
  {
    id: 't5',
    name: 'Task Overdue',
    event: 'task_overdue',
    subject: 'Overdue: {{task_name}}',
    enabled: true
  }
];

export function NotificationSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    enableEmailNotifications: true,
    enableInAppNotifications: true,
    enableSMSNotifications: false,
    batchNotifications: true,
    batchInterval: '60',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    respectQuietHours: true
  });

  // Event-specific Settings
  const [eventSettings, setEventSettings] = useState({
    taskAssigned: { email: true, inApp: true, sms: false },
    taskCompleted: { email: true, inApp: true, sms: false },
    taskOverdue: { email: true, inApp: true, sms: false },
    ndaApproved: { email: true, inApp: true, sms: false },
    ndaRejected: { email: true, inApp: true, sms: false },
    ndaExecuted: { email: true, inApp: false, sms: false },
    workflowStarted: { email: false, inApp: true, sms: false },
    workflowCompleted: { email: true, inApp: true, sms: false },
    commentAdded: { email: true, inApp: true, sms: false },
    deadlineApproaching: { email: true, inApp: true, sms: false }
  });

  // Escalation Settings
  const [escalationSettings, setEscalationSettings] = useState({
    enableEscalation: true,
    escalationDelayHours: '24',
    escalateToManager: true,
    escalateToAdmin: false,
    maxEscalationLevel: '2'
  });

  const handleSave = () => {
    toast.success('Notification settings saved', {
      description: 'Your notification preferences have been updated'
    });
  };

  const handleTestNotification = () => {
    toast.success('Test notification sent', {
      description: 'Check your email and in-app notifications'
    });
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
            <h1 className="mb-2">Notification Settings</h1>
            <p className="text-[var(--color-text-secondary)]">
              Configure email and system notifications
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              icon={<Bell className="w-4 h-4" />}
              onClick={handleTestNotification}
            >
              Send Test
            </Button>
            <Button variant="primary" icon={<Save className="w-5 h-5" />} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="events">Event Notifications</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="escalation">Escalation</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Notification Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Send notifications via email
                  </p>
                </div>
                <Switch
                  checked={generalSettings.enableEmailNotifications}
                  onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, enableEmailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>In-App Notifications</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Show notifications within the application
                  </p>
                </div>
                <Switch
                  checked={generalSettings.enableInAppNotifications}
                  onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, enableInAppNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Send critical alerts via SMS (requires Twilio setup)
                  </p>
                </div>
                <Switch
                  checked={generalSettings.enableSMSNotifications}
                  onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, enableSMSNotifications: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Delivery Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Batch Notifications</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Group multiple notifications into digest emails
                  </p>
                </div>
                <Switch
                  checked={generalSettings.batchNotifications}
                  onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, batchNotifications: checked }))}
                />
              </div>

              {generalSettings.batchNotifications && (
                <div>
                  <Label htmlFor="batch-interval">Batch Interval (minutes)</Label>
                  <Input
                    id="batch-interval"
                    type="number"
                    value={generalSettings.batchInterval}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, batchInterval: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Wait time before sending batched notifications
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Quiet Hours</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Respect Quiet Hours</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Delay non-urgent notifications during quiet hours
                  </p>
                </div>
                <Switch
                  checked={generalSettings.respectQuietHours}
                  onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, respectQuietHours: checked }))}
                />
              </div>

              {generalSettings.respectQuietHours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={generalSettings.quietHoursStart}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">Quiet Hours End</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={generalSettings.quietHoursEnd}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Event Notification Settings</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Configure which channels to use for each type of notification
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4">Event</th>
                    <th className="text-center py-3 px-4">
                      <Mail className="w-4 h-4 mx-auto" />
                      <span className="text-xs block mt-1">Email</span>
                    </th>
                    <th className="text-center py-3 px-4">
                      <Bell className="w-4 h-4 mx-auto" />
                      <span className="text-xs block mt-1">In-App</span>
                    </th>
                    <th className="text-center py-3 px-4">
                      <MessageSquare className="w-4 h-4 mx-auto" />
                      <span className="text-xs block mt-1">SMS</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(eventSettings).map(([event, channels]) => (
                    <tr key={event} className="border-b border-[var(--color-border)]">
                      <td className="py-4 px-4">
                        <span className="capitalize">{event.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Switch
                          checked={channels.email}
                          onCheckedChange={(checked) => 
                            setEventSettings(prev => ({
                              ...prev,
                              [event]: { ...prev[event as keyof typeof prev], email: checked }
                            }))
                          }
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Switch
                          checked={channels.inApp}
                          onCheckedChange={(checked) => 
                            setEventSettings(prev => ({
                              ...prev,
                              [event]: { ...prev[event as keyof typeof prev], inApp: checked }
                            }))
                          }
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Switch
                          checked={channels.sms}
                          onCheckedChange={(checked) => 
                            setEventSettings(prev => ({
                              ...prev,
                              [event]: { ...prev[event as keyof typeof prev], sms: checked }
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="mb-1">Email Templates</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Customize email notification templates
                </p>
              </div>
              <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />}>
                Add Template
              </Button>
            </div>

            <div className="space-y-3">
              {mockTemplates.map(template => (
                <div 
                  key={template.id}
                  className="p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="mb-1">{template.name}</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Event: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{template.event}</code>
                      </p>
                    </div>
                    <Switch checked={template.enabled} />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Subject Line</Label>
                      <Input
                        value={template.subject}
                        className="mt-1"
                        readOnly
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email Body</Label>
                      <Textarea
                        rows={3}
                        className="mt-1"
                        placeholder="Email template body..."
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                    <Button variant="secondary" size="sm">Edit Template</Button>
                    <Button variant="subtle" size="sm">Preview</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <h4 className="text-blue-900 mb-2">Template Variables</h4>
            <p className="text-sm text-blue-700 mb-3">
              Use these variables in your email templates:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                '{{user_name}}',
                '{{nda_number}}',
                '{{nda_title}}',
                '{{task_name}}',
                '{{due_date}}',
                '{{counterparty}}',
                '{{department}}',
                '{{link}}'
              ].map(variable => (
                <code key={variable} className="text-xs bg-white px-2 py-1 rounded border border-blue-300">
                  {variable}
                </code>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Escalation Tab */}
        <TabsContent value="escalation" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Escalation Policy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Automatic Escalation</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Escalate overdue tasks to management
                  </p>
                </div>
                <Switch
                  checked={escalationSettings.enableEscalation}
                  onCheckedChange={(checked) => setEscalationSettings(prev => ({ ...prev, enableEscalation: checked }))}
                />
              </div>

              {escalationSettings.enableEscalation && (
                <>
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <Label htmlFor="escalation-delay">Escalation Delay (hours)</Label>
                    <Input
                      id="escalation-delay"
                      type="number"
                      value={escalationSettings.escalationDelayHours}
                      onChange={(e) => setEscalationSettings(prev => ({ ...prev, escalationDelayHours: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Hours after due date before escalating
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                    <Label>Escalation Recipients</Label>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Escalate to user&apos;s manager</span>
                      <Switch
                        checked={escalationSettings.escalateToManager}
                        onCheckedChange={(checked) => setEscalationSettings(prev => ({ ...prev, escalateToManager: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Escalate to system administrators</span>
                      <Switch
                        checked={escalationSettings.escalateToAdmin}
                        onCheckedChange={(checked) => setEscalationSettings(prev => ({ ...prev, escalateToAdmin: checked }))}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <Label htmlFor="max-escalation">Maximum Escalation Level</Label>
                    <Input
                      id="max-escalation"
                      type="number"
                      min="1"
                      max="5"
                      value={escalationSettings.maxEscalationLevel}
                      onChange={(e) => setEscalationSettings(prev => ({ ...prev, maxEscalationLevel: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Number of escalation levels before final alert
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Escalation Schedule</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Level 1: Direct Manager</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">+24 hours</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Notify the task assignee&apos;s direct manager
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Level 2: Department Head</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">+48 hours</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Escalate to department head if still unresolved
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Level 3: System Administrator</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">+72 hours</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Final escalation to system administrators
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
