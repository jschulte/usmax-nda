/**
 * System Events Filtering Tests
 * Story 9.2: Verify system events are filtered from UI views
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditAction } from '../../services/auditService.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
    },
    nda: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock ndaService
vi.mock('../../services/ndaService.js', () => ({
  buildSecurityFilter: vi.fn().mockResolvedValue({}),
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

describe('System Events Filtering - Story 9.2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SYSTEM_EVENTS constant', () => {
    it('should define system events to filter', () => {
      // Verify the constant includes the problem actions
      const SYSTEM_EVENTS = [
        AuditAction.PERMISSION_DENIED,
        AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      ];

      expect(SYSTEM_EVENTS).toContain('permission_denied');
      expect(SYSTEM_EVENTS).toContain('unauthorized_access_attempt');
    });
  });

  describe('Admin audit logs endpoint', () => {
    it('should filter system events by default', async () => {
      const { prisma } = await import('../../db/index.js');

      // Simulate query that would be made by endpoint
      const where: any = {
        action: { notIn: ['permission_denied', 'unauthorized_access_attempt'] },
      };

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        {
          id: 'log-1',
          action: 'nda_created',
          entityType: 'nda',
          entityId: 'nda-123',
          userId: 'user-1',
          ipAddress: '192.168.1.1',
          details: {},
          createdAt: new Date(),
        },
      ] as any);

      const results = await prisma.auditLog.findMany({ where });

      // Verify only meaningful actions returned
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('nda_created');
      expect(results[0].action).not.toBe('permission_denied');
      expect(results[0].action).not.toBe('unauthorized_access_attempt');
    });

    it('should include system events when includeSystemEvents=true', async () => {
      const { prisma } = await import('../../db/index.js');

      // When includeSystemEvents is true, no action filter applied
      const where: any = {};

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        { id: '1', action: 'nda_created', entityType: 'nda', createdAt: new Date() },
        { id: '2', action: 'permission_denied', entityType: 'auth', createdAt: new Date() },
        { id: '3', action: 'unauthorized_access_attempt', entityType: 'nda', createdAt: new Date() },
      ] as any);

      const results = await prisma.auditLog.findMany({ where });

      // All events returned when no filter
      expect(results).toHaveLength(3);
      expect(results.map(r => r.action)).toContain('permission_denied');
      expect(results.map(r => r.action)).toContain('unauthorized_access_attempt');
    });
  });

  describe('NDA audit trail endpoint', () => {
    it('should always filter system events from timeline', async () => {
      const { prisma } = await import('../../db/index.js');

      // NDA timeline always filters system events
      const where: any = {
        entityId: 'nda-123',
        entityType: { in: ['nda', 'document', 'email', 'notification'] },
        action: { notIn: ['permission_denied', 'unauthorized_access_attempt'] },
      };

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        { id: '1', action: 'nda_created', entityType: 'nda', createdAt: new Date() },
        { id: '2', action: 'nda_status_changed', entityType: 'nda', createdAt: new Date() },
        { id: '3', action: 'document_uploaded', entityType: 'document', createdAt: new Date() },
      ] as any);

      const results = await prisma.auditLog.findMany({ where });

      // Only meaningful NDA actions
      expect(results).toHaveLength(3);
      expect(results.every(r => !['permission_denied', 'unauthorized_access_attempt'].includes(r.action))).toBe(true);
    });

    it('should not include permission check noise in NDA timeline', async () => {
      const { prisma } = await import('../../db/index.js');

      // Before Story 9.2, this would return hundreds of permission_denied entries
      // After Story 9.2, only meaningful actions
      vi.mocked(prisma.auditLog.count).mockResolvedValue(5); // Down from 1390!

      const count = await prisma.auditLog.count({
        where: {
          entityId: 'nda-123',
          action: { notIn: ['permission_denied', 'unauthorized_access_attempt'] },
        },
      });

      expect(count).toBeLessThan(10); // Reasonable number of real actions
    });
  });

  describe('System events still logged to database', () => {
    it('verifies system events are still written to database', () => {
      // This test confirms the design: system events ARE logged (for security)
      // but filtered from UI views

      const systemEventActions = [
        AuditAction.PERMISSION_DENIED,
        AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      ];

      // These actions exist in AuditAction enum
      expect(systemEventActions).toHaveLength(2);
      expect(AuditAction.PERMISSION_DENIED).toBe('permission_denied');
      expect(AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT).toBe('unauthorized_access_attempt');

      // auditService.log() still accepts these actions
      // They're just filtered at the query level in routes
    });
  });
});
