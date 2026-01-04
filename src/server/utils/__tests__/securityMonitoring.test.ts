/**
 * Security Monitoring Utilities Tests
 * Story 6.4: Login Attempt Tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Prisma } from '../../../generated/prisma/index.js';
import {
  getFailedLoginsByIp,
  getFailedLoginsByEmail,
  getRecentFailedLogins,
  shouldBlockIp,
} from '../securityMonitoring.js';

// Mock Prisma
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

describe('Security Monitoring Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFailedLoginsByIp', () => {
    it('should count failed login attempts from an IP', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

      const count = await getFailedLoginsByIp('192.168.1.100');

      expect(count).toBe(5);
      expect(prisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: ['login_failed', 'mfa_failed'] },
            ipAddress: '192.168.1.100',
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
    });

    it('should support custom time window', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(3);

      const customDate = new Date('2024-01-01');
      const count = await getFailedLoginsByIp('192.168.1.100', customDate);

      expect(count).toBe(3);
      expect(prisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: customDate },
          }),
        })
      );
    });
  });

  describe('getFailedLoginsByEmail', () => {
    it('should count failed login attempts for an email', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(7);

      const count = await getFailedLoginsByEmail('admin@usmax.com');

      expect(count).toBe(7);
      expect(prisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: ['login_failed', 'mfa_failed'] },
            details: {
              path: ['email'],
              equals: 'admin@usmax.com',
            },
          }),
        })
      );
    });
  });

  describe('getRecentFailedLogins', () => {
    it('should return recent failed login attempts', async () => {
      const { prisma } = await import('../../db/index.js');

      type AuditLogSelection = {
        id: string;
        action: string;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        details: Prisma.JsonValue | null;
      };

      const mockEntries: AuditLogSelection[] = [
        {
          id: 'log-1',
          action: 'login_failed',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          details: { email: 'admin@usmax.com', reason: 'invalid_credentials' },
        },
        {
          id: 'log-2',
          action: 'mfa_failed',
          createdAt: new Date('2024-01-15T09:00:00Z'),
          ipAddress: '192.168.1.101',
          userAgent: 'Chrome/120',
          details: { email: 'test@usmax.com', reason: 'invalid_mfa', attemptsRemaining: 2 },
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockEntries);

      const results = await getRecentFailedLogins(50);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'log-1',
        action: 'login_failed',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        email: 'admin@usmax.com',
        reason: 'invalid_credentials',
        attemptsRemaining: undefined,
      });
      expect(results[1].attemptsRemaining).toBe(2);
    });

    it('should clamp limit to a safe range', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await getRecentFailedLogins(-10);
      await getRecentFailedLogins(9999);

      const calls = vi.mocked(prisma.auditLog.findMany).mock.calls;
      expect(calls[0][0]).toEqual(expect.objectContaining({ take: 1 }));
      expect(calls[1][0]).toEqual(expect.objectContaining({ take: 500 }));
    });
  });

  describe('shouldBlockIp', () => {
    it('should return true if failures exceed threshold', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(15);

      const shouldBlock = await shouldBlockIp('192.168.1.100', 10);

      expect(shouldBlock).toBe(true);
    });

    it('should return false if failures below threshold', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

      const shouldBlock = await shouldBlockIp('192.168.1.100', 10);

      expect(shouldBlock).toBe(false);
    });

    it('should support custom threshold and window', async () => {
      const { prisma } = await import('../../db/index.js');

      vi.mocked(prisma.auditLog.count).mockResolvedValue(8);

      const shouldBlock = await shouldBlockIp('192.168.1.100', 5, 30);

      expect(shouldBlock).toBe(true);
      expect(prisma.auditLog.count).toHaveBeenCalled();
    });
  });
});
