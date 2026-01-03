/**
 * Version Number Helper Tests
 * Story 4.6: Document Metadata Tracking
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
  prisma: {
    document: {
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from '../../db/index.js';
import { getNextVersionNumber } from '../versionNumberHelper.js';

describe('getNextVersionNumber', () => {
  it('returns 1 when no documents exist', async () => {
    vi.mocked(prisma.document.aggregate).mockResolvedValue({
      _max: { versionNumber: null },
    } as any);

    await expect(getNextVersionNumber('nda-1')).resolves.toBe(1);
  });

  it('returns max version + 1', async () => {
    vi.mocked(prisma.document.aggregate).mockResolvedValue({
      _max: { versionNumber: 4 },
    } as any);

    await expect(getNextVersionNumber('nda-1')).resolves.toBe(5);
  });
});
