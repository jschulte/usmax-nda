import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Inbox, 
  FolderOpen, 
  GitBranch, 
  BarChart3, 
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'My NDAs', path: '/my-ndas' },
    { icon: Inbox, label: 'Requests', path: '/requests' },
    { icon: FolderOpen, label: 'Templates and Clauses', path: '/templates' },
    { icon: GitBranch, label: 'Workflows and Approvals', path: '/workflows' },
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
        <div className="flex items-center justify-between p-6 lg:justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="lg:block">
              <h1 className="text-lg">NDA System</h1>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-colors text-left ${
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
            <p className="mt-1">© 2025 Government Agency</p>
          </div>
        </div>
      </aside>
    </>
  );
}