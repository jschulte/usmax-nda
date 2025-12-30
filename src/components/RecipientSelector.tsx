/**
 * Recipient Selector Component
 *
 * Shows POCs and other recipients with names, roles, and emails
 * Provides a clearer way to select email recipients than comma-separated text
 */

import React, { useState } from 'react';
import { User, X, Plus, Mail } from 'lucide-react';
import { Button } from './ui/AppButton';
import { Badge } from './ui/AppBadge';

export interface Recipient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: string; // e.g., "Relationship POC", "Contracts POC"
  company?: string;
}

interface RecipientSelectorProps {
  recipients: Recipient[];
  selectedRecipientIds: Set<string>;
  onToggle: (recipientId: string) => void;
  onAddCustom?: (email: string) => void;
  allowCustomRecipients?: boolean;
}

export function RecipientSelector({
  recipients,
  selectedRecipientIds,
  onToggle,
  onAddCustom,
  allowCustomRecipients = true
}: RecipientSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const handleAddCustom = () => {
    if (customEmail.trim() && onAddCustom) {
      onAddCustom(customEmail.trim());
      setCustomEmail('');
      setShowCustomInput(false);
    }
  };

  const getDisplayName = (recipient: Recipient): string => {
    const firstName = recipient.firstName || '';
    const lastName = recipient.lastName || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || recipient.email.split('@')[0];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">
          Recipients
        </label>
        {allowCustomRecipients && (
          <Button
            variant="subtle"
            size="sm"
            icon={<Plus className="w-3 h-3" />}
            onClick={() => setShowCustomInput(true)}
          >
            Add recipient
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {recipients.map((recipient) => {
          const isSelected = selectedRecipientIds.has(recipient.id);
          return (
            <div
              key={recipient.id}
              onClick={() => onToggle(recipient.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-blue-50'
                  : 'border-[var(--color-border)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                    <p className="font-medium truncate">{getDisplayName(recipient)}</p>
                    {recipient.role && (
                      <Badge variant="default" className="text-xs">{recipient.role}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-secondary)] truncate">
                      {recipient.email}
                    </p>
                  </div>
                  {recipient.company && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {recipient.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCustomInput && (
        <div className="mt-3 p-3 border border-[var(--color-border)] rounded-lg bg-gray-50">
          <label className="text-xs text-[var(--color-text-secondary)] mb-2 block">
            Add custom recipient
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              autoFocus
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddCustom}
            >
              Add
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setShowCustomInput(false);
                setCustomEmail('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {selectedRecipientIds.size === 0 && (
        <p className="text-sm text-orange-600 mt-2">
          ⚠️ Please select at least one recipient
        </p>
      )}

      <p className="text-xs text-[var(--color-text-muted)] mt-3">
        {selectedRecipientIds.size} recipient{selectedRecipientIds.size !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}

// Helper Check icon component
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 4.5L6 12L2.5 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
