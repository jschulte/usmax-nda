import type { Page, Route } from '@playwright/test';
import type { User as AuthUser } from '../../../src/client/contexts/AuthContext';
import type { WorkflowGuidance } from '../../../src/client/services/workflowService';
import type {
  AvailableActions,
  NdaDetail,
  NdaDetailResponse,
  NdaEmailSummary,
  NdaStatus,
  StatusInfoResponse,
} from '../../../src/client/services/ndaService';
import type { Document } from '../../../src/client/services/documentService';
import type { AgencyGroup, Subagency } from '../../../src/client/services/agencyService';
import type { Contact } from '../../../src/client/services/userService';
import type { AuditLogEntry } from '../../../src/client/services/auditService';
import type { InternalNote } from '../../../src/client/services/notesService';
import type { Role } from '../../../src/client/services/adminService';
import type { User as ManagedUser, UserSearchResult } from '../../../src/client/services/userService';
import { buildDocument, buildEmailSummary, buildNdaDetail, buildNdaListItem } from '../factories/ndaFactory';

export type UserKey = 'admin' | 'ndaUser' | 'agencyUserA' | 'agencyUserB';

export interface MockUser extends AuthUser {
  firstName: string;
  lastName: string;
  permissions: string[];
  roles: string[];
  authorizedAgencyGroupIds: string[];
}

export interface MockState {
  auth: {
    isAuthenticated: boolean;
    currentUserKey: UserKey;
    mfaAttempts: number;
    mfaBypass: boolean;
    sessionExpiresAt: number;
    csrfToken: string;
  };
  users: Record<UserKey, MockUser>;
  managedUsers: ManagedUser[];
  roles: Role[];
  agencies: {
    groups: AgencyGroup[];
    subagencies: Record<string, Subagency[]>;
  };
  access: {
    agencyGroups: Record<string, { users: Array<{ contactId: string; name: string; email: string; grantedAt: string; grantedBy: { id: string; name: string } | null }> }>;
    subagencies: Record<string, { users: Array<{ contactId: string; name: string; email: string; accessType: 'direct' | 'inherited'; grantedAt?: string; grantedBy?: { id: string; name: string } | null }> }>;
  };
  ndas: NdaDetail[];
  documents: Record<string, Document[]>;
  emails: Record<string, NdaEmailSummary[]>;
  notes: Record<string, InternalNote[]>;
  auditLogs: AuditLogEntry[];
  workflowGuidance: Record<string, WorkflowGuidance>;
  emailTemplates: Array<{
    id: string;
    name: string;
    description: string | null;
    subject: string;
    body: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

const nowIso = () => new Date().toISOString();

const defaultStatusInfo: StatusInfoResponse = {
  statuses: {
    CREATED: {
      label: 'Created',
      color: '#3b82f6',
      variant: 'default',
      hiddenByDefault: false,
      isTerminal: false,
      canReactivate: false,
      validTransitions: ['PENDING_APPROVAL', 'SENT_PENDING_SIGNATURE', 'IN_REVISION'],
    },
    PENDING_APPROVAL: {
      label: 'Pending Approval',
      color: '#f59e0b',
      variant: 'warning',
      hiddenByDefault: false,
      isTerminal: false,
      canReactivate: false,
      validTransitions: ['SENT_PENDING_SIGNATURE', 'IN_REVISION'],
    },
    SENT_PENDING_SIGNATURE: {
      label: 'Sent',
      color: '#0ea5e9',
      variant: 'default',
      hiddenByDefault: false,
      isTerminal: false,
      canReactivate: false,
      validTransitions: ['FULLY_EXECUTED'],
    },
    IN_REVISION: {
      label: 'In Revision',
      color: '#e11d48',
      variant: 'warning',
      hiddenByDefault: false,
      isTerminal: false,
      canReactivate: false,
      validTransitions: ['SENT_PENDING_SIGNATURE'],
    },
    FULLY_EXECUTED: {
      label: 'Executed',
      color: '#22c55e',
      variant: 'success',
      hiddenByDefault: false,
      isTerminal: true,
      canReactivate: false,
      validTransitions: [],
    },
    INACTIVE_CANCELED: {
      label: 'Canceled',
      color: '#9ca3af',
      variant: 'muted',
      hiddenByDefault: true,
      isTerminal: true,
      canReactivate: false,
      validTransitions: [],
    },
    EXPIRED: {
      label: 'Expired',
      color: '#6b7280',
      variant: 'muted',
      hiddenByDefault: true,
      isTerminal: true,
      canReactivate: false,
      validTransitions: [],
    },
  },
  terminalStatuses: ['FULLY_EXECUTED', 'INACTIVE_CANCELED', 'EXPIRED'],
  reactivatableStatuses: [],
  hiddenByDefault: ['INACTIVE_CANCELED', 'EXPIRED'],
};

export function createMockState(): MockState {
  const agencies: AgencyGroup[] = [
    {
      id: 'ag-1',
      name: 'Air Force',
      code: 'USAF',
      description: 'Air Force',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      subagencyCount: 1,
      ndaCount: 2,
    },
    {
      id: 'ag-2',
      name: 'Navy',
      code: 'USN',
      description: 'Navy',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      subagencyCount: 0,
      ndaCount: 1,
    },
  ];

  const subagencies: Record<string, Subagency[]> = {
    'ag-1': [
      {
        id: 'sub-1',
        name: 'Space Systems',
        code: 'SPACE',
        description: 'Space Systems',
        agencyGroupId: 'ag-1',
        ndaCount: 2,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    'ag-2': [],
  };

  const users: Record<UserKey, MockUser> = {
    admin: {
      id: 'user-admin',
      email: 'admin@usmax.com',
      firstName: 'Admin',
      lastName: 'User',
      permissions: [
        'nda:create',
        'nda:update',
        'nda:upload_document',
        'nda:send_email',
        'nda:mark_status',
        'nda:view',
        'admin:manage_users',
        'admin:manage_agencies',
        'admin:manage_templates',
        'admin:view_audit_logs',
      ],
      roles: ['Admin'],
      authorizedAgencyGroupIds: ['ag-1', 'ag-2'],
    },
    ndaUser: {
      id: 'user-nda',
      email: 'user@usmax.com',
      firstName: 'Nda',
      lastName: 'User',
      permissions: ['nda:create', 'nda:update', 'nda:upload_document', 'nda:send_email', 'nda:mark_status', 'nda:view'],
      roles: ['NDA User'],
      authorizedAgencyGroupIds: ['ag-1'],
    },
    agencyUserA: {
      id: 'user-a',
      email: 'usera@usmax.com',
      firstName: 'Ava',
      lastName: 'Scope',
      permissions: ['nda:view'],
      roles: ['Read-Only'],
      authorizedAgencyGroupIds: ['ag-1'],
    },
    agencyUserB: {
      id: 'user-b',
      email: 'userb@usmax.com',
      firstName: 'Ben',
      lastName: 'Scope',
      permissions: ['nda:view'],
      roles: ['Read-Only'],
      authorizedAgencyGroupIds: ['ag-2'],
    },
  };

  const emailTemplates = [
    {
      id: 'email-1',
      name: 'Default Email Template',
      description: 'Default template',
      subject: 'NDA {{displayId}} - {{companyName}}',
      body: 'Hello {{companyName}},\n\nPlease review NDA {{displayId}}.',
      isDefault: true,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'email-2',
      name: 'Follow Up Template',
      description: 'Follow up message',
      subject: 'Follow up on NDA {{displayId}}',
      body: 'Hi {{companyName}},\n\nJust checking in on NDA {{displayId}}.',
      isDefault: false,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  const ndaA = buildNdaDetail({
    id: 'nda-1',
    displayId: '1001',
    companyName: 'Acme Corp',
    agencyGroup: { id: 'ag-1', name: 'Air Force' },
    subagency: { id: 'sub-1', name: 'Space Systems' },
    status: 'CREATED',
  });

  const ndaB = buildNdaDetail({
    id: 'nda-2',
    displayId: '1002',
    companyName: 'Blue Harbor',
    agencyGroup: { id: 'ag-2', name: 'Navy' },
    subagency: undefined,
    status: 'IN_REVISION',
  });

  const documents: Record<string, Document[]> = {
    [ndaA.id]: [buildDocument({ id: 'doc-1', ndaId: ndaA.id })],
    [ndaB.id]: [],
  };

  const emails: Record<string, NdaEmailSummary[]> = {
    [ndaA.id]: [],
    [ndaB.id]: [],
  };

  const managedUsers: ManagedUser[] = [
    {
      id: 'user-admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@usmax.com',
      active: true,
      roles: ['Admin'],
      agencyAccess: {
        groups: ['Air Force', 'Navy'],
        subagencies: [],
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'user-nda',
      firstName: 'Nda',
      lastName: 'User',
      email: 'user@usmax.com',
      active: true,
      roles: ['NDA User'],
      agencyAccess: {
        groups: ['Air Force'],
        subagencies: ['Space Systems'],
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  const roles: Role[] = [
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Full access',
      isSystemRole: true,
      permissions: users.admin.permissions.map((code) => ({
        id: `perm-${code}`,
        code,
        name: code,
        category: code.split(':')[0],
      })),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'role-nda',
      name: 'NDA User',
      description: 'NDA user',
      isSystemRole: true,
      permissions: users.ndaUser.permissions.map((code) => ({
        id: `perm-${code}`,
        code,
        name: code,
        category: code.split(':')[0],
      })),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'audit-1',
      action: 'nda_created',
      entityType: 'nda',
      entityId: ndaA.id,
      userId: users.admin.id,
      user: {
        id: users.admin.id,
        firstName: users.admin.firstName,
        lastName: users.admin.lastName,
        email: users.admin.email,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Playwright',
      details: { companyName: ndaA.companyName },
      createdAt: nowIso(),
    },
  ];

  const workflowGuidance: Record<string, WorkflowGuidance> = {
    [ndaA.id]: {
      nextAction: 'route_for_approval',
      nextActionLabel: 'Route for approval',
      nextActionDescription: 'Route this NDA for approval.',
      approvalRequired: true,
      canSkipApproval: false,
      approvers: ['Legal Team'],
      canUserApprove: false,
      isSelfApproval: false,
      availableActions: {
        canRouteForApproval: true,
        canSendDirectly: false,
        canSelfApprove: false,
      },
      guidanceText: 'Route this NDA for approval before sending.',
    },
    [ndaB.id]: {
      nextAction: 'send_directly',
      nextActionLabel: 'Send directly',
      nextActionDescription: 'Send this NDA directly.',
      approvalRequired: false,
      canSkipApproval: true,
      skipApprovalReason: 'Low risk',
      approvers: [],
      canUserApprove: true,
      isSelfApproval: true,
      availableActions: {
        canRouteForApproval: false,
        canSendDirectly: true,
        canSelfApprove: true,
      },
      guidanceText: 'This NDA can be sent directly.',
    },
  };

  return {
    auth: {
      isAuthenticated: false,
      currentUserKey: 'ndaUser',
      mfaAttempts: 0,
      mfaBypass: true,
      sessionExpiresAt: Date.now() + 30 * 60_000,
      csrfToken: 'csrf-token',
    },
    users,
    managedUsers,
    roles,
    agencies: {
      groups: agencies,
      subagencies,
    },
    access: {
      agencyGroups: {},
      subagencies: {},
    },
    ndas: [ndaA, ndaB],
    documents,
    emails,
    notes: {
      [ndaA.id]: [],
      [ndaB.id]: [],
    },
    auditLogs,
    workflowGuidance,
    emailTemplates,
  };
}

const jsonResponse = (route: Route, status: number, body: unknown, headers?: Record<string, string>) => {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(body),
  });
};

const emptyResponse = (route: Route, status = 204) => route.fulfill({ status });

const parseJsonBody = <T>(routeRequest: { postDataJSON?: () => T }): T | null => {
  try {
    return routeRequest.postDataJSON ? routeRequest.postDataJSON() : null;
  } catch {
    return null;
  }
};

const getCurrentUser = (state: MockState): MockUser => state.users[state.auth.currentUserKey];

const isAuthorizedForNda = (state: MockState, nda: NdaDetail) => {
  const user = getCurrentUser(state);
  return user.authorizedAgencyGroupIds.includes(nda.agencyGroup.id);
};

const buildNdaResponse = (state: MockState, nda: NdaDetail): NdaDetailResponse => {
  return {
    nda,
    documents: state.documents[nda.id] ?? [],
    emails: state.emails[nda.id] ?? [],
    auditTrail: [],
    statusHistory: [],
    statusProgression: nda.statusProgression ?? { steps: [], isTerminal: false },
    availableActions: nda.availableActions ?? {
      canEdit: true,
      canSendEmail: true,
      canUploadDocument: true,
      canChangeStatus: true,
      canDelete: false,
    },
  } as NdaDetailResponse;
};

const buildDashboard = (state: MockState) => {
  return {
    recentNdas: state.ndas.slice(0, 5).map((nda) => ({
      id: nda.id,
      displayId: nda.displayId,
      companyName: nda.companyName,
      status: nda.status,
      agencyGroupName: nda.agencyGroup.name,
      createdAt: nda.createdAt,
    })),
    itemsNeedingAttention: {
      stale: [],
      expiring: [],
      waitingOnThirdParty: [],
    },
    metrics: {
      activeNdas: state.ndas.length,
      expiringSoon: 0,
      averageCycleTimeDays: 14,
      ndasByStatus: state.ndas.reduce<Record<string, number>>((acc, nda) => {
        acc[nda.status] = (acc[nda.status] ?? 0) + 1;
        return acc;
      }, {}),
    },
    recentActivity: state.auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? '',
      description: log.action,
      user: {
        id: log.user?.id ?? 'system',
        name: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      },
    })),
  };
};

export async function setupMockApi(page: Page, state: MockState): Promise<void> {
  const context = page.context();
  await context.unroute('**/api/**');

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const currentUser = getCurrentUser(state);

    if (path === '/api/auth/me' && method === 'GET') {
      if (!state.auth.isAuthenticated) {
        return jsonResponse(route, 401, { error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
      return jsonResponse(route, 200, {
        user: currentUser,
        expiresAt: state.auth.sessionExpiresAt,
        csrfToken: state.auth.csrfToken,
      });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = parseJsonBody<{ email?: string; password?: string }>(request) ?? {};
      const email = body.email ?? '';
      const password = body.password ?? '';

      const validCredentials =
        (email === 'admin@usmax.com' && password === 'Admin123!@#$') ||
        (email === 'user@usmax.com' && password === 'Test1234!@#$') ||
        (email === 'usera@usmax.com' && password === 'Test1234!@#$') ||
        (email === 'userb@usmax.com' && password === 'Test1234!@#$');

      if (!validCredentials) {
        return jsonResponse(route, 401, { error: 'Invalid credentials' });
      }

      const matchedKey = (Object.keys(state.users) as UserKey[]).find(
        (key) => state.users[key].email === email
      );
      if (matchedKey) {
        state.auth.currentUserKey = matchedKey;
      }
      state.auth.mfaAttempts = 0;

      return jsonResponse(route, 200, {
        challengeName: 'SOFTWARE_TOKEN_MFA',
        session: 'mock-session',
      });
    }

    if (path === '/api/auth/mfa-challenge' && method === 'POST') {
      const body = parseJsonBody<{ session?: string; mfaCode?: string }>(request) ?? {};
      const mfaCode = body.mfaCode ?? '';

      if (!state.auth.mfaBypass && mfaCode !== '123456') {
        state.auth.mfaAttempts += 1;
        const attemptsRemaining = Math.max(0, 3 - state.auth.mfaAttempts);
        return jsonResponse(route, 401, {
          error: 'Invalid MFA code',
          attemptsRemaining,
        });
      }

      state.auth.isAuthenticated = true;
      state.auth.sessionExpiresAt = state.auth.sessionExpiresAt || Date.now() + 30 * 60_000;

      return jsonResponse(route, 200, {
        user: currentUser,
        expiresAt: state.auth.sessionExpiresAt,
        csrfToken: state.auth.csrfToken,
      });
    }

    if (path === '/api/auth/refresh' && method === 'POST') {
      state.auth.sessionExpiresAt = Date.now() + 30 * 60_000;
      return jsonResponse(route, 200, {
        expiresAt: state.auth.sessionExpiresAt,
        csrfToken: state.auth.csrfToken,
      });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      state.auth.isAuthenticated = false;
      return emptyResponse(route, 204);
    }

    if (path === '/api/dashboard' && method === 'GET') {
      return jsonResponse(route, 200, buildDashboard(state));
    }

    if (path === '/api/ndas' && method === 'GET') {
      const agencyGroupId = url.searchParams.get('agencyGroupId');
      const search = url.searchParams.get('search');
      const scopedNdas = state.ndas.filter((nda) => isAuthorizedForNda(state, nda));

      const filtered = scopedNdas.filter((nda) => {
        if (agencyGroupId && nda.agencyGroup.id !== agencyGroupId) return false;
        if (search) {
          const term = search.toLowerCase();
          return (
            nda.companyName.toLowerCase().includes(term) ||
            nda.displayId.toLowerCase().includes(term)
          );
        }
        return true;
      });

      return jsonResponse(route, 200, {
        ndas: filtered.map(buildNdaListItem),
        total: filtered.length,
        page: 1,
        limit: 25,
        totalPages: 1,
      });
    }

    if (path === '/api/ndas/status-info' && method === 'GET') {
      return jsonResponse(route, 200, defaultStatusInfo);
    }

    if (path === '/api/ndas/company-suggestions' && method === 'GET') {
      return jsonResponse(route, 200, {
        companies: state.ndas.map((nda) => ({ companyName: nda.companyName, count: 1 })),
      });
    }

    if (path === '/api/ndas/company-search' && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase() ?? '';
      const companies = state.ndas
        .filter((nda) => nda.companyName.toLowerCase().includes(q))
        .map((nda) => ({ name: nda.companyName, count: 1 }));
      return jsonResponse(route, 200, { companies });
    }

    if (path === '/api/ndas/company-defaults' && method === 'GET') {
      return jsonResponse(route, 200, {
        defaults: {
          companyCity: 'Washington',
          companyState: 'DC',
          stateOfIncorporation: 'DE',
          typicalNdaType: 'MUTUAL',
          typeCounts: [{ ndaType: 'MUTUAL', count: 5 }],
          defaultTemplateId: 'tmpl-1',
          defaultTemplateName: 'Default Template',
        },
      });
    }

    if (path === '/api/ndas/agency-suggestions' && method === 'GET') {
      return jsonResponse(route, 200, {
        suggestions: {
          commonCompanies: [{ companyName: 'Acme Corp', count: 3 }],
          typicalNdaType: 'MUTUAL',
          typicalPosition: 'PRIME',
          typeCounts: [{ ndaType: 'MUTUAL', count: 3 }],
          defaultTemplateId: 'tmpl-1',
          defaultTemplateName: 'Default Template',
        },
      });
    }

    if (path === '/api/ndas/agency-subagencies' && method === 'GET') {
      const agencyGroupId = url.searchParams.get('agencyGroupId') ?? '';
      const subagencies = state.agencies.subagencies[agencyGroupId] ?? [];
      return jsonResponse(route, 200, {
        subagencies: subagencies.map((sub) => ({ id: sub.id, name: sub.name, count: sub.ndaCount ?? 0 })),
      });
    }

    if (path === '/api/ndas/filter-suggestions' && method === 'GET') {
      return jsonResponse(route, 200, { values: [] });
    }

    if (path === '/api/ndas/filter-presets' && method === 'GET') {
      return jsonResponse(route, 200, { presets: [] });
    }

    if (path === '/api/rtf-templates' && method === 'GET') {
      return jsonResponse(route, 200, {
        templates: [
          {
            id: 'tmpl-1',
            name: 'Default Template',
            description: 'Default template',
            isDefault: true,
            isActive: true,
            isRecommended: true,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          },
        ],
        count: 1,
      });
    }

    if (path === '/api/email-templates' && method === 'GET') {
      const templates = state.emailTemplates.filter((template) => template.isActive);
      return jsonResponse(route, 200, {
        templates,
        count: templates.length,
      });
    }

    if (path === '/api/admin/email-templates' && method === 'GET') {
      const includeInactive = url.searchParams.get('includeInactive') === 'true';
      const templates = includeInactive
        ? state.emailTemplates
        : state.emailTemplates.filter((template) => template.isActive);
      return jsonResponse(route, 200, { templates, count: templates.length });
    }

    if (path === '/api/admin/email-templates' && method === 'POST') {
      const body = parseJsonBody<{
        name?: string;
        description?: string | null;
        subject?: string;
        body?: string;
        isDefault?: boolean;
      }>(request) ?? {};

      const newTemplate = {
        id: `email-${Date.now()}`,
        name: body.name ?? 'Untitled Template',
        description: body.description ?? null,
        subject: body.subject ?? '',
        body: body.body ?? '',
        isDefault: body.isDefault ?? false,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      if (newTemplate.isDefault) {
        state.emailTemplates = state.emailTemplates.map((template) => ({
          ...template,
          isDefault: false,
        }));
      }

      state.emailTemplates = [newTemplate, ...state.emailTemplates];
      return jsonResponse(route, 201, { template: newTemplate, message: 'Email template created successfully' });
    }

    const adminEmailDuplicateMatch = path.match(/^\/api\/admin\/email-templates\/([^/]+)\/duplicate$/);
    if (adminEmailDuplicateMatch && method === 'POST') {
      const templateId = adminEmailDuplicateMatch[1];
      const original = state.emailTemplates.find((template) => template.id === templateId);
      if (!original) {
        return jsonResponse(route, 404, { error: 'Email template not found', code: 'TEMPLATE_NOT_FOUND' });
      }

      const duplicate = {
        ...original,
        id: `email-${Date.now()}`,
        name: `${original.name} (Copy)`,
        isDefault: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      state.emailTemplates = [duplicate, ...state.emailTemplates];
      return jsonResponse(route, 200, { template: duplicate, message: 'Email template duplicated successfully' });
    }

    const adminEmailTemplateMatch = path.match(/^\/api\/admin\/email-templates\/([^/]+)$/);
    if (adminEmailTemplateMatch && method === 'PUT') {
      const templateId = adminEmailTemplateMatch[1];
      const body = parseJsonBody<{
        name?: string;
        description?: string | null;
        subject?: string;
        body?: string;
        isDefault?: boolean;
        isActive?: boolean;
      }>(request) ?? {};

      const templateIndex = state.emailTemplates.findIndex((template) => template.id === templateId);
      if (templateIndex < 0) {
        return jsonResponse(route, 404, { error: 'Email template not found', code: 'TEMPLATE_NOT_FOUND' });
      }

      if (body.isDefault) {
        state.emailTemplates = state.emailTemplates.map((template) => ({
          ...template,
          isDefault: template.id === templateId,
        }));
      }

      const existing = state.emailTemplates[templateIndex];
      const updated = {
        ...existing,
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        subject: body.subject ?? existing.subject,
        body: body.body ?? existing.body,
        isDefault: body.isDefault ?? existing.isDefault,
        isActive: body.isActive ?? existing.isActive,
        updatedAt: nowIso(),
      };

      state.emailTemplates[templateIndex] = updated;
      return jsonResponse(route, 200, { template: updated, message: 'Email template updated successfully' });
    }

    if (adminEmailTemplateMatch && method === 'DELETE') {
      const templateId = adminEmailTemplateMatch[1];
      const templateIndex = state.emailTemplates.findIndex((template) => template.id === templateId);
      if (templateIndex < 0) {
        return jsonResponse(route, 404, { error: 'Email template not found', code: 'TEMPLATE_NOT_FOUND' });
      }

      const template = state.emailTemplates[templateIndex];
      if (template.isDefault) {
        return jsonResponse(route, 400, { error: 'Cannot delete the default template', code: 'CANNOT_DELETE_DEFAULT' });
      }

      state.emailTemplates[templateIndex] = {
        ...template,
        isActive: false,
        updatedAt: nowIso(),
      };

      return jsonResponse(route, 200, { message: 'Email template deleted successfully' });
    }

    if (path === '/api/agency-groups' && method === 'GET') {
      const groups = currentUser.roles.includes('Admin')
        ? state.agencies.groups
        : state.agencies.groups.filter((group) => currentUser.authorizedAgencyGroupIds.includes(group.id));
      return jsonResponse(route, 200, {
        agencyGroups: groups,
        pagination: {
          page: 1,
          limit: 20,
          total: groups.length,
          totalPages: 1,
        },
      });
    }

    if (path === '/api/agency-groups' && method === 'POST') {
      const body = parseJsonBody<{ name?: string; code?: string; description?: string }>(request) ?? {};
      const newGroup: AgencyGroup = {
        id: `ag-${Date.now()}`,
        name: body.name ?? 'New Group',
        code: body.code ?? 'NEW',
        description: body.description ?? '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        subagencyCount: 0,
        ndaCount: 0,
      };
      state.agencies.groups.unshift(newGroup);
      state.agencies.subagencies[newGroup.id] = [];
      return jsonResponse(route, 200, { agencyGroup: newGroup });
    }

    const agencyGroupMatch = path.match(/^\/api\/agency-groups\/([^/]+)$/);
    if (agencyGroupMatch && method === 'DELETE') {
      const groupId = agencyGroupMatch[1];
      state.agencies.groups = state.agencies.groups.filter((group) => group.id !== groupId);
      delete state.agencies.subagencies[groupId];
      return emptyResponse(route, 204);
    }

    const subagencyListMatch = path.match(/^\/api\/agency-groups\/([^/]+)\/subagencies$/);
    if (subagencyListMatch && method === 'GET') {
      const groupId = subagencyListMatch[1];
      return jsonResponse(route, 200, { subagencies: state.agencies.subagencies[groupId] ?? [] });
    }

    if (subagencyListMatch && method === 'POST') {
      const groupId = subagencyListMatch[1];
      const body = parseJsonBody<{ name?: string; code?: string; description?: string }>(request) ?? {};
      const newSub: Subagency = {
        id: `sub-${Date.now()}`,
        name: body.name ?? 'New Subagency',
        code: body.code ?? 'SUB',
        description: body.description ?? '',
        agencyGroupId: groupId,
        ndaCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.agencies.subagencies[groupId] = [...(state.agencies.subagencies[groupId] ?? []), newSub];
      return jsonResponse(route, 200, { subagency: newSub });
    }

    const agencyAccessMatch = path.match(/^\/api\/agency-groups\/([^/]+)\/access$/);
    if (agencyAccessMatch && method === 'GET') {
      const groupId = agencyAccessMatch[1];
      const users = state.access.agencyGroups[groupId]?.users ?? [];
      return jsonResponse(route, 200, { users });
    }

    if (agencyAccessMatch && method === 'POST') {
      const groupId = agencyAccessMatch[1];
      const body = parseJsonBody<{ contactId?: string }>(request) ?? {};
      const contactId = body.contactId ?? `contact-${Date.now()}`;
      const name = 'Taylor Grant';
      const email = 'taylor.grant@usmax.com';
      const entry = {
        contactId,
        name,
        email,
        grantedAt: nowIso(),
        grantedBy: { id: currentUser.id, name: `${currentUser.firstName} ${currentUser.lastName}` },
      };
      const existing = state.access.agencyGroups[groupId]?.users ?? [];
      state.access.agencyGroups[groupId] = { users: [entry, ...existing] };
      return jsonResponse(route, 200, {
        message: 'Access granted',
        agencyGroupId: groupId,
        contactId,
      });
    }

    const agencyAccessRevokeMatch = path.match(/^\/api\/agency-groups\/([^/]+)\/access\/([^/]+)$/);
    if (agencyAccessRevokeMatch && method === 'DELETE') {
      const groupId = agencyAccessRevokeMatch[1];
      const contactId = agencyAccessRevokeMatch[2];
      const existing = state.access.agencyGroups[groupId]?.users ?? [];
      state.access.agencyGroups[groupId] = {
        users: existing.filter((user) => user.contactId !== contactId),
      };
      return emptyResponse(route, 204);
    }

    const subagencyAccessMatch = path.match(/^\/api\/subagencies\/([^/]+)\/access$/);
    if (subagencyAccessMatch && method === 'GET') {
      const subagencyId = subagencyAccessMatch[1];
      const users = state.access.subagencies[subagencyId]?.users ?? [];
      return jsonResponse(route, 200, { users });
    }

    if (subagencyAccessMatch && method === 'POST') {
      const subagencyId = subagencyAccessMatch[1];
      const body = parseJsonBody<{ contactId?: string }>(request) ?? {};
      const contactId = body.contactId ?? `contact-${Date.now()}`;
      const name = 'Taylor Grant';
      const email = 'taylor.grant@usmax.com';
      const entry = {
        contactId,
        name,
        email,
        accessType: 'direct' as const,
        grantedAt: nowIso(),
        grantedBy: { id: currentUser.id, name: `${currentUser.firstName} ${currentUser.lastName}` },
      };
      const existing = state.access.subagencies[subagencyId]?.users ?? [];
      state.access.subagencies[subagencyId] = { users: [entry, ...existing] };
      return jsonResponse(route, 200, {
        message: 'Access granted',
        subagencyId,
        contactId,
      });
    }

    const subagencyAccessRevokeMatch = path.match(/^\/api\/subagencies\/([^/]+)\/access\/([^/]+)$/);
    if (subagencyAccessRevokeMatch && method === 'DELETE') {
      const subagencyId = subagencyAccessRevokeMatch[1];
      const contactId = subagencyAccessRevokeMatch[2];
      const existing = state.access.subagencies[subagencyId]?.users ?? [];
      state.access.subagencies[subagencyId] = {
        users: existing.filter((user) => user.contactId !== contactId),
      };
      return emptyResponse(route, 204);
    }

    if (path === '/api/contacts/search' && method === 'GET') {
      const q = url.searchParams.get('q') ?? '';
      if (q.length < 3) {
        return jsonResponse(route, 200, { contacts: [] });
      }
      return jsonResponse(route, 200, {
        contacts: [
          {
            id: 'contact-1',
            firstName: 'Taylor',
            lastName: 'Grant',
            email: 'taylor.grant@usmax.com',
            roles: ['NDA User'],
            jobTitle: 'Analyst',
          },
        ],
      });
    }

    if (path === '/api/contacts/external' && method === 'POST') {
      const body = parseJsonBody<{
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        fax?: string;
      }>(request);
      const contact: Contact = {
        id: `contact-${Date.now()}`,
        firstName: body?.firstName ?? null,
        lastName: body?.lastName ?? null,
        email: body?.email ?? 'external@company.com',
        workPhone: body?.phone ?? null,
        cellPhone: null,
        active: true,
        jobTitle: null,
        type: 'external',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } as Contact;
      return jsonResponse(route, 200, { contact });
    }

    if (path === '/api/contacts/external/search' && method === 'GET') {
      return jsonResponse(route, 200, { contacts: [] });
    }

    if (path === '/api/contacts/internal-users/search' && method === 'GET') {
      return jsonResponse(route, 200, { users: [] });
    }

    const ndaDetailMatch = path.match(/^\/api\/ndas\/([^/]+)$/);
    if (ndaDetailMatch && method === 'GET') {
      const ndaId = ndaDetailMatch[1];
      const nda = state.ndas.find((item) => item.id === ndaId);
      if (!nda || !isAuthorizedForNda(state, nda)) {
        return jsonResponse(route, 404, { error: 'NDA not found', code: 'NOT_FOUND' });
      }
      const detail = buildNdaResponse(state, nda);
      return jsonResponse(route, 200, detail);
    }

    if (ndaDetailMatch && method === 'PUT') {
      const ndaId = ndaDetailMatch[1];
      const body = parseJsonBody<Record<string, unknown>>(request) ?? {};
      const ndaIndex = state.ndas.findIndex((item) => item.id === ndaId);
      const nda = ndaIndex === -1 ? null : state.ndas[ndaIndex];
      if (!nda || !isAuthorizedForNda(state, nda)) {
        return jsonResponse(route, 404, { error: 'NDA not found' });
      }
      state.ndas[ndaIndex] = {
        ...nda,
        ...body,
        updatedAt: nowIso(),
      } as NdaDetail;
      return jsonResponse(route, 200, { message: 'NDA updated', nda: state.ndas[ndaIndex] });
    }

    if (ndaDetailMatch && method === 'POST') {
      const ndaId = ndaDetailMatch[1];
      if (path.endsWith('/clone')) {
        const source = state.ndas.find((nda) => nda.id === ndaId);
        if (!source || !isAuthorizedForNda(state, source)) {
          return jsonResponse(route, 404, { error: 'NDA not found' });
        }
        const cloned = buildNdaDetail({
          ...source,
          id: `nda-${Date.now()}`,
          displayId: String(1000 + state.ndas.length + 1),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          status: 'CREATED',
        });
        state.ndas.push(cloned);
        return jsonResponse(route, 200, { message: 'NDA cloned', nda: cloned });
      }
    }

    const ndaStatusMatch = path.match(/^\/api\/ndas\/([^/]+)\/status$/);
    if (ndaStatusMatch && method === 'PATCH') {
      const ndaId = ndaStatusMatch[1];
      const body = parseJsonBody<{ status?: NdaStatus }>(request) ?? {};
      const nda = state.ndas.find((item) => item.id === ndaId);
      if (!nda || !isAuthorizedForNda(state, nda)) {
        return jsonResponse(route, 404, { error: 'NDA not found' });
      }
      nda.status = body.status ?? nda.status;
      nda.updatedAt = nowIso();
      return jsonResponse(route, 200, { message: 'Status updated', nda });
    }

    if (path === '/api/ndas' && method === 'POST') {
      const body = parseJsonBody<Record<string, unknown>>(request) ?? {};
      const newNda = buildNdaDetail({
        id: `nda-${Date.now()}`,
        displayId: String(1000 + state.ndas.length + 1),
        companyName: String(body.companyName ?? 'New NDA'),
        agencyGroup: state.agencies.groups.find((group) => group.id === body.agencyGroupId) ?? {
          id: 'ag-1',
          name: 'Air Force',
        },
        abbreviatedName: String(body.abbreviatedName ?? 'New NDA'),
        authorizedPurpose: String(body.authorizedPurpose ?? 'Purpose'),
        status: 'CREATED',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      state.ndas.push(newNda);
      state.documents[newNda.id] = [];
      state.emails[newNda.id] = [];
      state.notes[newNda.id] = [];
      return jsonResponse(route, 200, { message: 'NDA created', nda: newNda });
    }

    const ndaPreviewMatch = path.match(/^\/api\/ndas\/([^/]+)\/preview-document$/);
    if (ndaPreviewMatch && method === 'POST') {
      const ndaId = ndaPreviewMatch[1];
      return jsonResponse(route, 200, {
        message: 'Preview generated',
        preview: {
          previewUrl: `/api/mock-preview/${ndaId}`,
          htmlContent: '<p>Preview</p>',
          mergedFields: {},
          templateUsed: { id: 'tmpl-1', name: 'Default Template' },
        },
      });
    }

    const ndaGenerateMatch = path.match(/^\/api\/ndas\/([^/]+)\/generate-document$/);
    if (ndaGenerateMatch && method === 'POST') {
      const ndaId = ndaGenerateMatch[1];
      const newDoc = buildDocument({
        id: `doc-${Date.now()}`,
        ndaId,
        filename: `nda-${ndaId}.rtf`,
        documentType: 'GENERATED',
      });
      state.documents[ndaId] = [...(state.documents[ndaId] ?? []), newDoc];
      return jsonResponse(route, 200, {
        message: 'Generated',
        document: {
          documentId: newDoc.id,
          filename: newDoc.filename,
          s3Key: 'mock',
        },
      });
    }

    const ndaDocumentsMatch = path.match(/^\/api\/ndas\/([^/]+)\/documents$/);
    if (ndaDocumentsMatch && method === 'GET') {
      const ndaId = ndaDocumentsMatch[1];
      return jsonResponse(route, 200, { documents: state.documents[ndaId] ?? [] });
    }

    const ndaUploadMatch = path.match(/^\/api\/ndas\/([^/]+)\/documents\/upload$/);
    if (ndaUploadMatch && method === 'POST') {
      const ndaId = ndaUploadMatch[1];
      const newDoc = buildDocument({
        id: `doc-${Date.now()}`,
        ndaId,
        filename: 'uploaded-document.rtf',
        documentType: 'UPLOADED',
      });
      state.documents[ndaId] = [...(state.documents[ndaId] ?? []), newDoc];
      return jsonResponse(route, 200, {
        message: 'Uploaded',
        document: newDoc,
      });
    }

    const ndaDocDownloadMatch = path.match(/^\/api\/ndas\/documents\/([^/]+)\/download-url$/);
    if (ndaDocDownloadMatch && method === 'GET') {
      const docId = ndaDocDownloadMatch[1];
      return jsonResponse(route, 200, {
        downloadUrl: `/api/mock-download/${docId}`,
        filename: `document-${docId}.rtf`,
      });
    }

    const ndaEditContentMatch = path.match(/^\/api\/ndas\/([^/]+)\/documents\/([^/]+)\/edit-content$/);
    if (ndaEditContentMatch && method === 'GET') {
      return jsonResponse(route, 200, { htmlContent: '<p>Editable content</p>' });
    }

    if (path.startsWith('/api/mock-download/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/rtf',
          'Content-Disposition': 'attachment; filename="mock-document.rtf"',
        },
        body: '{\\rtf1 Mock Document}',
      });
    }

    if (path.startsWith('/api/mock-preview/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: '<html><body>Preview</body></html>',
      });
    }

    const ndaEmailPreviewMatch = path.match(/^\/api\/ndas\/([^/]+)\/email-preview/);
    if (ndaEmailPreviewMatch && method === 'GET') {
      const ndaId = ndaEmailPreviewMatch[1];
      const attachments = (state.documents[ndaId] ?? []).map((doc) => ({
        filename: doc.filename,
        documentId: doc.id,
      }));
      return jsonResponse(route, 200, {
        preview: {
          subject: `NDA for ${ndaId}`,
          toRecipients: [state.ndas.find((item) => item.id === ndaId)?.relationshipPoc.email ?? 'contact@example.com'],
          ccRecipients: [],
          bccRecipients: [],
          body: 'Please review the NDA.',
          attachments,
          templateId: 'email-1',
          templateName: 'Default Email Template',
        },
      });
    }

    const ndaSendEmailMatch = path.match(/^\/api\/ndas\/([^/]+)\/send-email$/);
    if (ndaSendEmailMatch && method === 'POST') {
      const ndaId = ndaSendEmailMatch[1];
      const newEmail = buildEmailSummary({
        subject: `NDA for ${ndaId}`,
        toRecipients: [state.ndas.find((item) => item.id === ndaId)?.relationshipPoc.email ?? 'contact@example.com'],
      });
      state.emails[ndaId] = [...(state.emails[ndaId] ?? []), newEmail];
      return jsonResponse(route, 200, { emailId: newEmail.id, status: 'SENT' });
    }

    const ndaAuditMatch = path.match(/^\/api\/ndas\/([^/]+)\/audit-trail$/);
    if (ndaAuditMatch && method === 'GET') {
      return jsonResponse(route, 200, {
        nda: { id: ndaAuditMatch[1], displayId: '1001', companyName: 'Acme Corp' },
        timeline: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      });
    }

    const ndaSubscribersMatch = path.match(/^\/api\/ndas\/([^/]+)\/subscribers$/);
    if (ndaSubscribersMatch && method === 'GET') {
      return jsonResponse(route, 200, { subscribers: [] });
    }

    const ndaNotesMatch = path.match(/^\/api\/ndas\/([^/]+)\/notes$/);
    if (ndaNotesMatch && method === 'GET') {
      const ndaId = ndaNotesMatch[1];
      return jsonResponse(route, 200, { notes: state.notes[ndaId] ?? [] });
    }

    if (ndaNotesMatch && method === 'POST') {
      const ndaId = ndaNotesMatch[1];
      const body = parseJsonBody<{ noteText?: string }>(request) ?? {};
      const note: InternalNote = {
        id: `note-${Date.now()}`,
        ndaId,
        userId: currentUser.id,
        noteText: body.noteText ?? '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        user: {
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
        },
      };
      state.notes[ndaId] = [...(state.notes[ndaId] ?? []), note];
      return jsonResponse(route, 200, { note });
    }

    const ndaNotesUpdateMatch = path.match(/^\/api\/ndas\/([^/]+)\/notes\/([^/]+)$/);
    if (ndaNotesUpdateMatch && method === 'PUT') {
      return jsonResponse(route, 200, { note: state.notes[ndaNotesUpdateMatch[1]]?.[0] ?? null });
    }

    if (ndaNotesUpdateMatch && method === 'DELETE') {
      return jsonResponse(route, 200, { message: 'Deleted' });
    }

    const ndaWorkflowMatch = path.match(/^\/api\/ndas\/([^/]+)\/workflow-guidance$/);
    if (ndaWorkflowMatch && method === 'GET') {
      const ndaId = ndaWorkflowMatch[1];
      return jsonResponse(route, 200, { guidance: state.workflowGuidance[ndaId] });
    }

    if (path === '/api/users' && method === 'GET') {
      return jsonResponse(route, 200, {
        users: state.managedUsers,
        pagination: { page: 1, limit: 20, total: state.managedUsers.length, totalPages: 1 },
      });
    }

    if (path === '/api/users/search' && method === 'GET') {
      const query = url.searchParams.get('q')?.toLowerCase() ?? '';
      const matches: UserSearchResult[] = state.managedUsers
        .filter((user) => user.email.toLowerCase().includes(query) || user.firstName.toLowerCase().includes(query))
        .map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          jobTitle: user.jobTitle ?? null,
          active: user.active,
          roles: user.roles,
        }));
      return jsonResponse(route, 200, { users: matches });
    }

    if (path === '/api/users' && method === 'POST') {
      const body = parseJsonBody<{ firstName?: string; lastName?: string; email?: string }>(request) ?? {};
      const newUser: ManagedUser = {
        id: `user-${Date.now()}`,
        firstName: body.firstName ?? 'New',
        lastName: body.lastName ?? 'User',
        email: body.email ?? 'new@usmax.com',
        active: true,
        roles: [],
        agencyAccess: { groups: [], subagencies: [] },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.managedUsers = [newUser, ...state.managedUsers];
      return jsonResponse(route, 200, { message: 'User created', user: newUser });
    }

    const usersMatch = path.match(/^\/api\/users\/([^/]+)$/);
    if (usersMatch && method === 'PUT') {
      const userId = usersMatch[1];
      const body = parseJsonBody<Record<string, unknown>>(request) ?? {};
      const userIndex = state.managedUsers.findIndex((user) => user.id === userId);
      if (userIndex === -1) {
        return jsonResponse(route, 404, { error: 'User not found' });
      }
      const updatedUser: ManagedUser = {
        ...state.managedUsers[userIndex],
        ...body,
        updatedAt: nowIso(),
      };
      state.managedUsers[userIndex] = updatedUser;
      return jsonResponse(route, 200, { message: 'User updated', user: updatedUser });
    }
    if (usersMatch && method === 'DELETE') {
      const userId = usersMatch[1];
      state.managedUsers = state.managedUsers.map((user) =>
        user.id === userId ? { ...user, active: false, updatedAt: nowIso() } : user
      );
      return jsonResponse(route, 200, { message: 'User deactivated' });
    }

    if (path === '/api/admin/roles' && method === 'GET') {
      return jsonResponse(route, 200, { roles: state.roles });
    }

    const adminRolesMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/roles$/);
    if (adminRolesMatch && method === 'GET') {
      const userId = adminRolesMatch[1];
      const user = state.managedUsers.find((item) => item.id === userId);
      return jsonResponse(route, 200, {
        userId,
        email: user?.email ?? 'unknown',
        name: user ? `${user.firstName} ${user.lastName}` : null,
        roles: state.roles
          .filter((role) => user?.roles.includes(role.name))
          .map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystemRole: role.isSystemRole,
            grantedAt: nowIso(),
            permissions: role.permissions.map((perm) => ({ code: perm.code, name: perm.name })),
          })),
      });
    }

    if (adminRolesMatch && method === 'POST') {
      const userId = adminRolesMatch[1];
      const body = parseJsonBody<{ roleId?: string }>(request) ?? {};
      const role = state.roles.find((item) => item.id === body.roleId);
      if (role) {
        state.managedUsers = state.managedUsers.map((user) =>
          user.id === userId ? { ...user, roles: Array.from(new Set([...user.roles, role.name])) } : user
        );
      }
      return jsonResponse(route, 200, {
        message: 'Role assigned',
        userId,
        roleId: body.roleId,
        roleName: role?.name ?? 'Role',
      });
    }

    const adminRoleRemoveMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/roles\/([^/]+)$/);
    if (adminRoleRemoveMatch && method === 'DELETE') {
      return jsonResponse(route, 200, {
        message: 'Role removed',
        userId: adminRoleRemoveMatch[1],
        roleId: adminRoleRemoveMatch[2],
        roleName: 'Role',
      });
    }

    if (path === '/api/admin/audit-logs' && method === 'GET') {
      return jsonResponse(route, 200, {
        auditLogs: state.auditLogs,
        pagination: { page: 1, limit: 20, total: state.auditLogs.length, totalPages: 1 },
        filters: {
          availableActions: ['nda_created'],
          availableEntityTypes: ['nda'],
        },
      });
    }

    if (path.startsWith('/api/admin/audit-logs/export') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
        body: 'id,action\n1,nda_created\n',
      });
    }

    return jsonResponse(route, 404, {
      error: 'Unhandled mock route',
      code: 'UNMOCKED_ENDPOINT',
      path,
      method,
    });
  });
}
