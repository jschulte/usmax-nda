import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

export function TopBar() {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-6">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" size={18} />
          <input
            type="text"
            placeholder="Search NDAs, parties, projects…"
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell size={20} className="text-[var(--color-text-secondary)]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm">
              JD
            </div>
            <div className="text-left">
              <div className="text-sm">Jane Doe</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Legal Reviewer</div>
            </div>
            <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[var(--color-border)] rounded-lg shadow-lg py-1 z-50">
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Profile</button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Settings</button>
              <hr className="my-1 border-[var(--color-border)]" />
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
