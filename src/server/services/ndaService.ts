/**
 * NDA Service
 * Story 3.1: Create NDA with Basic Form
 *
 * Handles NDA CRUD operations with:
 * - Row-level security (agency-based filtering)
 * - Validation of required fields
 * - Audit logging
 * - Status history tracking
 */

import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import {
  isValidTransition,
  transitionStatus,
  StatusTrigger,
  StatusTransitionError,
  getValidTransitionsFrom,
} from './statusTransitionService.js';
import { ConfigKey, getConfig } from './systemConfigService.js';
import { NdaStatus, UsMaxPosition, NdaType } from '../../generated/prisma/index.js';
import type { Prisma } from '../../generated/prisma/index.js';
import type { UserContext } from '../types/auth.js';
import { scopeNDAsToUser } from './agencyScopeService.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';
// Story H-1 Task 13: Import POC assignment notification
import { notifyPocAssignment } from './notificationService.js';
// Story 6.2: Field change tracking
import { detectFieldChanges } from '../utils/detectFieldChanges.js';

// Re-export enums for use in other modules
export { NdaStatus, UsMaxPosition, NdaType };

function buildNdaOrderBy(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined
): Prisma.NdaOrderByWithRelationInput {
  const direction: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

  switch (sortBy) {
    case 'displayId':
      return { displayId: direction };
    case 'companyName':
      return { companyName: direction };
    case 'agencyGroupName':
      return { agencyGroup: { name: direction } };
    case 'subagencyName':
      return { subagency: { name: direction } };
    case 'status':
      return { status: direction };
    case 'effectiveDate':
      return { effectiveDate: direction };
    case 'createdAt':
      return { createdAt: direction };
    case 'updatedAt':
      return { updatedAt: direction };
    default:
      return { updatedAt: direction };
  }
}

/**
 * Custom error for NDA service operations
 */
export class NdaServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'NdaServiceError';
  }
}

/**
 * Input for creating a new NDA
 */
export interface CreateNdaInput {
  companyName: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyGroupId: string;
  subagencyId?: string;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  abbreviatedName: string;
  authorizedPurpose: string;
  effectiveDate?: string | Date;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  opportunityPocId?: string; // Defaults to current user
  contractsPocId?: string;
  relationshipPocId: string;
  contactsPocId?: string;
  rtfTemplateId?: string | null;
}

/**
 * Input for updating an NDA
 */
export interface UpdateNdaInput {
  companyName?: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyGroupId?: string;
  subagencyId?: string | null;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  abbreviatedName?: string;
  authorizedPurpose?: string;
  effectiveDate?: string | Date | null;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  contractsPocId?: string | null;
  relationshipPocId?: string;
  contactsPocId?: string | null;
  rtfTemplateId?: string | null;
}

/**
 * Parameters for listing NDAs
 */
export interface ListNdaParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Global search (Story 5.1)
  search?: string; // Full-text search across all fields
  // Filters
  agencyGroupId?: string;
  subagencyId?: string;
  companyName?: string;
  status?: NdaStatus;
  createdById?: string;
  effectiveDateFrom?: string | Date;
  effectiveDateTo?: string | Date;
  showInactive?: boolean;
  showCancelled?: boolean;
  // Draft filter (Story 3.6)
  draftsOnly?: boolean; // Only show CREATED status with incomplete fields
  myDrafts?: boolean; // Only show drafts created by current user
  // Extended filters (Story 3.7)
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  isNonUsMax?: boolean;
  usMaxPosition?: UsMaxPosition;
  createdDateFrom?: string | Date;
  createdDateTo?: string | Date;
  opportunityPocName?: string;
  contractsPocName?: string;
  relationshipPocName?: string;
  // Filter preset
  preset?: 'my-ndas' | 'expiring-soon' | 'drafts' | 'inactive';
}

/**
 * Audit metadata for tracking
 */
interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Build row-level security filter for NDA queries
 * Users can only see NDAs for agencies they have access to
 */
export async function buildSecurityFilter(userContext: UserContext): Promise<Prisma.NdaWhereInput> {
  const scope = await scopeNDAsToUser(userContext);

  if (Object.keys(scope).length === 0) {
    return {};
  }

  // Important: wrap the scope in an AND so callers can safely add their own OR clauses
  // (e.g., search predicates) without accidentally overwriting the security filter.
  return {
    AND: [scope],
  };
}

/**
 * Validate that user has access to the agency
 */
async function validateAgencyAccess(
  userContext: UserContext,
  agencyGroupId: string,
  subagencyId?: string | null
): Promise<void> {
  const hasGroupAccess = userContext.authorizedAgencyGroups?.includes(agencyGroupId);

  if (hasGroupAccess) {
    // If user has group access, they can access any subagency in that group
    if (subagencyId) {
      const subagency = await prisma.subagency.findUnique({
        where: { id: subagencyId },
      });
      if (!subagency || subagency.agencyGroupId !== agencyGroupId) {
        throw new NdaServiceError(
          'Subagency does not belong to the selected agency group',
          'INVALID_SUBAGENCY'
        );
      }
    }
    return;
  }

  // Check if user has direct subagency access
  if (subagencyId && userContext.authorizedSubagencies?.includes(subagencyId)) {
    // Verify subagency belongs to the agency group
    const subagency = await prisma.subagency.findUnique({
      where: { id: subagencyId },
    });
    if (!subagency || subagency.agencyGroupId !== agencyGroupId) {
      throw new NdaServiceError(
        'Subagency does not belong to the selected agency group',
        'INVALID_SUBAGENCY'
      );
    }
    return;
  }

  throw new NdaServiceError(
    'You do not have access to create NDAs for this agency',
    'UNAUTHORIZED_AGENCY'
  );
}

/**
 * Validate required NDA fields
 */
function validateNdaInput(input: CreateNdaInput): void {
  if (!input.companyName?.trim()) {
    throw new NdaServiceError('Company Name is required', 'VALIDATION_ERROR');
  }

  if (!input.agencyGroupId?.trim()) {
    throw new NdaServiceError('Agency Group is required', 'VALIDATION_ERROR');
  }

  if (!input.abbreviatedName?.trim()) {
    throw new NdaServiceError('Abbreviated Opportunity Name is required', 'VALIDATION_ERROR');
  }

  if (!input.authorizedPurpose?.trim()) {
    throw new NdaServiceError('Authorized Purpose is required', 'VALIDATION_ERROR');
  }

  if (input.authorizedPurpose.length > 255) {
    throw new NdaServiceError(
      'Authorized Purpose must not exceed 255 characters',
      'VALIDATION_ERROR'
    );
  }

  if (!input.relationshipPocId?.trim()) {
    throw new NdaServiceError('Relationship POC is required', 'VALIDATION_ERROR');
  }
}

async function validateTemplateSelection(
  agencyGroupId: string,
  rtfTemplateId?: string | null
): Promise<void> {
  if (!rtfTemplateId) return;

  const template = await prisma.rtfTemplate.findFirst({
    where: {
      id: rtfTemplateId,
      isActive: true,
      OR: [{ agencyGroupId }, { agencyGroupId: null }],
    },
  });

  if (!template) {
    throw new NdaServiceError('Template not found or inactive', 'INVALID_TEMPLATE');
  }
}

/**
 * Create a new NDA
 */
export async function createNda(
  input: CreateNdaInput,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<any> {
  // Validate input
  validateNdaInput(input);

  // Validate agency access
  await validateAgencyAccess(userContext, input.agencyGroupId, input.subagencyId);

  await validateTemplateSelection(input.agencyGroupId, input.rtfTemplateId);

  // Set defaults
  // Default opportunityPocId to current user if not provided
  const opportunityPocId = input.opportunityPocId || userContext.contactId;

  // Validate that opportunityPocId contact exists (prevent foreign key errors)
  if (opportunityPocId) {
    const pocExists = await prisma.contact.findUnique({
      where: { id: opportunityPocId },
      select: { id: true },
    });

    if (!pocExists) {
      throw new NdaServiceError(
        'Invalid Opportunity POC: Contact not found. Please select a valid contact.',
        'VALIDATION_ERROR'
      );
    }
  }

  // Validate that relationshipPocId contact exists (prevent foreign key errors)
  if (input.relationshipPocId) {
    const pocExists = await prisma.contact.findUnique({
      where: { id: input.relationshipPocId },
      select: { id: true },
    });

    if (!pocExists) {
      throw new NdaServiceError(
        'Invalid Relationship POC: Contact not found. Please select a valid contact.',
        'VALIDATION_ERROR'
      );
    }
  }

  // Parse effective date if string
  let effectiveDate: Date | null = null;
  if (input.effectiveDate) {
    effectiveDate =
      typeof input.effectiveDate === 'string' ? new Date(input.effectiveDate) : input.effectiveDate;

    if (Number.isNaN(effectiveDate.getTime())) {
      throw new NdaServiceError('Effective Date must be a valid date', 'VALIDATION_ERROR');
    }
  }

  // Create NDA with initial status history
  const nda = await prisma.nda.create({
    data: {
      companyName: input.companyName.trim(),
      companyCity: input.companyCity?.trim() || null,
      companyState: input.companyState?.trim() || null,
      stateOfIncorporation: input.stateOfIncorporation?.trim() || null,
      agencyGroupId: input.agencyGroupId,
      subagencyId: input.subagencyId || null,
      agencyOfficeName: input.agencyOfficeName?.trim() || null,
      ndaType: input.ndaType || 'MUTUAL',
      abbreviatedName: input.abbreviatedName.trim(),
      authorizedPurpose: input.authorizedPurpose.trim(),
      effectiveDate,
      usMaxPosition: input.usMaxPosition || 'PRIME',
      isNonUsMax: input.isNonUsMax || false,
      opportunityPocId,
      contractsPocId: input.contractsPocId || null,
      relationshipPocId: input.relationshipPocId,
      contactsPocId: input.contactsPocId || null,
      rtfTemplateId: input.rtfTemplateId || null,
      createdById: userContext.contactId,
      status: 'CREATED',
      // Create initial status history entry
      statusHistory: {
        create: {
          status: 'CREATED',
          changedById: userContext.contactId,
        },
      },
    } as any,
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      opportunityPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contractsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      relationshipPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contactsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Audit log
  await auditService.log({
    action: AuditAction.NDA_CREATED,
    entityType: 'nda',
    entityId: nda.id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      displayId: nda.displayId,
      companyName: nda.companyName,
      agencyGroupId: nda.agencyGroupId,
      subagencyId: nda.subagencyId,
    },
  });

  // Story H-1 Task 13: Notify POCs when assigned during creation
  // Don't notify the creator since they initiated the action
  const pocAssignments: Array<{ pocId: string; pocType: string }> = [];

  if (opportunityPocId && opportunityPocId !== userContext.contactId) {
    pocAssignments.push({ pocId: opportunityPocId, pocType: 'Opportunity POC' });
  }
  if (input.contractsPocId && input.contractsPocId !== userContext.contactId) {
    pocAssignments.push({ pocId: input.contractsPocId, pocType: 'Contracts POC' });
  }
  if (input.relationshipPocId && input.relationshipPocId !== userContext.contactId) {
    pocAssignments.push({ pocId: input.relationshipPocId, pocType: 'Relationship POC' });
  }
  if (input.contactsPocId && input.contactsPocId !== userContext.contactId) {
    pocAssignments.push({ pocId: input.contactsPocId, pocType: 'Contacts POC' });
  }

  // Send notifications asynchronously (don't block the create response)
  if (pocAssignments.length > 0) {
    Promise.all(
      pocAssignments.map(({ pocId, pocType }) =>
        notifyPocAssignment(nda.id, pocId, pocType, userContext).catch((err) =>
          console.error(`[NdaService] Failed to notify ${pocType}:`, err)
        )
      )
    ).catch(() => {
      // Suppress unhandled rejection - notifications are best-effort
    });
  }

  return nda;
}

/**
 * Get a single NDA by ID with row-level security
 */
export async function getNda(id: string, userContext: UserContext): Promise<any | null> {
  const nda = await findNdaWithScope(id, userContext, {
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      opportunityPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contractsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      relationshipPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contactsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      clonedFrom: { select: { id: true, displayId: true, companyName: true } },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        include: {
          changedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return nda;
}

/**
 * Available actions for an NDA based on user permissions (Story 3.8)
 */
export interface AvailableActions {
  canEdit: boolean;
  canSendEmail: boolean;
  canUploadDocument: boolean;
  canChangeStatus: boolean;
  canDelete: boolean;
  canApprove: boolean; // Story 10.6
  canRouteForApproval: boolean; // Story 10.6
}

/**
 * Status progression step (Story 3.9)
 */
export interface StatusProgressionStep {
  status: NdaStatus;
  label: string;
  completed: boolean;
  timestamp?: Date;
  isCurrent: boolean;
  changedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Status progression display info (Story 3.9)
 */
export interface StatusProgression {
  steps: StatusProgressionStep[];
  isTerminal: boolean;
  terminalStatus?: NdaStatus;
}

/**
 * Status order for progression visualization (Story 3.9)
 */
const STATUS_ORDER: NdaStatus[] = [
  NdaStatus.CREATED,
  NdaStatus.PENDING_APPROVAL,
  NdaStatus.SENT_PENDING_SIGNATURE,
  NdaStatus.IN_REVISION,
  NdaStatus.FULLY_EXECUTED,
];

const STATUS_LABELS: Record<NdaStatus, string> = {
  [NdaStatus.CREATED]: 'Created/Pending Release',
  [NdaStatus.PENDING_APPROVAL]: 'Pending Approval',
  [NdaStatus.SENT_PENDING_SIGNATURE]: 'Sent/Pending Signature',
  [NdaStatus.IN_REVISION]: 'In Revision',
  [NdaStatus.FULLY_EXECUTED]: 'Fully Executed NDA Uploaded',
  [NdaStatus.INACTIVE_CANCELED]: 'Inactive/Canceled',
  [NdaStatus.EXPIRED]: 'Expired',
};

const TERMINAL_STATUSES: NdaStatus[] = [NdaStatus.INACTIVE_CANCELED, NdaStatus.EXPIRED];

/**
 * Calculate status progression for visual display (Story 3.9)
 */
export function calculateStatusProgression(
  currentStatus: NdaStatus,
  statusHistory: Array<{
    status: NdaStatus;
    changedAt: Date;
    changedBy?: { id: string; firstName: string; lastName: string };
  }>
): StatusProgression {
  // Check if current status is terminal
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

  // Build a map of when each status was achieved
  const statusTimestamps = new Map<NdaStatus, { timestamp: Date; changedBy?: { id: string; firstName: string; lastName: string } }>();
  for (const entry of statusHistory) {
    // Only keep the first occurrence of each status
    if (!statusTimestamps.has(entry.status)) {
      statusTimestamps.set(entry.status, {
        timestamp: entry.changedAt,
        changedBy: entry.changedBy,
      });
    }
  }

  // Find current position in progression
  const currentPosition = STATUS_ORDER.indexOf(currentStatus);

  // Build steps
  const steps: StatusProgressionStep[] = STATUS_ORDER.map((status, index) => {
    const historyEntry = statusTimestamps.get(status);
    const completed = historyEntry !== undefined || (currentPosition >= 0 && index <= currentPosition);

    return {
      status,
      label: STATUS_LABELS[status],
      completed,
      timestamp: historyEntry?.timestamp,
      isCurrent: status === currentStatus && !isTerminal,
      changedBy: historyEntry?.changedBy,
    };
  });

  return {
    steps,
    isTerminal,
    terminalStatus: isTerminal ? currentStatus : undefined,
  };
}

/**
 * NDA Detail Response (Story 3.8, 3.9)
 */
export interface NdaDetailResponse {
  nda: any;
  documents: any[];
  emails: any[];
  auditTrail: any[];
  statusHistory: any[];
  statusProgression: StatusProgression;
  availableActions: AvailableActions;
}

/**
 * Get detailed NDA view with all related data (Story 3.8)
 * Includes documents, audit trail, status history, and permission-based actions
 */
export async function getNdaDetail(
  id: string,
  userContext: UserContext
): Promise<NdaDetailResponse | null> {
  // Get the NDA with all related data
  const nda = await getNda(id, userContext);

  if (!nda) {
    return null;
  }

  // Get audit trail for this NDA
  const auditTrail = await prisma.auditLog.findMany({
    where: {
      entityType: 'nda',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to last 100 entries
  });

  // Format audit trail with user names
  const formattedAuditTrail = auditTrail.map((entry) => ({
    action: entry.action,
    timestamp: entry.createdAt,
    userId: entry.userId,
    details: entry.details,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  }));

  // Determine available actions based on permissions
  const availableActions: AvailableActions = {
    canEdit: userContext.permissions.has('nda:update'),
    canSendEmail: userContext.permissions.has('nda:send_email'),
    canUploadDocument: userContext.permissions.has('nda:upload_document'),
    canChangeStatus: userContext.permissions.has('nda:mark_status'),
    canDelete: userContext.permissions.has('nda:delete'),
    canApprove: userContext.permissions.has('nda:approve'), // Story 10.6
    canRouteForApproval: userContext.permissions.has('nda:create'), // Story 10.6
  };

  const emails = await prisma.ndaEmail.findMany({
    where: { ndaId: id },
    orderBy: { sentAt: 'desc' },
    include: {
      sentBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Calculate status progression for visual display (Story 3.9)
  const statusProgression = calculateStatusProgression(
    nda.status as NdaStatus,
    nda.statusHistory || []
  );

  return {
    nda,
    documents: nda.documents || [],
    emails,
    auditTrail: formattedAuditTrail,
    statusHistory: nda.statusHistory || [],
    statusProgression,
    availableActions,
  };
}

/**
 * List NDAs with filtering, pagination, and row-level security
 */
export async function listNdas(
  params: ListNdaParams,
  userContext: UserContext
): Promise<{
  ndas: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  // Build security filter
  const securityFilter = await buildSecurityFilter(userContext);

  // Build where clause
  const where: Prisma.NdaWhereInput = {
    ...securityFilter,
  };

  // Global search (Story 5.1) - search across multiple fields
  if (params.search && params.search.trim().length >= 2) {
    const searchTerm = params.search.trim();
    where.OR = [
      { companyName: { contains: searchTerm, mode: 'insensitive' } },
      { abbreviatedName: { contains: searchTerm, mode: 'insensitive' } },
      { authorizedPurpose: { contains: searchTerm, mode: 'insensitive' } },
      { companyCity: { contains: searchTerm, mode: 'insensitive' } },
      { companyState: { contains: searchTerm, mode: 'insensitive' } },
      { agencyOfficeName: { contains: searchTerm, mode: 'insensitive' } },
      { stateOfIncorporation: { contains: searchTerm, mode: 'insensitive' } },
      // Search by display ID (convert to number if possible)
      ...(isFinite(parseInt(searchTerm, 10))
        ? [{ displayId: parseInt(searchTerm, 10) }]
        : []),
      // Search in related entities
      { agencyGroup: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { subagency: { name: { contains: searchTerm, mode: 'insensitive' } } },
      {
        opportunityPoc: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      {
        contractsPoc: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      {
        relationshipPoc: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  // Apply filters
  if (params.agencyGroupId) {
    where.agencyGroupId = params.agencyGroupId;
  }

  if (params.subagencyId) {
    where.subagencyId = params.subagencyId;
  }

  if (params.companyName) {
    where.companyName = { contains: params.companyName, mode: 'insensitive' };
  }

  if (params.status) {
    // Specific status requested - use it directly (Story 3.15)
    where.status = params.status;
  } else {
    // No specific status - apply default inactive/cancelled filtering (Story 3.15)
    // By default, exclude INACTIVE_CANCELED and EXPIRED unless explicitly requested
    const excludeStatuses: NdaStatus[] = [];

    if (!params.showInactive) {
      excludeStatuses.push(NdaStatus.INACTIVE_CANCELED);
    }
    if (!params.showCancelled) {
      excludeStatuses.push(NdaStatus.EXPIRED);
    }

    if (excludeStatuses.length > 0) {
      where.status = { notIn: excludeStatuses };
    }
  }

  if (params.createdById) {
    where.createdById = params.createdById;
  }

  // Date filters
  if (params.effectiveDateFrom || params.effectiveDateTo) {
    where.effectiveDate = {};
    if (params.effectiveDateFrom) {
      where.effectiveDate.gte = new Date(params.effectiveDateFrom);
    }
    if (params.effectiveDateTo) {
      where.effectiveDate.lte = new Date(params.effectiveDateTo);
    }
  }

  // Draft filters (Story 3.6)
  if (params.draftsOnly) {
    // Override status filter to only show CREATED
    where.status = 'CREATED';
  }

  if (params.myDrafts) {
    // Show only drafts created by current user
    where.status = 'CREATED';
    where.createdById = userContext.contactId;
  }

  // Extended filters (Story 3.7)
  if (params.companyCity) {
    where.companyCity = { contains: params.companyCity, mode: 'insensitive' };
  }

  if (params.companyState) {
    where.companyState = { contains: params.companyState, mode: 'insensitive' };
  }

  if (params.stateOfIncorporation) {
    where.stateOfIncorporation = { contains: params.stateOfIncorporation, mode: 'insensitive' };
  }

  if (params.agencyOfficeName) {
    where.agencyOfficeName = { contains: params.agencyOfficeName, mode: 'insensitive' };
  }

  if (params.ndaType) {
    where.ndaType = params.ndaType;
  }

  if (params.isNonUsMax !== undefined) {
    where.isNonUsMax = params.isNonUsMax;
  }

  if (params.usMaxPosition) {
    where.usMaxPosition = params.usMaxPosition;
  }

  // Created date filters
  if (params.createdDateFrom || params.createdDateTo) {
    where.createdAt = {};
    if (params.createdDateFrom) {
      where.createdAt.gte = new Date(params.createdDateFrom);
    }
    if (params.createdDateTo) {
      where.createdAt.lte = new Date(params.createdDateTo);
    }
  }

  // POC name filters (join with Contact table)
  if (params.opportunityPocName) {
    where.opportunityPoc = {
      OR: [
        { firstName: { contains: params.opportunityPocName, mode: 'insensitive' } },
        { lastName: { contains: params.opportunityPocName, mode: 'insensitive' } },
      ],
    };
  }

  if (params.contractsPocName) {
    where.contractsPoc = {
      OR: [
        { firstName: { contains: params.contractsPocName, mode: 'insensitive' } },
        { lastName: { contains: params.contractsPocName, mode: 'insensitive' } },
      ],
    };
  }

  if (params.relationshipPocName) {
    where.relationshipPoc = {
      OR: [
        { firstName: { contains: params.relationshipPocName, mode: 'insensitive' } },
        { lastName: { contains: params.relationshipPocName, mode: 'insensitive' } },
      ],
    };
  }

  // Filter presets (Story 3.7)
  if (params.preset) {
    switch (params.preset) {
      case 'my-ndas':
        where.createdById = userContext.contactId;
        break;
      case 'expiring-soon':
        // NDAs expiring soon based on effective date + default term length
        const [termDaysValue, warningDaysValue] = await Promise.all([
          getConfig(ConfigKey.NDA_DEFAULT_TERM_DAYS),
          getConfig(ConfigKey.DASHBOARD_EXPIRATION_WARNING_DAYS),
        ]);

        const defaultTermDays = Number.parseInt(termDaysValue, 10);
        const warningDays = Number.parseInt(warningDaysValue, 10);
        const termDays = Number.isFinite(defaultTermDays) && defaultTermDays > 0 ? defaultTermDays : 365;
        const windowDays = Number.isFinite(warningDays) && warningDays > 0 ? warningDays : 30;

        const now = new Date();
        const earliestEffectiveDate = new Date(now);
        earliestEffectiveDate.setDate(now.getDate() - termDays);
        const latestEffectiveDate = new Date(now);
        latestEffectiveDate.setDate(now.getDate() + windowDays - termDays);

        where.effectiveDate = {
          ...(where.effectiveDate as Prisma.DateTimeFilter || {}),
          gte: earliestEffectiveDate,
          lte: latestEffectiveDate,
        };
        break;
      case 'drafts':
        where.status = 'CREATED';
        break;
      case 'inactive':
        where.status = 'INACTIVE_CANCELED';
        break;
    }
  }

  // Handle sort
  const orderBy = buildNdaOrderBy(params.sortBy, params.sortOrder);

  // Execute queries
  const [ndas, total] = await Promise.all([
    prisma.nda.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        agencyGroup: { select: { id: true, name: true, code: true } },
        subagency: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        opportunityPoc: { select: { id: true, firstName: true, lastName: true } },
        contractsPoc: { select: { id: true, firstName: true, lastName: true } },
        relationshipPoc: { select: { id: true, firstName: true, lastName: true } },
        contactsPoc: { select: { id: true, firstName: true, lastName: true } },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          include: {
            changedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.nda.count({ where }),
  ]);

  const ndasWithDraftInfo = ndas.map((nda) => {
    const incompleteFields = getIncompleteFields({
      companyName: nda.companyName,
      abbreviatedName: nda.abbreviatedName,
      authorizedPurpose: nda.authorizedPurpose,
      relationshipPocId: nda.relationshipPocId,
      agencyGroupId: nda.agencyGroupId,
    });

    return {
      ...nda,
      incompleteFields,
      isDraft: nda.status === 'CREATED' && incompleteFields.length > 0,
    };
  });

  return {
    ndas: ndasWithDraftInfo,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get distinct filter suggestions for NDA list filters
 */
export async function getFilterSuggestions(
  field: 'companyCity' | 'companyState' | 'stateOfIncorporation' | 'agencyOfficeName',
  query: string,
  userContext: UserContext,
  limit = 10
): Promise<string[]> {
  const securityFilter = await buildSecurityFilter(userContext);
  const trimmed = query.trim();
  if (!trimmed) return [];

  const where: Prisma.NdaWhereInput = {
    ...securityFilter,
    [field]: { contains: trimmed, mode: 'insensitive' },
  };

  const results = await prisma.nda.findMany({
    where,
    distinct: [field],
    select: { [field]: true } as Prisma.NdaSelect,
    orderBy: { [field]: 'asc' } as Prisma.NdaOrderByWithRelationInput,
    take: limit,
  });

  return results
    .map((row) => (row as unknown as Record<string, string | null>)[field])
    .filter((value): value is string => Boolean(value));
}

/**
 * Filter preset definitions for the NDA list (Story 3.7)
 */
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  params: Partial<ListNdaParams>;
}

/**
 * Get available filter presets
 */
export function getFilterPresets(): FilterPreset[] {
  return [
    {
      id: 'my-ndas',
      name: 'My NDAs',
      description: 'NDAs created by me',
      params: { preset: 'my-ndas' },
    },
    {
      id: 'drafts',
      name: 'Drafts',
      description: 'NDAs in draft status',
      params: { preset: 'drafts' },
    },
    {
      id: 'expiring-soon',
      name: 'Expiring Soon',
      description: 'NDAs expiring within 30 days',
      params: { preset: 'expiring-soon' },
    },
    {
      id: 'inactive',
      name: 'Inactive',
      description: 'Inactive NDAs',
      params: { preset: 'inactive', showInactive: true },
    },
    {
      id: 'all',
      name: 'All NDAs',
      description: 'All active NDAs',
      params: {},
    },
  ];
}

/**
 * Update an NDA
 */
export async function updateNda(
  id: string,
  input: UpdateNdaInput,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<any> {
  // First, check if NDA exists and user has access
  const existing = await getNda(id, userContext);
  if (!existing) {
    throw new NdaServiceError('NDA not found or access denied', 'NOT_FOUND');
  }

  // If changing agency, validate new agency access
  if (input.agencyGroupId && input.agencyGroupId !== existing.agencyGroupId) {
    await validateAgencyAccess(userContext, input.agencyGroupId, input.subagencyId);
  }

  const targetAgencyGroupId = input.agencyGroupId ?? existing.agencyGroupId;
  await validateTemplateSelection(targetAgencyGroupId, input.rtfTemplateId);

  // Validate field lengths
  if (input.authorizedPurpose && input.authorizedPurpose.length > 255) {
    throw new NdaServiceError(
      'Authorized Purpose must not exceed 255 characters',
      'VALIDATION_ERROR'
    );
  }

  // Parse effective date if provided
  const effectiveDate =
    input.effectiveDate === null
      ? null
      : input.effectiveDate
        ? typeof input.effectiveDate === 'string'
          ? new Date(input.effectiveDate)
          : input.effectiveDate
        : undefined;

  // Build update data
  const updateData: Prisma.NdaUpdateInput = {};

  if (input.companyName !== undefined) updateData.companyName = input.companyName.trim();
  if (input.companyCity !== undefined) updateData.companyCity = input.companyCity?.trim() || null;
  if (input.companyState !== undefined)
    updateData.companyState = input.companyState?.trim() || null;
  if (input.stateOfIncorporation !== undefined)
    updateData.stateOfIncorporation = input.stateOfIncorporation?.trim() || null;
  if (input.agencyGroupId !== undefined)
    updateData.agencyGroup = { connect: { id: input.agencyGroupId } };
  if (input.subagencyId !== undefined) {
    updateData.subagency = input.subagencyId
      ? { connect: { id: input.subagencyId } }
      : { disconnect: true };
  }
  if (input.agencyOfficeName !== undefined)
    updateData.agencyOfficeName = input.agencyOfficeName?.trim() || null;
  if (input.ndaType !== undefined) updateData.ndaType = input.ndaType;
  if (input.abbreviatedName !== undefined)
    updateData.abbreviatedName = input.abbreviatedName.trim();
  if (input.authorizedPurpose !== undefined)
    updateData.authorizedPurpose = input.authorizedPurpose.trim();
  if (effectiveDate !== undefined) updateData.effectiveDate = effectiveDate;
  if (input.usMaxPosition !== undefined) updateData.usMaxPosition = input.usMaxPosition;
  if (input.isNonUsMax !== undefined) updateData.isNonUsMax = input.isNonUsMax;
  if (input.contractsPocId !== undefined) {
    updateData.contractsPoc = input.contractsPocId
      ? { connect: { id: input.contractsPocId } }
      : { disconnect: true };
  }
  if (input.relationshipPocId !== undefined)
    updateData.relationshipPoc = { connect: { id: input.relationshipPocId } };
  if (input.contactsPocId !== undefined) {
    updateData.contactsPoc = input.contactsPocId
      ? { connect: { id: input.contactsPocId } }
      : { disconnect: true };
  }
  if (input.rtfTemplateId !== undefined) {
    updateData.rtfTemplate = input.rtfTemplateId
      ? { connect: { id: input.rtfTemplateId } }
      : { disconnect: true };
  }

  const nda = await prisma.nda.update({
    where: { id },
    data: updateData,
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      opportunityPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contractsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      relationshipPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contactsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Story 6.2: Detect field changes for audit trail
  // Build comparable before/after objects
  const beforeValues: Record<string, unknown> = existing as any as Record<string, unknown>;
  const beforeValuesFiltered: Record<string, unknown> = {
    companyName: existing.companyName,
    companyCity: existing.companyCity,
    companyState: existing.companyState,
    stateOfIncorporation: existing.stateOfIncorporation,
    agencyGroupId: existing.agencyGroupId,
    subagencyId: existing.subagencyId,
    agencyOfficeName: existing.agencyOfficeName,
    ndaType: existing.ndaType,
    abbreviatedName: existing.abbreviatedName,
    authorizedPurpose: existing.authorizedPurpose,
    effectiveDate: existing.effectiveDate,
    usMaxPosition: existing.usMaxPosition,
    isNonUsMax: existing.isNonUsMax,
    contractsPocId: existing.contractsPoc?.id ?? null,
    relationshipPocId: existing.relationshipPoc?.id ?? null,
    contactsPocId: existing.contactsPoc?.id ?? null,
    rtfTemplateId: existing.rtfTemplate?.id ?? null,
  };

  const afterValuesFiltered: Record<string, unknown> = {
    companyName: input.companyName ?? existing.companyName,
    companyCity: input.companyCity ?? existing.companyCity,
    companyState: input.companyState ?? existing.companyState,
    stateOfIncorporation: input.stateOfIncorporation ?? existing.stateOfIncorporation,
    agencyGroupId: input.agencyGroupId ?? existing.agencyGroupId,
    subagencyId: input.subagencyId ?? existing.subagencyId,
    agencyOfficeName: input.agencyOfficeName ?? existing.agencyOfficeName,
    ndaType: input.ndaType ?? existing.ndaType,
    abbreviatedName: input.abbreviatedName ?? existing.abbreviatedName,
    authorizedPurpose: input.authorizedPurpose ?? existing.authorizedPurpose,
    effectiveDate: effectiveDate ?? existing.effectiveDate,
    usMaxPosition: input.usMaxPosition ?? existing.usMaxPosition,
    isNonUsMax: input.isNonUsMax ?? existing.isNonUsMax,
    contractsPocId: input.contractsPocId ?? existing.contractsPoc?.id ?? null,
    relationshipPocId: input.relationshipPocId ?? existing.relationshipPoc?.id ?? null,
    contactsPocId: input.contactsPocId ?? existing.contactsPoc?.id ?? null,
    rtfTemplateId: input.rtfTemplateId ?? existing.rtfTemplate?.id ?? null,
  };

  const fieldChanges = detectFieldChanges(beforeValuesFiltered, afterValuesFiltered);

  // Audit log
  await auditService.log({
    action: AuditAction.NDA_UPDATED,
    entityType: 'nda',
    entityId: nda.id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      displayId: nda.displayId,
      changes: fieldChanges, // Story 6.2: Include structured field changes
    },
  });

  // Story H-1 Task 13: Notify POCs when assigned
  // Check if any POC fields changed and notify the newly assigned users
  const pocChanges: Array<{ pocId: string; pocType: string }> = [];

  if (input.contractsPocId && input.contractsPocId !== existing.contractsPoc?.id) {
    pocChanges.push({ pocId: input.contractsPocId, pocType: 'Contracts POC' });
  }
  if (input.relationshipPocId && input.relationshipPocId !== existing.relationshipPoc?.id) {
    pocChanges.push({ pocId: input.relationshipPocId, pocType: 'Relationship POC' });
  }
  if (input.contactsPocId && input.contactsPocId !== existing.contactsPoc?.id) {
    pocChanges.push({ pocId: input.contactsPocId, pocType: 'Contacts POC' });
  }

  // Send notifications asynchronously (don't block the update response)
  if (pocChanges.length > 0) {
    Promise.all(
      pocChanges.map(({ pocId, pocType }) =>
        notifyPocAssignment(nda.id, pocId, pocType, userContext).catch((err) =>
          console.error(`[NdaService] Failed to notify ${pocType}:`, err)
        )
      )
    ).catch(() => {
      // Suppress unhandled rejection - notifications are best-effort
    });
  }

  return nda;
}

/**
 * Change NDA status with history tracking
 */
export async function changeNdaStatus(
  id: string,
  newStatus: NdaStatus,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<any> {
  // Check if NDA exists and user has access
  const existing = await getNda(id, userContext);
  if (!existing) {
    throw new NdaServiceError('NDA not found or access denied', 'NOT_FOUND');
  }

  const currentStatus = existing.status as NdaStatus;

  // Validate transition is allowed (Story 3.12)
  if (!isValidTransition(currentStatus, newStatus)) {
    const validTargets = getValidTransitionsFrom(currentStatus);
    throw new NdaServiceError(
      `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTargets.join(', ') || 'none'}`,
      'INVALID_TRANSITION'
    );
  }

  // Use transition service for consistent handling
  try {
    await transitionStatus(
      id,
      newStatus,
      StatusTrigger.MANUAL_CHANGE,
      userContext,
      auditMeta
    );
  } catch (error) {
    if (error instanceof StatusTransitionError) {
      throw new NdaServiceError(error.message, error.code);
    }
    throw error;
  }

  // Fetch updated NDA with status history
  const nda = await prisma.nda.findUnique({
    where: { id },
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        include: {
          changedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return nda;
}

/**
 * Clone an existing NDA
 * Story 3.3: Clone/Duplicate NDA (Second Entry Path)
 *
 * Creates a new NDA with all fields copied from the source,
 * with optional overrides for specific fields.
 */
export interface CloneNdaOverrides {
  ndaType?: NdaType;
  abbreviatedName?: string;
  authorizedPurpose?: string;
  effectiveDate?: string | Date;
  companyName?: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyGroupId?: string;
  subagencyId?: string | null;
  agencyOfficeName?: string;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  opportunityPocId?: string;
  contractsPocId?: string | null;
  relationshipPocId?: string;
  contactsPocId?: string | null;
  rtfTemplateId?: string | null;
}

export async function cloneNda(
  sourceId: string,
  overrides: CloneNdaOverrides,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<any> {
  // Get the source NDA with security check
  const source = await getNda(sourceId, userContext);
  if (!source) {
    throw new NdaServiceError('Source NDA not found or access denied', 'NOT_FOUND');
  }

  // If changing agency, validate access to new agency
  const targetAgencyGroupId = overrides.agencyGroupId || source.agencyGroup.id;
  const targetSubagencyId = overrides.subagencyId !== undefined ? overrides.subagencyId : source.subagency?.id;
  await validateAgencyAccess(userContext, targetAgencyGroupId, targetSubagencyId || undefined);

  const resolvedTemplateId =
    overrides.rtfTemplateId !== undefined ? overrides.rtfTemplateId : source.rtfTemplateId;
  await validateTemplateSelection(targetAgencyGroupId, resolvedTemplateId);

  // If subagency provided, validate it belongs to agency group
  if (targetSubagencyId) {
    const subagency = await prisma.subagency.findFirst({
      where: {
        id: targetSubagencyId,
        agencyGroupId: targetAgencyGroupId,
      },
    });

    if (!subagency) {
      throw new NdaServiceError(
        'Subagency does not belong to the specified agency group',
        'INVALID_SUBAGENCY'
      );
    }
  }

  // Parse effective date if provided
  let effectiveDate: Date | null = null;
  if (overrides.effectiveDate) {
    effectiveDate = typeof overrides.effectiveDate === 'string'
      ? new Date(overrides.effectiveDate)
      : overrides.effectiveDate;

    if (isNaN(effectiveDate.getTime())) {
      throw new NdaServiceError('Invalid effective date format', 'VALIDATION_ERROR');
    }
  }

  // Validate authorizedPurpose length if provided
  if (overrides.authorizedPurpose && overrides.authorizedPurpose.length > 255) {
    throw new NdaServiceError(
      'Authorized purpose must not exceed 255 characters',
      'VALIDATION_ERROR'
    );
  }

  // Create the cloned NDA
  const clonedNda = await prisma.nda.create({
    data: {
      // Copy from source with overrides
      companyName: overrides.companyName?.trim() || source.companyName,
      companyCity: overrides.companyCity !== undefined
        ? overrides.companyCity?.trim() || null
        : source.companyCity,
      companyState: overrides.companyState !== undefined
        ? overrides.companyState?.trim() || null
        : source.companyState,
      stateOfIncorporation: overrides.stateOfIncorporation !== undefined
        ? overrides.stateOfIncorporation?.trim() || null
        : source.stateOfIncorporation,
      agencyGroup: { connect: { id: targetAgencyGroupId } },
      subagency: targetSubagencyId ? { connect: { id: targetSubagencyId } } : undefined,
      agencyOfficeName: overrides.agencyOfficeName !== undefined
        ? overrides.agencyOfficeName?.trim() || null
        : source.agencyOfficeName,
      ndaType: overrides.ndaType ?? source.ndaType ?? 'MUTUAL',
      abbreviatedName: overrides.abbreviatedName?.trim() || source.abbreviatedName,
      authorizedPurpose: overrides.authorizedPurpose?.trim() || source.authorizedPurpose,
      effectiveDate: effectiveDate !== null ? effectiveDate : null,
      usMaxPosition: overrides.usMaxPosition ?? source.usMaxPosition,
      isNonUsMax: overrides.isNonUsMax ?? source.isNonUsMax,
      rtfTemplateId: resolvedTemplateId || null,

      // Reset status to CREATED for cloned NDAs
      status: 'CREATED',
      fullyExecutedDate: null,

      // Track clone source
      clonedFrom: { connect: { id: sourceId } },

      // Set current user as creator
      createdBy: { connect: { id: userContext.contactId } },

      // POCs - use overrides or copy from source
      opportunityPoc: {
        connect: {
          id: overrides.opportunityPocId || source.opportunityPoc?.id || userContext.contactId,
        },
      },
      contractsPoc: overrides.contractsPocId !== undefined
        ? (overrides.contractsPocId ? { connect: { id: overrides.contractsPocId } } : undefined)
        : (source.contractsPoc ? { connect: { id: source.contractsPoc.id } } : undefined),
      relationshipPoc: {
        connect: {
          id: overrides.relationshipPocId || source.relationshipPoc?.id || userContext.contactId,
        },
      },
      contactsPoc: overrides.contactsPocId !== undefined
        ? (overrides.contactsPocId ? { connect: { id: overrides.contactsPocId } } : undefined)
        : (source.contactsPoc ? { connect: { id: source.contactsPoc.id } } : undefined),

      // Create initial status history entry
      statusHistory: {
        create: {
          status: 'CREATED',
          changedById: userContext.contactId,
        },
      },
    },
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      opportunityPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contractsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      relationshipPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contactsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      clonedFrom: { select: { id: true, displayId: true, companyName: true } },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        include: {
          changedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  // Audit log with clone source information
  await auditService.log({
    action: AuditAction.NDA_CLONED,
    entityType: 'nda',
    entityId: clonedNda.id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      displayId: clonedNda.displayId,
      clonedFromId: source.id,
      clonedFromDisplayId: source.displayId,
      companyName: clonedNda.companyName,
    },
  });

  return clonedNda;
}

/**
 * Required fields for a complete NDA
 */
const REQUIRED_NDA_FIELDS = [
  'companyName',
  'abbreviatedName',
  'authorizedPurpose',
  'relationshipPocId',
  'agencyGroupId',
] as const;

/**
 * Get list of incomplete required fields for an NDA
 * Story 3.6: Draft Management & Auto-Save
 */
export function getIncompleteFields(nda: {
  companyName?: string | null;
  abbreviatedName?: string | null;
  authorizedPurpose?: string | null;
  relationshipPocId?: string | null;
  agencyGroupId?: string | null;
}): string[] {
  return REQUIRED_NDA_FIELDS.filter((field) => {
    const value = nda[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
}

/**
 * Update NDA draft (partial save for auto-save)
 * Story 3.6: Draft Management & Auto-Save
 *
 * Allows partial updates without full validation.
 * Only validates fields that are being updated.
 */
export interface UpdateDraftInput {
  companyName?: string;
  companyCity?: string;
  companyState?: string;
  stateOfIncorporation?: string;
  agencyGroupId?: string;
  subagencyId?: string | null;
  agencyOfficeName?: string;
  ndaType?: NdaType;
  abbreviatedName?: string;
  authorizedPurpose?: string;
  effectiveDate?: string | Date | null;
  usMaxPosition?: UsMaxPosition;
  isNonUsMax?: boolean;
  contractsPocId?: string | null;
  relationshipPocId?: string;
  contactsPocId?: string | null;
  rtfTemplateId?: string | null;
}

export interface UpdateDraftResult {
  savedAt: Date;
  incompleteFields: string[];
  nda: any;
}

export async function updateDraft(
  id: string,
  input: UpdateDraftInput,
  userContext: UserContext,
  auditMeta?: AuditMeta
): Promise<UpdateDraftResult> {
  // Check if NDA exists and user has access
  const existing = await getNda(id, userContext);
  if (!existing) {
    throw new NdaServiceError('NDA not found or access denied', 'NOT_FOUND');
  }

  // Only allow draft updates on CREATED status NDAs
  if (existing.status !== 'CREATED') {
    throw new NdaServiceError(
      'Cannot update draft - NDA is no longer in draft status',
      'INVALID_STATUS'
    );
  }

  // Validate field lengths if provided
  if (input.authorizedPurpose && input.authorizedPurpose.length > 255) {
    throw new NdaServiceError(
      'Authorized Purpose must not exceed 255 characters',
      'VALIDATION_ERROR'
    );
  }

  // If changing agency, validate new agency access
  if (input.agencyGroupId && input.agencyGroupId !== existing.agencyGroupId) {
    await validateAgencyAccess(userContext, input.agencyGroupId, input.subagencyId);
  }

  const targetAgencyGroupId = input.agencyGroupId ?? existing.agencyGroupId;
  await validateTemplateSelection(targetAgencyGroupId, input.rtfTemplateId);

  // Parse effective date if provided
  const effectiveDate =
    input.effectiveDate === null
      ? null
      : input.effectiveDate
        ? typeof input.effectiveDate === 'string'
          ? new Date(input.effectiveDate)
          : input.effectiveDate
        : undefined;

  // Build update data - only include fields that were provided
  const updateData: Prisma.NdaUpdateInput = {};

  if (input.companyName !== undefined) updateData.companyName = input.companyName.trim();
  if (input.companyCity !== undefined) updateData.companyCity = input.companyCity?.trim() || null;
  if (input.companyState !== undefined)
    updateData.companyState = input.companyState?.trim() || null;
  if (input.stateOfIncorporation !== undefined)
    updateData.stateOfIncorporation = input.stateOfIncorporation?.trim() || null;
  if (input.agencyGroupId !== undefined)
    updateData.agencyGroup = { connect: { id: input.agencyGroupId } };
  if (input.subagencyId !== undefined) {
    updateData.subagency = input.subagencyId
      ? { connect: { id: input.subagencyId } }
      : { disconnect: true };
  }
  if (input.agencyOfficeName !== undefined)
    updateData.agencyOfficeName = input.agencyOfficeName?.trim() || null;
  if (input.ndaType !== undefined) updateData.ndaType = input.ndaType;
  if (input.abbreviatedName !== undefined)
    updateData.abbreviatedName = input.abbreviatedName.trim();
  if (input.authorizedPurpose !== undefined)
    updateData.authorizedPurpose = input.authorizedPurpose.trim();
  if (effectiveDate !== undefined) updateData.effectiveDate = effectiveDate;
  if (input.usMaxPosition !== undefined) updateData.usMaxPosition = input.usMaxPosition;
  if (input.isNonUsMax !== undefined) updateData.isNonUsMax = input.isNonUsMax;
  if (input.contractsPocId !== undefined) {
    updateData.contractsPoc = input.contractsPocId
      ? { connect: { id: input.contractsPocId } }
      : { disconnect: true };
  }
  if (input.relationshipPocId !== undefined)
    updateData.relationshipPoc = { connect: { id: input.relationshipPocId } };
  if (input.contactsPocId !== undefined) {
    updateData.contactsPoc = input.contactsPocId
      ? { connect: { id: input.contactsPocId } }
      : { disconnect: true };
  }
  if (input.rtfTemplateId !== undefined) {
    updateData.rtfTemplate = input.rtfTemplateId
      ? { connect: { id: input.rtfTemplateId } }
      : { disconnect: true };
  }

  const nda = await prisma.nda.update({
    where: { id },
    data: updateData,
    include: {
      agencyGroup: { select: { id: true, name: true, code: true } },
      subagency: { select: { id: true, name: true, code: true } },
      opportunityPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contractsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      relationshipPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      contactsPoc: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  const savedAt = new Date();

  // Calculate incomplete fields
  const incompleteFields = getIncompleteFields({
    companyName: nda.companyName,
    abbreviatedName: nda.abbreviatedName,
    authorizedPurpose: nda.authorizedPurpose,
    relationshipPocId: nda.relationshipPocId,
    agencyGroupId: nda.agencyGroupId,
  });

  // Story 6.2: Detect field changes for draft auto-save
  const beforeValues: Record<string, unknown> = {
    companyName: existing.companyName,
    companyCity: existing.companyCity,
    companyState: existing.companyState,
    stateOfIncorporation: existing.stateOfIncorporation,
    agencyGroupId: existing.agencyGroupId,
    subagencyId: existing.subagencyId,
    agencyOfficeName: existing.agencyOfficeName,
    ndaType: existing.ndaType,
    abbreviatedName: existing.abbreviatedName,
    authorizedPurpose: existing.authorizedPurpose,
    effectiveDate: existing.effectiveDate,
    usMaxPosition: existing.usMaxPosition,
    isNonUsMax: existing.isNonUsMax,
    contractsPocId: existing.contractsPocId,
    relationshipPocId: existing.relationshipPocId,
    contactsPocId: existing.contactsPocId,
    rtfTemplateId: existing.rtfTemplateId,
  };

  const afterValues: Record<string, unknown> = {
    companyName:
      input.companyName !== undefined ? input.companyName.trim() : existing.companyName,
    companyCity:
      input.companyCity !== undefined ? input.companyCity?.trim() || null : existing.companyCity,
    companyState:
      input.companyState !== undefined ? input.companyState?.trim() || null : existing.companyState,
    stateOfIncorporation:
      input.stateOfIncorporation !== undefined
        ? input.stateOfIncorporation?.trim() || null
        : existing.stateOfIncorporation,
    agencyGroupId:
      input.agencyGroupId !== undefined ? input.agencyGroupId : existing.agencyGroupId,
    subagencyId:
      input.subagencyId !== undefined ? input.subagencyId : existing.subagencyId,
    agencyOfficeName:
      input.agencyOfficeName !== undefined
        ? input.agencyOfficeName?.trim() || null
        : existing.agencyOfficeName,
    ndaType: input.ndaType !== undefined ? input.ndaType : existing.ndaType,
    abbreviatedName:
      input.abbreviatedName !== undefined
        ? input.abbreviatedName.trim()
        : existing.abbreviatedName,
    authorizedPurpose:
      input.authorizedPurpose !== undefined
        ? input.authorizedPurpose.trim()
        : existing.authorizedPurpose,
    effectiveDate: effectiveDate !== undefined ? effectiveDate : existing.effectiveDate,
    usMaxPosition:
      input.usMaxPosition !== undefined ? input.usMaxPosition : existing.usMaxPosition,
    isNonUsMax: input.isNonUsMax !== undefined ? input.isNonUsMax : existing.isNonUsMax,
    contractsPocId:
      input.contractsPocId !== undefined ? input.contractsPocId : existing.contractsPocId,
    relationshipPocId:
      input.relationshipPocId !== undefined ? input.relationshipPocId : existing.relationshipPocId,
    contactsPocId:
      input.contactsPocId !== undefined ? input.contactsPocId : existing.contactsPocId,
    rtfTemplateId:
      input.rtfTemplateId !== undefined ? input.rtfTemplateId : existing.rtfTemplateId,
  };

  const fieldChanges = detectFieldChanges(beforeValues, afterValues);

  // Audit log (with flag that this is an auto-save)
  await auditService.log({
    action: AuditAction.NDA_UPDATED,
    entityType: 'nda',
    entityId: nda.id,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      displayId: nda.displayId,
      isDraftSave: true,
      changes: fieldChanges,
    },
  });

  return {
    savedAt,
    incompleteFields,
    nda,
  };
}

/**
 * Export NDAs to CSV format
 * Story 8.26: NDA List Export
 *
 * Exports NDAs using the same filters as listNdas but without pagination.
 * Returns CSV string ready for download.
 */
export async function exportNdas(
  params: Omit<ListNdaParams, 'page' | 'limit'>,
  userContext: UserContext
): Promise<{ csv: string; count: number }> {
  // Reuse listNdas but with a high limit to get all records
  const maxExportLimit = 10000; // Safety limit
  const result = await listNdas(
    { ...params, page: 1, limit: maxExportLimit },
    userContext
  );

  // Define CSV columns
  const columns = [
    { header: 'NDA ID', key: 'displayId' },
    { header: 'Company Name', key: 'companyName' },
    { header: 'Abbreviated Name', key: 'abbreviatedName' },
    { header: 'Status', key: 'status' },
    { header: 'Agency Group', key: 'agencyGroupName' },
    { header: 'Subagency', key: 'subagencyName' },
    { header: 'Agency Office', key: 'agencyOfficeName' },
    { header: 'Company City', key: 'companyCity' },
    { header: 'Company State', key: 'companyState' },
    { header: 'State of Incorporation', key: 'stateOfIncorporation' },
    { header: 'Authorized Purpose', key: 'authorizedPurpose' },
    { header: 'Effective Date', key: 'effectiveDate' },
    { header: 'USmax Position', key: 'usMaxPosition' },
    { header: 'Non-USmax', key: 'isNonUsMax' },
    { header: 'Opportunity POC', key: 'opportunityPocName' },
    { header: 'Contracts POC', key: 'contractsPocName' },
    { header: 'Relationship POC', key: 'relationshipPocName' },
    { header: 'Created By', key: 'createdByName' },
    { header: 'Created At', key: 'createdAt' },
    { header: 'Updated At', key: 'updatedAt' },
  ];

  // Format rows
  const rows = result.ndas.map((nda) => ({
    displayId: nda.displayId,
    companyName: nda.companyName,
    abbreviatedName: nda.abbreviatedName,
    status: nda.status,
    agencyGroupName: nda.agencyGroup?.name || '',
    subagencyName: nda.subagency?.name || '',
    agencyOfficeName: nda.agencyOfficeName || '',
    companyCity: nda.companyCity || '',
    companyState: nda.companyState || '',
    stateOfIncorporation: nda.stateOfIncorporation || '',
    authorizedPurpose: nda.authorizedPurpose || '',
    effectiveDate: nda.effectiveDate ? new Date(nda.effectiveDate).toISOString().split('T')[0] : '',
    usMaxPosition: nda.usMaxPosition,
    isNonUsMax: nda.isNonUsMax ? 'Yes' : 'No',
    opportunityPocName: formatPocName(nda.opportunityPoc),
    contractsPocName: formatPocName(nda.contractsPoc),
    relationshipPocName: formatPocName(nda.relationshipPoc),
    createdByName: formatPocName(nda.createdBy),
    createdAt: nda.createdAt ? new Date(nda.createdAt).toISOString() : '',
    updatedAt: nda.updatedAt ? new Date(nda.updatedAt).toISOString() : '',
  }));

  // Generate CSV
  const header = columns.map((c) => escapeCSV(c.header)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCSV(String(row[col.key as keyof typeof row] ?? ''))).join(',')
  );

  const csv = [header, ...dataRows].join('\n');

  return { csv, count: result.total };
}

/**
 * Format POC name for export
 */
function formatPocName(poc: { firstName?: string; lastName?: string } | null | undefined): string {
  if (!poc) return '';
  const first = poc.firstName || '';
  const last = poc.lastName || '';
  return `${first} ${last}`.trim();
}

/**
 * Escape a value for CSV (handles quotes and commas)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
