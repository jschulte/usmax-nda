/**
 * Story 10.3: Status Display Name Formatter
 * Maps database enum values to legacy display names per customer requirements
 */

export type NdaStatus =
  | 'CREATED'
  | 'PENDING_APPROVAL'
  | 'SENT_PENDING_SIGNATURE'
  | 'IN_REVISION'
  | 'FULLY_EXECUTED'
  | 'INACTIVE_CANCELED'
  | 'EXPIRED';

/**
 * Legacy status display names (customer-facing)
 */
export const NDA_STATUS_DISPLAY_NAMES: Record<NdaStatus, string> = {
  CREATED: 'Created/Pending Release',
  PENDING_APPROVAL: 'Pending Approval',
  SENT_PENDING_SIGNATURE: 'Sent/Pending Signature',
  IN_REVISION: 'In Revision',
  FULLY_EXECUTED: 'Fully Executed NDA Uploaded',
  INACTIVE_CANCELED: 'Inactive/Canceled',
  EXPIRED: 'Expired'
};

/**
 * Get display name for a status value
 */
export function getStatusDisplayName(status: NdaStatus): string {
  return NDA_STATUS_DISPLAY_NAMES[status] || status;
}

/**
 * Get all status options for dropdowns
 */
export function getStatusOptions(): Array<{ value: NdaStatus; label: string }> {
  return Object.entries(NDA_STATUS_DISPLAY_NAMES).map(([value, label]) => ({
    value: value as NdaStatus,
    label
  }));
}
