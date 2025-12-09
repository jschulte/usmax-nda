import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, Settings as SettingsIcon, LogOut, Menu } from 'lucide-react';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  return (
    <header className="h-16 bg-white border-b border-[var(--color-border)] sticky top-0 z-10">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Menu Button (Mobile) + Search */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-[var(--color-text-secondary)]" />
          </button>
          
          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search NDAs, parties, projects…"
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
        
        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-2 lg:gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-danger)] rounded-full" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 lg:gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm">Sarah Johnson</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Legal Reviewer</p>
              </div>
              <ChevronDown className="hidden lg:block w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[var(--color-border)] rounded-lg shadow-lg">
                <button 
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                >
                  <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>Profile</span>
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                >
                  <SettingsIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-[var(--color-border)]">
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-[var(--color-danger)]">
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-[var(--color-border)] p-4 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search NDAs, parties, projects…"
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}