/**
 * NDA Metadata Sidebar
 *
 * Compact sidebar showing NDA details, people, and workflow guidance
 * Used in document-first layout
 */

import React from 'react';
import { Card } from './ui/AppCard';
import { Badge } from './ui/AppBadge';
import { Building, User, Calendar, FileText } from 'lucide-react';
import type { NdaDetail } from '../client/services/ndaService';

interface NDAMetadataSidebarProps {
  nda: NdaDetail;
}

export function NDAMetadataSidebar({ nda }: NDAMetadataSidebarProps) {
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'FULLY_EXECUTED':
        return 'success';
      case 'SENT_PENDING_SIGNATURE':
      case 'IN_REVISION':
        return 'warning';
      case 'INACTIVE_CANCELED':
      case 'EXPIRED':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-4">
      {/* Company & Agency */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">Details</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Company</p>
              <p className="text-sm font-medium truncate">{nda.companyName}</p>
              {nda.companyCity && nda.companyState && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {nda.companyCity}, {nda.companyState}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Agency</p>
              <p className="text-sm font-medium">{nda.agencyGroup.name}</p>
              {nda.subagency && (
                <p className="text-xs text-[var(--color-text-muted)]">{nda.subagency.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Status</p>
              <Badge variant={getStatusVariant(nda.status)} className="mt-1">
                {nda.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Created</p>
              <p className="text-sm">{new Date(nda.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {nda.effectiveDate && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)]">Effective Date</p>
                <p className="text-sm">{new Date(nda.effectiveDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* People */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">People</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Created By</p>
              <p className="text-sm truncate">
                {nda.createdBy.firstName} {nda.createdBy.lastName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">Relationship POC</p>
              <p className="text-sm truncate">
                {nda.relationshipPoc.firstName} {nda.relationshipPoc.lastName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {nda.relationshipPoc.email}
              </p>
            </div>
          </div>

          {nda.contractsPoc && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)]">Contracts POC</p>
                <p className="text-sm truncate">
                  {nda.contractsPoc.firstName} {nda.contractsPoc.lastName}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {nda.contractsPoc.email}
                </p>
              </div>
            </div>
          )}

          {nda.opportunityPoc && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)]">Opportunity POC</p>
                <p className="text-sm truncate">
                  {nda.opportunityPoc.firstName} {nda.opportunityPoc.lastName}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {nda.opportunityPoc.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Additional Info */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">Additional Info</h3>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Display ID</p>
            <p>{nda.displayId}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Abbreviated Name</p>
            <p>{nda.abbreviatedName}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Purpose</p>
            <p className="text-xs">{nda.authorizedPurpose}</p>
          </div>
          {nda.stateOfIncorporation && (
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">State of Incorporation</p>
              <p>{nda.stateOfIncorporation}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
