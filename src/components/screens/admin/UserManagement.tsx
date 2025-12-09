import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  UserPlus,
  Key
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
import { Switch } from '../../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  department: string;
  job_title: string;
  roles: string[];
  status: 'active' | 'inactive' | 'suspended';
  last_login: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
}

const mockUsers: User[] = [
  {
    id: '1',
    username: 'sarah.johnson',
    email: 'sarah.johnson@agency.gov',
    full_name: 'Sarah Johnson',
    department: 'Legal',
    job_title: 'Senior Legal Counsel',
    roles: ['legal_reviewer', 'admin'],
    status: 'active',
    last_login: '2025-12-08T09:30:00',
    created_at: '2024-01-15T10:00:00'
  },
  {
    id: '2',
    username: 'michael.chen',
    email: 'michael.chen@agency.gov',
    full_name: 'Michael Chen',
    department: 'IT Services',
    job_title: 'IT Manager',
    roles: ['manager', 'requester'],
    status: 'active',
    last_login: '2025-12-07T16:45:00',
    created_at: '2024-02-20T10:00:00'
  },
  {
    id: '3',
    username: 'emily.rodriguez',
    email: 'emily.rodriguez@agency.gov',
    full_name: 'Emily Rodriguez',
    department: 'HR',
    job_title: 'HR Specialist',
    roles: ['requester'],
    status: 'active',
    last_login: '2025-12-08T08:15:00',
    created_at: '2024-03-10T10:00:00'
  },
  {
    id: '4',
    username: 'james.wilson',
    email: 'james.wilson@agency.gov',
    full_name: 'James Wilson',
    department: 'Legal',
    job_title: 'Legal Assistant',
    roles: ['legal_reviewer'],
    status: 'inactive',
    last_login: '2025-11-20T14:30:00',
    created_at: '2024-04-05T10:00:00'
  }
];

const mockRoles: Role[] = [
  {
    id: 'r1',
    name: 'Super Admin',
    description: 'Full system access and control',
    permissions: ['all'],
    user_count: 2
  },
  {
    id: 'r2',
    name: 'Admin',
    description: 'Administrative access to most system features',
    permissions: ['users.manage', 'workflows.manage', 'templates.manage', 'settings.manage'],
    user_count: 5
  },
  {
    id: 'r3',
    name: 'Legal Reviewer',
    description: 'Review and approve NDAs, manage templates',
    permissions: ['ndas.review', 'ndas.approve', 'templates.create', 'clauses.manage'],
    user_count: 8
  },
  {
    id: 'r4',
    name: 'Manager',
    description: 'Approve department NDAs and view team tasks',
    permissions: ['ndas.approve.department', 'tasks.view.team', 'reports.view.department'],
    user_count: 12
  },
  {
    id: 'r5',
    name: 'Requester',
    description: 'Create and submit NDA requests',
    permissions: ['ndas.create', 'ndas.view.own', 'ndas.submit'],
    user_count: 45
  }
];

export function UserManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    department: '',
    job_title: '',
    roles: [] as string[],
    status: 'active' as User['status']
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const departments = ['Legal', 'IT Services', 'HR', 'Finance', 'Operations', 'Infrastructure'];
  const availableRoles = ['admin', 'legal_reviewer', 'manager', 'approver', 'requester'];
  const availablePermissions = [
    'ndas.create', 'ndas.view.own', 'ndas.view.all', 'ndas.edit', 'ndas.delete',
    'ndas.approve', 'ndas.review', 'workflows.manage', 'templates.manage',
    'users.manage', 'settings.manage', 'reports.view', 'audit.view'
  ];

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleAddUser = () => {
    setUserForm({
      username: '',
      email: '',
      full_name: '',
      department: '',
      job_title: '',
      roles: [],
      status: 'active'
    });
    setEditingUser(null);
    setShowUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setUserForm({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      job_title: user.job_title,
      roles: user.roles,
      status: user.status
    });
    setEditingUser(user);
    setShowUserDialog(true);
  };

  const handleSaveUser = () => {
    if (!userForm.username || !userForm.email || !userForm.full_name) {
      toast.error('Validation error', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    toast.success(editingUser ? 'User updated' : 'User created', {
      description: `${userForm.full_name} has been ${editingUser ? 'updated' : 'created'} successfully`
    });
    setShowUserDialog(false);
  };

  const handleDeleteUser = (user: User) => {
    toast.success('User deleted', {
      description: `${user.full_name} has been removed from the system`
    });
  };

  const handleResetPassword = (user: User) => {
    toast.success('Password reset', {
      description: `Password reset email sent to ${user.email}`
    });
  };

  const handleSuspendUser = (user: User) => {
    toast.success('User suspended', {
      description: `${user.full_name}'s account has been suspended`
    });
  };

  const handleAddRole = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setEditingRole(null);
    setShowRoleDialog(true);
  };

  const handleEditRole = (role: Role) => {
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    setEditingRole(role);
    setShowRoleDialog(true);
  };

  const handleSaveRole = () => {
    if (!roleForm.name || !roleForm.description) {
      toast.error('Validation error', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    toast.success(editingRole ? 'Role updated' : 'Role created', {
      description: `${roleForm.name} has been ${editingRole ? 'updated' : 'created'} successfully`
    });
    setShowRoleDialog(false);
  };

  const handleDeleteRole = (role: Role) => {
    toast.success('Role deleted', {
      description: `${role.name} role has been removed`
    });
  };

  const togglePermission = (permission: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const formatDate = (dateString: string) => {
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
                    placeholder="Search users by name, email, or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddUser}>
                Add User
              </Button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm">User</th>
                    <th className="text-left py-3 px-4 text-sm">Department</th>
                    <th className="text-left py-3 px-4 text-sm">Roles</th>
                    <th className="text-left py-3 px-4 text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-sm">Last Login</th>
                    <th className="text-right py-3 px-4 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{user.job_title}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{user.department}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(role => (
                            <Badge key={role} variant="default" className="text-xs">
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant="status" 
                          status={user.status === 'active' ? 'Executed' : user.status === 'inactive' ? 'Expired' : 'Rejected'}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                        {formatDate(user.last_login)}
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
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSuspendUser(user)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-[var(--color-danger)]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--color-text-secondary)]">No users found matching your filters</p>
              </div>
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
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddRole}>
                Add Role
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockRoles.map(role => (
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
                        <p className="text-sm text-[var(--color-text-secondary)]">{role.description}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRole(role)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteRole(role)}
                          className="text-[var(--color-danger)]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      {role.permissions.length === 1 && role.permissions[0] === 'all' 
                        ? 'All permissions' 
                        : `${role.permissions.length} permissions`}
                    </span>
                    <Badge variant="default">{role.user_count} users</Badge>
                  </div>
                </div>
              ))}
            </div>
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
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={userForm.username}
                  onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="john.doe"
                  className="mt-1"
                />
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
            </div>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={userForm.full_name}
                onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={userForm.department}
                  onValueChange={(value) => setUserForm(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger id="department" className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={userForm.job_title}
                  onChange={(e) => setUserForm(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g., Legal Counsel"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Roles</Label>
              <div className="mt-2 space-y-2">
                {availableRoles.map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserForm(prev => ({ ...prev, roles: [...prev.roles, role] }));
                        } else {
                          setUserForm(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{role.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="user_status">Account Status</Label>
              <Select
                value={userForm.status}
                onValueChange={(value) => setUserForm(prev => ({ ...prev, status: value as User['status'] }))}
              >
                <SelectTrigger id="user_status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveUser}>
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role configuration and permissions' : 'Create a new role with permissions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Compliance Officer"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role_description">Description *</Label>
              <Input
                id="role_description"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role's responsibilities"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-3 block">Permissions</Label>
              <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg p-4">
                <div className="space-y-2">
                  {availablePermissions.map(permission => (
                    <label key={permission} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded"
                      />
                      <span className="text-sm">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                {roleForm.permissions.length} permissions selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
