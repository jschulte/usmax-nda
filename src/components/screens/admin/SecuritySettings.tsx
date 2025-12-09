import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  ArrowLeft,
  Shield,
  Lock,
  Key,
  AlertTriangle,
  Clock,
  Globe,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export function SecuritySettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('authentication');

  // Authentication Settings
  const [authSettings, setAuthSettings] = useState({
    sessionTimeout: '60',
    requireMFA: false,
    allowRememberMe: true,
    maxLoginAttempts: '5',
    lockoutDuration: '30',
    passwordExpiration: '90',
    minPasswordLength: '12',
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventPasswordReuse: '5'
  });

  // Access Control Settings
  const [accessSettings, setAccessSettings] = useState({
    ipWhitelist: '',
    enableGeoRestrictions: false,
    allowedCountries: [] as string[],
    requireDeviceVerification: false,
    sessionConcurrency: '3'
  });

  // API Security Settings
  const [apiSettings, setApiSettings] = useState({
    rateLimit: '1000',
    rateLimitWindow: '3600',
    enableApiKeys: true,
    requireApiKeyRotation: true,
    apiKeyExpirationDays: '90',
    enableCORS: true,
    allowedOrigins: 'https://nda.agency.gov'
  });

  // Audit & Monitoring
  const [auditSettings, setAuditSettings] = useState({
    logAllRequests: true,
    logSensitiveData: false,
    retentionDays: '2555',
    alertFailedLogins: true,
    failedLoginThreshold: '3',
    alertSuspiciousActivity: true,
    enableRealTimeMonitoring: true
  });

  const handleSave = () => {
    toast.success('Security settings saved', {
      description: 'Your security configuration has been updated successfully'
    });
  };

  const handleTestConnection = () => {
    toast.info('Testing connection', {
      description: 'Verifying security configuration...'
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
            <h1 className="mb-2">Security Settings</h1>
            <p className="text-[var(--color-text-secondary)]">
              Configure security policies and access controls
            </p>
          </div>
          <Button variant="primary" icon={<Save className="w-5 h-5" />} onClick={handleSave}>
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Security Status Alert */}
      <Card className="mb-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="text-green-900 mb-1">Security Status: Good</h4>
            <p className="text-sm text-green-700">
              All security policies are properly configured and active. Last security audit: 2 days ago.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="api">API Security</TabsTrigger>
          <TabsTrigger value="audit">Audit & Monitoring</TabsTrigger>
        </TabsList>

        {/* Authentication Tab */}
        <TabsContent value="authentication" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Session Management</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={authSettings.sessionTimeout}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Users will be logged out after this period of inactivity
                  </p>
                </div>
                <div>
                  <Label htmlFor="login-attempts">Max Login Attempts</Label>
                  <Input
                    id="login-attempts"
                    type="number"
                    value={authSettings.maxLoginAttempts}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Account locked after failed attempts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-duration"
                    type="number"
                    value={authSettings.lockoutDuration}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, lockoutDuration: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password-expiration">Password Expiration (days)</Label>
                  <Input
                    id="password-expiration"
                    type="number"
                    value={authSettings.passwordExpiration}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordExpiration: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Multi-Factor Authentication (MFA)</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Require all users to enable MFA
                  </p>
                </div>
                <Switch
                  checked={authSettings.requireMFA}
                  onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireMFA: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Remember Me Option</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Allow users to stay logged in across sessions
                  </p>
                </div>
                <Switch
                  checked={authSettings.allowRememberMe}
                  onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, allowRememberMe: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Password Policy</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="min-password">Minimum Password Length</Label>
                <Input
                  id="min-password"
                  type="number"
                  min="8"
                  max="32"
                  value={authSettings.minPasswordLength}
                  onChange={(e) => setAuthSettings(prev => ({ ...prev, minPasswordLength: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                <Label>Password Complexity Requirements</Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Require uppercase letters (A-Z)</span>
                  <Switch
                    checked={authSettings.requireUppercase}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireUppercase: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Require lowercase letters (a-z)</span>
                  <Switch
                    checked={authSettings.requireLowercase}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireLowercase: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Require numbers (0-9)</span>
                  <Switch
                    checked={authSettings.requireNumbers}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireNumbers: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Require special characters (!@#$%)</span>
                  <Switch
                    checked={authSettings.requireSpecialChars}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireSpecialChars: checked }))}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <Label htmlFor="password-reuse">Prevent Password Reuse (last N passwords)</Label>
                <Input
                  id="password-reuse"
                  type="number"
                  value={authSettings.preventPasswordReuse}
                  onChange={(e) => setAuthSettings(prev => ({ ...prev, preventPasswordReuse: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">IP Access Control</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ip-whitelist">IP Whitelist</Label>
                <textarea
                  id="ip-whitelist"
                  value={accessSettings.ipWhitelist}
                  onChange={(e) => setAccessSettings(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                  placeholder="Enter IP addresses or CIDR ranges, one per line&#10;192.168.1.0/24&#10;10.0.0.1"
                  rows={6}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md mt-1 font-mono text-sm"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Only allow access from these IP addresses. Leave empty to allow all IPs.
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Geographic Restrictions</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Restrict access based on user location
                  </p>
                </div>
                <Switch
                  checked={accessSettings.enableGeoRestrictions}
                  onCheckedChange={(checked) => setAccessSettings(prev => ({ ...prev, enableGeoRestrictions: checked }))}
                />
              </div>

              {accessSettings.enableGeoRestrictions && (
                <div>
                  <Label>Allowed Countries</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select allowed countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Device & Session Control</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Device Verification</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Require verification for new devices
                  </p>
                </div>
                <Switch
                  checked={accessSettings.requireDeviceVerification}
                  onCheckedChange={(checked) => setAccessSettings(prev => ({ ...prev, requireDeviceVerification: checked }))}
                />
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <Label htmlFor="session-concurrency">Maximum Concurrent Sessions</Label>
                <Input
                  id="session-concurrency"
                  type="number"
                  value={accessSettings.sessionConcurrency}
                  onChange={(e) => setAccessSettings(prev => ({ ...prev, sessionConcurrency: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Number of simultaneous active sessions allowed per user
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* API Security Tab */}
        <TabsContent value="api" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">API Rate Limiting</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate-limit">Rate Limit (requests)</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={apiSettings.rateLimit}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, rateLimit: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="rate-window">Time Window (seconds)</Label>
                  <Input
                    id="rate-window"
                    type="number"
                    value={apiSettings.rateLimitWindow}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, rateLimitWindow: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Maximum number of API requests allowed per time window
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">API Key Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable API Keys</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Allow API key authentication for integrations
                  </p>
                </div>
                <Switch
                  checked={apiSettings.enableApiKeys}
                  onCheckedChange={(checked) => setApiSettings(prev => ({ ...prev, enableApiKeys: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Require API Key Rotation</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Force periodic rotation of API keys
                  </p>
                </div>
                <Switch
                  checked={apiSettings.requireApiKeyRotation}
                  onCheckedChange={(checked) => setApiSettings(prev => ({ ...prev, requireApiKeyRotation: checked }))}
                />
              </div>

              {apiSettings.requireApiKeyRotation && (
                <div>
                  <Label htmlFor="api-expiration">API Key Expiration (days)</Label>
                  <Input
                    id="api-expiration"
                    type="number"
                    value={apiSettings.apiKeyExpirationDays}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, apiKeyExpirationDays: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">CORS Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable CORS</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Allow cross-origin resource sharing
                  </p>
                </div>
                <Switch
                  checked={apiSettings.enableCORS}
                  onCheckedChange={(checked) => setApiSettings(prev => ({ ...prev, enableCORS: checked }))}
                />
              </div>

              {apiSettings.enableCORS && (
                <div>
                  <Label htmlFor="allowed-origins">Allowed Origins</Label>
                  <textarea
                    id="allowed-origins"
                    value={apiSettings.allowedOrigins}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, allowedOrigins: e.target.value }))}
                    placeholder="Enter allowed origins, one per line&#10;https://app.agency.gov&#10;https://portal.agency.gov"
                    rows={4}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md mt-1 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Audit & Monitoring Tab */}
        <TabsContent value="audit" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Audit Logging</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Log All API Requests</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Record every API request for audit purposes
                  </p>
                </div>
                <Switch
                  checked={auditSettings.logAllRequests}
                  onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, logAllRequests: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Log Sensitive Data</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Include sensitive data in audit logs (not recommended)
                  </p>
                </div>
                <Switch
                  checked={auditSettings.logSensitiveData}
                  onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, logSensitiveData: checked }))}
                />
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <Label htmlFor="retention">Audit Log Retention (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  value={auditSettings.retentionDays}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, retentionDays: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  7 years (2555 days) required for government compliance
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Security Alerts</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Failed Login Alerts</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Send alerts for multiple failed login attempts
                  </p>
                </div>
                <Switch
                  checked={auditSettings.alertFailedLogins}
                  onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, alertFailedLogins: checked }))}
                />
              </div>

              {auditSettings.alertFailedLogins && (
                <div>
                  <Label htmlFor="failed-threshold">Alert Threshold (attempts)</Label>
                  <Input
                    id="failed-threshold"
                    type="number"
                    value={auditSettings.failedLoginThreshold}
                    onChange={(e) => setAuditSettings(prev => ({ ...prev, failedLoginThreshold: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Suspicious Activity Alerts</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Alert on unusual access patterns or behaviors
                  </p>
                </div>
                <Switch
                  checked={auditSettings.alertSuspiciousActivity}
                  onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, alertSuspiciousActivity: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Real-Time Monitoring</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Enable real-time security monitoring dashboard
                  </p>
                </div>
                <Switch
                  checked={auditSettings.enableRealTimeMonitoring}
                  onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, enableRealTimeMonitoring: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-amber-900 mb-1">Security Monitoring Active</h4>
                <p className="text-sm text-amber-700">
                  All security events are being logged and monitored. Unusual activity will trigger immediate alerts to administrators.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
