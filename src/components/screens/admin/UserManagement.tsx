import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Input } from '../../ui/AppInput';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  MoreVertical,
  Key,
  Building,
  Download,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Checkbox } from '../../ui/checkbox';
import * as userService from '../../../client/services/userService';
import * as adminService from '../../../client/services/adminService';
import * as agencyService from '../../../client/services/agencyService';
import { ApiError } from '../../../client/services/api';
import { useAuth } from '../../../client/hooks/useAuth';
import { BulkActionToolbar } from './BulkActionToolbar';

// Using backend types
type User = userService.User & {
  fullName?: string;
  assignedRoles?: adminService.UserRole[];
};

type Role = adminService.Role;
type AgencyGroup = agencyService.AgencyGroup;

export function UserManagement() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingAccessUser, setViewingAccessUser] = useState<User | null>(null);

  // Confirmation dialogs
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [userAccessSummary, setUserAccessSummary] = useState<userService.UserAccessSummary | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Bulk selection + actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkRoleDialog, setShowBulkRoleDialog] = useState(false);
  const [showBulkAccessDialog, setShowBulkAccessDialog] = useState(false);
  const [showBulkDeactivateDialog, setShowBulkDeactivateDialog] = useState(false);
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkAccessMode, setBulkAccessMode] = useState<'group' | 'subagency'>('group');
  const [bulkAccessGroupId, setBulkAccessGroupId] = useState('');
  const [bulkAccessSubagencyIds, setBulkAccessSubagencyIds] = useState<Set<string>>(new Set());
  const [bulkSubagencies, setBulkSubagencies] = useState<agencyService.Subagency[]>([]);
  const [bulkSubagencyLoading, setBulkSubagencyLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [exportingAccess, setExportingAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<userService.UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [originalRoleIds, setOriginalRoleIds] = useState<string[]>([]);

  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    workPhone: '',
    cellPhone: '',
    jobTitle: '',
    selectedRoles: [] as string[]
  });

  // Load users on mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [pagination.page, searchQuery, filterStatus]);

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [searchQuery, filterStatus]);

  // Load roles and agency groups on mount
  useEffect(() => {
    loadRoles();
    loadAgencyGroups();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await userService.searchUsers(
          query,
          filterStatus === 'all' ? undefined : filterStatus === 'active'
        );
        if (!active) return;
        setSearchResults(response.users ?? []);
        setSearchError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to search users';
        setSearchError(message);
        setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, filterStatus]);

  const selectedCount = selectedUserIds.size;
  const isAllSelected = users.length > 0 && users.every((user) => selectedUserIds.has(user.id));
  const isSomeSelected = users.some((user) => selectedUserIds.has(user.id));
  const selectionIncludesSelf = authUser?.id ? selectedUserIds.has(authUser.id) : false;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean | 'indeterminate') => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        users.forEach((user) => next.add(user.id));
      } else {
        users.forEach((user) => next.delete(user.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  useEffect(() => {
    if (bulkAccessMode !== 'subagency' || !bulkAccessGroupId) {
      setBulkSubagencies([]);
      setBulkAccessSubagencyIds(new Set());
      return;
    }

    let isActive = true;
    setBulkSubagencyLoading(true);
    agencyService
      .listSubagencies(bulkAccessGroupId)
      .then((response) => {
        if (!isActive) return;
        setBulkSubagencies(response.subagencies);
      })
      .catch(() => {
        if (!isActive) return;
        setBulkSubagencies([]);
      })
      .finally(() => {
        if (isActive) setBulkSubagencyLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [bulkAccessMode, bulkAccessGroupId]);

  const formatDisplayName = (user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBulkAssignRole = async () => {
    if (!bulkRoleId) {
      toast.error('Select a role to assign');
      return;
    }

    setBulkActionLoading(true);
    try {
      const result = await userService.bulkAssignRole(Array.from(selectedUserIds), bulkRoleId);
      toast.success(`Role assigned to ${result.assignedCount} user${result.assignedCount !== 1 ? 's' : ''}`, {
        description: result.skippedCount ? `${result.skippedCount} skipped` : undefined,
      });
      setShowBulkRoleDialog(false);
      setBulkRoleId('');
      clearSelection();
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign role';
      toast.error('Bulk role assignment failed', { description: message });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkGrantAccess = async () => {
    if (!bulkAccessGroupId) {
      toast.error('Select an agency group');
      return;
    }

    if (bulkAccessMode === 'subagency' && bulkAccessSubagencyIds.size === 0) {
      toast.error('Select at least one subagency');
      return;
    }

    setBulkActionLoading(true);
    try {
      const payload =
        bulkAccessMode === 'group'
          ? { agencyGroupId: bulkAccessGroupId }
          : { subagencyIds: Array.from(bulkAccessSubagencyIds) };

      const result = await userService.bulkGrantAccess(Array.from(selectedUserIds), payload);
      toast.success(`Access granted for ${result.grantedCount} assignment${result.grantedCount !== 1 ? 's' : ''}`, {
        description: result.skippedCount ? `${result.skippedCount} skipped` : undefined,
      });
      setShowBulkAccessDialog(false);
      setBulkAccessGroupId('');
      setBulkAccessSubagencyIds(new Set());
      setBulkAccessMode('group');
      clearSelection();
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to grant access';
      toast.error('Bulk access grant failed', { description: message });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    setBulkActionLoading(true);
    try {
      const result = await userService.bulkDeactivateUsers(Array.from(selectedUserIds));
      const baseMessage = `Deactivated ${result.deactivatedCount} user${result.deactivatedCount !== 1 ? 's' : ''}`;
      const description = result.skippedSelf
        ? 'Your account was excluded from deactivation.'
        : result.skippedCount
          ? `${result.skippedCount} skipped`
          : undefined;
      toast.success(baseMessage, { description });
      setShowBulkDeactivateDialog(false);
      clearSelection();
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate users';
      toast.error('Bulk deactivate failed', { description: message });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = async () => {
    setBulkExporting(true);
    try {
      const blob = await userService.bulkExportUsers(Array.from(selectedUserIds));
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `selected-users-access-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Exported selected users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export users';
      toast.error('Bulk export failed', { description: message });
    } finally {
      setBulkExporting(false);
    }
  };

  const handleNavigateToGroup = (groupId: string) => {
    navigate('/administration/agency-groups', { state: { focusGroupId: groupId } });
  };

  const handleNavigateToSubagency = (groupId: string, subagencyId: string) => {
    navigate('/administration/agency-groups', {
      state: { focusGroupId: groupId, focusSubagencyId: subagencyId },
    });
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        active: filterStatus === 'all' ? undefined : filterStatus === 'active'
      });

      // Add computed fullName field
      const usersWithFullName = response.users.map(user => ({
        ...user,
        fullName: formatDisplayName(user)
      }));

      setUsers(usersWithFullName);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load users';
      setError(errorMessage);
      toast.error('Error loading users', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await adminService.listRoles();
      setRoles(response.roles);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load roles';
      toast.error('Error loading roles', { description: errorMessage });
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadAgencyGroups = async () => {
    try {
      const response = await agencyService.listAgencyGroups();
      setAgencyGroups(response.agencyGroups);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load agency groups';
      toast.error('Error loading agency groups', { description: errorMessage });
    }
  };

  const loadUserAccess = async (userId: string) => {
    try {
      setLoadingAccess(true);
      const [accessSummary, userRoles] = await Promise.all([
        userService.getUserAccessSummary(userId),
        adminService.getUserRoles(userId)
      ]);

      setUserAccessSummary(accessSummary);

      setViewingAccessUser((current) =>
        current ? { ...current, assignedRoles: userRoles.roles } : current
      );
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load user access';
      toast.error('Error loading user access', { description: errorMessage });
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleSelectSearchResult = (user: userService.UserSearchResult) => {
    setSearchQuery(formatDisplayName(user));
    setSearchResults([]);
  };

  const handleAddUser = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      workPhone: '',
      cellPhone: '',
      jobTitle: '',
      selectedRoles: []
    });
    setOriginalRoleIds([]);
    setEditingUser(null);
    setShowUserDialog(true);
  };

  const handleEditUser = async (user: User) => {
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      workPhone: user.workPhone || '',
      cellPhone: user.cellPhone || '',
      jobTitle: user.jobTitle || '',
      selectedRoles: []
    });
    setOriginalRoleIds([]);

    // Load user's current roles
    try {
      const userRoles = await adminService.getUserRoles(user.id);
      const roleIds = userRoles.roles.map((r) => r.id);
      setUserForm(prev => ({
        ...prev,
        selectedRoles: roleIds
      }));
      setOriginalRoleIds(roleIds);
    } catch (err) {
      console.error('Failed to load user roles:', err);
    }

    setEditingUser(user);
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.firstName || !userForm.lastName || !userForm.email) {
      toast.error('Validation error', {
        description: 'Please fill in all required fields (first name, last name, email)'
      });
      return;
    }

    try {
      setSavingUser(true);

      if (editingUser) {
        // Update existing user
        await userService.updateUser(editingUser.id, {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          workPhone: userForm.workPhone || undefined,
          cellPhone: userForm.cellPhone || undefined,
          jobTitle: userForm.jobTitle || undefined
        });

        // Handle role changes
        const rolesToAdd = userForm.selectedRoles.filter(
          (roleId) => !originalRoleIds.includes(roleId)
        );
        const rolesToRemove = originalRoleIds.filter(
          (roleId) => !userForm.selectedRoles.includes(roleId)
        );

        // Add new roles
        for (const roleId of rolesToAdd) {
          await adminService.assignRole(editingUser.id, roleId);
        }

        // Remove old roles
        for (const roleId of rolesToRemove) {
          await adminService.removeRole(editingUser.id, roleId);
        }

        toast.success('User updated', {
          description: `${userForm.firstName} ${userForm.lastName} has been updated successfully`
        });
      } else {
        // Create new user
        const response = await userService.createUser({
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          workPhone: userForm.workPhone || undefined,
          cellPhone: userForm.cellPhone || undefined,
          jobTitle: userForm.jobTitle || undefined
        });

        // Assign roles to new user
        if (response.user.id && userForm.selectedRoles.length > 0) {
          for (const roleId of userForm.selectedRoles) {
            await adminService.assignRole(response.user.id, roleId);
          }
        }

        toast.success('User created', {
          description: `${userForm.firstName} ${userForm.lastName} has been created successfully`
        });
      }

      setShowUserDialog(false);
      loadUsers(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to save user';
      toast.error('Error saving user', { description: errorMessage });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteUserConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deactivateUser(userToDelete.id);
      toast.success('User deactivated', {
        description: `${userToDelete.fullName} has been deactivated`
      });
      setShowDeleteUserConfirm(false);
      loadUsers(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to deactivate user';
      toast.error('Error deactivating user', { description: errorMessage });
    }
  };

  // Story H-1: Reactivate a deactivated user
  const handleReactivateUser = async (user: User) => {
    try {
      await userService.reactivateUser(user.id);
      toast.success('User reactivated', {
        description: `${user.fullName} has been reactivated`
      });
      loadUsers(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to reactivate user';
      toast.error('Error reactivating user', { description: errorMessage });
    }
  };

  const handleViewAccess = async (user: User) => {
    setViewingAccessUser(user);
    setShowAccessDialog(true);
    await loadUserAccess(user.id);
  };

  const handleExportAccess = async () => {
    try {
      setExportingAccess(true);
      const blob = await adminService.exportAccessReport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `access-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Access export downloaded');
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to export access report';
      toast.error('Export failed', { description: errorMessage });
    } finally {
      setExportingAccess(false);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await adminService.assignRole(userId, roleId);
      toast.success('Role assigned successfully');
      if (viewingAccessUser?.id === userId) {
        await loadUserAccess(userId);
      }
      loadUsers(); // Refresh the list
    } catch (err) {
      // Story 9.5: Better error handling
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to assign role';
      const errorCode = err instanceof ApiError ? err.code : 'UNKNOWN';
      toast.error('Error assigning role', {
        description: `${errorMessage} (${errorCode})`
      });
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await adminService.removeRole(userId, roleId);
      toast.success('Role removed successfully');
      if (viewingAccessUser?.id === userId) {
        await loadUserAccess(userId);
      }
      loadUsers(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to remove role';
      toast.error('Error removing role', { description: errorMessage });
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="subtle"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/administration')}
          className="mb-4"
        >
          Back to Administration
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2">User Management</h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage users, roles, and access permissions
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
                  )}
                </div>

                {searchError && (
                  <p className="mt-2 text-xs text-[var(--color-danger)]">{searchError}</p>
                )}

                {searchQuery.trim().length >= 3 && !searchLoading && searchResults.length === 0 && !searchError && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    No matches found.
                  </p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 rounded-md border border-[var(--color-border)] bg-white shadow-sm max-h-56 overflow-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(user)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatDisplayName(user)}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {user.email}
                          {user.roles?.length ? ` · ${user.roles.join(', ')}` : ''}
                          {user.jobTitle ? ` · ${user.jobTitle}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                icon={exportingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                onClick={handleExportAccess}
                disabled={exportingAccess}
              >
                {exportingAccess ? 'Exporting...' : 'Export Access'}
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddUser}>
                Add User
              </Button>
            </div>

            <BulkActionToolbar
              selectedCount={selectedCount}
              isLoading={bulkActionLoading}
              isExporting={bulkExporting}
              onAssignRole={() => setShowBulkRoleDialog(true)}
              onGrantAccess={() => setShowBulkAccessDialog(true)}
              onDeactivate={() => setShowBulkDeactivateDialog(true)}
              onExport={handleBulkExport}
              onClearSelection={clearSelection}
            />

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            )}

            {/* Users Table */}
            {!loading && (
              <>
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="py-3 px-4 text-sm">
                          <Checkbox
                            checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                            onCheckedChange={toggleSelectAllVisible}
                            aria-label="Select all users on page"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm">Name</th>
                        <th className="text-left py-3 px-4 text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-sm">Work Phone</th>
                        <th className="text-left py-3 px-4 text-sm">Cell Phone</th>
                        <th className="text-left py-3 px-4 text-sm">Job Title</th>
                        <th className="text-left py-3 px-4 text-sm">Roles</th>
                        <th className="text-left py-3 px-4 text-sm">Agency Access</th>
                        <th className="text-left py-3 px-4 text-sm">Status</th>
                        <th className="text-right py-3 px-4 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <Checkbox
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              aria-label={`Select ${user.fullName || user.email}`}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                            {user.email}
                          </td>
                          <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                            {user.workPhone || '—'}
                          </td>
                          <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                            {user.cellPhone || '—'}
                          </td>
                          <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                            {user.jobTitle || '—'}
                          </td>
                          <td className="py-4 px-4">
                            {user.roles?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <Badge key={role} variant="default" className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-[var(--color-text-secondary)]">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                              <div>
                                Groups: {user.agencyAccess?.groups?.length
                                  ? user.agencyAccess.groups.join(', ')
                                  : '—'}
                              </div>
                              <div>
                                Subagencies: {user.agencyAccess?.subagencies?.length
                                  ? user.agencyAccess.subagencies.join(', ')
                                  : '—'}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="status"
                              status={user.active ? 'Executed' : 'Expired'}
                            >
                              {user.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewAccess(user)}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Manage Access
                                </DropdownMenuItem>
                                {user.active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-[var(--color-danger)]"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deactivate User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleReactivateUser(user)}
                                    className="text-[var(--color-success)]"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reactivate User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className="p-4 border border-[var(--color-border)] rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            aria-label={`Select ${user.fullName || user.email}`}
                          />
                          <div className="flex-1">
                          <p className="font-medium mb-1">{user.fullName}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-0.5">{user.email}</p>
                          {user.jobTitle && (
                            <p className="text-xs text-[var(--color-text-muted)]">{user.jobTitle}</p>
                          )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-gray-100 rounded flex-shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewAccess(user)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Manage Access
                            </DropdownMenuItem>
                            {user.active ? (
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user)}
                                className="text-[var(--color-danger)]"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deactivate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleReactivateUser(user)}
                                className="text-[var(--color-success)]"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reactivate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Work: {user.workPhone || '—'}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Cell: {user.cellPhone || '—'}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Job Title: {user.jobTitle || '—'}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Agency Access: {user.agencyAccess?.groups?.length
                            ? user.agencyAccess.groups.join(', ')
                            : '—'}
                          {user.agencyAccess?.subagencies?.length
                            ? ` · ${user.agencyAccess.subagencies.join(', ')}`
                            : ''}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="status"
                          status={user.active ? 'Executed' : 'Expired'}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.roles?.length ? (
                          user.roles.map((role) => (
                            <Badge key={role} variant="default" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="default" className="text-xs">No roles</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {users.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[var(--color-text-secondary)]">No users found matching your filters</p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="mb-1">Roles & Permissions</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Configure role-based access control
                </p>
              </div>
            </div>

            {loadingRoles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className="p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <h4>{role.name}</h4>
                          {role.description && (
                            <p className="text-sm text-[var(--color-text-secondary)]">{role.description}</p>
                          )}
                          {role.isSystemRole && (
                            <Badge variant="default" className="text-xs mt-1">System Role</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                    </div>

                    {role.permissions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map(perm => (
                          <Badge key={perm.id} variant="default" className="text-xs">
                            {perm.name}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="default" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information and permissions' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@agency.gov"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workPhone">Work Phone</Label>
                <Input
                  id="workPhone"
                  value={userForm.workPhone}
                  onChange={(e) => setUserForm(prev => ({ ...prev, workPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cellPhone">Cell Phone</Label>
                <Input
                  id="cellPhone"
                  value={userForm.cellPhone}
                  onChange={(e) => setUserForm(prev => ({ ...prev, cellPhone: e.target.value }))}
                  placeholder="(555) 987-6543"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={userForm.jobTitle}
                onChange={(e) => setUserForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="e.g., Legal Counsel"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Roles</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-lg p-3">
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  roles.map(role => (
                    <label key={role.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm(prev => ({ ...prev, selectedRoles: [...prev.selectedRoles, role.id] }));
                          } else {
                            setUserForm(prev => ({ ...prev, selectedRoles: prev.selectedRoles.filter(r => r !== role.id) }));
                          }
                        }}
                        className="rounded mt-1"
                      />
                      <div>
                        <span className="text-sm font-medium">{role.name}</span>
                        {role.description && (
                          <p className="text-xs text-[var(--color-text-secondary)]">{role.description}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowUserDialog(false)} disabled={savingUser}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveUser} disabled={savingUser}>
              {savingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingUser ? 'Update User' : 'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Access Management Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Access - {viewingAccessUser?.fullName}</DialogTitle>
            <DialogDescription>
              Manage roles and agency access for this user
            </DialogDescription>
          </DialogHeader>

          {loadingAccess ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : userAccessSummary ? (
            <div className="space-y-6 py-4">
              {/* Roles Section */}
              <div>
                <h4 className="mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Assigned Roles
                </h4>
                <div className="space-y-2">
                  {viewingAccessUser?.assignedRoles && viewingAccessUser.assignedRoles.length > 0 ? (
                    viewingAccessUser.assignedRoles.map(role => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{role.name}</p>
                          {role.description && (
                            <p className="text-sm text-[var(--color-text-secondary)]">{role.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {role.permissions.map(perm => (
                              <Badge key={perm.code} variant="default" className="text-xs">
                                {perm.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {!role.isSystemRole && (
                          <Button
                            variant="subtle"
                            size="sm"
                            icon={<X className="w-4 h-4" />}
                            onClick={() => viewingAccessUser && handleRemoveRole(viewingAccessUser.id, role.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">No roles assigned</p>
                  )}

                  {/* Add Role Dropdown */}
                  <div className="mt-3">
                    <Select
                      value=""
                      onValueChange={(roleId) => viewingAccessUser && handleAssignRole(viewingAccessUser.id, roleId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                          .filter(role => !viewingAccessUser?.assignedRoles?.some(ur => ur.id === role.id))
                          .map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Agency Access Section */}
              <div>
                <h4 className="mb-3 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Agency Access
                </h4>
                <div className="space-y-4">
                  {userAccessSummary.agencyGroupAccess.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Agency Groups</p>
                      {userAccessSummary.agencyGroupAccess.map((group) => (
                        <div
                          key={group.id}
                          className="p-3 border border-[var(--color-border)] rounded-lg mb-2"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              className="font-medium text-left hover:underline"
                              onClick={() => handleNavigateToGroup(group.id)}
                            >
                              {group.name}
                            </button>
                            <Badge variant="default" className="text-xs">Group</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            Granted by {group.grantedBy?.name ?? 'Unknown'} · {formatDateTime(group.grantedAt)}
                          </p>
                          {group.subagencies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {group.subagencies.map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-[var(--color-surface-muted)] hover:bg-slate-100"
                                  onClick={() => handleNavigateToSubagency(group.id, sub.id)}
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {userAccessSummary.subagencyAccess.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Direct Subagency Access</p>
                      {userAccessSummary.subagencyAccess.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 border border-[var(--color-border)] rounded-lg mb-2"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              className="font-medium text-left hover:underline"
                              onClick={() => handleNavigateToSubagency(sub.agencyGroup.id, sub.id)}
                            >
                              {sub.name}
                            </button>
                            <Badge variant="default" className="text-xs">Direct</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Group:&nbsp;
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() => handleNavigateToGroup(sub.agencyGroup.id)}
                            >
                              {sub.agencyGroup.name}
                            </button>
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            Granted by {sub.grantedBy?.name ?? 'Unknown'} · {formatDateTime(sub.grantedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {userAccessSummary.agencyGroupAccess.length === 0 &&
                   userAccessSummary.subagencyAccess.length === 0 && (
                    <p className="text-sm text-[var(--color-text-secondary)]">No agency access configured</p>
                  )}
                </div>
              </div>

              {/* Effective Permissions */}
              <div>
                <h4 className="mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Effective Permissions
                </h4>
                <div className="flex flex-wrap gap-1">
                  {userAccessSummary.effectivePermissions.map(perm => (
                    <Badge key={perm} variant="default" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAccessDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteUserConfirm} onOpenChange={setShowDeleteUserConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {userToDelete?.fullName}? This will prevent them from accessing the system.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteUserConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDeleteUser}>
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Assignment Dialog */}
      <Dialog open={showBulkRoleDialog} onOpenChange={setShowBulkRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role to Selected Users</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Role</Label>
            <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowBulkRoleDialog(false)} disabled={bulkActionLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBulkAssignRole} disabled={bulkActionLoading || !bulkRoleId}>
              {bulkActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Access Grant Dialog */}
      <Dialog open={showBulkAccessDialog} onOpenChange={setShowBulkAccessDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grant Access to Selected Users</DialogTitle>
            <DialogDescription>
              Grant agency access to {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Access Type</Label>
              <Select value={bulkAccessMode} onValueChange={(value) => setBulkAccessMode(value as 'group' | 'subagency')}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Agency Group (all subagencies)</SelectItem>
                  <SelectItem value="subagency">Specific Subagencies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Agency Group</Label>
              <Select value={bulkAccessGroupId} onValueChange={setBulkAccessGroupId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select agency group" />
                </SelectTrigger>
                <SelectContent>
                  {agencyGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bulkAccessMode === 'subagency' && (
              <div>
                <Label>Subagencies</Label>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border)] p-3 space-y-2">
                  {bulkSubagencyLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : bulkSubagencies.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">Select a group to load subagencies.</p>
                  ) : (
                    bulkSubagencies.map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={bulkAccessSubagencyIds.has(sub.id)}
                          onCheckedChange={() => {
                            setBulkAccessSubagencyIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(sub.id)) {
                                next.delete(sub.id);
                              } else {
                                next.add(sub.id);
                              }
                              return next;
                            });
                          }}
                        />
                        <span>{sub.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowBulkAccessDialog(false)} disabled={bulkActionLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkGrantAccess}
              disabled={bulkActionLoading || !bulkAccessGroupId || (bulkAccessMode === 'subagency' && bulkAccessSubagencyIds.size === 0)}
            >
              {bulkActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Granting...
                </>
              ) : (
                'Grant Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Deactivate Confirmation */}
      <Dialog open={showBulkDeactivateDialog} onOpenChange={setShowBulkDeactivateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Selected Users</DialogTitle>
            <DialogDescription>
              You are about to deactivate {selectedCount} user{selectedCount !== 1 ? 's' : ''}.
              {selectionIncludesSelf ? ' Your account will be skipped.' : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowBulkDeactivateDialog(false)} disabled={bulkActionLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBulkDeactivate} disabled={bulkActionLoading}>
              {bulkActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate Users'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
