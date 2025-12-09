import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './components/screens/Dashboard';
import { MyNDAs } from './components/screens/MyNDAs';
import { Requests } from './components/screens/Requests';
import { RequestWizard } from './components/screens/RequestWizard';
import { NDADetail } from './components/screens/NDADetail';
import { Templates } from './components/screens/Templates';
import { Workflows } from './components/screens/Workflows';
import { WorkflowEditor } from './components/screens/WorkflowEditor';
import { Reports } from './components/screens/Reports';
import { Administration } from './components/screens/Administration';
import { UserManagement } from './components/screens/admin/UserManagement';
import { SecuritySettings } from './components/screens/admin/SecuritySettings';
import { SystemConfiguration } from './components/screens/admin/SystemConfiguration';
import { NotificationSettings } from './components/screens/admin/NotificationSettings';
import { AuditLogs } from './components/screens/admin/AuditLogs';
import { ExternalSigningPortal } from './components/screens/ExternalSigningPortal';
import { Profile } from './components/screens/Profile';
import { Settings } from './components/screens/Settings';
import { Toaster } from './components/ui/sonner';

function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* External signing portal - no main layout */}
        <Route path="/sign/:id" element={<ExternalSigningPortal />} />
        
        {/* Internal application routes - with main layout */}
        <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/my-ndas" element={<MainLayout><MyNDAs /></MainLayout>} />
        <Route path="/requests" element={<MainLayout><Requests /></MainLayout>} />
        <Route path="/request-wizard" element={<MainLayout><RequestWizard /></MainLayout>} />
        <Route path="/nda/:id" element={<MainLayout><NDADetail /></MainLayout>} />
        <Route path="/templates" element={<MainLayout><Templates /></MainLayout>} />
        <Route path="/workflows" element={<MainLayout><Workflows /></MainLayout>} />
        <Route path="/workflows/create" element={<MainLayout><WorkflowEditor /></MainLayout>} />
        <Route path="/workflows/edit/:id" element={<MainLayout><WorkflowEditor /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
        <Route path="/administration" element={<MainLayout><Administration /></MainLayout>} />
        <Route path="/administration/users" element={<MainLayout><UserManagement /></MainLayout>} />
        <Route path="/administration/security" element={<MainLayout><SecuritySettings /></MainLayout>} />
        <Route path="/administration/system" element={<MainLayout><SystemConfiguration /></MainLayout>} />
        <Route path="/administration/notifications" element={<MainLayout><NotificationSettings /></MainLayout>} />
        <Route path="/administration/audit-logs" element={<MainLayout><AuditLogs /></MainLayout>} />
        <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
        <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}