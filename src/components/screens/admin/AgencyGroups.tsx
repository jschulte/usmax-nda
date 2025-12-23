import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../../ui/AppCard';
import { Button } from '../../ui/AppButton';
import { Input, TextArea } from '../../ui/AppInput';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import * as agencyService from '../../../client/services/agencyService';
import * as agencyAccessService from '../../../client/services/agencyAccessService';
import { ApiError } from '../../../client/services/api';
import { UserAutocomplete } from '../../../client/components/UserAutocomplete';

type AgencyGroup = agencyService.AgencyGroup;
type Subagency = agencyService.Subagency;
type AgencyAccessUser = agencyAccessService.AgencyAccessUser;
type ContactSearchResult = agencyAccessService.ContactSearchResult;
type SubagencyAccessUser = agencyAccessService.SubagencyAccessUser;

interface GroupFormState {
  name: string;
  code: string;
  description: string;
}

interface SubagencyFormState {
  name: string;
  code: string;
  description: string;
}

export function AgencyGroups() {
  const navigate = useNavigate();
  const location = useLocation();
  const [handledDeepLink, setHandledDeepLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groups, setGroups] = useState<AgencyGroup[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [subagenciesByGroup, setSubagenciesByGroup] = useState<Record<string, Subagency[]>>({});
  const [subagencyCounts, setSubagencyCounts] = useState<Record<string, number>>({});
  const [loadingSubagencyGroups, setLoadingSubagencyGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSubagencyDialog, setShowSubagencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [showSubagencyAccessDialog, setShowSubagencyAccessDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'group' | 'subagency';
    groupId?: string;
    subagencyId?: string;
    label: string;
    ndaCount?: number;
    subagencyCount?: number;
  } | null>(null);

  // Story H-1: Confirmation state for revoke access operations
  const [revokeTarget, setRevokeTarget] = useState<{
    type: 'group' | 'subagency';
    contactId: string;
    userName: string;
    entityName: string;
  } | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  // Story H-1: Pagination state for agency groups
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [editingGroup, setEditingGroup] = useState<AgencyGroup | null>(null);
  const [editingSubagency, setEditingSubagency] = useState<Subagency | null>(null);
  const [activeGroupForSubagency, setActiveGroupForSubagency] = useState<AgencyGroup | null>(null);
  const [activeGroupForAccess, setActiveGroupForAccess] = useState<AgencyGroup | null>(null);
  const [activeSubagencyForAccess, setActiveSubagencyForAccess] = useState<Subagency | null>(null);

  const [accessUsers, setAccessUsers] = useState<AgencyAccessUser[]>([]);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [revokingAccessId, setRevokingAccessId] = useState<string | null>(null);

  const [subagencyAccessUsers, setSubagencyAccessUsers] = useState<SubagencyAccessUser[]>([]);
  const [isSubagencyAccessLoading, setIsSubagencyAccessLoading] = useState(false);
  const [isGrantingSubagencyAccess, setIsGrantingSubagencyAccess] = useState(false);
  const [revokingSubagencyAccessId, setRevokingSubagencyAccessId] = useState<string | null>(null);

  const [groupForm, setGroupForm] = useState<GroupFormState>({
    name: '',
    code: '',
    description: '',
  });

  const [subagencyForm, setSubagencyForm] = useState<SubagencyFormState>({
    name: '',
    code: '',
    description: '',
  });

  // Story H-1: Load groups when pagination or search changes
  useEffect(() => {
    void loadGroups();
  }, [pagination.page, searchQuery]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await agencyService.listAgencyGroups({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
      });
      setGroups(response.agencyGroups);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
      setSubagencyCounts(
        response.agencyGroups.reduce((acc, group) => {
          acc[group.id] = group.subagencyCount ?? 0;
          return acc;
        }, {} as Record<string, number>)
      );
    } catch (error) {
      handleApiError(error, 'Failed to load agency groups');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [searchQuery]);

  const loadSubagencies = async (groupId: string) => {
    // Set loading state
    setLoadingSubagencyGroups((prev) => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
    try {
      const response = await agencyService.listSubagencies(groupId);
      // Ensure we always set an array, even if response is malformed
      const subagencies = Array.isArray(response?.subagencies) ? response.subagencies : [];
      setSubagenciesByGroup((prev) => ({ ...prev, [groupId]: subagencies }));
      const count = subagencies.length;
      setSubagencyCounts((prev) => ({ ...prev, [groupId]: count }));
      return subagencies;
    } catch (error) {
      // On error, set empty array to prevent perpetual loading state
      setSubagenciesByGroup((prev) => ({ ...prev, [groupId]: [] }));
      handleApiError(error, 'Failed to load subagencies');
      return [];
    } finally {
      // Clear loading state
      setLoadingSubagencyGroups((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const toggleGroupExpanded = async (groupId: string) => {
    const next = new Set(expandedGroupIds);
    if (next.has(groupId)) {
      next.delete(groupId);
      setExpandedGroupIds(next);
      return;
    }

    next.add(groupId);
    setExpandedGroupIds(next);
    if (!subagenciesByGroup[groupId]) {
      await loadSubagencies(groupId);
    }
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', code: '', description: '' });
    setShowGroupDialog(true);
  };

  const openEditGroup = (group: AgencyGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      code: group.code,
      description: group.description ?? '',
    });
    setShowGroupDialog(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim() || !groupForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    const normalizedName = groupForm.name.trim().toLowerCase();
    const isDuplicateName = groups.some((group) => {
      if (editingGroup && group.id === editingGroup.id) return false;
      return group.name.trim().toLowerCase() === normalizedName;
    });

    if (isDuplicateName) {
      toast.error('Agency group name must be unique');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        code: groupForm.code.trim().toUpperCase(),
        description: groupForm.description.trim() || undefined,
      };

      if (editingGroup) {
        const response = await agencyService.updateAgencyGroup(editingGroup.id, payload);
        setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? response.agencyGroup : g)));
        toast.success('Agency group updated');
      } else {
        const response = await agencyService.createAgencyGroup(payload);
        setGroups((prev) => [response.agencyGroup, ...prev]);
        setSubagencyCounts((prev) => ({ ...prev, [response.agencyGroup.id]: response.agencyGroup.subagencyCount ?? 0 }));
        toast.success('Agency group created');
      }

      setShowGroupDialog(false);
      setEditingGroup(null);
    } catch (error) {
      handleApiError(error, 'Failed to save agency group');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateSubagency = (group: AgencyGroup) => {
    setEditingSubagency(null);
    setActiveGroupForSubagency(group);
    setSubagencyForm({ name: '', code: '', description: '' });
    setShowSubagencyDialog(true);
  };

  const openEditSubagency = (group: AgencyGroup, subagency: Subagency) => {
    setEditingSubagency(subagency);
    setActiveGroupForSubagency(group);
    setSubagencyForm({
      name: subagency.name,
      code: subagency.code,
      description: subagency.description ?? '',
    });
    setShowSubagencyDialog(true);
  };

  const saveSubagency = async () => {
    if (!activeGroupForSubagency) return;
    if (!subagencyForm.name.trim() || !subagencyForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    const existingSubs = subagenciesByGroup[activeGroupForSubagency.id] ?? [];
    const normalizedName = subagencyForm.name.trim().toLowerCase();
    const isDuplicateName = existingSubs.some((sub) => {
      if (editingSubagency && sub.id === editingSubagency.id) return false;
      return sub.name.toLowerCase() === normalizedName;
    });

    if (isDuplicateName) {
      toast.error('Subagency name must be unique within agency group');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: subagencyForm.name.trim(),
        code: subagencyForm.code.trim().toUpperCase(),
        description: subagencyForm.description.trim() || undefined,
      };

      if (editingSubagency) {
        const response = await agencyService.updateSubagency(editingSubagency.id, payload);
        setSubagenciesByGroup((prev) => {
          const current = prev[activeGroupForSubagency.id] ?? [];
          return {
            ...prev,
            [activeGroupForSubagency.id]: current.map((s) => (s.id === editingSubagency.id ? response.subagency : s)),
          };
        });
        toast.success('Subagency updated');
      } else {
        const response = await agencyService.createSubagency(activeGroupForSubagency.id, payload);
        setSubagenciesByGroup((prev) => {
          const current = prev[activeGroupForSubagency.id] ?? [];
          return {
            ...prev,
            [activeGroupForSubagency.id]: [response.subagency, ...current],
          };
        });
        setSubagencyCounts((prev) => ({
          ...prev,
          [activeGroupForSubagency.id]: (prev[activeGroupForSubagency.id] ?? 0) + 1,
        }));
        toast.success('Subagency created');
      }

      setShowSubagencyDialog(false);
      setEditingSubagency(null);
    } catch (error) {
      handleApiError(error, 'Failed to save subagency');
    } finally {
      setIsSaving(false);
    }
  };

  const loadAccessUsers = async (groupId: string) => {
    setIsAccessLoading(true);
    try {
      const response = await agencyAccessService.listAgencyGroupAccess(groupId);
      setAccessUsers(response.users);
    } catch (error) {
      handleApiError(error, 'Failed to load access list');
    } finally {
      setIsAccessLoading(false);
    }
  };

  const openManageAccess = async (group: AgencyGroup) => {
    setActiveGroupForAccess(group);
    setShowAccessDialog(true);
    await loadAccessUsers(group.id);
  };

  const handleGrantAccess = async (contact: ContactSearchResult) => {
    if (!activeGroupForAccess) return;
    setIsGrantingAccess(true);
    try {
      await agencyAccessService.grantAgencyGroupAccess(activeGroupForAccess.id, contact.id);
      await loadAccessUsers(activeGroupForAccess.id);
      toast.success(`Access granted to ${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim());
    } catch (error) {
      handleApiError(error, 'Failed to grant access');
    } finally {
      setIsGrantingAccess(false);
    }
  };

  // Story H-1: Show confirmation dialog before revoking agency group access
  const confirmRevokeAccess = (user: AgencyAccessUser) => {
    if (!activeGroupForAccess) return;
    setRevokeTarget({
      type: 'group',
      contactId: user.contactId,
      userName: user.name ?? user.email ?? 'Unknown User',
      entityName: activeGroupForAccess.name,
    });
    setShowRevokeDialog(true);
  };

  const handleRevokeAccess = async (contactId: string) => {
    if (!activeGroupForAccess) return;
    setRevokingAccessId(contactId);
    try {
      await agencyAccessService.revokeAgencyGroupAccess(activeGroupForAccess.id, contactId);
      setAccessUsers((prev) => prev.filter((user) => user.contactId !== contactId));
      toast.success('Access revoked');
    } catch (error) {
      handleApiError(error, 'Failed to revoke access');
    } finally {
      setRevokingAccessId(null);
    }
  };

  const loadSubagencyAccessUsers = async (subagencyId: string) => {
    setIsSubagencyAccessLoading(true);
    try {
      const response = await agencyAccessService.listSubagencyAccess(subagencyId);
      setSubagencyAccessUsers(response.users);
    } catch (error) {
      handleApiError(error, 'Failed to load subagency access');
    } finally {
      setIsSubagencyAccessLoading(false);
    }
  };

  const openSubagencyAccess = async (subagency: Subagency) => {
    setActiveSubagencyForAccess(subagency);
    setShowSubagencyAccessDialog(true);
    await loadSubagencyAccessUsers(subagency.id);
  };

  useEffect(() => {
    const state = location.state as
      | { focusGroupId?: string; focusSubagencyId?: string }
      | null;

    if (!state || handledDeepLink) return;
    if (!groups.length) return;

    const { focusGroupId, focusSubagencyId } = state;
    if (!focusGroupId) {
      setHandledDeepLink(true);
      return;
    }

    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.add(focusGroupId);
      return next;
    });

    const run = async () => {
      const group = groups.find((g) => g.id === focusGroupId);
      if (!group) {
        setHandledDeepLink(true);
        return;
      }

      const subagencies =
        subagenciesByGroup[focusGroupId] ?? (await loadSubagencies(focusGroupId));

      if (focusSubagencyId) {
        const subagency = subagencies.find((s) => s.id === focusSubagencyId);
        if (subagency) {
          await openSubagencyAccess(subagency);
        }
      } else {
        await openManageAccess(group);
      }

      setHandledDeepLink(true);
    };

    void run();
  }, [location.state, handledDeepLink, groups, subagenciesByGroup]);

  const handleGrantSubagencyAccess = async (contact: ContactSearchResult) => {
    if (!activeSubagencyForAccess) return;
    setIsGrantingSubagencyAccess(true);
    try {
      await agencyAccessService.grantSubagencyAccess(activeSubagencyForAccess.id, contact.id);
      await loadSubagencyAccessUsers(activeSubagencyForAccess.id);
      toast.success('Subagency access granted');
    } catch (error) {
      handleApiError(error, 'Failed to grant subagency access');
    } finally {
      setIsGrantingSubagencyAccess(false);
    }
  };

  // Story H-1: Show confirmation dialog before revoking subagency access
  const confirmRevokeSubagencyAccess = (user: SubagencyAccessUser) => {
    if (!activeSubagencyForAccess) return;
    setRevokeTarget({
      type: 'subagency',
      contactId: user.contactId,
      userName: user.name ?? user.email ?? 'Unknown User',
      entityName: activeSubagencyForAccess.name,
    });
    setShowRevokeDialog(true);
  };

  const handleRevokeSubagencyAccess = async (contactId: string) => {
    if (!activeSubagencyForAccess) return;
    setRevokingSubagencyAccessId(contactId);
    try {
      await agencyAccessService.revokeSubagencyAccess(activeSubagencyForAccess.id, contactId);
      setSubagencyAccessUsers((prev) => prev.filter((user) => user.contactId !== contactId));
      toast.success('Subagency access revoked');
    } catch (error) {
      handleApiError(error, 'Failed to revoke subagency access');
    } finally {
      setRevokingSubagencyAccessId(null);
    }
  };

  // Story H-1: Execute revoke after confirmation
  const executeRevokeAccess = async () => {
    if (!revokeTarget) return;

    if (revokeTarget.type === 'group') {
      await handleRevokeAccess(revokeTarget.contactId);
    } else {
      await handleRevokeSubagencyAccess(revokeTarget.contactId);
    }

    setShowRevokeDialog(false);
    setRevokeTarget(null);
  };

  const confirmDeleteGroup = (group: AgencyGroup) => {
    const subagencyCount = subagencyCounts[group.id] ?? group.subagencyCount ?? 0;
    setDeleteTarget({
      type: 'group',
      groupId: group.id,
      label: group.name,
      subagencyCount,
    });
    setShowDeleteDialog(true);
  };

  const confirmDeleteSubagency = (group: AgencyGroup, subagency: Subagency) => {
    setDeleteTarget({
      type: 'subagency',
      groupId: group.id,
      subagencyId: subagency.id,
      label: subagency.name,
      ndaCount: subagency.ndaCount ?? 0,
    });
    setShowDeleteDialog(true);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'group' && deleteTarget.groupId) {
        await agencyService.deleteAgencyGroup(deleteTarget.groupId);
        setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.groupId));
        setSubagenciesByGroup((prev) => {
          const next = { ...prev };
          delete next[deleteTarget.groupId!];
          return next;
        });
        toast.success('Agency group deleted');
      }

      if (deleteTarget.type === 'subagency' && deleteTarget.subagencyId && deleteTarget.groupId) {
        await agencyService.deleteSubagency(deleteTarget.subagencyId);
        setSubagenciesByGroup((prev) => {
          const current = prev[deleteTarget.groupId!] ?? [];
          return {
            ...prev,
            [deleteTarget.groupId!]: current.filter((s) => s.id !== deleteTarget.subagencyId),
          };
        });
        setSubagencyCounts((prev) => ({
          ...prev,
          [deleteTarget.groupId!]: Math.max(0, (prev[deleteTarget.groupId!] ?? 1) - 1),
        }));
        toast.success('Subagency deleted');
      }

      setShowDeleteDialog(false);
      setDeleteTarget(null);
    } catch (error) {
      handleApiError(error, 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => {
      const subagencies = subagenciesByGroup[group.id] ?? [];
      return (
        group.name.toLowerCase().includes(query) ||
        group.code.toLowerCase().includes(query) ||
        subagencies.some((sub) => sub.name.toLowerCase().includes(query) || sub.code.toLowerCase().includes(query))
      );
    });
  }, [groups, searchQuery, subagenciesByGroup]);

  const handleApiError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      if (error.code === 'HAS_NDAS' && typeof error.details === 'object' && error.details) {
        const details = error.details as { ndaCount?: number };
        toast.error(`Cannot delete subagency with ${details.ndaCount ?? 'existing'} NDAs`);
        return;
      }
      if (error.code === 'HAS_SUBAGENCIES') {
        const details = error.details as { subagencyCount?: number } | undefined;
        const count = details?.subagencyCount ?? deleteTarget?.subagencyCount;
        toast.error(`Cannot delete agency group with ${count ?? 'existing'} subagencies`);
        return;
      }
      toast.error(error.message || fallback);
      return;
    }

    toast.error(fallback);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/administration')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="mb-1">Agency Groups & Subagencies</h1>
          <p className="text-[var(--color-text-secondary)]">
            Manage agency hierarchy, subagency assignments, and NDA access structure.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Search groups or subagencies"
                className="pl-9 min-w-[260px]"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <Button onClick={openCreateGroup} icon={<Plus className="w-4 h-4" />}>
            Add Agency Group
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading agency groups...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Agency Group</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Subagencies</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[var(--color-text-secondary)]">
                    No agency groups found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded = expandedGroupIds.has(group.id);
                  const subagencies = subagenciesByGroup[group.id] ?? [];
                  const isLoadingSubagencies = loadingSubagencyGroups.has(group.id);
                  const subCount = subagencyCounts[group.id] ?? group.subagencyCount ?? 0;

                  return (
                    <React.Fragment key={group.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="subtle"
                              size="sm"
                              className="px-2"
                              onClick={() => void toggleGroupExpanded(group.id)}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                              />
                            </Button>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                                {group.name}
                              </p>
                              {group.description && (
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{group.code}</TableCell>
                        <TableCell>{subCount}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Story 9.3: Ensure dropdown menu works reliably */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="subtle"
                                size="sm"
                                className="px-2"
                                type="button"
                                aria-label="Agency options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={5}>
                              <DropdownMenuItem onClick={() => openCreateSubagency(group)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add subagency
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void openManageAccess(group)}>
                                <Users className="w-4 h-4 mr-2" />
                                Manage access
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditGroup(group)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit group
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => confirmDeleteGroup(group)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-slate-50">
                            <div className="pl-10">
                              {isLoadingSubagencies ? (
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] py-3">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading subagencies...
                                </div>
                              ) : subagencies.length === 0 ? (
                                // Story 9.4: Add actionable button to empty state
                                <div className="py-4 text-center">
                                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                                    No subagencies yet
                                  </p>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<Plus className="w-4 h-4" />}
                                    onClick={() => openCreateSubagency(group)}
                                  >
                                    Add Subagency
                                  </Button>
                                </div>
                              ) : (
                                // Story 9.4: Add header button when subagencies exist
                                <>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">
                                      Subagencies ({subagencies.length})
                                    </h4>
                                    <Button
                                      variant="subtle"
                                      size="sm"
                                      icon={<Plus className="w-4 h-4" />}
                                      onClick={() => openCreateSubagency(group)}
                                    >
                                      Add Subagency
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                  {subagencies.map((subagency) => (
                                    <div
                                      key={subagency.id}
                                      className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-white px-4 py-3"
                                    >
                                      <div>
                                        <p className="font-medium">
                                          {subagency.name} <span className="text-xs text-[var(--color-text-secondary)]">({subagency.code})</span>
                                        </p>
                                        {subagency.description && (
                                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                            {subagency.description}
                                          </p>
                                        )}
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                          NDAs: {subagency.ndaCount ?? 0}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="subtle"
                                          size="sm"
                                          onClick={() => void openSubagencyAccess(subagency)}
                                        >
                                          Access
                                        </Button>
                                        <Button
                                          variant="subtle"
                                          size="sm"
                                          onClick={() => openEditSubagency(group, subagency)}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => confirmDeleteSubagency(group, subagency)}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {/* Story H-1: Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} groups
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Agency Group' : 'Create Agency Group'}</DialogTitle>
            <DialogDescription>
              Agency groups represent major customer organizations (e.g., DoD, Healthcare).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Group name"
              placeholder="Department of Defense"
              value={groupForm.name}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="Group code"
              placeholder="DOD"
              value={groupForm.code}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <TextArea
              label="Description"
              placeholder="Optional description"
              rows={3}
              value={groupForm.description}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowGroupDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveGroup} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubagencyDialog} onOpenChange={setShowSubagencyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSubagency ? 'Edit Subagency' : 'Create Subagency'}</DialogTitle>
            <DialogDescription>
              {activeGroupForSubagency
                ? `Subagencies live inside ${activeGroupForSubagency.name}.`
                : 'Select an agency group first.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Subagency name"
              placeholder="Air Force"
              value={subagencyForm.name}
              onChange={(event) => setSubagencyForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="Subagency code"
              placeholder="USAF"
              value={subagencyForm.code}
              onChange={(event) => setSubagencyForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <TextArea
              label="Description"
              placeholder="Optional description"
              rows={3}
              value={subagencyForm.description}
              onChange={(event) => setSubagencyForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowSubagencyDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveSubagency} disabled={isSaving || !activeGroupForSubagency}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save subagency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAccessDialog}
        onOpenChange={(open) => {
          setShowAccessDialog(open);
          if (!open) {
            setActiveGroupForAccess(null);
            setAccessUsers([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Access{activeGroupForAccess ? ` - ${activeGroupForAccess.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Grant or revoke group-level access to view all subagencies in this agency group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <UserAutocomplete
              label="Grant access to user"
              placeholder="Type at least 3 characters"
              disabled={isGrantingAccess || isAccessLoading || !activeGroupForAccess}
              onSelect={handleGrantAccess}
            />

            <div>
              <h4 className="text-sm font-medium mb-2">Users with access</h4>
              {isAccessLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading access list...
                </div>
              ) : accessUsers.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">No users have access yet.</p>
              ) : (
                <div className="space-y-2">
                  {accessUsers.map((user) => (
                    <div
                      key={user.contactId}
                      className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Granted by {user.grantedBy?.name ?? 'System'} ·{' '}
                          {new Date(user.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmRevokeAccess(user)}
                        disabled={revokingAccessId === user.contactId}
                      >
                        {revokingAccessId === user.contactId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Revoke'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSubagencyAccessDialog}
        onOpenChange={(open) => {
          setShowSubagencyAccessDialog(open);
          if (!open) {
            setActiveSubagencyForAccess(null);
            setSubagencyAccessUsers([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Subagency Access{activeSubagencyForAccess ? ` - ${activeSubagencyForAccess.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Manage direct access for this subagency. Inherited access from the parent agency group is shown read-only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <UserAutocomplete
              label="Grant subagency access"
              placeholder="Type at least 3 characters"
              disabled={isGrantingSubagencyAccess || isSubagencyAccessLoading || !activeSubagencyForAccess}
              onSelect={handleGrantSubagencyAccess}
            />

            <div>
              <h4 className="text-sm font-medium mb-2">Users with access</h4>
              {isSubagencyAccessLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading access list...
                </div>
              ) : subagencyAccessUsers.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">No users have access yet.</p>
              ) : (
                <div className="space-y-2">
                  {subagencyAccessUsers.map((user) => {
                    const isInherited = user.accessType === 'inherited';
                    return (
                      <div
                        key={`${user.contactId}-${user.accessType}`}
                        className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-white px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                          {isInherited ? (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                              Inherited from {user.inheritedFrom?.agencyGroupName ?? 'agency group'}
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                              Granted by {user.grantedBy?.name ?? 'System'} ·{' '}
                              {user.grantedAt ? new Date(user.grantedAt).toLocaleDateString() : '—'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmRevokeSubagencyAccess(user)}
                          disabled={isInherited || revokingSubagencyAccessId === user.contactId}
                        >
                          {revokingSubagencyAccessId === user.contactId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Revoke'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'group'
                ? 'Deleting a group removes it from the hierarchy. This cannot happen if subagencies still exist.'
                : 'Deleting a subagency is blocked when NDAs exist.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-[var(--color-border)] bg-slate-50 p-3 text-sm">
            Delete {deleteTarget?.type === 'group' ? 'agency group' : 'subagency'}: <strong>{deleteTarget?.label}</strong>
            {deleteTarget?.type === 'subagency' && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Current NDAs linked: {deleteTarget.ndaCount ?? 0}
              </p>
            )}
            {deleteTarget?.type === 'group' && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Current subagencies linked: {deleteTarget.subagencyCount ?? 0}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={performDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story H-1: Revoke access confirmation dialog */}
      <Dialog
        open={showRevokeDialog}
        onOpenChange={(open) => {
          setShowRevokeDialog(open);
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm access revocation</DialogTitle>
            <DialogDescription>
              This will remove the user's access to the {revokeTarget?.type === 'group' ? 'agency group' : 'subagency'}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-[var(--color-border)] bg-slate-50 p-3 text-sm">
            Are you sure you want to revoke access for <strong>{revokeTarget?.userName}</strong> to{' '}
            <strong>{revokeTarget?.entityName}</strong>?
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowRevokeDialog(false);
                setRevokeTarget(null);
              }}
              disabled={revokingAccessId !== null || revokingSubagencyAccessId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeRevokeAccess}
              disabled={revokingAccessId !== null || revokingSubagencyAccessId !== null}
            >
              {revokingAccessId !== null || revokingSubagencyAccessId !== null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Revoke Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
