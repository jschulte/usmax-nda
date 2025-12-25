import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  FolderOpen,
  BarChart3,
  Settings,
  X,
  Plus
} from 'lucide-react';
import { Button } from '../ui/AppButton';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Inbox, label: 'My NDAs', path: '/my-ndas' },
    { icon: Inbox, label: 'My Drafts', path: '/my-drafts' },
    { icon: Inbox, label: 'All NDAs', path: '/ndas' },
    { icon: FolderOpen, label: 'Templates and Clauses', path: '/templates' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Administration', path: '/administration' }
  ];
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[var(--color-sidebar)] border-r border-[var(--color-border)]
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Mobile Close Button */}
        <div className="flex items-start justify-between p-6">
          <div className="flex flex-col items-start gap-3 flex-1">
            <img 
              src="https://www.usmax.com/wp-content/themes/usmax/static/images/usmax-site-logo.jpg" 
              alt="USMax"
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-base">NDA System</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">Lifecycle Management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Story 10.13: Request NDA Button */}
          <div className="mb-6">
            <Button
              onClick={() => {
                navigate('/ndas/new');
                onClose?.(); // Close mobile menu
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Request NDA
            </Button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)]">
            <p>Version 2.1.0</p>
            <p className="mt-1">© 2025 USMax</p>
          </div>
        </div>
      </aside>
    </>
  );
}
