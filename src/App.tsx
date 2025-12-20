/**
 * USMax NDA Management System - Main Application
 * Story 1.1: AWS Cognito MFA Integration
 *
 * Updated to include:
 * - AuthProvider for authentication context
 * - Protected routes that require authentication
 * - Login and MFA challenge pages
 * - Session warning modal
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './components/screens/Dashboard';
import { Requests } from './components/screens/Requests';
import { RequestWizard } from './components/screens/RequestWizard';
import { NDADetail } from './components/screens/NDADetail';
import { Templates } from './components/screens/Templates';
import { Reports } from './components/screens/Reports';
import { Administration } from './components/screens/Administration';
import { UserManagement } from './components/screens/admin/UserManagement';
import { SecuritySettings } from './components/screens/admin/SecuritySettings';
import { NotificationSettings } from './components/screens/admin/NotificationSettings';
import { AuditLogs } from './components/screens/admin/AuditLogs';
import { Profile } from './components/screens/Profile';
import { Settings } from './components/screens/Settings';
import { Toaster } from './components/ui/sonner';

// Auth components (Story 1.1)
import { AuthProvider, useAuth } from './client/contexts/AuthContext';
import { LoginPage } from './client/pages/LoginPage';
import { MFAChallengePage } from './client/pages/MFAChallengePage';
import { SessionWarningModal } from './client/components/SessionWarningModal';
import { AgencyGroupsPage } from './client/pages/admin/AgencyGroupsPage';

/**
 * Protected Route Component
 * Task 5.5: Implement automatic redirect on 401 responses
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Main Layout Component
 * Wraps protected pages with sidebar and top bar
 */
function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[var(--color-background)]">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/**
 * Public Route Component
 * Redirects authenticated users to dashboard
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Session Warning Modal (AC3: Session timeout warning) */}
        <SessionWarningModal />

        <Toaster />
        <Routes>
          {/* Auth routes - public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/mfa-challenge" element={<MFAChallengePage />} />

          {/* Internal application routes - protected with main layout */}
          <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/requests" element={<MainLayout><Requests /></MainLayout>} />
          <Route path="/request-wizard" element={<MainLayout><RequestWizard /></MainLayout>} />
          <Route path="/nda/:id" element={<MainLayout><NDADetail /></MainLayout>} />
          <Route path="/templates" element={<MainLayout><Templates /></MainLayout>} />
          <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/administration" element={<MainLayout><Administration /></MainLayout>} />
          <Route path="/administration/agency-groups" element={<MainLayout><AgencyGroupsPage /></MainLayout>} />
          <Route path="/administration/users" element={<MainLayout><UserManagement /></MainLayout>} />
          <Route path="/administration/security" element={<MainLayout><SecuritySettings /></MainLayout>} />
          <Route path="/administration/notifications" element={<MainLayout><NotificationSettings /></MainLayout>} />
          <Route path="/administration/audit-logs" element={<MainLayout><AuditLogs /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />

          {/* Catch all - redirect to dashboard (or login if not authenticated) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
