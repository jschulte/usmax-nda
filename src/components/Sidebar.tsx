import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Inbox, 
  FileStack, 
  GitBranch, 
  BarChart3, 
  Settings 
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-ndas', label: 'My NDAs', icon: FileText },
    { id: 'requests', label: 'Requests', icon: Inbox },
    { id: 'templates', label: 'Templates & Clauses', icon: FileStack },
    { id: 'workflows', label: 'Workflows & Approvals', icon: GitBranch },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'admin', label: 'Administration', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-white border-r border-[var(--color-border)] h-screen flex flex-col">
      <div className="p-6 border-b border-[var(--color-border)]">
        <h2 className="text-[var(--color-primary)]">NDA Lifecycle</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Government Portal</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
