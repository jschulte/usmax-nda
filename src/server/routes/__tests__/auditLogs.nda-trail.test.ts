/**
 * NDA Audit Trail Viewer Tests
 * Story 6.5: Verify NDA audit trail endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { Prisma } from '../../../generated/prisma/index.js';

// Mock Prisma
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    nda: {
      findFirst: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

// Mock ndaService
vi.mock('../../services/ndaService.js', () => ({
  buildSecurityFilter: vi.fn(),
}));

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: { userContext?: Record<string, unknown> }, _res: unknown, next: () => void) => {
    req.userContext = {
      id: 'user-1',
      contactId: 'contact-456',
      email: 'test@usmax.com',
      name: 'Test User',
      roles: ['NDA User'],
      permissions: new Set(['nda:view', 'nda:create', 'nda:update']),
      authorizedAgencyGroups: ['group-1'],
      authorizedSubagencies: ['sub-1'],
    };
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAnyPermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock auditService
vi.mock('../../services/auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/auditService.js')>(
    '../../services/auditService.js'
  );
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('NDA Audit Trail Viewer', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(cookieParser());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const loadRouter = async () => {
    const { default: auditLogsRouter } = await import('../auditLogs.js');
    app.use('/api', auditLogsRouter);
  };

  type AuditLogSelection = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string | null;
    ipAddress: string | null;
    details: Prisma.JsonValue | null;
    createdAt: Date;
  };

  it('returns audit trail with metadata and relative time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

    const { prisma } = await import('../../db/index.js');
    const { buildSecurityFilter } = await import('../../services/ndaService.js');

    await loadRouter();

    vi.mocked(buildSecurityFilter).mockResolvedValue({});

    const mockNda = {
      id: 'nda-123',
      displayId: 'NDA-2024-001',
      companyName: 'ACME Corp',
    };

    const mockAuditLogs: AuditLogSelection[] = [
      {
        id: 'log-1',
        action: 'nda_status_changed',
        entityType: 'nda',
        entityId: 'nda-123',
        userId: 'contact-456',
        ipAddress: '192.168.1.1',
        details: { previousStatus: 'Created', newStatus: 'Emailed' },
        createdAt: new Date('2024-01-15T11:55:00Z'),
      },
      {
        id: 'log-2',
        action: 'document_uploaded',
        entityType: 'document',
        entityId: 'nda-123',
        userId: null,
        ipAddress: '192.168.1.1',
        details: { filename: 'nda_v1.rtf' },
        createdAt: new Date('2024-01-15T11:40:00Z'),
      },
    ];

    const mockUsers = [
      {
        id: 'contact-456',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@usmax.com',
      },
    ];

    vi.mocked(prisma.nda.findFirst).mockResolvedValue(mockNda);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(2);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockAuditLogs);
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockUsers);

    const response = await request(app).get('/api/ndas/nda-123/audit-trail');

    expect(response.status).toBe(200);
    expect(response.body.nda).toEqual({
      id: 'nda-123',
      displayId: 'NDA-2024-001',
      companyName: 'ACME Corp',
    });

    expect(response.body.timeline).toHaveLength(2);
    expect(response.body.timeline[0]).toEqual(
      expect.objectContaining({
        action: 'nda_status_changed',
        label: 'Status Changed',
        icon: 'arrow-right',
        color: 'orange',
        relativeTime: '5 minutes ago',
        description: 'Status changed from "Created" to "Emailed"',
        user: expect.objectContaining({
          name: 'John Doe',
        }),
      })
    );

    expect(response.body.timeline[1]).toEqual(
      expect.objectContaining({
        action: 'document_uploaded',
        label: 'Document Uploaded',
        icon: 'upload',
        color: 'teal',
        user: expect.objectContaining({
          name: 'System',
        }),
      })
    );
  });

  it('returns 404 when NDA is not accessible', async () => {
    const { prisma } = await import('../../db/index.js');
    const { buildSecurityFilter } = await import('../../services/ndaService.js');

    await loadRouter();

    vi.mocked(buildSecurityFilter).mockResolvedValue({ subagencyId: { in: ['other-sub'] } });
    vi.mocked(prisma.nda.findFirst).mockResolvedValue(null);

    const response = await request(app).get('/api/ndas/nda-404/audit-trail');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NDA_NOT_FOUND');
  });

  it('supports action type filtering', async () => {
    const { prisma } = await import('../../db/index.js');
    const { buildSecurityFilter } = await import('../../services/ndaService.js');

    await loadRouter();

    vi.mocked(buildSecurityFilter).mockResolvedValue({});
    vi.mocked(prisma.nda.findFirst).mockResolvedValue({
      id: 'nda-123',
      displayId: 'NDA-2024-001',
      companyName: 'ACME Corp',
    });
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

    const response = await request(app)
      .get('/api/ndas/nda-123/audit-trail')
      .query({ actionTypes: 'nda_status_changed,document_uploaded' });

    expect(response.status).toBe(200);

    const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0][0];
    expect(call.where.action.in).toEqual(['nda_status_changed', 'document_uploaded']);
    expect(call.where.action.notIn).toBeDefined();
  });

  it('applies pagination parameters', async () => {
    const { prisma } = await import('../../db/index.js');
    const { buildSecurityFilter } = await import('../../services/ndaService.js');

    await loadRouter();

    vi.mocked(buildSecurityFilter).mockResolvedValue({});
    vi.mocked(prisma.nda.findFirst).mockResolvedValue({
      id: 'nda-123',
      displayId: 'NDA-2024-001',
      companyName: 'ACME Corp',
    });
    vi.mocked(prisma.auditLog.count).mockResolvedValue(25);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

    const response = await request(app)
      .get('/api/ndas/nda-123/audit-trail')
      .query({ page: '2', limit: '10' });

    expect(response.status).toBe(200);
    const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0][0];
    expect(call.skip).toBe(10);
    expect(call.take).toBe(10);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 2,
        limit: 10,
        total: 25,
      })
    );
  });
});
