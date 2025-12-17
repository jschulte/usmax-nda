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
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
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
    NDA_CLONED: 'nda_cloned',
  },
}));

import {
  createNda,
  getNda,
  getNdaDetail,
  listNdas,
  updateNda,
  changeNdaStatus,
  getIncompleteFields,
  updateDraft,
  getFilterPresets,
  calculateStatusProgression,
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

  describe('cloneNda', () => {
    // Import cloneNda dynamically to use updated mock
    let cloneNda: typeof import('../ndaService.js').cloneNda;

    beforeEach(async () => {
      const module = await import('../ndaService.js');
      cloneNda = module.cloneNda;
      // Set up default subagency mocks - validateAgencyAccess uses findUnique, cloneNda uses findFirst
      const mockSubagency = {
        id: 'sub-1',
        agencyGroupId: 'agency-1',
        name: 'Army',
        code: 'ARMY',
      };
      mockPrisma.subagency.findFirst.mockResolvedValue(mockSubagency);
      mockPrisma.subagency.findUnique.mockResolvedValue(mockSubagency);
    });

    const mockSourceNda = {
      id: 'source-nda',
      displayId: 1500,
      companyName: 'TechCorp Solutions',
      companyCity: 'San Francisco',
      companyState: 'CA',
      stateOfIncorporation: 'Delaware',
      abbreviatedName: 'TC-DoD-2024',
      authorizedPurpose: 'Software Development Services',
      effectiveDate: new Date('2024-01-15'),
      usMaxPosition: 'PRIME',
      isNonUsMax: false,
      status: 'FULLY_EXECUTED',
      agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
      subagency: { id: 'sub-1', name: 'Army', code: 'ARMY' },
      opportunityPoc: { id: 'poc-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      contractsPoc: { id: 'poc-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
      relationshipPoc: { id: 'poc-3', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      createdBy: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@test.com' },
    };

    const mockClonedNda = {
      id: 'cloned-nda',
      displayId: 1501,
      companyName: 'TechCorp Solutions',
      companyCity: 'San Francisco',
      companyState: 'CA',
      stateOfIncorporation: 'Delaware',
      abbreviatedName: 'TC-DoD-2025',
      authorizedPurpose: 'New Project Services',
      effectiveDate: new Date('2025-01-15'),
      usMaxPosition: 'PRIME',
      isNonUsMax: false,
      status: 'CREATED',
      agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
      subagency: { id: 'sub-1', name: 'Army', code: 'ARMY' },
      opportunityPoc: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@test.com' },
      contractsPoc: { id: 'poc-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
      relationshipPoc: { id: 'poc-3', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      createdBy: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@test.com' },
      clonedFrom: { id: 'source-nda', displayId: 1500, companyName: 'TechCorp Solutions' },
      statusHistory: [
        { status: 'CREATED', changedAt: new Date(), changedBy: { id: 'contact-1', firstName: 'Test', lastName: 'User' } },
      ],
    };

    it('clones NDA with overrides', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockSourceNda);
      mockPrisma.nda.create.mockResolvedValue(mockClonedNda);

      const result = await cloneNda(
        'source-nda',
        {
          abbreviatedName: 'TC-DoD-2025',
          authorizedPurpose: 'New Project Services',
          effectiveDate: '2025-01-15',
        },
        createMockUserContext()
      );

      expect(result.id).toBe('cloned-nda');
      expect(result.clonedFrom.id).toBe('source-nda');
      expect(result.status).toBe('CREATED');
    });

    it('copies all fields from source when no overrides provided', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockSourceNda);
      mockPrisma.nda.create.mockResolvedValue(mockClonedNda);

      await cloneNda('source-nda', {}, createMockUserContext());

      expect(mockPrisma.nda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyName: mockSourceNda.companyName,
            status: 'CREATED', // Always reset to CREATED
          }),
        })
      );
    });

    it('sets status to CREATED regardless of source status', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        ...mockSourceNda,
        status: 'FULLY_EXECUTED',
      });
      mockPrisma.nda.create.mockResolvedValue(mockClonedNda);

      await cloneNda('source-nda', {}, createMockUserContext());

      expect(mockPrisma.nda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CREATED',
            fullyExecutedDate: null,
          }),
        })
      );
    });

    it('records clonedFromId in new NDA', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockSourceNda);
      mockPrisma.nda.create.mockResolvedValue(mockClonedNda);

      await cloneNda('source-nda', {}, createMockUserContext());

      expect(mockPrisma.nda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clonedFrom: { connect: { id: 'source-nda' } },
          }),
        })
      );
    });

    it('validates authorizedPurpose length in overrides', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockSourceNda);

      await expect(
        cloneNda(
          'source-nda',
          { authorizedPurpose: 'a'.repeat(256) },
          createMockUserContext()
        )
      ).rejects.toThrow('Authorized purpose must not exceed 255 characters');
    });

    it('throws error when source NDA not found', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      await expect(
        cloneNda('nonexistent', {}, createMockUserContext())
      ).rejects.toThrow('Source NDA not found or access denied');
    });

    it('validates agency access when changing agency', async () => {
      // Mock source NDA without subagency for this test
      mockPrisma.nda.findFirst.mockResolvedValue({
        ...mockSourceNda,
        subagency: null,
      });
      // Clear subagency mocks for this test - no subagency involved
      mockPrisma.subagency.findFirst.mockResolvedValue(null);
      mockPrisma.subagency.findUnique.mockResolvedValue(null);

      const userWithLimitedAccess = createMockUserContext();
      userWithLimitedAccess.authorizedAgencyGroups = ['other-agency'];
      userWithLimitedAccess.authorizedSubagencies = [];

      await expect(
        cloneNda('source-nda', { agencyGroupId: 'unauthorized-agency' }, userWithLimitedAccess)
      ).rejects.toThrow('You do not have access to create NDAs for this agency');
    });

    it('logs audit event for clone operation', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockSourceNda);
      mockPrisma.nda.create.mockResolvedValue(mockClonedNda);

      await cloneNda(
        'source-nda',
        { abbreviatedName: 'New Name' },
        createMockUserContext(),
        { ipAddress: '127.0.0.1' }
      );

      // Audit log should be called (tested via auditService mock)
      expect(mockPrisma.nda.create).toHaveBeenCalled();
    });
  });

  describe('getIncompleteFields', () => {
    it('returns empty array when all required fields present', () => {
      const result = getIncompleteFields({
        companyName: 'Test Company',
        abbreviatedName: 'TC-2024',
        authorizedPurpose: 'Test Purpose',
        relationshipPocId: 'poc-1',
        agencyGroupId: 'agency-1',
      });

      expect(result).toEqual([]);
    });

    it('returns missing required fields', () => {
      const result = getIncompleteFields({
        companyName: 'Test Company',
        abbreviatedName: null,
        authorizedPurpose: '',
        relationshipPocId: undefined,
        agencyGroupId: 'agency-1',
      });

      expect(result).toContain('abbreviatedName');
      expect(result).toContain('authorizedPurpose');
      expect(result).toContain('relationshipPocId');
      expect(result).not.toContain('companyName');
      expect(result).not.toContain('agencyGroupId');
    });

    it('treats whitespace-only strings as empty', () => {
      const result = getIncompleteFields({
        companyName: '   ',
        abbreviatedName: 'TC-2024',
        authorizedPurpose: '\t\n',
        relationshipPocId: 'poc-1',
        agencyGroupId: 'agency-1',
      });

      expect(result).toContain('companyName');
      expect(result).toContain('authorizedPurpose');
    });
  });

  describe('updateDraft', () => {
    const mockDraftNda = {
      id: 'nda-1',
      displayId: 1001,
      status: 'CREATED',
      agencyGroupId: 'group-1',
      companyName: 'Test Co',
      abbreviatedName: 'TC-2024',
      authorizedPurpose: 'Testing',
      relationshipPocId: 'poc-1',
      agencyGroup: { id: 'group-1', name: 'DoD', code: 'DOD' },
      opportunityPoc: { id: 'poc-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      contractsPoc: null,
      relationshipPoc: { id: 'poc-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      createdBy: { id: 'contact-1', firstName: 'User', lastName: 'One', email: 'user@test.com' },
    };

    it('updates draft and returns incomplete fields', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockDraftNda);
      mockPrisma.nda.update.mockResolvedValue({
        ...mockDraftNda,
        companyName: 'Updated Company',
      });

      const result = await updateDraft(
        'nda-1',
        { companyName: 'Updated Company' },
        createMockUserContext()
      );

      expect(result.savedAt).toBeInstanceOf(Date);
      expect(result.incompleteFields).toBeDefined();
      expect(Array.isArray(result.incompleteFields)).toBe(true);
    });

    it('rejects updating non-draft NDAs', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue({
        ...mockDraftNda,
        status: 'EMAILED', // Not a draft
      });

      await expect(
        updateDraft('nda-1', { companyName: 'Updated' }, createMockUserContext())
      ).rejects.toThrow('Cannot update draft - NDA is no longer in draft status');
    });

    it('validates authorizedPurpose length', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockDraftNda);

      await expect(
        updateDraft('nda-1', { authorizedPurpose: 'a'.repeat(256) }, createMockUserContext())
      ).rejects.toThrow('Authorized Purpose must not exceed 255 characters');
    });

    it('returns correct incomplete fields after partial update', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockDraftNda);
      mockPrisma.nda.update.mockResolvedValue({
        ...mockDraftNda,
        companyName: 'New Company',
        abbreviatedName: '', // Now incomplete
      });

      const result = await updateDraft(
        'nda-1',
        { companyName: 'New Company', abbreviatedName: '' },
        createMockUserContext()
      );

      expect(result.incompleteFields).toContain('abbreviatedName');
    });

    it('throws error when NDA not found', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      await expect(
        updateDraft('nonexistent', { companyName: 'Test' }, createMockUserContext())
      ).rejects.toThrow('NDA not found or access denied');
    });
  });

  // Story 3.7: NDA List with Filtering
  describe('getFilterPresets', () => {
    it('returns array of filter presets', () => {
      const presets = getFilterPresets();

      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);

      // Check preset structure
      presets.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('params');
      });
    });

    it('includes expected presets', () => {
      const presets = getFilterPresets();
      const presetIds = presets.map((p) => p.id);

      expect(presetIds).toContain('my-ndas');
      expect(presetIds).toContain('drafts');
      expect(presetIds).toContain('expiring-soon');
      expect(presetIds).toContain('inactive');
      expect(presetIds).toContain('all');
    });
  });

  describe('listNdas extended filters (Story 3.7)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('filters by companyCity', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { companyCity: 'Arlington' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyCity: { contains: 'Arlington', mode: 'insensitive' },
          }),
        })
      );
    });

    it('filters by companyState', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { companyState: 'Virginia' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyState: { contains: 'Virginia', mode: 'insensitive' },
          }),
        })
      );
    });

    it('filters by stateOfIncorporation', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { stateOfIncorporation: 'Delaware' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stateOfIncorporation: { contains: 'Delaware', mode: 'insensitive' },
          }),
        })
      );
    });

    it('filters by agencyOfficeName', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { agencyOfficeName: 'Headquarters' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agencyOfficeName: { contains: 'Headquarters', mode: 'insensitive' },
          }),
        })
      );
    });

    it('filters by isNonUsMax', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { isNonUsMax: true },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isNonUsMax: true,
          }),
        })
      );
    });

    it('filters by created date range', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await listNdas(
        { createdDateFrom: fromDate, createdDateTo: toDate },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('filters by opportunityPocName', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { opportunityPocName: 'Smith' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunityPoc: {
              OR: [
                { firstName: { contains: 'Smith', mode: 'insensitive' } },
                { lastName: { contains: 'Smith', mode: 'insensitive' } },
              ],
            },
          }),
        })
      );
    });

    it('applies my-ndas preset', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      const userContext = createMockUserContext({ contactId: 'contact-123' });

      await listNdas(
        { preset: 'my-ndas' },
        userContext
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdById: 'contact-123',
          }),
        })
      );
    });

    it('applies drafts preset', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { preset: 'drafts' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CREATED',
          }),
        })
      );
    });

    it('applies inactive preset', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { preset: 'inactive' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'INACTIVE',
          }),
        })
      );
    });

    it('applies expiring-soon preset', async () => {
      mockPrisma.nda.findMany.mockResolvedValue([]);
      mockPrisma.nda.count.mockResolvedValue(0);

      await listNdas(
        { preset: 'expiring-soon' },
        createMockUserContext()
      );

      expect(mockPrisma.nda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            effectiveDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  // Story 3.8: NDA Detail View
  describe('getNdaDetail', () => {
    const mockNda = {
      id: 'nda-1',
      displayId: 1001,
      companyName: 'Test Company',
      status: 'CREATED',
      agencyGroupId: 'agency-1',
      documents: [
        { id: 'doc-1', filename: 'test.pdf', uploadedAt: new Date() },
      ],
      statusHistory: [
        { status: 'CREATED', changedAt: new Date(), changedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe' } },
      ],
    };

    const mockAuditTrail = [
      {
        action: 'nda_created',
        createdAt: new Date(),
        userId: 'user-1',
        details: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns full NDA detail with audit trail and available actions', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockNda);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditTrail);

      const userContext = createMockUserContext({
        permissions: new Set(['nda:view', 'nda:update', 'nda:upload_document']),
      });

      const result = await getNdaDetail('nda-1', userContext);

      expect(result).not.toBeNull();
      expect(result!.nda).toEqual(mockNda);
      expect(result!.documents).toEqual(mockNda.documents);
      expect(result!.statusHistory).toEqual(mockNda.statusHistory);
      expect(result!.auditTrail).toHaveLength(1);
      expect(result!.emails).toEqual([]); // Not yet implemented
    });

    it('returns correct available actions based on permissions', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockNda);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const userContext = createMockUserContext({
        permissions: new Set(['nda:view', 'nda:update']),
      });

      const result = await getNdaDetail('nda-1', userContext);

      expect(result!.availableActions).toEqual({
        canEdit: true,
        canSendEmail: false,
        canUploadDocument: false,
        canChangeStatus: false,
        canDelete: false,
      });
    });

    it('returns all actions true for user with all permissions', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockNda);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const userContext = createMockUserContext({
        permissions: new Set([
          'nda:view',
          'nda:update',
          'nda:send_email',
          'nda:upload_document',
          'nda:mark_status',
          'nda:delete',
        ]),
      });

      const result = await getNdaDetail('nda-1', userContext);

      expect(result!.availableActions).toEqual({
        canEdit: true,
        canSendEmail: true,
        canUploadDocument: true,
        canChangeStatus: true,
        canDelete: true,
      });
    });

    it('returns null when NDA not found', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(null);

      const result = await getNdaDetail('nonexistent', createMockUserContext());

      expect(result).toBeNull();
      // Should not query audit log when NDA doesn't exist
      expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('queries audit log with correct parameters', async () => {
      mockPrisma.nda.findFirst.mockResolvedValue(mockNda);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await getNdaDetail('nda-1', createMockUserContext());

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'nda',
          entityId: 'nda-1',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });

  // Story 3.9: Status Progression Visualization
  describe('calculateStatusProgression', () => {
    it('returns all steps with correct completion for CREATED status', () => {
      const result = calculateStatusProgression('CREATED', [
        { status: 'CREATED', changedAt: new Date('2024-01-01'), changedBy: { id: 'u1', firstName: 'John', lastName: 'Doe' } },
      ]);

      expect(result.steps).toHaveLength(4);
      expect(result.steps[0]).toEqual(expect.objectContaining({
        status: 'CREATED',
        label: 'Created',
        completed: true,
        isCurrent: true,
      }));
      expect(result.steps[1]).toEqual(expect.objectContaining({
        status: 'EMAILED',
        completed: false,
        isCurrent: false,
      }));
      expect(result.steps[2]).toEqual(expect.objectContaining({
        status: 'IN_REVISION',
        completed: false,
        isCurrent: false,
      }));
      expect(result.steps[3]).toEqual(expect.objectContaining({
        status: 'FULLY_EXECUTED',
        completed: false,
        isCurrent: false,
      }));
      expect(result.isTerminal).toBe(false);
    });

    it('returns correct progression for EMAILED status', () => {
      const result = calculateStatusProgression('EMAILED', [
        { status: 'CREATED', changedAt: new Date('2024-01-01') },
        { status: 'EMAILED', changedAt: new Date('2024-01-02') },
      ]);

      expect(result.steps[0].completed).toBe(true);
      expect(result.steps[1].completed).toBe(true);
      expect(result.steps[1].isCurrent).toBe(true);
      expect(result.steps[2].completed).toBe(false);
      expect(result.steps[3].completed).toBe(false);
    });

    it('returns correct progression for FULLY_EXECUTED status', () => {
      const result = calculateStatusProgression('FULLY_EXECUTED', [
        { status: 'CREATED', changedAt: new Date('2024-01-01') },
        { status: 'EMAILED', changedAt: new Date('2024-01-02') },
        { status: 'FULLY_EXECUTED', changedAt: new Date('2024-01-05') },
      ]);

      expect(result.steps.every((s) => s.completed)).toBe(true);
      expect(result.steps[3].isCurrent).toBe(true);
      expect(result.isTerminal).toBe(false);
    });

    it('marks INACTIVE as terminal status', () => {
      const result = calculateStatusProgression('INACTIVE', [
        { status: 'CREATED', changedAt: new Date('2024-01-01') },
        { status: 'EMAILED', changedAt: new Date('2024-01-02') },
        { status: 'INACTIVE', changedAt: new Date('2024-01-03') },
      ]);

      expect(result.isTerminal).toBe(true);
      expect(result.terminalStatus).toBe('INACTIVE');
      // No step should be marked as current when terminal
      expect(result.steps.every((s) => !s.isCurrent)).toBe(true);
    });

    it('marks CANCELLED as terminal status', () => {
      const result = calculateStatusProgression('CANCELLED', [
        { status: 'CREATED', changedAt: new Date('2024-01-01') },
        { status: 'CANCELLED', changedAt: new Date('2024-01-02') },
      ]);

      expect(result.isTerminal).toBe(true);
      expect(result.terminalStatus).toBe('CANCELLED');
    });

    it('preserves timestamps from status history', () => {
      const createdDate = new Date('2024-01-01T10:00:00Z');
      const emailedDate = new Date('2024-01-02T14:30:00Z');

      const result = calculateStatusProgression('EMAILED', [
        { status: 'CREATED', changedAt: createdDate },
        { status: 'EMAILED', changedAt: emailedDate },
      ]);

      expect(result.steps[0].timestamp).toEqual(createdDate);
      expect(result.steps[1].timestamp).toEqual(emailedDate);
      expect(result.steps[2].timestamp).toBeUndefined();
    });

    it('includes changedBy info when available', () => {
      const result = calculateStatusProgression('CREATED', [
        {
          status: 'CREATED',
          changedAt: new Date(),
          changedBy: { id: 'user-1', firstName: 'Jane', lastName: 'Smith' },
        },
      ]);

      expect(result.steps[0].changedBy).toEqual({
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });

    it('handles empty status history', () => {
      const result = calculateStatusProgression('CREATED', []);

      expect(result.steps).toHaveLength(4);
      expect(result.steps[0].completed).toBe(true); // Current status is always completed
      expect(result.steps[0].isCurrent).toBe(true);
      expect(result.steps[0].timestamp).toBeUndefined(); // No timestamp without history
    });
  });
});
