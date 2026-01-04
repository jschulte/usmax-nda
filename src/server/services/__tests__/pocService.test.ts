/**
 * POC Service Tests
 * Story 3.14: POC Management & Validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchInternalUsers,
  getInternalUser,
  listInternalUsers,
  searchExternalContacts,
  getContactDetails,
  copyContactDetails,
  findOrCreateExternalContact,
  validateInternalUser,
  updateEmailSignature,
  PocServiceError,
} from '../pocService.js';

// Mock Prisma
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    contact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

import { prisma } from '../../db/index.js';
const mockPrisma = vi.mocked(prisma);

describe('POC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchInternalUsers', () => {
    it('should return empty array for short queries', async () => {
      const result = await searchInternalUsers('ab');
      expect(result).toEqual([]);
      expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
    });

    it('should search internal users by name and email', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@usmax.com',
          emailSignature: 'Best regards,\nJohn',
          jobTitle: 'Manager',
        },
      ] as any);

      const result = await searchInternalUsers('john');

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('John Doe');
      expect(result[0].emailSignature).toBe('Best regards,\nJohn');
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isInternal: true,
            active: true,
          }),
        })
      );
    });

    it('should limit results to 10', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);

      await searchInternalUsers('test');

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('getInternalUser', () => {
    it('should return internal user with display name', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'contact-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@usmax.com',
        emailSignature: 'Thanks,\nJane',
        jobTitle: 'Director',
      } as any);

      const result = await getInternalUser('contact-1');

      expect(result).not.toBeNull();
      expect(result?.displayName).toBe('Jane Smith');
      expect(result?.emailSignature).toBe('Thanks,\nJane');
    });

    it('should return null for non-internal user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await getInternalUser('contact-external');

      expect(result).toBeNull();
    });
  });

  describe('listInternalUsers', () => {
    it('should return all active internal users', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: '1', firstName: 'A', lastName: 'User', email: 'a@usmax.com', emailSignature: null, jobTitle: null },
        { id: '2', firstName: 'B', lastName: 'User', email: 'b@usmax.com', emailSignature: null, jobTitle: null },
      ] as any);

      const result = await listInternalUsers();

      expect(result).toHaveLength(2);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isInternal: true, active: true },
        })
      );
    });
  });

  describe('findOrCreateExternalContact', () => {
    it('should create new contact when not found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.contact.create.mockResolvedValue({
        id: 'new-contact',
        email: 'external@company.com',
        firstName: 'External',
        lastName: 'Contact',
        workPhone: '(555) 123-4567',
        fax: null,
        isInternal: false,
      } as any);

      const result = await findOrCreateExternalContact({
        email: 'external@company.com',
        firstName: 'External',
        lastName: 'Contact',
        phone: '5551234567',
      });

      expect(result.id).toBe('new-contact');
      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'external@company.com',
          isInternal: false,
          workPhone: '(555) 123-4567', // Normalized
        }),
      });
    });

    it('should update existing contact when found', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'existing-contact',
        email: 'existing@company.com',
        firstName: null,
        lastName: null,
        workPhone: null,
      } as any);
      mockPrisma.contact.update.mockResolvedValue({
        id: 'existing-contact',
        email: 'existing@company.com',
        firstName: 'Updated',
        lastName: 'Name',
        workPhone: '(555) 999-8888',
      } as any);

      const result = await findOrCreateExternalContact({
        email: 'existing@company.com',
        firstName: 'Updated',
        lastName: 'Name',
        phone: '(555) 999-8888',
      });

      expect(result.id).toBe('existing-contact');
      expect(mockPrisma.contact.update).toHaveBeenCalled();
    });

    it('should throw error for invalid email', async () => {
      await expect(
        findOrCreateExternalContact({
          email: 'invalid-email',
        })
      ).rejects.toThrow(PocServiceError);
    });

    it('should throw error for invalid phone', async () => {
      await expect(
        findOrCreateExternalContact({
          email: 'valid@email.com',
          phone: 'not-a-phone',
        })
      ).rejects.toThrow(PocServiceError);
    });
  });

  describe('getContactDetails', () => {
    it('should return contact with all POC fields', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'contact-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        workPhone: '(555) 123-4567',
        fax: '(555) 123-4568',
        jobTitle: 'Engineer',
        isInternal: false,
        emailSignature: null,
      } as any);

      const result = await getContactDetails('contact-1');

      expect(result).not.toBeNull();
      expect(result?.phone).toBe('(555) 123-4567');
      expect(result?.fax).toBe('(555) 123-4568');
      expect(result?.isInternal).toBe(false);
    });

    it('should return null for non-existent contact', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await getContactDetails('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('copyContactDetails', () => {
    it('should return formatted contact details for copying', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        firstName: 'Copy',
        lastName: 'Source',
        email: 'source@example.com',
        workPhone: '(555) 111-2222',
        fax: '(555) 111-2223',
        jobTitle: 'Manager',
      } as any);

      const result = await copyContactDetails('source-contact');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Copy Source');
      expect(result?.email).toBe('source@example.com');
      expect(result?.phone).toBe('(555) 111-2222');
    });

    it('should use email as name when no first/last name', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        firstName: null,
        lastName: null,
        email: 'noname@example.com',
        workPhone: null,
        fax: null,
        jobTitle: null,
      } as any);

      const result = await copyContactDetails('contact-no-name');

      expect(result?.name).toBe('noname@example.com');
    });
  });

  describe('validateInternalUser', () => {
    it('should return true for active internal user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        isInternal: true,
        active: true,
      } as any);

      const result = await validateInternalUser('internal-user');

      expect(result).toBe(true);
    });

    it('should return false for external user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        isInternal: false,
        active: true,
      } as any);

      const result = await validateInternalUser('external-user');

      expect(result).toBe(false);
    });

    it('should return false for inactive user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        isInternal: true,
        active: false,
      } as any);

      const result = await validateInternalUser('inactive-user');

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const result = await validateInternalUser('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('updateEmailSignature', () => {
    it('should update signature for internal user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'internal-user',
        isInternal: true,
      } as any);
      mockPrisma.contact.update.mockResolvedValue({} as any);

      await expect(
        updateEmailSignature('internal-user', 'New signature')
      ).resolves.not.toThrow();

      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'internal-user' },
        data: { emailSignature: 'New signature' },
      });
    });

    it('should throw error for non-internal user', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'external-user',
        isInternal: false,
      } as any);

      await expect(
        updateEmailSignature('external-user', 'Signature')
      ).rejects.toThrow('Only internal users can have email signatures');
    });
  });

  describe('searchExternalContacts', () => {
    it('should search external contacts only', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'ext-1',
          firstName: 'External',
          lastName: 'Person',
          email: 'ext@company.com',
          workPhone: '(555) 444-5555',
        },
      ] as any);

      const result = await searchExternalContacts('ext');

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('External Person');
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isInternal: false,
            active: true,
          }),
        })
      );
    });

    it('should return empty for short queries', async () => {
      const result = await searchExternalContacts('ab');
      expect(result).toEqual([]);
    });
  });
});
