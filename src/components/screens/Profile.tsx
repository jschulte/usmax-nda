import React, { useState } from 'react';
import { Card } from '../ui/AppCard';
import { Button } from '../ui/AppButton';
import { Input } from '../ui/AppInput';
import { Key, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function Profile() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleChangePassword = () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Validation error', {
        description: 'Please fill in all password fields'
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Validation error', {
        description: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.new_password.length < 12) {
      toast.error('Validation error', {
        description: 'Password must be at least 12 characters long'
      });
      return;
    }

    // TODO: Call API to change password
    toast.success('Password changed', {
      description: 'Your password has been updated successfully'
    });
    setShowPasswordDialog(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // TODO: Persist theme preference and apply to application
    toast.success('Theme updated', {
      description: `Switched to ${newTheme} mode`
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2">Profile Settings</h1>
        <p className="text-[var(--color-text-secondary)]">
          Manage your account preferences
        </p>
      </div>

      {/* Security Settings */}
      <Card className="mb-6">
        <h3 className="mb-4">Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Change your account password
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
            >
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <h3 className="mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <Label>Theme</Label>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              Choose your preferred color scheme
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  theme === 'light'
                    ? 'border-[var(--color-primary)] bg-blue-50'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <Sun className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Light</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Default theme</p>
                </div>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'border-[var(--color-primary)] bg-blue-50'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <Moon className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Dark</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Easier on the eyes</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Choose a strong password to keep your account secure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Minimum 12 characters with uppercase, lowercase, numbers, and special characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
