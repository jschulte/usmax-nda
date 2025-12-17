/**
 * Agency Suggestions Service Tests
 * Story 3.4: Agency-First Entry Path with Suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCommonCompanies,
  getTypicalPosition,
  getAgencySuggestions,
  getCommonSubagencies,
} from '../agencySuggestionsService.js';
import type { UserContext } from '../../middleware/attachUserContext.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  default: {
    nda: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '../../db/index.js';

const mockPrisma = prisma as any;

describe('agencySuggestionsService', () => {
  // Sample user context
  const mockUserContext: UserContext = {
    id: 'user-1',
    email: 'test@example.com',
    contactId: 'contact-1',
    name: 'Test User',
    roles: ['nda_user'],
    permissions: new Set(['nda:create', 'nda:view', 'nda:update']),
    authorizedAgencyGroups: ['agency-dod', 'agency-nasa'],
    authorizedSubagencies: ['sub-army'],
  };

  // Admin context
  const adminContext: UserContext = {
    ...mockUserContext,
    roles: ['admin'],
    permissions: new Set(['admin:bypass']),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommonCompanies', () => {
    it('returns top companies sorted by count', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'Lockheed Martin' },
        { companyName: 'Lockheed Martin' },
        { companyName: 'Lockheed Martin' },
        { companyName: 'Boeing' },
        { companyName: 'Boeing' },
        { companyName: 'Northrop Grumman' },
        { companyName: 'Raytheon' },
        { companyName: 'General Dynamics' },
      ]);

      const result = await getCommonCompanies('agency-dod', mockUserContext);

      expect(result).toHaveLength(5);
      expect(result[0].companyName).toBe('Lockheed Martin');
      expect(result[0].count).toBe(3);
      expect(result[1].companyName).toBe('Boeing');
      expect(result[1].count).toBe(2);
    });

    it('respects limit parameter', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'Company1' },
        { companyName: 'Company2' },
        { companyName: 'Company3' },
      ]);

      const result = await getCommonCompanies('agency-dod', mockUserContext, 2);

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no NDAs found', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const result = await getCommonCompanies('agency-dod', mockUserContext);

      expect(result).toEqual([]);
    });

    it('applies security filter for non-admin users', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getCommonCompanies('agency-dod', mockUserContext);

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { agencyGroupId: { in: mockUserContext.authorizedAgencyGroups } },
                  { subagencyId: { in: mockUserContext.authorizedSubagencies } },
                ],
              }),
            ]),
          }),
        })
      );
    });

    it('admin bypasses security filter', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getCommonCompanies('agency-dod', adminContext);

      const call = mockPrisma.nda.findMany.mock.calls[0][0];
      expect(call.where.AND[0]).toEqual({}); // Empty security filter
    });
  });

  describe('getTypicalPosition', () => {
    it('returns most common position', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { usMaxPosition: 'PRIME' },
        { usMaxPosition: 'PRIME' },
        { usMaxPosition: 'PRIME' },
        { usMaxPosition: 'SUB' },
        { usMaxPosition: 'TEAMING' },
      ]);

      const result = await getTypicalPosition('agency-dod', mockUserContext);

      expect(result.typicalPosition).toBe('PRIME');
      expect(result.positionCounts).toContainEqual({ position: 'PRIME', count: 3 });
      expect(result.positionCounts).toContainEqual({ position: 'SUB', count: 1 });
      expect(result.positionCounts).toContainEqual({ position: 'TEAMING', count: 1 });
    });

    it('returns position counts sorted by frequency', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { usMaxPosition: 'SUB' },
        { usMaxPosition: 'SUB' },
        { usMaxPosition: 'PRIME' },
        { usMaxPosition: 'TEAMING' },
        { usMaxPosition: 'TEAMING' },
        { usMaxPosition: 'TEAMING' },
      ]);

      const result = await getTypicalPosition('agency-dod', mockUserContext);

      expect(result.typicalPosition).toBe('TEAMING');
      expect(result.positionCounts[0]).toEqual({ position: 'TEAMING', count: 3 });
      expect(result.positionCounts[1]).toEqual({ position: 'SUB', count: 2 });
      expect(result.positionCounts[2]).toEqual({ position: 'PRIME', count: 1 });
    });

    it('returns undefined position when no NDAs found', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const result = await getTypicalPosition('agency-dod', mockUserContext);

      expect(result.typicalPosition).toBeUndefined();
      expect(result.positionCounts).toEqual([]);
    });
  });

  describe('getAgencySuggestions', () => {
    it('returns combined suggestions', async () => {
      // Mock for getCommonCompanies and getTypicalPosition
      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'Lockheed Martin', usMaxPosition: 'PRIME' },
        { companyName: 'Boeing', usMaxPosition: 'PRIME' },
        { companyName: 'Lockheed Martin', usMaxPosition: 'SUB' },
      ]);

      const result = await getAgencySuggestions('agency-dod', mockUserContext);

      expect(result.commonCompanies).toBeDefined();
      expect(result.typicalPosition).toBeDefined();
      expect(result.positionCounts).toBeDefined();
    });

    it('returns empty suggestions when no data', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const result = await getAgencySuggestions('agency-new', mockUserContext);

      expect(result.commonCompanies).toEqual([]);
      expect(result.typicalPosition).toBeUndefined();
    });
  });

  describe('getCommonSubagencies', () => {
    it('returns subagencies sorted by count', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { subagencyId: 'sub-army', subagency: { id: 'sub-army', name: 'Army' } },
        { subagencyId: 'sub-army', subagency: { id: 'sub-army', name: 'Army' } },
        { subagencyId: 'sub-army', subagency: { id: 'sub-army', name: 'Army' } },
        { subagencyId: 'sub-navy', subagency: { id: 'sub-navy', name: 'Navy' } },
        { subagencyId: 'sub-navy', subagency: { id: 'sub-navy', name: 'Navy' } },
        { subagencyId: 'sub-airforce', subagency: { id: 'sub-airforce', name: 'Air Force' } },
      ]);

      const result = await getCommonSubagencies('agency-dod', mockUserContext);

      expect(result).toHaveLength(3);
      expect(result[0].subagencyId).toBe('sub-army');
      expect(result[0].subagencyName).toBe('Army');
      expect(result[0].count).toBe(3);
      expect(result[1].subagencyId).toBe('sub-navy');
      expect(result[1].count).toBe(2);
    });

    it('respects limit parameter', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { subagencyId: 'sub-1', subagency: { id: 'sub-1', name: 'Sub 1' } },
        { subagencyId: 'sub-2', subagency: { id: 'sub-2', name: 'Sub 2' } },
        { subagencyId: 'sub-3', subagency: { id: 'sub-3', name: 'Sub 3' } },
      ]);

      const result = await getCommonSubagencies('agency-dod', mockUserContext, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('returns empty array when no subagencies found', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const result = await getCommonSubagencies('agency-dod', mockUserContext);

      expect(result).toEqual([]);
    });

    it('excludes NDAs without subagencies', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { subagencyId: 'sub-army', subagency: { id: 'sub-army', name: 'Army' } },
        { subagencyId: null, subagency: null }, // Should be excluded
      ]);

      const result = await getCommonSubagencies('agency-dod', mockUserContext);

      expect(result).toHaveLength(1);
      expect(result[0].subagencyId).toBe('sub-army');
    });
  });
});
