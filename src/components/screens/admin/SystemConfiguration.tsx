import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Input } from '../../ui/AppInput';
import {
  ArrowLeft,
  Database,
  Mail,
  FileText,
  Globe,
  Calendar,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Clock
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
import { Badge } from '../../ui/Badge';

export function SystemConfiguration() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    organizationName: 'Federal Agency',
    systemName: 'NDA Lifecycle Management',
    supportEmail: 'support@agency.gov',
    systemUrl: 'https://nda.agency.gov',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    language: 'en-US'
  });

  // Email Configuration
  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp',
    smtpHost: 'smtp.agency.gov',
    smtpPort: '587',
    smtpSecure: true,
    smtpUser: 'nda-system@agency.gov',
    smtpPassword: '',
    fromName: 'NDA System',
    fromEmail: 'nda-system@agency.gov',
    replyTo: 'no-reply@agency.gov'
  });

  // Document Settings
  const [documentSettings, setDocumentSettings] = useState({
    storageProvider: 's3',
    s3Bucket: 'nda-documents-prod',
    s3Region: 'us-gov-west-1',
    s3AccessKey: '',
    s3SecretKey: '',
    maxFileSize: '25',
    allowedFileTypes: '.pdf,.docx,.doc',
    enableVersioning: true,
    retentionYears: '7'
  });

  // Integration Settings
  const [integrationSettings, setIntegrationSettings] = useState({
    ldapEnabled: true,
    ldapUrl: 'ldap://ad.agency.gov:389',
    ldapBaseDn: 'dc=agency,dc=gov',
    ldapBindDn: 'cn=ldap-reader,dc=agency,dc=gov',
    ldapBindPassword: '',
    esignProvider: 'docusign',
    docusignApiKey: '',
    docusignAccountId: '',
    docusignBaseUrl: 'https://demo.docusign.net'
  });

  // Connection Status
  const [connectionStatus, setConnectionStatus] = useState({
    database: 'connected',
    email: 'connected',
    storage: 'connected',
    ldap: 'connected',
    esign: 'disconnected'
  });

  const handleSave = () => {
    toast.success('System configuration saved', {
      description: 'All settings have been updated successfully'
    });
  };

  const handleTestEmail = () => {
    toast.loading('Testing email connection...', { id: 'test-email' });
    setTimeout(() => {
      toast.success('Email test successful', {
        id: 'test-email',
        description: 'Test email sent successfully'
      });
    }, 2000);
  };

  const handleTestStorage = () => {
    toast.loading('Testing storage connection...', { id: 'test-storage' });
    setTimeout(() => {
      toast.success('Storage test successful', {
        id: 'test-storage',
        description: 'Successfully connected to storage'
      });
    }, 2000);
  };

  const handleTestLDAP = () => {
    toast.loading('Testing LDAP connection...', { id: 'test-ldap' });
    setTimeout(() => {
      toast.success('LDAP test successful', {
        id: 'test-ldap',
        description: 'Successfully connected to LDAP server'
      });
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Executed';
      case 'disconnected':
        return 'Rejected';
      case 'pending':
        return 'In legal review';
      default:
        return 'Draft';
    }
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
            <h1 className="mb-2">System Configuration</h1>
            <p className="text-[var(--color-text-secondary)]">
              General system settings and integrations
            </p>
          </div>
          <Button variant="primary" icon={<Save className="w-5 h-5" />} onClick={handleSave}>
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Connection Status Overview */}
      <Card className="mb-6">
        <h3 className="mb-4">Connection Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus.database)}
            <div>
              <p className="text-sm">Database</p>
              <Badge variant="status" status={getStatusColor(connectionStatus.database)}>
                {connectionStatus.database}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus.email)}
            <div>
              <p className="text-sm">Email</p>
              <Badge variant="status" status={getStatusColor(connectionStatus.email)}>
                {connectionStatus.email}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus.storage)}
            <div>
              <p className="text-sm">Storage</p>
              <Badge variant="status" status={getStatusColor(connectionStatus.storage)}>
                {connectionStatus.storage}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus.ldap)}
            <div>
              <p className="text-sm">LDAP</p>
              <Badge variant="status" status={getStatusColor(connectionStatus.ldap)}>
                {connectionStatus.ldap}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus.esign)}
            <div>
              <p className="text-sm">E-Signature</p>
              <Badge variant="status" status={getStatusColor(connectionStatus.esign)}>
                {connectionStatus.esign}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <h3 className="mb-4">Organization Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={generalSettings.organizationName}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, organizationName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="system-name">System Name</Label>
                <Input
                  id="system-name"
                  value={generalSettings.systemName}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemName: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="system-url">System URL</Label>
                  <Input
                    id="system-url"
                    type="url"
                    value={generalSettings.systemUrl}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemUrl: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Regional Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={generalSettings.timezone}
                  onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}
                >
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
                  <Select
                    value={generalSettings.dateFormat}
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, dateFormat: value }))}
                  >
                    <SelectTrigger id="date-format" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={generalSettings.language}
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, language: value }))}
                  >
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

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>SMTP Configuration</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<TestTube className="w-4 h-4" />}
                onClick={handleTestEmail}
              >
                Test Connection
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={emailConfig.smtpHost}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    value={emailConfig.smtpPort}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <Label>Use TLS/SSL</Label>
                <Switch
                  checked={emailConfig.smtpSecure}
                  onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, smtpSecure: checked }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--color-border)]">
                <div>
                  <Label htmlFor="smtp-user">Username</Label>
                  <Input
                    id="smtp-user"
                    value={emailConfig.smtpUser}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={emailConfig.smtpPassword}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">Email Defaults</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={emailConfig.fromName}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reply-to">Reply-To Email</Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={emailConfig.replyTo}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>Document Storage (S3)</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<TestTube className="w-4 h-4" />}
                onClick={handleTestStorage}
              >
                Test Connection
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="s3-bucket">S3 Bucket Name</Label>
                  <Input
                    id="s3-bucket"
                    value={documentSettings.s3Bucket}
                    onChange={(e) => setDocumentSettings(prev => ({ ...prev, s3Bucket: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s3-region">AWS Region</Label>
                  <Select
                    value={documentSettings.s3Region}
                    onValueChange={(value) => setDocumentSettings(prev => ({ ...prev, s3Region: value }))}
                  >
                    <SelectTrigger id="s3-region" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-gov-west-1">GovCloud West</SelectItem>
                      <SelectItem value="us-gov-east-1">GovCloud East</SelectItem>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="s3-access">Access Key ID</Label>
                  <Input
                    id="s3-access"
                    type="password"
                    value={documentSettings.s3AccessKey}
                    onChange={(e) => setDocumentSettings(prev => ({ ...prev, s3AccessKey: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="s3-secret">Secret Access Key</Label>
                  <Input
                    id="s3-secret"
                    type="password"
                    value={documentSettings.s3SecretKey}
                    onChange={(e) => setDocumentSettings(prev => ({ ...prev, s3SecretKey: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">File Handling</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={documentSettings.maxFileSize}
                    onChange={(e) => setDocumentSettings(prev => ({ ...prev, maxFileSize: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="retention">Retention Period (years)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={documentSettings.retentionYears}
                    onChange={(e) => setDocumentSettings(prev => ({ ...prev, retentionYears: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="file-types">Allowed File Types</Label>
                <Input
                  id="file-types"
                  value={documentSettings.allowedFileTypes}
                  onChange={(e) => setDocumentSettings(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
                  placeholder=".pdf,.docx,.doc"
                  className="mt-1"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Comma-separated list of allowed file extensions
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-[var(--color-border)]">
                <div>
                  <Label>Enable Document Versioning</Label>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Keep history of document changes
                  </p>
                </div>
                <Switch
                  checked={documentSettings.enableVersioning}
                  onCheckedChange={(checked) => setDocumentSettings(prev => ({ ...prev, enableVersioning: checked }))}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3>LDAP / Active Directory</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<TestTube className="w-4 h-4" />}
                onClick={handleTestLDAP}
              >
                Test Connection
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable LDAP Authentication</Label>
                <Switch
                  checked={integrationSettings.ldapEnabled}
                  onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, ldapEnabled: checked }))}
                />
              </div>

              {integrationSettings.ldapEnabled && (
                <>
                  <div>
                    <Label htmlFor="ldap-url">LDAP Server URL</Label>
                    <Input
                      id="ldap-url"
                      value={integrationSettings.ldapUrl}
                      onChange={(e) => setIntegrationSettings(prev => ({ ...prev, ldapUrl: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ldap-base-dn">Base DN</Label>
                    <Input
                      id="ldap-base-dn"
                      value={integrationSettings.ldapBaseDn}
                      onChange={(e) => setIntegrationSettings(prev => ({ ...prev, ldapBaseDn: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ldap-bind-dn">Bind DN</Label>
                      <Input
                        id="ldap-bind-dn"
                        value={integrationSettings.ldapBindDn}
                        onChange={(e) => setIntegrationSettings(prev => ({ ...prev, ldapBindDn: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ldap-password">Bind Password</Label>
                      <Input
                        id="ldap-password"
                        type="password"
                        value={integrationSettings.ldapBindPassword}
                        onChange={(e) => setIntegrationSettings(prev => ({ ...prev, ldapBindPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4">E-Signature Integration</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="esign-provider">Provider</Label>
                <Select
                  value={integrationSettings.esignProvider}
                  onValueChange={(value) => setIntegrationSettings(prev => ({ ...prev, esignProvider: value }))}
                >
                  <SelectTrigger id="esign-provider" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docusign">DocuSign</SelectItem>
                    <SelectItem value="adobe">Adobe Sign</SelectItem>
                    <SelectItem value="none">None / Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {integrationSettings.esignProvider === 'docusign' && (
                <>
                  <div>
                    <Label htmlFor="docusign-api">Integration Key</Label>
                    <Input
                      id="docusign-api"
                      type="password"
                      value={integrationSettings.docusignApiKey}
                      onChange={(e) => setIntegrationSettings(prev => ({ ...prev, docusignApiKey: e.target.value }))}
                      placeholder="••••••••-••••-••••-••••-••••••••••••"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="docusign-account">Account ID</Label>
                      <Input
                        id="docusign-account"
                        value={integrationSettings.docusignAccountId}
                        onChange={(e) => setIntegrationSettings(prev => ({ ...prev, docusignAccountId: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docusign-url">API Base URL</Label>
                      <Input
                        id="docusign-url"
                        value={integrationSettings.docusignBaseUrl}
                        onChange={(e) => setIntegrationSettings(prev => ({ ...prev, docusignBaseUrl: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}