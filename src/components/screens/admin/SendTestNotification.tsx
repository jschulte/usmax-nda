/**
 * Send Test Notification Component
 * Story 9.17: Send Test Notification with Recipient Selection
 *
 * Admin tool for sending test notifications to verify system functionality
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Select } from '../../ui/AppInput';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
}

// Notification types from NotificationEvent enum
const NOTIFICATION_TYPES = [
  { value: 'nda_created', label: 'NDA Created', description: 'A new NDA has been created' },
  { value: 'nda_emailed', label: 'NDA Emailed', description: 'The NDA has been emailed to the partner' },
  { value: 'document_uploaded', label: 'Document Uploaded', description: 'A new document has been uploaded' },
  { value: 'status_changed', label: 'Status Changed', description: 'The NDA status has changed' },
  { value: 'fully_executed', label: 'Fully Executed', description: 'The NDA has been marked as fully executed' },
  { value: 'approval_requested', label: 'Approval Requested', description: 'An NDA has been submitted for approval' },
  { value: 'assigned_to_me', label: 'POC Assignment', description: 'User assigned as Point of Contact' },
];

export function SendTestNotification() {
  const [notificationType, setNotificationType] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);

    try {
      const res = await fetch('/api/users?active=true', {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load users');
      }

      const data = await res.json();
      const usersWithNames = data.users.map((user: any) => ({
        ...user,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      }));

      setAllUsers(usersWithNames);
    } catch (err: any) {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSend() {
    if (!notificationType) {
      toast.error('Please select a notification type');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);

    try {
      const res = await fetch('/api/admin/test-notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notificationType,
          recipientIds: selectedUsers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send test notification');
      }

      const data = await res.json();

      toast.success('Test notification sent!', {
        description: `Sent to ${data.sent} recipient(s). Check your email.`,
      });

      // Reset form
      setNotificationType('');
      setSelectedUsers([]);
      setSearchQuery('');
    } catch (err: any) {
      console.error('Error sending test notification:', err);
      toast.error('Failed to send test notification', {
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  }

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedType = NOTIFICATION_TYPES.find((t) => t.value === notificationType);

  return (
    <Card>
      <h3 className="mb-4">Send Test Notification</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Send test notifications to verify the system is working correctly. Test emails will be marked
        with [TEST] and include a disclaimer.
      </p>

      <div className="space-y-6">
        {/* Notification Type Selector (AC2) */}
        <div>
          <label className="block text-sm font-medium mb-2">Notification Type</label>
          <Select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
            className="w-full"
          >
            <option value="">Select notification type...</option>
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          {selectedType && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              📧 {selectedType.description}
            </p>
          )}
        </div>

        {/* Recipient Selector (AC3) */}
        <div>
          <label className="block text-sm font-medium mb-2">Recipients</label>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md mb-3 text-sm"
          />

          {/* User List */}
          <div className="border border-[var(--color-border)] rounded-md max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                No users found matching "{searchQuery}"
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        {user.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                Selected ({selectedUsers.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((userId) => {
                  const user = allUsers.find((u) => u.id === userId);
                  if (!user) return null;

                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      {user.name}
                      <button
                        onClick={() => toggleUser(userId)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Send Button (AC4) */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={handleSend}
            disabled={!notificationType || selectedUsers.length === 0 || sending}
          >
            {sending ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
