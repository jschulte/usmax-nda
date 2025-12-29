/**
 * Template Service Tests
 * Story 3.13: RTF Template Selection & Preview
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTemplatesForNda,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  TemplateServiceError,
} from '../templateService.js';
import type { UserContext } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    rtfTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    nda: {
      findUnique: vi.fn(),
    },
    document: {
      create: vi.fn(),
    },
  },
}));

// Mock S3 service
vi.mock('../s3Service.js', () => ({
  uploadDocument: vi.fn().mockResolvedValue({
    documentId: 'doc-123',
    s3Key: 'ndas/nda-123/doc.docx',
  }),
  generatePresignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    DOCUMENT_GENERATED: 'document_generated',
  },
}));

import { prisma } from '../../db/index.js';
const mockPrisma = vi.mocked(prisma);

describe('Template Service', () => {
  const mockUserContext: UserContext = {
    userId: 'user-123',
    id: 'user-123',
    email: 'user@test.com',
    contactId: 'contact-123',
    permissions: new Set(['nda:view', 'nda:create']),
    authorizedAgencyGroups: ['agency-1', 'agency-2'],
    authorizedSubagencies: ['sub-1', 'sub-2'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemplatesForNda', () => {
    it('should return templates with recommendations for agency', async () => {
      mockPrisma.rtfTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'DoD Standard NDA',
          description: 'Default for DoD',
          content: Buffer.from('template content'),
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-1',
        },
        {
          id: 'template-2',
          name: 'Generic USmax NDA',
          description: 'Generic template',
          content: Buffer.from('template content'),
          agencyGroupId: null,
          agencyGroup: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-1',
        },
      ] as any);

      const templates = await getTemplatesForNda('agency-1');

      expect(templates).toHaveLength(2);
      // Agency-specific template is recommended
      expect(templates[0].isRecommended).toBe(true);
      // Generic default is also recommended
      expect(templates[1].isRecommended).toBe(true);
    });

    it('should mark non-matching templates as not recommended', async () => {
      mockPrisma.rtfTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'DoD Standard NDA',
          description: 'Default for DoD',
          content: Buffer.from('template content'),
          agencyGroupId: 'agency-1',
          agencyGroup: { id: 'agency-1', name: 'DoD', code: 'DOD' },
          isDefault: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-1',
        },
      ] as any);

      // Request templates for a different agency
      const templates = await getTemplatesForNda('agency-2');

      expect(templates).toHaveLength(1);
      expect(templates[0].isRecommended).toBe(false);
    });
  });

  describe('listTemplates', () => {
    it('should return all active templates', async () => {
      mockPrisma.rtfTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Template 1',
          description: null,
          content: Buffer.from('content'),
          agencyGroupId: null,
          agencyGroup: null,
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: null,
        },
      ] as any);

      const templates = await listTemplates();

      expect(templates).toHaveLength(1);
      expect(mockPrisma.rtfTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should include inactive templates when requested', async () => {
      mockPrisma.rtfTemplate.findMany.mockResolvedValue([]);

      await listTemplates(true);

      expect(mockPrisma.rtfTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe('getTemplate', () => {
    it('should return template with content', async () => {
      const content = Buffer.from('RTF content');
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue({
        id: 'template-1',
        name: 'Test Template',
        description: 'A test',
        content,
        agencyGroupId: null,
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
      } as any);

      const template = await getTemplate('template-1');

      expect(template).not.toBeNull();
      expect(template?.content).toBeInstanceOf(Buffer);
      expect(template?.name).toBe('Test Template');
    });

    it('should return null for non-existent template', async () => {
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue(null);

      const template = await getTemplate('nonexistent');

      expect(template).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      mockPrisma.rtfTemplate.create.mockResolvedValue({
        id: 'new-template',
        name: 'New Template',
        description: null,
        content: Buffer.from('content'),
        agencyGroupId: null,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'contact-123',
      } as any);

      const result = await createTemplate(
        {
          name: 'New Template',
          content: Buffer.from('content'),
        },
        mockUserContext
      );

      expect(result.name).toBe('New Template');
      expect(mockPrisma.rtfTemplate.create).toHaveBeenCalled();
    });

    it('should unset other defaults when creating default template', async () => {
      mockPrisma.rtfTemplate.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.rtfTemplate.create.mockResolvedValue({
        id: 'new-default',
        name: 'New Default',
        description: null,
        content: Buffer.from('content'),
        agencyGroupId: null,
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'contact-123',
      } as any);

      await createTemplate(
        {
          name: 'New Default',
          content: Buffer.from('content'),
          isDefault: true,
        },
        mockUserContext
      );

      expect(mockPrisma.rtfTemplate.updateMany).toHaveBeenCalledWith({
        where: {
          isDefault: true,
          agencyGroupId: null,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template properties', async () => {
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue({
        id: 'template-1',
        name: 'Old Name',
        agencyGroupId: null,
      } as any);

      mockPrisma.rtfTemplate.update.mockResolvedValue({
        id: 'template-1',
        name: 'New Name',
      } as any);

      const result = await updateTemplate('template-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw NOT_FOUND for non-existent template', async () => {
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue(null);

      await expect(
        updateTemplate('nonexistent', { name: 'Test' })
      ).rejects.toThrow(TemplateServiceError);
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete template by setting isActive to false', async () => {
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue({
        id: 'template-1',
        name: 'Template',
        isActive: true,
      } as any);

      mockPrisma.rtfTemplate.update.mockResolvedValue({
        id: 'template-1',
        isActive: false,
      } as any);

      await deleteTemplate('template-1');

      expect(mockPrisma.rtfTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { isActive: false },
      });
    });

    it('should throw NOT_FOUND for non-existent template', async () => {
      mockPrisma.rtfTemplate.findUnique.mockResolvedValue(null);

      await expect(deleteTemplate('nonexistent')).rejects.toThrow(TemplateServiceError);
    });
  });
});
