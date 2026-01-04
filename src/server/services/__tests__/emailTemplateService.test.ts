/**
 * Email Template Service Tests
 * Story 7.6: Email Template Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = vi.hoisted(() => ({
  emailTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => {
  const prismaMock = {
    emailTemplate: mockTx.emailTemplate,
  };

  return { prisma: prismaMock, default: prismaMock };
});

import {
  listEmailTemplates,
  getEmailTemplate,
  getDefaultEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
} from '../emailTemplateService.js';
import { prisma } from '../../db/index.js';

const mockPrisma = vi.mocked(prisma);

describe('Email Template Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEmailTemplates', () => {
    it('lists active templates by default', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([
        { id: 'tmpl-1', name: 'Default', description: null, isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const results = await listEmailTemplates();

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(results).toHaveLength(1);
    });

    it('lists all templates when includeInactive is true', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);

      await listEmailTemplates(true);

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('getEmailTemplate', () => {
    it('returns template details when found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Standard',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getEmailTemplate('tmpl-1');

      expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalled();
      expect(result?.id).toBe('tmpl-1');
    });

    it('returns null when template missing', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      const result = await getEmailTemplate('missing');
      expect(result).toBeNull();
    });
  });

  describe('getDefaultEmailTemplate', () => {
    it('returns first active template ordered by default then name', async () => {
      mockPrisma.emailTemplate.findFirst.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Default',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getDefaultEmailTemplate();

      expect(mockPrisma.emailTemplate.findFirst).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          subject: true,
          body: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result?.isDefault).toBe(true);
    });
  });

  describe('createEmailTemplate', () => {
    it('unsets existing default when creating new default', async () => {
      mockPrisma.emailTemplate.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.emailTemplate.create.mockResolvedValue({
        id: 'tmpl-1',
        name: 'New Default',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createEmailTemplate({
        name: 'New Default',
        subject: 'Subject',
        body: 'Body',
        isDefault: true,
      });

      expect(mockPrisma.emailTemplate.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });

    it('does not unset defaults when creating non-default', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue({
        id: 'tmpl-2',
        name: 'Non Default',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createEmailTemplate({
        name: 'Non Default',
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
      });

      expect(mockPrisma.emailTemplate.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updateEmailTemplate', () => {
    it('unsets other defaults when setting template as default', async () => {
      mockPrisma.emailTemplate.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.emailTemplate.update.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Updated',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updateEmailTemplate('tmpl-1', { isDefault: true });

      expect(mockPrisma.emailTemplate.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true, NOT: { id: 'tmpl-1' } },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });

    it('does not unset defaults when isDefault not provided', async () => {
      mockPrisma.emailTemplate.update.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Updated',
        description: null,
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await updateEmailTemplate('tmpl-1', { name: 'Updated' });

      expect(mockPrisma.emailTemplate.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmailTemplate', () => {
    it('throws when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(deleteEmailTemplate('missing')).rejects.toThrow('Template not found');
    });

    it('throws when trying to delete default template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ isDefault: true });

      await expect(deleteEmailTemplate('tmpl-1')).rejects.toThrow('Cannot delete the default template');
    });

    it('soft deletes non-default template', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ isDefault: false });
      mockPrisma.emailTemplate.update.mockResolvedValue({ id: 'tmpl-1' });

      await deleteEmailTemplate('tmpl-1');

      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: { isActive: false },
      });
    });
  });

  describe('duplicateEmailTemplate', () => {
    it('throws when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(duplicateEmailTemplate('missing')).rejects.toThrow('Template not found');
    });

    it('creates a non-default active copy with "(Copy)" suffix', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({
        name: 'Standard NDA',
        description: 'Default template',
        subject: 'Subject',
        body: 'Body',
      });
      mockPrisma.emailTemplate.create.mockResolvedValue({
        id: 'tmpl-copy',
        name: 'Standard NDA (Copy)',
        description: 'Default template',
        subject: 'Subject',
        body: 'Body',
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await duplicateEmailTemplate('tmpl-1');

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: {
          name: 'Standard NDA (Copy)',
          description: 'Default template',
          subject: 'Subject',
          body: 'Body',
          isDefault: false,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          subject: true,
          body: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result.isDefault).toBe(false);
      expect(result.isActive).toBe(true);
    });
  });
});
