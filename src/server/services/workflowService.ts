/**
 * Workflow Service
 *
 * Determines approval requirements and next steps for NDAs
 * Provides clear guidance on what users should do next
 */

import { prisma } from '../db/index.js';
import type { UserContext } from '../types/auth.js';

export interface WorkflowGuidance {
  // What should happen next
  nextAction: 'route_for_approval' | 'send_directly' | 'awaiting_approval' | 'ready_to_send';
  nextActionLabel: string;
  nextActionDescription: string;

  // Approval requirements
  approvalRequired: boolean;
  approvalReason?: string;
  canSkipApproval: boolean;
  skipApprovalReason?: string;

  // Who can approve
  approvers: string[];
  canUserApprove: boolean;
  isSelfApproval: boolean;

  // Available actions
  availableActions: {
    canRouteForApproval: boolean;
    canSendDirectly: boolean;
    canSelfApprove: boolean;
  };

  // Help text
  guidanceText: string;
  warningText?: string;
}

/**
 * Workflow configuration rules
 * Phase 1: Hardcoded rules
 * Phase 2: Move to database (WorkflowConfig model)
 */
const WORKFLOW_RULES = {
  // System-wide defaults
  system: {
    defaultApprovalRequired: true,
    allowSelfApproval: false,
    approverRoles: ['Admin'],
  },

  // Agency-specific rules
  agencies: {
    // Department of Defense - Strict approval required
    'DoD': {
      approvalRequired: true,
      allowSelfApproval: false,
      requireDoubleApproval: false, // Future enhancement
      approverRoles: ['Admin'],
      reason: 'DoD NDAs require approval to ensure compliance with CUI and ITAR requirements',
    },
    // Federal Civilian - Approval required
    'Federal': {
      approvalRequired: true,
      allowSelfApproval: false,
      approverRoles: ['Admin'],
      reason: 'Federal NDAs require approval to ensure FAR compliance',
    },
    // Healthcare - Approval required
    'Healthcare': {
      approvalRequired: true,
      allowSelfApproval: false,
      approverRoles: ['Admin'],
      reason: 'Healthcare NDAs require approval to ensure HIPAA compliance',
    },
    // Commercial - Flexible
    'Commercial': {
      approvalRequired: false, // Can send directly
      allowSelfApproval: true,
      approverRoles: ['Admin', 'NDA User'],
      reason: 'Commercial NDAs can be sent directly if authorized',
    },
  },

  // NDA Type specific rules
  ndaTypes: {
    MUTUAL: {
      approvalRecommended: true,
      reason: 'Mutual NDAs involve bidirectional obligations and should be reviewed',
    },
    CONSULTANT: {
      approvalRecommended: false,
      reason: 'Standard consultant NDAs follow pre-approved templates',
    },
  },
};

/**
 * Get workflow guidance for an NDA
 *
 * @param ndaId - NDA ID
 * @param userContext - Current user context
 * @returns Workflow guidance with next steps
 */
export async function getWorkflowGuidance(
  ndaId: string,
  userContext: UserContext
): Promise<WorkflowGuidance> {
  // Load NDA with related data
  const nda = await prisma.nda.findUnique({
    where: { id: ndaId },
    include: {
      agencyGroup: { select: { code: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!nda) {
    throw new Error('NDA not found');
  }

  // Get agency rules (or fallback to system defaults)
  const agencyCode = nda.agencyGroup.code;
  const agencyRules = WORKFLOW_RULES.agencies[agencyCode as keyof typeof WORKFLOW_RULES.agencies] ||
    { approvalRequired: WORKFLOW_RULES.system.defaultApprovalRequired };

  // Get NDA type rules
  const typeRules = WORKFLOW_RULES.ndaTypes[nda.ndaType as keyof typeof WORKFLOW_RULES.ndaTypes] ||
    { approvalRecommended: false };

  // Determine if approval is required
  const approvalRequired = agencyRules.approvalRequired;

  // Check if user can approve
  const userRoles = await getUserRoles(userContext.contactId);
  const canUserApprove = userRoles.some(role =>
    (agencyRules.approverRoles || WORKFLOW_RULES.system.approverRoles).includes(role.name)
  );

  // Check if this would be self-approval
  const isSelfApproval = nda.createdBy.id === userContext.contactId;

  // Check if user can skip approval (admin override)
  const isAdmin = userContext.permissions.some(p => p.code === 'admin:manage_users' || p.code.startsWith('admin:'));
  const canSkipApproval = isAdmin && !approvalRequired;

  // Determine next action based on current status
  let nextAction: WorkflowGuidance['nextAction'];
  let nextActionLabel: string;
  let nextActionDescription: string;
  let guidanceText: string;
  let warningText: string | undefined;

  switch (nda.status) {
    case 'CREATED':
      if (approvalRequired) {
        nextAction = 'route_for_approval';
        nextActionLabel = 'Route for Approval';
        nextActionDescription = 'Submit this NDA for review and approval before sending';
        guidanceText = `This ${nda.agencyGroup.name} NDA requires approval before sending. ${agencyRules.reason || 'Approval ensures compliance and quality.'}`;

        if (isSelfApproval && agencyRules.allowSelfApproval) {
          warningText = 'Note: You created this NDA. Self-approval is allowed but will be noted in the audit log.';
        }
      } else {
        nextAction = 'send_directly';
        nextActionLabel = 'Send Email';
        nextActionDescription = 'Send this NDA directly to the counterparty';
        guidanceText = `This ${nda.agencyGroup.name} NDA can be sent directly. ${agencyRules.reason || 'No approval required for this agency.'}`;

        if (typeRules.approvalRecommended) {
          warningText = 'Recommendation: Consider routing for approval since this is a mutual NDA with bidirectional obligations.';
        }
      }
      break;

    case 'PENDING_APPROVAL':
      nextAction = 'awaiting_approval';
      nextActionLabel = canUserApprove ? 'Review & Approve' : 'Awaiting Approval';
      nextActionDescription = canUserApprove
        ? 'Review this NDA and approve or reject it'
        : 'Waiting for an authorized approver to review';
      guidanceText = canUserApprove
        ? 'You can approve this NDA. Please review the document before approving.'
        : `This NDA is pending approval from: ${(agencyRules.approverRoles || WORKFLOW_RULES.system.approverRoles).join(', ')}`;

      if (isSelfApproval && canUserApprove) {
        warningText = '⚠️ You are approving your own NDA. This is allowed but will be flagged in the audit log.';
      }
      break;

    case 'IN_REVISION':
    case 'SENT_PENDING_SIGNATURE':
      nextAction = 'ready_to_send';
      nextActionLabel = 'Send Email';
      nextActionDescription = 'Send this NDA to the counterparty for signature';
      guidanceText = 'This NDA has been approved and is ready to send.';
      break;

    default:
      nextAction = 'awaiting_approval';
      nextActionLabel = 'In Progress';
      nextActionDescription = 'NDA is being processed';
      guidanceText = `Current status: ${nda.status}`;
  }

  return {
    nextAction,
    nextActionLabel,
    nextActionDescription,
    approvalRequired,
    approvalReason: agencyRules.reason,
    canSkipApproval,
    skipApprovalReason: canSkipApproval ? 'You have admin permissions' : undefined,
    approvers: agencyRules.approverRoles || WORKFLOW_RULES.system.approverRoles,
    canUserApprove,
    isSelfApproval,
    availableActions: {
      canRouteForApproval: nda.status === 'CREATED',
      canSendDirectly: !approvalRequired && nda.status === 'CREATED',
      canSelfApprove: isSelfApproval && canUserApprove && (agencyRules.allowSelfApproval ?? false),
    },
    guidanceText,
    warningText,
  };
}

/**
 * Get user roles
 */
async function getUserRoles(contactId: string): Promise<Array<{ name: string }>> {
  const contactRoles = await prisma.contactRole.findMany({
    where: { contactId },
    include: {
      role: { select: { name: true } },
    },
  });

  return contactRoles.map(cr => ({ name: cr.role.name }));
}

/**
 * Get workflow rules for an agency (by code)
 * Future: Load from database instead of hardcoded
 */
export function getAgencyWorkflowRules(agencyCode: string) {
  return WORKFLOW_RULES.agencies[agencyCode as keyof typeof WORKFLOW_RULES.agencies];
}

/**
 * Explain why approval is or isn't required
 */
export function explainApprovalRequirement(
  agencyCode: string,
  ndaType: string
): string {
  const agencyRules = getAgencyWorkflowRules(agencyCode);
  const typeRules = WORKFLOW_RULES.ndaTypes[ndaType as keyof typeof WORKFLOW_RULES.ndaTypes];

  if (agencyRules?.approvalRequired) {
    return agencyRules.reason || 'Approval required per agency policy';
  }

  if (typeRules?.approvalRecommended) {
    return typeRules.reason || 'Approval recommended for this NDA type';
  }

  return 'No approval required for this agency and NDA type';
}
