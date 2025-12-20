/**
 * Status Transition Service
 * Story 3.12: Status Management & Auto-Transitions
 *
 * Manages NDA status transitions with:
 * - Transition validation matrix
 * - Auto-transition triggers
 * - Audit logging with before/after values
 */

import { NdaStatus } from '../../generated/prisma/index.js';
import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';

// Re-export NdaStatus for convenience
export { NdaStatus };

/**
 * Triggers that can cause a status transition
 */
export enum StatusTrigger {
  EMAIL_SENT = 'email_sent',
  DOCUMENT_UPLOADED = 'document_uploaded',
  FULLY_EXECUTED_UPLOAD = 'fully_executed_upload',
  MANUAL_CHANGE = 'manual_change',
  SYSTEM_AUTO = 'system_auto',
}

/**
 * Result of a status transition
 */
export interface TransitionResult {
  previousStatus: NdaStatus;
  newStatus: NdaStatus;
  trigger: StatusTrigger;
  timestamp: Date;
  ndaId: string;
  displayId: number;
}

/**
 * Custom error for status transition failures
 */
export class StatusTransitionError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_TRANSITION' | 'NDA_NOT_FOUND' | 'ALREADY_IN_STATUS' | 'TERMINAL_STATUS' | 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'StatusTransitionError';
  }
}

/**
 * Valid status transitions matrix
 * Defines what status changes are allowed from each state
 */
export const VALID_TRANSITIONS: Record<NdaStatus, NdaStatus[]> = {
  [NdaStatus.CREATED]: [
    NdaStatus.EMAILED,
    NdaStatus.INACTIVE,
    NdaStatus.CANCELLED,
  ],
  [NdaStatus.EMAILED]: [
    NdaStatus.IN_REVISION,
    NdaStatus.FULLY_EXECUTED,
    NdaStatus.INACTIVE,
    NdaStatus.CANCELLED,
  ],
  [NdaStatus.IN_REVISION]: [
    NdaStatus.EMAILED,
    NdaStatus.FULLY_EXECUTED,
    NdaStatus.INACTIVE,
    NdaStatus.CANCELLED,
  ],
  [NdaStatus.FULLY_EXECUTED]: [
    NdaStatus.INACTIVE,
  ],
  [NdaStatus.INACTIVE]: [
    NdaStatus.CREATED,
    NdaStatus.EMAILED,
    NdaStatus.IN_REVISION,
    NdaStatus.FULLY_EXECUTED,
  ],
  [NdaStatus.CANCELLED]: [], // Terminal state - no transitions allowed
};

/**
 * Auto-transition rules based on triggers
 */
export const AUTO_TRANSITION_RULES: Partial<Record<StatusTrigger, { from: NdaStatus[]; to: NdaStatus }>> = {
  [StatusTrigger.EMAIL_SENT]: {
    from: [NdaStatus.CREATED],
    to: NdaStatus.EMAILED,
  },
  [StatusTrigger.DOCUMENT_UPLOADED]: {
    from: [NdaStatus.EMAILED],
    to: NdaStatus.IN_REVISION,
  },
  [StatusTrigger.FULLY_EXECUTED_UPLOAD]: {
    from: [NdaStatus.CREATED, NdaStatus.EMAILED, NdaStatus.IN_REVISION],
    to: NdaStatus.FULLY_EXECUTED,
  },
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(fromStatus: NdaStatus, toStatus: NdaStatus): boolean {
  const validTargets = VALID_TRANSITIONS[fromStatus];
  return validTargets?.includes(toStatus) ?? false;
}

/**
 * Get the auto-transition target status for a trigger
 * Returns undefined if no auto-transition should occur
 */
export function getAutoTransitionTarget(
  currentStatus: NdaStatus,
  trigger: StatusTrigger
): NdaStatus | undefined {
  const rule = AUTO_TRANSITION_RULES[trigger];
  if (!rule) return undefined;

  if (rule.from.includes(currentStatus)) {
    return rule.to;
  }

  return undefined;
}

/**
 * Transition NDA status with validation and audit logging
 *
 * @param ndaId - ID of the NDA
 * @param newStatus - Target status
 * @param trigger - What triggered the transition
 * @param userContext - User making the change
 * @param auditMeta - Optional audit metadata
 * @returns TransitionResult with details of the transition
 * @throws StatusTransitionError if transition is invalid
 */
export async function transitionStatus(
  ndaId: string,
  newStatus: NdaStatus,
  trigger: StatusTrigger,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<TransitionResult> {
  // Get current NDA state
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: {
      id: true,
      displayId: true,
      status: true,
    },
  });

  if (!nda) {
    throw new StatusTransitionError('NDA not found', 'NDA_NOT_FOUND');
  }

  const currentStatus = nda.status as NdaStatus;

  // Check if already in target status
  if (currentStatus === newStatus) {
    throw new StatusTransitionError(
      `NDA is already in ${newStatus} status`,
      'ALREADY_IN_STATUS'
    );
  }

  // Validate transition is allowed
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new StatusTransitionError(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_TRANSITION'
    );
  }

  // Prepare update data
  const updateData: {
    status: NdaStatus;
    fullyExecutedDate?: Date;
    statusHistory: {
      create: {
        status: NdaStatus;
        changedById: string;
      };
    };
  } = {
    status: newStatus,
    statusHistory: {
      create: {
        status: newStatus,
        changedById: userContext.contactId,
      },
    },
  };

  // Set fullyExecutedDate when transitioning to FULLY_EXECUTED
  if (newStatus === NdaStatus.FULLY_EXECUTED) {
    updateData.fullyExecutedDate = new Date();
  }

  // Perform the update
  await prisma.nda.update({
    where: { id: ndaId },
    data: updateData,
  });

  // Audit log with before/after values
  await auditService.log({
    action: AuditAction.NDA_STATUS_CHANGED,
    entityType: 'nda',
    entityId: ndaId,
    userId: userContext.contactId,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
    details: {
      displayId: nda.displayId,
      previousStatus: currentStatus,
      newStatus,
      trigger,
    },
  });

  const result: TransitionResult = {
    previousStatus: currentStatus,
    newStatus,
    trigger,
    timestamp: new Date(),
    ndaId: nda.id,
    displayId: nda.displayId,
  };

  return result;
}

/**
 * Attempt auto-transition based on trigger
 * Silently succeeds if no transition is needed
 *
 * @param ndaId - ID of the NDA
 * @param trigger - What triggered the potential transition
 * @param userContext - User context
 * @param auditMeta - Optional audit metadata
 * @returns TransitionResult if transition occurred, undefined otherwise
 */
export async function attemptAutoTransition(
  ndaId: string,
  trigger: StatusTrigger,
  userContext: UserContext,
  auditMeta?: { ipAddress?: string; userAgent?: string }
): Promise<TransitionResult | undefined> {
  // Get current NDA status
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    select: {
      id: true,
      displayId: true,
      status: true,
    },
  });

  if (!nda) {
    return undefined;
  }

  const currentStatus = nda.status as NdaStatus;
  const targetStatus = getAutoTransitionTarget(currentStatus, trigger);

  if (!targetStatus) {
    // No auto-transition needed for this trigger/status combination
    return undefined;
  }

  // Perform the transition
  return transitionStatus(ndaId, targetStatus, trigger, userContext, auditMeta);
}

/**
 * Get all valid transitions from current status
 */
export function getValidTransitionsFrom(status: NdaStatus): NdaStatus[] {
  return VALID_TRANSITIONS[status] || [];
}

/**
 * Check if a status is terminal (no outgoing transitions)
 */
export function isTerminalStatus(status: NdaStatus): boolean {
  const validTargets = VALID_TRANSITIONS[status];
  return !validTargets || validTargets.length === 0;
}

// ============================================================================
// STORY 3.15: Inactive & Cancelled Status Management
// ============================================================================

/**
 * Statuses that are hidden from default list views
 */
export const HIDDEN_BY_DEFAULT_STATUSES: NdaStatus[] = [
  NdaStatus.INACTIVE,
  NdaStatus.CANCELLED,
];

/**
 * Check if a status is hidden by default in list views
 */
export function isHiddenByDefault(status: NdaStatus): boolean {
  return HIDDEN_BY_DEFAULT_STATUSES.includes(status);
}

/**
 * Check if an NDA can be reactivated (only from INACTIVE, not CANCELLED)
 */
export function canReactivate(status: NdaStatus): boolean {
  return status === NdaStatus.INACTIVE;
}

/**
 * Status display information for frontend
 */
export interface StatusDisplayInfo {
  label: string;
  color: string;
  variant: 'default' | 'muted' | 'danger' | 'success' | 'warning';
  hiddenByDefault: boolean;
  isTerminal: boolean;
  canReactivate: boolean;
}

/**
 * Status display configuration
 */
export const STATUS_DISPLAY: Record<NdaStatus, StatusDisplayInfo> = {
  [NdaStatus.CREATED]: {
    label: 'Created',
    color: 'blue',
    variant: 'default',
    hiddenByDefault: false,
    isTerminal: false,
    canReactivate: false,
  },
  [NdaStatus.EMAILED]: {
    label: 'Emailed',
    color: 'green',
    variant: 'default',
    hiddenByDefault: false,
    isTerminal: false,
    canReactivate: false,
  },
  [NdaStatus.IN_REVISION]: {
    label: 'In Revision',
    color: 'yellow',
    variant: 'warning',
    hiddenByDefault: false,
    isTerminal: false,
    canReactivate: false,
  },
  [NdaStatus.FULLY_EXECUTED]: {
    label: 'Fully Executed',
    color: 'emerald',
    variant: 'success',
    hiddenByDefault: false,
    isTerminal: false,
    canReactivate: false,
  },
  [NdaStatus.INACTIVE]: {
    label: 'Inactive',
    color: 'gray',
    variant: 'muted',
    hiddenByDefault: true,
    isTerminal: false,
    canReactivate: true,
  },
  [NdaStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'red',
    variant: 'danger',
    hiddenByDefault: true,
    isTerminal: true,
    canReactivate: false,
  },
};

/**
 * Get display information for a status
 */
export function getStatusDisplayInfo(status: NdaStatus): StatusDisplayInfo {
  return STATUS_DISPLAY[status];
}

/**
 * Get all status display info (for frontend dropdown population)
 */
export function getAllStatusDisplayInfo(): Record<NdaStatus, StatusDisplayInfo> {
  return { ...STATUS_DISPLAY };
}
