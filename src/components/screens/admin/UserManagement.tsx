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
  Calendar,
  MoreVertical,
  Key,
  Briefcase,
  Building,
  Loader2,
  X
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
import { Badge } from '../../ui/Badge';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import * as userService from '../../../client/services/userService';
import * as adminService from '../../../client/services/adminService';
import * as agencyService from '../../../client/services/agencyService';
import { ApiError } from '../../../client/services/api';

// Using backend types
type User = userService.User & {
  fullName?: string;
  roles?: adminService.UserRole[];
};

type Role = adminService.Role;
type AgencyGroup = agencyService.AgencyGroup;

export function UserManagement() {
  const navigate = useNavigate();
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

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load roles and agency groups on mount
  useEffect(() => {
    loadRoles();
    loadAgencyGroups();
  }, []);

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
        fullName: `${user.firstName} ${user.lastName}`
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

      // Update the viewing user with loaded roles
      if (viewingAccessUser) {
        setViewingAccessUser({
          ...viewingAccessUser,
          roles: userRoles.roles
        });
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load user access';
      toast.error('Error loading user access', { description: errorMessage });
    } finally {
      setLoadingAccess(false);
    }
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

    // Load user's current roles
    try {
      const userRoles = await adminService.getUserRoles(user.id);
      setUserForm(prev => ({
        ...prev,
        selectedRoles: userRoles.roles.map(r => r.id)
      }));
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
        const currentRoleIds = editingUser.roles?.map(r => r.id) || [];
        const rolesToAdd = userForm.selectedRoles.filter(rid => !currentRoleIds.includes(rid));
        const rolesToRemove = currentRoleIds.filter(rid => !userForm.selectedRoles.includes(rid));

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

  const handleViewAccess = async (user: User) => {
    setViewingAccessUser(user);
    setShowAccessDialog(true);
    await loadUserAccess(user.id);
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
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to assign role';
      toast.error('Error assigning role', { description: errorMessage });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                </div>
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
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddUser}>
                Add User
              </Button>
            </div>

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
                        <th className="text-left py-3 px-4 text-sm">User</th>
                        <th className="text-left py-3 px-4 text-sm">Contact</th>
                        <th className="text-left py-3 px-4 text-sm">Status</th>
                        <th className="text-left py-3 px-4 text-sm">Created</th>
                        <th className="text-right py-3 px-4 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
                              {user.jobTitle && (
                                <p className="text-xs text-[var(--color-text-muted)]">{user.jobTitle}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-[var(--color-text-secondary)]">
                              {user.workPhone && <p>Work: {user.workPhone}</p>}
                              {user.cellPhone && <p>Cell: {user.cellPhone}</p>}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="status"
                              status={user.isActive ? 'Executed' : 'Expired'}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                            {formatDate(user.createdAt)}
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
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-[var(--color-danger)]"
                                  disabled={!user.isActive}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deactivate User
                                </DropdownMenuItem>
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
                        <div className="flex-1">
                          <p className="font-medium mb-1">{user.fullName}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-0.5">{user.email}</p>
                          {user.jobTitle && (
                            <p className="text-xs text-[var(--color-text-muted)]">{user.jobTitle}</p>
                          )}
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
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              className="text-[var(--color-danger)]"
                              disabled={!user.isActive}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deactivate User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 mb-3">
                        {user.workPhone && (
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            Work: {user.workPhone}
                          </div>
                        )}
                        {user.cellPhone && (
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            Cell: {user.cellPhone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Created: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="status"
                          status={user.isActive ? 'Executed' : 'Expired'}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
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
                  {viewingAccessUser?.roles && viewingAccessUser.roles.length > 0 ? (
                    viewingAccessUser.roles.map(role => (
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
                          .filter(role => !viewingAccessUser?.roles?.some(ur => ur.id === role.id))
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
                <div className="space-y-3">
                  {/* Agency Group Access */}
                  {userAccessSummary.agencyGroupAccess.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Agency Groups</p>
                      {userAccessSummary.agencyGroupAccess.map(ag => (
                        <div
                          key={ag.agencyGroupId}
                          className="p-3 border border-[var(--color-border)] rounded-lg mb-2"
                        >
                          <p className="font-medium">{ag.agencyGroupName}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {ag.subagencies.length} subagenc{ag.subagencies.length !== 1 ? 'ies' : 'y'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct Subagency Access */}
                  {userAccessSummary.directSubagencyAccess.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Direct Subagency Access</p>
                      {userAccessSummary.directSubagencyAccess.map(sa => (
                        <div
                          key={sa.subagencyId}
                          className="p-3 border border-[var(--color-border)] rounded-lg mb-2"
                        >
                          <p className="font-medium">{sa.subagencyName}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Part of {sa.agencyGroupName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {userAccessSummary.agencyGroupAccess.length === 0 &&
                   userAccessSummary.directSubagencyAccess.length === 0 && (
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
    </div>
  );
}
