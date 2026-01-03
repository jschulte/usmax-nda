import { NdaStatus } from '../../generated/prisma/index.js';

export interface TimeInStatus {
  days: number;
  statusChangeDate: Date;
}

export const WAITING_STATUSES: ReadonlySet<NdaStatus> = new Set([
  NdaStatus.SENT_PENDING_SIGNATURE,
  NdaStatus.IN_REVISION,
]);

type StatusHistoryEntry = {
  status: NdaStatus;
  changedAt: Date;
};

export function getTimeInStatus(
  status: NdaStatus,
  statusHistory: StatusHistoryEntry[] | null | undefined,
  fallbackDate: Date
): TimeInStatus | null {
  if (!WAITING_STATUSES.has(status)) {
    return null;
  }

  let statusChangeDate = fallbackDate;

  if (statusHistory && statusHistory.length > 0) {
    for (let i = statusHistory.length - 1; i >= 0; i -= 1) {
      const entry = statusHistory[i];
      if (entry?.status === status && entry.changedAt) {
        statusChangeDate = entry.changedAt;
        break;
      }
    }
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - statusChangeDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    days,
    statusChangeDate,
  };
}
