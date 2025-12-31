/**
 * Workflow Service (Client)
 *
 * Fetches workflow guidance for NDAs
 */

import { get } from './api';

export interface WorkflowGuidance {
  nextAction: 'route_for_approval' | 'send_directly' | 'awaiting_approval' | 'ready_to_send';
  nextActionLabel: string;
  nextActionDescription: string;
  approvalRequired: boolean;
  approvalReason?: string;
  canSkipApproval: boolean;
  skipApprovalReason?: string;
  approvers: string[];
  canUserApprove: boolean;
  isSelfApproval: boolean;
  availableActions: {
    canRouteForApproval: boolean;
    canSendDirectly: boolean;
    canSelfApprove: boolean;
  };
  guidanceText: string;
  warningText?: string;
}

/**
 * Get workflow guidance for an NDA
 *
 * @param ndaId - NDA ID
 * @returns Workflow guidance with next steps and approval requirements
 */
export async function getWorkflowGuidance(ndaId: string): Promise<WorkflowGuidance> {
  const response = await get<{ guidance: WorkflowGuidance }>(`/api/ndas/${ndaId}/workflow-guidance`);
  return response.guidance;
}
