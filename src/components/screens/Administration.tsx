import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Settings, Users, Shield, Bell, FileText, Building, Mail } from 'lucide-react';

export function Administration() {
  const navigate = useNavigate();
  
  const adminSections = [
    {
      icon: Building,
      title: 'Agency Groups',
      description: 'Manage agency group hierarchy and organization',
      color: 'bg-indigo-100 text-indigo-600',
      path: '/administration/agency-groups'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      color: 'bg-blue-100 text-blue-600',
      path: '/administration/users'
    },
    {
      icon: Mail,
      title: 'Email Templates',
      description: 'Create and edit email templates with placeholders',
      color: 'bg-green-100 text-green-600',
      path: '/administration/email-templates'
    },
    {
      icon: Shield,
      title: 'Security Settings',
      description: 'Configure security policies and access controls',
      color: 'bg-purple-100 text-purple-600',
      path: '/administration/security'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure email and system notifications',
      color: 'bg-amber-100 text-amber-600',
      path: '/administration/notifications'
    },
    {
      icon: FileText,
      title: 'Audit Logs',
      description: 'View system activity and audit trails',
      color: 'bg-teal-100 text-teal-600',
      path: '/administration/audit-logs'
    },
    {
      icon: Settings,
      title: 'Advanced Settings',
      description: 'Advanced configuration options',
      color: 'bg-gray-100 text-gray-600',
      path: '/administration/advanced'
    }
  ];
  
  const handleConfigure = (section: any) => {
    navigate(section.path);
  };
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Administration</h1>
        <p className="text-[var(--color-text-secondary)]">System configuration and administrative controls</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base mb-1">{section.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{section.description}</p>
                </div>
              </div>
              <Button variant="subtle" size="sm" className="w-full mt-4" onClick={() => handleConfigure(section)}>
                Configure
              </Button>
            </Card>
          );
        })}
      </div>
      
      <Card className="mt-8">
        <h3 className="mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Version</p>
            <p>2.1.0</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Database Status</p>
            <p className="text-[var(--color-success)]">Connected</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Database Backups</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Automated daily via AWS RDS</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
