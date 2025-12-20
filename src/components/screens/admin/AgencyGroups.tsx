import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import * as agencyService from '../../../client/services/agencyService';
import { ApiError } from '../../../client/services/api';

type AgencyGroup = agencyService.AgencyGroup;
type Subagency = agencyService.Subagency;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groups, setGroups] = useState<AgencyGroup[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [subagenciesByGroup, setSubagenciesByGroup] = useState<Record<string, Subagency[]>>({});
  const [subagencyCounts, setSubagencyCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showSubagencyDialog, setShowSubagencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'group' | 'subagency';
    groupId?: string;
    subagencyId?: string;
    label: string;
    ndaCount?: number;
    subagencyCount?: number;
  } | null>(null);

  const [editingGroup, setEditingGroup] = useState<AgencyGroup | null>(null);
  const [editingSubagency, setEditingSubagency] = useState<Subagency | null>(null);
  const [activeGroupForSubagency, setActiveGroupForSubagency] = useState<AgencyGroup | null>(null);

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

  useEffect(() => {
    void loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await agencyService.listAgencyGroups();
      setGroups(response.agencyGroups);
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

  const loadSubagencies = async (groupId: string) => {
    try {
      const response = await agencyService.listSubagencies(groupId);
      setSubagenciesByGroup((prev) => ({ ...prev, [groupId]: response.subagencies }));
      const count = response.subagencies.length;
      setSubagencyCounts((prev) => ({ ...prev, [groupId]: count }));
    } catch (error) {
      handleApiError(error, 'Failed to load subagencies');
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="subtle" size="sm" className="px-2">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openCreateSubagency(group)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add subagency
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
                              {subagencies.length === 0 ? (
                                <div className="text-sm text-[var(--color-text-secondary)] py-3">
                                  No subagencies yet. Use “Add subagency” to create one.
                                </div>
                              ) : (
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
    </div>
  );
}
