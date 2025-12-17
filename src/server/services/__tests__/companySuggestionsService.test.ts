/**
 * Company Suggestions Service Tests
 * Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRecentCompanies,
  getCompanyDefaults,
  getMostCommonAgency,
  searchCompanies,
} from '../companySuggestionsService.js';
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

describe('companySuggestionsService', () => {
  // Sample user context with NDA permissions
  const mockUserContext: UserContext = {
    id: 'user-1',
    email: 'test@example.com',
    contactId: 'contact-1',
    name: 'Test User',
    roles: ['nda_user'],
    permissions: new Set(['nda:create', 'nda:view', 'nda:update']),
    authorizedAgencyGroups: ['agency-1', 'agency-2'],
    authorizedSubagencies: ['sub-1'],
  };

  // Admin context (bypasses row-level security)
  const adminContext: UserContext = {
    ...mockUserContext,
    roles: ['admin'],
    permissions: new Set(['admin:bypass']),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentCompanies', () => {
    it('returns recent companies sorted by most recent first', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const lastWeek = new Date(now.getTime() - 7 * 86400000);

      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'TechCorp', createdAt: now },
        { companyName: 'MegaCorp', createdAt: yesterday },
        { companyName: 'TechCorp', createdAt: lastWeek },
        { companyName: 'SmallBiz', createdAt: lastWeek },
      ]);

      const companies = await getRecentCompanies(mockUserContext);

      expect(companies).toHaveLength(3);
      expect(companies[0].companyName).toBe('TechCorp');
      expect(companies[0].count).toBe(2);
      expect(companies[1].companyName).toBe('MegaCorp');
      expect(companies[1].count).toBe(1);
      expect(companies[2].companyName).toBe('SmallBiz');
    });

    it('respects limit parameter', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'Company1', createdAt: new Date() },
        { companyName: 'Company2', createdAt: new Date() },
        { companyName: 'Company3', createdAt: new Date() },
      ]);

      const companies = await getRecentCompanies(mockUserContext, 2);

      expect(companies).toHaveLength(2);
    });

    it('applies security filter for non-admin users', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getRecentCompanies(mockUserContext);

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

    it('returns empty array when no companies found', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const companies = await getRecentCompanies(mockUserContext);

      expect(companies).toEqual([]);
    });
  });

  describe('getCompanyDefaults', () => {
    it('returns auto-fill defaults from historical NDAs', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        {
          companyCity: 'San Francisco',
          companyState: 'CA',
          stateOfIncorporation: 'Delaware',
          relationshipPocId: 'poc-1',
          relationshipPoc: { id: 'poc-1', name: 'John Doe' },
          contractsPocId: 'poc-2',
          contractsPoc: { id: 'poc-2', name: 'Jane Smith' },
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD' },
          subagencyId: 'sub-1',
          subagency: { id: 'sub-1', name: 'Army' },
          createdAt: new Date(),
        },
      ]);

      const defaults = await getCompanyDefaults('TechCorp', mockUserContext);

      expect(defaults.companyCity).toBe('San Francisco');
      expect(defaults.companyState).toBe('CA');
      expect(defaults.stateOfIncorporation).toBe('Delaware');
      expect(defaults.lastRelationshipPocId).toBe('poc-1');
      expect(defaults.lastRelationshipPocName).toBe('John Doe');
      expect(defaults.lastContractsPocId).toBe('poc-2');
      expect(defaults.lastContractsPocName).toBe('Jane Smith');
      expect(defaults.mostCommonAgencyGroupId).toBe('agency-1');
      expect(defaults.mostCommonAgencyGroupName).toBe('DoD');
    });

    it('returns most recent values for fields', async () => {
      const now = new Date();
      const lastYear = new Date(now.getTime() - 365 * 86400000);

      mockPrisma.nda.findMany.mockResolvedValue([
        {
          companyCity: 'New York',
          companyState: 'NY',
          stateOfIncorporation: null,
          relationshipPocId: null,
          relationshipPoc: null,
          contractsPocId: null,
          contractsPoc: null,
          agencyGroupId: 'agency-2',
          agencyGroup: { id: 'agency-2', name: 'NASA' },
          subagencyId: null,
          subagency: null,
          createdAt: now,
        },
        {
          companyCity: 'Boston',
          companyState: 'MA',
          stateOfIncorporation: 'Massachusetts',
          relationshipPocId: 'poc-1',
          relationshipPoc: { id: 'poc-1', name: 'Old POC' },
          contractsPocId: null,
          contractsPoc: null,
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD' },
          subagencyId: null,
          subagency: null,
          createdAt: lastYear,
        },
      ]);

      const defaults = await getCompanyDefaults('TechCorp', mockUserContext);

      // Most recent non-null values
      expect(defaults.companyCity).toBe('New York');
      expect(defaults.companyState).toBe('NY');
      expect(defaults.stateOfIncorporation).toBe('Massachusetts'); // From older NDA
    });

    it('returns most common agency by frequency', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        {
          companyCity: null,
          companyState: null,
          stateOfIncorporation: null,
          relationshipPocId: null,
          relationshipPoc: null,
          contractsPocId: null,
          contractsPoc: null,
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD' },
          subagencyId: null,
          subagency: null,
          createdAt: new Date(),
        },
        {
          companyCity: null,
          companyState: null,
          stateOfIncorporation: null,
          relationshipPocId: null,
          relationshipPoc: null,
          contractsPocId: null,
          contractsPoc: null,
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD' },
          subagencyId: null,
          subagency: null,
          createdAt: new Date(),
        },
        {
          companyCity: null,
          companyState: null,
          stateOfIncorporation: null,
          relationshipPocId: null,
          relationshipPoc: null,
          contractsPocId: null,
          contractsPoc: null,
          agencyGroupId: 'agency-2',
          agencyGroup: { id: 'agency-2', name: 'NASA' },
          subagencyId: null,
          subagency: null,
          createdAt: new Date(),
        },
      ]);

      const defaults = await getCompanyDefaults('TechCorp', mockUserContext);

      // DoD appears twice, NASA once
      expect(defaults.mostCommonAgencyGroupId).toBe('agency-1');
      expect(defaults.mostCommonAgencyGroupName).toBe('DoD');
    });

    it('returns empty object when no historical NDAs found', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const defaults = await getCompanyDefaults('NewCompany', mockUserContext);

      expect(defaults).toEqual({});
    });

    it('uses case-insensitive company name matching', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getCompanyDefaults('TechCorp', mockUserContext);

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                companyName: {
                  equals: 'TechCorp',
                  mode: 'insensitive',
                },
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('getMostCommonAgency', () => {
    it('returns most common agency with frequency percentage', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { agencyGroupId: 'agency-1', agencyGroup: { id: 'agency-1', name: 'DoD' } },
        { agencyGroupId: 'agency-1', agencyGroup: { id: 'agency-1', name: 'DoD' } },
        { agencyGroupId: 'agency-1', agencyGroup: { id: 'agency-1', name: 'DoD' } },
        { agencyGroupId: 'agency-1', agencyGroup: { id: 'agency-1', name: 'DoD' } },
        { agencyGroupId: 'agency-2', agencyGroup: { id: 'agency-2', name: 'NASA' } },
      ]);

      const result = await getMostCommonAgency('TechCorp', mockUserContext);

      expect(result).not.toBeNull();
      expect(result!.agencyGroupId).toBe('agency-1');
      expect(result!.agencyGroupName).toBe('DoD');
      expect(result!.frequency).toBe(80); // 4 out of 5 = 80%
    });

    it('returns null when no NDAs found for company', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const result = await getMostCommonAgency('NewCompany', mockUserContext);

      expect(result).toBeNull();
    });

    it('handles single agency scenario', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { agencyGroupId: 'agency-1', agencyGroup: { id: 'agency-1', name: 'DoD' } },
      ]);

      const result = await getMostCommonAgency('TechCorp', mockUserContext);

      expect(result).not.toBeNull();
      expect(result!.frequency).toBe(100);
    });
  });

  describe('searchCompanies', () => {
    it('searches companies by partial name match', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([
        { companyName: 'TechCorp Solutions' },
        { companyName: 'TechCorp Inc' },
        { companyName: 'TechCorp LLC' },
      ]);

      const results = await searchCompanies('Tech', mockUserContext);

      expect(results.length).toBeGreaterThan(0);
    });

    it('applies security filter', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await searchCompanies('Tech', mockUserContext);

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

    it('uses case-insensitive search', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await searchCompanies('tech', mockUserContext);

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                companyName: {
                  contains: 'tech',
                  mode: 'insensitive',
                },
              }),
            ]),
          }),
        })
      );
    });

    it('respects limit parameter', async () => {
      const companies = Array.from({ length: 30 }, (_, i) => ({
        companyName: `Company ${i}`,
      }));
      mockPrisma.nda.findMany.mockResolvedValue(companies);

      const results = await searchCompanies('Company', mockUserContext, 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array when no matches', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      const results = await searchCompanies('NonExistent', mockUserContext);

      expect(results).toEqual([]);
    });
  });

  describe('Admin bypass', () => {
    it('admins bypass security filter in getRecentCompanies', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getRecentCompanies(adminContext);

      // Admin should not have agency filter
      const call = mockPrisma.nda.findMany.mock.calls[0][0];
      const whereClause = call.where.AND[0];
      expect(whereClause).toEqual({}); // Empty security filter for admin
    });

    it('admins bypass security filter in getCompanyDefaults', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);

      await getCompanyDefaults('TechCorp', adminContext);

      const call = mockPrisma.nda.findMany.mock.calls[0][0];
      const whereClause = call.where.AND[0];
      expect(whereClause).toEqual({});
    });
  });
});
