/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'nda-1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../client/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', permissions: ['nda:create'] } }),
}));

vi.mock('../NDADocumentPreview', () => ({
  NDADocumentPreview: () => <div data-testid="nda-document-preview" />,
}));

vi.mock('../NDAWorkflowProgress', () => ({
  NDAWorkflowProgress: () => <div data-testid="nda-workflow-progress" />,
}));

vi.mock('../WorkflowGuidanceCard', () => ({
  WorkflowGuidanceCard: () => <div data-testid="workflow-guidance" />,
}));

vi.mock('../InlineEditableDocument', () => ({
  InlineEditableDocument: () => <div data-testid="inline-editable" />,
}));

vi.mock('../NDAMetadataSidebar', () => ({
  NDAMetadataSidebar: () => <div data-testid="nda-metadata" />,
}));

vi.mock('../RecipientSelector', () => ({
  RecipientSelector: () => <div data-testid="recipient-selector" />,
}));

vi.mock('../EmailPreview', () => ({
  EmailPreview: () => <div data-testid="email-preview" />,
}));

vi.mock('../ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock('../ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  User: () => <span>User</span>,
  Mail: () => <span>Mail</span>,
  Phone: () => <span>Phone</span>,
  Calendar: () => <span>Calendar</span>,
  FileText: () => <span>FileText</span>,
  Upload: () => <span>Upload</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
  Clock: () => <span>Clock</span>,
  Copy: () => <span>Copy</span>,
  Info: () => <span>Info</span>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../client/services/ndaService', () => ({
  getNdaDetail: vi.fn().mockResolvedValue({
    nda: {
      id: 'nda-1',
      displayId: 1590,
      companyName: 'TechCorp',
      agencyGroup: { id: 'agency-1', name: 'DoD' },
      subagency: null,
      status: 'CREATED',
      usMaxPosition: 'PRIME',
      ndaType: 'MUTUAL',
      effectiveDate: null,
      isNonUsMax: false,
      createdBy: { id: 'user-1' },
      clonedFrom: null,
      rtfTemplateId: null,
    },
    documents: [],
    emails: [],
    auditTrail: [],
    statusHistory: [],
    statusProgression: { steps: [], isTerminal: false },
    availableActions: {
      canEdit: true,
      canSendEmail: false,
      canUploadDocument: false,
      canChangeStatus: false,
      canDelete: false,
      canRouteForApproval: false,
      canApprove: false,
    },
  }),
  updateNDAStatus: vi.fn(),
  getEmailPreview: vi.fn(),
  sendNdaEmail: vi.fn(),
  getStatusInfo: vi.fn().mockResolvedValue({ statuses: {} }),
  routeForApproval: vi.fn(),
  approveNda: vi.fn(),
  rejectNda: vi.fn(),
}));

vi.mock('../../client/services/auditService', () => ({
  getNDAAuditTrail: vi.fn().mockResolvedValue({ timeline: [] }),
}));

vi.mock('../../client/services/notificationService', () => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getNDASubscriptions: vi.fn().mockResolvedValue({ subscribers: [] }),
}));

vi.mock('../../client/services/documentService', () => ({
  uploadDocument: vi.fn(),
  listDocuments: vi.fn().mockResolvedValue([]),
  downloadDocument: vi.fn(),
  generateDocument: vi.fn(),
  markAsExecuted: vi.fn(),
  downloadAllDocuments: vi.fn(),
}));

vi.mock('../../client/services/templateService', () => ({
  listTemplates: vi.fn().mockResolvedValue({ templates: [] }),
  generatePreview: vi.fn(),
}));

vi.mock('../../client/services/emailTemplateService', () => ({
  listEmailTemplates: vi.fn().mockResolvedValue({ templates: [] }),
}));

vi.mock('../../client/services/workflowService', () => ({
  getWorkflowGuidance: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../client/services/notesService', () => ({
  getNotes: vi.fn().mockResolvedValue({ notes: [] }),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('../../client/utils/formatAuditChanges', () => ({
  formatAuditDetails: vi.fn().mockReturnValue(''),
}));

import { NDADetail } from '../screens/NDADetail';

describe('NDADetail', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('shows clone button when user can create NDAs', async () => {
    render(<NDADetail />);

    const cloneButton = await screen.findByRole('button', { name: /clone nda/i });
    expect(cloneButton).toBeInTheDocument();

    cloneButton.click();
    expect(mockNavigate).toHaveBeenCalledWith('/requests?cloneFrom=nda-1');
  });
});
