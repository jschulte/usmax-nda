import type {
  AvailableActions,
  NdaDetail,
  NdaEmailSummary,
  NdaListItem,
  NdaStatus,
  StatusProgression,
  StatusProgressionStep,
} from '../../../src/client/services/ndaService';
import type { Document } from '../../../src/client/services/documentService';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const defaultActions: AvailableActions = {
  canEdit: true,
  canSendEmail: true,
  canUploadDocument: true,
  canChangeStatus: true,
  canDelete: false,
};

const defaultProgression = (status: NdaStatus): StatusProgression => {
  const steps: StatusProgressionStep[] = [
    {
      status: 'CREATED',
      label: 'Created',
      completed: status !== 'CREATED',
      timestamp: minutesAgo(120),
      isCurrent: status === 'CREATED',
    },
    {
      status: 'PENDING_APPROVAL',
      label: 'Pending Approval',
      completed: status === 'SENT_PENDING_SIGNATURE' || status === 'FULLY_EXECUTED',
      timestamp: status !== 'CREATED' ? minutesAgo(90) : undefined,
      isCurrent: status === 'PENDING_APPROVAL',
    },
    {
      status: 'SENT_PENDING_SIGNATURE',
      label: 'Sent',
      completed: status === 'FULLY_EXECUTED',
      timestamp: status === 'SENT_PENDING_SIGNATURE' || status === 'FULLY_EXECUTED' ? minutesAgo(45) : undefined,
      isCurrent: status === 'SENT_PENDING_SIGNATURE',
    },
    {
      status: 'FULLY_EXECUTED',
      label: 'Executed',
      completed: status === 'FULLY_EXECUTED',
      timestamp: status === 'FULLY_EXECUTED' ? minutesAgo(10) : undefined,
      isCurrent: status === 'FULLY_EXECUTED',
    },
  ];

  return {
    steps,
    isTerminal: status === 'FULLY_EXECUTED',
    terminalStatus: status === 'FULLY_EXECUTED' ? 'FULLY_EXECUTED' : undefined,
  };
};

export function buildNdaDetail(overrides: Partial<NdaDetail> = {}): NdaDetail {
  const base: NdaDetail = {
    id: 'nda-1',
    displayId: '1001',
    companyName: 'Acme Corp',
    ndaType: 'MUTUAL',
    agencyGroup: {
      id: 'ag-1',
      name: 'Air Force',
    },
    subagency: {
      id: 'sub-1',
      name: 'Space Systems',
    },
    agencyOfficeName: 'Office of Technology',
    abbreviatedName: 'Acme NDA',
    authorizedPurpose: 'Evaluate partnership opportunities',
    effectiveDate: minutesAgo(60),
    usMaxPosition: 'PRIME',
    isNonUsMax: false,
    opportunityPoc: {
      id: 'poc-op-1',
      firstName: 'Olivia',
      lastName: 'Reed',
      email: 'olivia.reed@usmax.com',
    },
    contractsPoc: {
      id: 'poc-ct-1',
      firstName: 'Miles',
      lastName: 'Stone',
      email: 'miles.stone@usmax.com',
    },
    relationshipPoc: {
      id: 'poc-rl-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@usmax.com',
    },
    contactsPoc: {
      id: 'poc-co-1',
      firstName: 'Alex',
      lastName: 'Ng',
      email: 'alex.ng@acme.com',
    },
    status: 'CREATED',
    createdBy: {
      id: 'user-1',
      firstName: 'Dana',
      lastName: 'Santos',
    },
    createdAt: minutesAgo(180),
    updatedAt: minutesAgo(30),
    documents: [],
    emails: [],
    auditTrail: [],
    statusHistory: [],
    availableActions: defaultActions,
    statusProgression: defaultProgression(overrides.status ?? 'CREATED'),
  };

  return {
    ...base,
    ...overrides,
    agencyGroup: { ...base.agencyGroup, ...overrides.agencyGroup },
    subagency: overrides.subagency === undefined ? base.subagency : overrides.subagency,
    opportunityPoc: overrides.opportunityPoc === undefined ? base.opportunityPoc : overrides.opportunityPoc,
    contractsPoc: overrides.contractsPoc === undefined ? base.contractsPoc : overrides.contractsPoc,
    relationshipPoc: { ...base.relationshipPoc, ...overrides.relationshipPoc },
    contactsPoc: overrides.contactsPoc === undefined ? base.contactsPoc : overrides.contactsPoc,
    createdBy: { ...base.createdBy, ...overrides.createdBy },
    availableActions: { ...defaultActions, ...overrides.availableActions },
    statusProgression: overrides.statusProgression ?? defaultProgression(overrides.status ?? base.status),
  };
}

export function buildNdaListItem(nda: NdaDetail): NdaListItem {
  return {
    id: nda.id,
    displayId: nda.displayId,
    companyName: nda.companyName,
    ndaType: nda.ndaType,
    status: nda.status,
    agencyGroup: nda.agencyGroup,
    subagency: nda.subagency ?? undefined,
    effectiveDate: nda.effectiveDate ?? undefined,
    createdAt: nda.createdAt,
    updatedAt: nda.updatedAt,
  };
}

export function buildDocument(overrides: Partial<Document> = {}): Document {
  const base: Document = {
    id: 'doc-1',
    ndaId: 'nda-1',
    filename: 'Acme-NDA.rtf',
    fileType: 'rtf',
    fileSize: 1024,
    documentType: 'GENERATED',
    isFullyExecuted: false,
    versionNumber: 1,
    notes: null,
    uploadedById: 'user-1',
    uploadedBy: {
      id: 'user-1',
      firstName: 'Dana',
      lastName: 'Santos',
      email: 'dana.santos@usmax.com',
    },
    uploadedAt: minutesAgo(15),
  };

  return {
    ...base,
    ...overrides,
    uploadedBy: { ...base.uploadedBy, ...overrides.uploadedBy },
  };
}

export function buildEmailSummary(overrides: Partial<NdaEmailSummary> = {}): NdaEmailSummary {
  return {
    id: overrides.id ?? `email-${Math.random().toString(36).slice(2, 8)}`,
    subject: overrides.subject ?? 'NDA for review',
    toRecipients: overrides.toRecipients ?? ['sarah.johnson@usmax.com'],
    ccRecipients: overrides.ccRecipients ?? [],
    bccRecipients: overrides.bccRecipients ?? [],
    body: overrides.body ?? 'Please review the NDA.',
    sentAt: overrides.sentAt ?? minutesAgo(5),
    status: overrides.status ?? 'SENT',
    sentBy: overrides.sentBy ?? {
      id: 'user-1',
      firstName: 'Dana',
      lastName: 'Santos',
      email: 'dana.santos@usmax.com',
    },
  };
}
