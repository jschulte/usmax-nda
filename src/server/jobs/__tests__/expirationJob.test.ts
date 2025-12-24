/**
 * Story 10.19: Expiration Job Tests
 * Tests for auto-expiration background job
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expireNdas } from '../expirationJob';
import { prisma } from '../../db/index';
import type { NdaStatus } from '@prisma/client';

// Mock changeNdaStatus
vi.mock('../../services/ndaService', () => ({
  changeNdaStatus: vi.fn().mockResolvedValue({ id: 'nda-1', status: 'EXPIRED' }),
}));

describe('Expiration Job', () => {
  describe('expireNdas', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('finds and expires NDAs past expiration date', async () => {
      // Mock NDAs with past expiration
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([
        {
          id: 'nda-1',
          displayId: 1001,
          companyName: 'TechCorp',
          expirationDate: pastDate,
          createdById: 'user-1',
        } as any,
      ]);

      const count = await expireNdas();

      expect(count).toBe(1);
      expect(prisma.nda.findMany).toHaveBeenCalledWith({
        where: {
          expirationDate: { lte: expect.any(Date) },
          status: { not: 'EXPIRED' },
        },
        select: expect.any(Object),
      });
    });

    it('skips NDAs already EXPIRED', async () => {
      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([]);

      const count = await expireNdas();

      expect(count).toBe(0);
    });

    it('returns 0 when no NDAs need expiration', async () => {
      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([]);

      const count = await expireNdas();

      expect(count).toBe(0);
    });

    it('handles multiple expired NDAs', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([
        { id: 'nda-1', displayId: 1001, companyName: 'Corp1', expirationDate: pastDate, createdById: 'user-1' },
        { id: 'nda-2', displayId: 1002, companyName: 'Corp2', expirationDate: pastDate, createdById: 'user-2' },
        { id: 'nda-3', displayId: 1003, companyName: 'Corp3', expirationDate: pastDate, createdById: 'user-3' },
      ] as any);

      const count = await expireNdas();

      expect(count).toBe(3);
    });

    it('continues processing if one NDA fails', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([
        { id: 'nda-1', displayId: 1001, companyName: 'Corp1', expirationDate: pastDate, createdById: 'user-1' },
        { id: 'nda-2', displayId: 1002, companyName: 'Corp2', expirationDate: pastDate, createdById: 'user-2' },
      ] as any);

      const { changeNdaStatus } = await import('../../services/ndaService');
      vi.mocked(changeNdaStatus)
        .mockRejectedValueOnce(new Error('Status change failed'))
        .mockResolvedValueOnce({ id: 'nda-2', status: 'EXPIRED' } as any);

      const count = await expireNdas();

      // Should still return 2 even though one failed
      expect(count).toBe(2);
    });

    it('creates system user context with correct permissions', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      vi.spyOn(prisma.nda, 'findMany').mockResolvedValue([
        { id: 'nda-1', displayId: 1001, companyName: 'Corp', expirationDate: pastDate, createdById: 'user-1' } as any,
      ]);

      const { changeNdaStatus } = await import('../../services/ndaService');

      await expireNdas();

      // Verify system user context was used
      expect(changeNdaStatus).toHaveBeenCalledWith(
        'nda-1',
        'EXPIRED',
        expect.objectContaining({
          id: 'system',
          email: 'system@usmax.com',
          contactId: 'system',
          permissions: expect.any(Set),
        }),
        expect.objectContaining({
          ipAddress: 'system',
          userAgent: 'auto-expiration-job',
        })
      );
    });
  });
});
