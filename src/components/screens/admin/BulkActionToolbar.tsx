import React from 'react';
import { Button } from '../../ui/AppButton';
import { Download, Loader2, UserMinus, UserPlus, Building, X } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  isLoading: boolean;
  isExporting: boolean;
  onAssignRole: () => void;
  onGrantAccess: () => void;
  onDeactivate: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  isLoading,
  isExporting,
  onAssignRole,
  onGrantAccess,
  onDeactivate,
  onExport,
  onClearSelection,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="text-sm font-medium text-blue-800">{selectedCount} selected</span>
      <Button
        size="sm"
        variant="outline"
        icon={<UserPlus className="w-4 h-4" />}
        onClick={onAssignRole}
        disabled={isLoading || isExporting}
      >
        Assign Role
      </Button>
      <Button
        size="sm"
        variant="outline"
        icon={<Building className="w-4 h-4" />}
        onClick={onGrantAccess}
        disabled={isLoading || isExporting}
      >
        Grant Access
      </Button>
      <Button
        size="sm"
        variant="outline"
        icon={<UserMinus className="w-4 h-4" />}
        onClick={onDeactivate}
        disabled={isLoading || isExporting}
      >
        Deactivate
      </Button>
      <Button
        size="sm"
        variant="outline"
        icon={isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        onClick={onExport}
        disabled={isExporting || isLoading}
      >
        Export
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<X className="w-4 h-4" />}
        onClick={onClearSelection}
      >
        Clear Selection
      </Button>
    </div>
  );
}
