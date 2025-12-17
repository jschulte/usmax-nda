/**
 * Tests for NDA Service
 * Story 3.1: Create NDA with Basic Form
 *
 * Tests:
 * - createNda with required fields
 * - createNda validation (missing fields, character limits)
 * - createNda agency access validation
 * - getNda with row-level security
 * - listNdas with filtering and pagination
 * - updateNda with validation
 * - changeNdaStatus with history tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - must be defined before imports
vi.mock('../../db/index.js', () => ({
  prisma: {
    nda: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    subagency: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    NDA_CREATED: 'nda_created',
    NDA_UPDATED: 'nda_updated',
    NDA_STATUS_CHANGED: 'nda_status_changed',
  },
}));

import {
  createNda,
  getNda,
  listNdas,
  updateNda,
  changeNdaStatus,
  NdaServiceError,
} from '../ndaService.js';
import { prisma } from '../../db/index.js';
import type { UserContext } from '../../types/auth.js';

const mockPrisma = vi.mocked(prisma);

// Helper to create mock user context
function createMockUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: 'cognito-123',
    email: 'test@usmax.com',
    contactId: 'contact-1',
    name: 'Test User',
    roles: ['NDA User'],
    permissions: new Set(['nda:create', 'nda:view', 'nda:update', 'nda:mark_status']),
    authorizedAgencyGroups: ['group-1', 'group-2'],
    authorizedSubagencies: ['sub-1', 'sub-2'],
    ...overrides,
  };
}

describe('NDA Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNda', () => {
    const validInput = {
      companyName: 'TechCorp Solutions',
      agencyGroupId: 'group-1',
      abbreviatedName: 'TechCorp DoD',
      authorizedPurpose: 'Mutual non-disclosure for DoD proposal',
      relationshipPocId: 'contact-2',
    };

    it('creates NDA with required fields', async () => {
      const mockNda = {
        id: 'nda-1',
        displayId: 1001,
        ...validInput,
        status: 'CREATED',
        createdAt: new Date(),
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        subagency: null,
        opportunityPoc: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
        contractsPoc: null,
        relationshipPoc: { id: 'contact-2', firstName: 'John', lastName: 'Doe', email: 'john@partner.com' },
        createdBy: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
      };

      mockPrisma.nda.create.mockResolvedValue(mockNda);

      const result = await createNda(validInput, createMockUserContext());

      expect(result).toEqual(mockNda);
      expect(mockPrisma.nda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyName: 'TechCorp Solutions',
            agencyGroupId: 'group-1',
            abbreviatedName: 'TechCorp DoD',
            authorizedPurpose: 'Mutual non-disclosure for DoD proposal',
            relationshipPocId: 'contact-2',
            status: 'CREATED',
          }),
        })
      );
    });

    it('throws error when company name is missing', async () => {
      const input = { ...validInput, companyName: '' };

      await expect(createNda(input, createMockUserContext())).rejects.toThrow(NdaServiceError);
      await expect(createNda(input, createMockUserContext())).rejects.toThrow(
        'Company Name is required'
      );
    });

    it('throws error when abbreviated name is missing', async () => {
      const input = { ...validInput, abbreviatedName: '' };

      await expect(createNda(input, createMockUserContext())).rejects.toThrow(
        'Abbreviated Opportunity Name is required'
      );
    });

    it('throws error when authorized purpose is missing', async () => {
      const input = { ...validInput, authorizedPurpose: '' };

      await expect(createNda(input, createMockUserContext())).rejects.toThrow(
        'Authorized Purpose is required'
      );
    });

    it('throws error when authorized purpose exceeds 255 characters', async () => {
      const input = { ...validInput, authorizedPurpose: 'x'.repeat(256) };

      await expect(createNda(input, createMockUserContext())).rejects.toThrow(
        'Authorized Purpose must not exceed 255 characters'
      );
    });

    it('throws error when relationship POC is missing', async () => {
      const input = { ...validInput, relationshipPocId: '' };

      await expect(createNda(input, createMockUserContext())).rejects.toThrow(
        'Relationship POC is required'
      );
    });

    it('throws error when user lacks agency access', async () => {
      const input = { ...validInput, agencyGroupId: 'unauthorized-group' };
      const userContext = createMockUserContext({
        authorizedAgencyGroups: ['other-group'],
        authorizedSubagencies: [],
      });

      await expect(createNda(input, userContext)).rejects.toThrow(
        'You do not have access to create NDAs for this agency'
      );
    });

    it('validates subagency belongs to agency group', async () => {
      const input = { ...validInput, subagencyId: 'sub-3' };
      const userContext = createMockUserContext();

      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-3',
        agencyGroupId: 'different-group', // Wrong group
        name: 'Wrong Agency',
        code: 'WRONG',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(createNda(input, userContext)).rejects.toThrow(
        'Subagency does not belong to the selected agency group'
      );
    });

    it('allows NDA creation with direct subagency access', async () => {
      const input = { ...validInput, agencyGroupId: 'group-3', subagencyId: 'sub-1' };
      const userContext = createMockUserContext({
        authorizedAgencyGroups: [], // No group access
        authorizedSubagencies: ['sub-1'], // But has subagency access
      });

      mockPrisma.subagency.findUnique.mockResolvedValue({
        id: 'sub-1',
        agencyGroupId: 'group-3',
        name: 'Air Force',
        code: 'USAF',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockNda = {
        id: 'nda-1',
        displayId: 1001,
        ...input,
        status: 'CREATED',
        createdAt: new Date(),
        agencyGroup: { id: 'group-3', name: 'DoD', code: 'DOD' },
        subagency: { id: 'sub-1', name: 'Air Force', code: 'USAF' },
        opportunityPoc: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
        contractsPoc: null,
        relationshipPoc: { id: 'contact-2', firstName: 'John', lastName: 'Doe', email: 'john@partner.com' },
        createdBy: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
      };

      mockPrisma.nda.create.mockResolvedValue(mockNda);

      const result = await createNda(input, userContext);

      expect(result).toEqual(mockNda);
    });

    it('defaults opportunity POC to current user', async () => {
      const mockNda = {
        id: 'nda-1',
        displayId: 1001,
        ...validInput,
        opportunityPocId: 'contact-1',
        status: 'CREATED',
        createdAt: new Date(),
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        subagency: null,
        opportunityPoc: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
        contractsPoc: null,
        relationshipPoc: { id: 'contact-2', firstName: 'John', lastName: 'Doe', email: 'john@partner.com' },
        createdBy: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@usmax.com' },
      };

      mockPrisma.nda.create.mockResolvedValue(mockNda);

      await createNda(validInput, createMockUserContext());

      expect(mockPrisma.nda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opportunityPocId: 'contact-1', // Current user's contact ID
          }),
        })
      );
    });
  });

  describe('getNda', () => {
    it('returns NDA when user has access', async () => {
      const mockNda = {
        id: 'nda-1',
        displayId: 1001,
        companyName: 'TechCorp',
        agencyGroupId: 'group-1',
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        subagency: null,
        statusHistory: [],
        documents: [],
      };

      mockPrisma.nda.findFirst.mockResolvedValue(mockNda);

      const result = await getNda('nda-1', createMockUserContext());

      expect(result).toEqual(mockNda);
      expect(mockPrisma.nda.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'nda-1',
            OR: expect.any(Array), // Security filter
          }),
        })
      );
    });

    it('returns null when NDA not found or access denied', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      const result = await getNda('nonexistent', createMockUserContext());

      expect(result).toBeNull();
    });
  });

  describe('listNdas', () => {
    it('returns paginated list with default values', async () => {
      const mockNdas = [
        { id: 'nda-1', displayId: 1001, companyName: 'TechCorp', agencyGroupId: 'group-1' },
        { id: 'nda-2', displayId: 1002, companyName: 'DataCorp', agencyGroupId: 'group-1' },
      ];

      mockPrisma.nda.findMany.mockResolvedValue(mockNdas);
      mockPrisma.nda.count.mockResolvedValue(2);

      const result = await listNdas({}, createMockUserContext());

      expect(result.ndas).toEqual(mockNdas);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('applies filters correctly', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        {
          companyName: 'Tech',
          status: 'CREATED',
          agencyGroupId: 'group-1',
        },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyName: { contains: 'Tech', mode: 'insensitive' },
            agencyGroupId: 'group-1',
          }),
        })
      );
    });

    it('excludes inactive and cancelled by default', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas({}, createMockUserContext());

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['INACTIVE', 'CANCELLED'] },
          }),
        })
      );
    });

    it('includes inactive when showInactive is true', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas({ showInactive: true }, createMockUserContext());

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'CANCELLED' },
          }),
        })
      );
    });

    it('respects pagination parameters', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(50);

      const result = await listNdas({ page: 2, limit: 10 }, createMockUserContext());

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('enforces maximum limit', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas({ limit: 500 }, createMockUserContext());

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Max limit
        })
      );
    });
  });

  describe('updateNda', () => {
    it('updates NDA fields', async () => {
      // First mock getNda check
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-1',
        agencyGroupId: 'group-1',
        status: 'CREATED',
      });

      // Then mock update
      const updatedNda = {
        id: 'nda-1',
        displayId: 1001,
        companyName: 'Updated TechCorp',
        status: 'CREATED',
        updatedAt: new Date(),
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
      };

      mockPrisma.nda.update.mockResolvedValue(updatedNda);

      const result = await updateNda(
        'nda-1',
        { companyName: 'Updated TechCorp' },
        createMockUserContext()
      );

      expect(result.companyName).toBe('Updated TechCorp');
    });

    it('throws error when NDA not found', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      await expect(
        updateNda('nonexistent', { companyName: 'New Name' }, createMockUserContext())
      ).rejects.toThrow('NDA not found or access denied');
    });

    it('validates authorized purpose length on update', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-1',
        agencyGroupId: 'group-1',
        status: 'CREATED',
      });

      await expect(
        updateNda('nda-1', { authorizedPurpose: 'x'.repeat(256) }, createMockUserContext())
      ).rejects.toThrow('Authorized Purpose must not exceed 255 characters');
    });
  });

  describe('changeNdaStatus', () => {
    it('changes status and records history', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-1',
        status: 'CREATED',
        fullyExecutedDate: null,
        agencyGroupId: 'group-1',
      });

      const updatedNda = {
        id: 'nda-1',
        displayId: 1001,
        status: 'EMAILED',
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        statusHistory: [
          { status: 'CREATED', changedAt: new Date(), changedBy: { id: 'contact-1' } },
          { status: 'EMAILED', changedAt: new Date(), changedBy: { id: 'contact-1' } },
        ],
      };

      mockPrisma.nda.update.mockResolvedValue(updatedNda);

      const result = await changeNdaStatus('nda-1', 'EMAILED', createMockUserContext());

      expect(result.status).toBe('EMAILED');
      expect(result.statusHistory).toHaveLength(2);
      expect(mockPrisma.nda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'EMAILED',
            statusHistory: {
              create: {
                status: 'EMAILED',
                changedById: 'contact-1',
              },
            },
          }),
        })
      );
    });

    it('sets fullyExecutedDate when status is FULLY_EXECUTED', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        id: 'nda-1',
        status: 'IN_REVISION',
        fullyExecutedDate: null,
        agencyGroupId: 'group-1',
      });

      const updatedNda = {
        id: 'nda-1',
        displayId: 1001,
        status: 'FULLY_EXECUTED',
        fullyExecutedDate: new Date(),
        agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
        statusHistory: [],
      };

      mockPrisma.nda.update.mockResolvedValue(updatedNda);

      await changeNdaStatus('nda-1', 'FULLY_EXECUTED', createMockUserContext());

      expect(mockPrisma.nda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullyExecutedDate: expect.any(Date),
          }),
        })
      );
    });

    it('throws error when NDA not found', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      await expect(
        changeNdaStatus('nonexistent', 'EMAILED', createMockUserContext())
      ).rejects.toThrow('NDA not found or access denied');
    });
  });
});
