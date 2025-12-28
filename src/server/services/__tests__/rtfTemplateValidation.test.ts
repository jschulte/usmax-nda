/**
 * RTF Template Validation Tests
 * Story 9.18: RTF Template Rich Text Editor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTemplate, updateTemplate, TemplateServiceError } from '../templateService.js';
import type { UserContext } from '../../types/auth.js';
import {
  invalidRtfContent,
  sampleRtfContentWithUnknownPlaceholder,
} from '../../../test/factories/rtfTemplateFactory';

vi.mock('../../db/index.js', () => ({
  prisma: {
    rtfTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../db/index.js';
const mockPrisma = prisma as any;

const mockUserContext: UserContext = {
  userId: 'user-1',
  id: 'user-1',
  email: 'admin@usmax.com',
  contactId: 'contact-1',
  permissions: new Set(['admin:manage_templates']),
  authorizedAgencyGroups: [],
  authorizedSubagencies: [],
};

describe('RTF template validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid RTF content on create', async () => {
    await expect(
      createTemplate(
        {
          name: 'Invalid Template',
          content: invalidRtfContent,
        },
        mockUserContext
      )
    ).rejects.toBeInstanceOf(TemplateServiceError);

    await expect(
      createTemplate(
        {
          name: 'Invalid Template',
          content: invalidRtfContent,
        },
        mockUserContext
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(mockPrisma.rtfTemplate.create).not.toHaveBeenCalled();
  });

  it('rejects unknown placeholders on create', async () => {
    await expect(
      createTemplate(
        {
          name: 'Unknown Placeholder',
          content: sampleRtfContentWithUnknownPlaceholder,
        },
        mockUserContext
      )
    ).rejects.toBeInstanceOf(TemplateServiceError);

    await expect(
      createTemplate(
        {
          name: 'Unknown Placeholder',
          content: sampleRtfContentWithUnknownPlaceholder,
        },
        mockUserContext
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(mockPrisma.rtfTemplate.create).not.toHaveBeenCalled();
  });

  it('rejects invalid RTF content on update', async () => {
    mockPrisma.rtfTemplate.findUnique.mockResolvedValue({
      id: 'template-1',
      name: 'Template 1',
      content: Buffer.from('{\\rtf1\\ansi ok}'),
      agencyGroupId: null,
      isDefault: false,
      isActive: true,
    });

    await expect(
      updateTemplate('template-1', {
        content: invalidRtfContent,
      })
    ).rejects.toBeInstanceOf(TemplateServiceError);

    await expect(
      updateTemplate('template-1', {
        content: invalidRtfContent,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(mockPrisma.rtfTemplate.update).not.toHaveBeenCalled();
  });

  it('rejects unknown placeholders on update', async () => {
    mockPrisma.rtfTemplate.findUnique.mockResolvedValue({
      id: 'template-1',
      name: 'Template 1',
      content: Buffer.from('{\\rtf1\\ansi ok}'),
      agencyGroupId: null,
      isDefault: false,
      isActive: true,
    });

    await expect(
      updateTemplate('template-1', {
        content: sampleRtfContentWithUnknownPlaceholder,
      })
    ).rejects.toBeInstanceOf(TemplateServiceError);

    await expect(
      updateTemplate('template-1', {
        content: sampleRtfContentWithUnknownPlaceholder,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(mockPrisma.rtfTemplate.update).not.toHaveBeenCalled();
  });
});
