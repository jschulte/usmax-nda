/**
 * Template Service Create Tests
 * Story 7.1: RTF Template Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTemplate, TemplateServiceError } from '../templateService.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    rtfTemplate: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    agencyGroup: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('../auditService.js', () => ({
  auditService: { log: vi.fn() },
  AuditAction: {
    RTF_TEMPLATE_CREATED: 'rtf_template_created',
    RTF_TEMPLATE_UPDATED: 'rtf_template_updated',
    RTF_TEMPLATE_DELETED: 'rtf_template_deleted',
  },
}));

vi.mock('../utils/scopedQuery.js', () => ({
  findNdaWithScope: vi.fn(),
}));

vi.mock('../s3Service.js', () => ({
  uploadDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

vi.mock('../templatePreviewService.js', () => ({
  extractPlaceholders: vi.fn().mockReturnValue([]),
  validatePlaceholders: vi.fn().mockReturnValue([]),
  SAMPLE_MERGE_FIELDS: {},
}));

vi.mock('@jonahschulte/rtf-toolkit', () => ({
  parseRTF: vi.fn(),
  toHTML: vi.fn(),
}));

vi.mock('../utils/versionNumberHelper.js', () => ({
  getNextVersionNumber: vi.fn().mockReturnValue(1),
}));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
});

describe('createTemplate', () => {
  const validRtfContent = Buffer.from('{\\rtf1\\ansi}{\\b Test}');

  it('rejects blank template names', async () => {
    await expect(
      createTemplate(
        { name: '  ', content: validRtfContent },
        'user-1'
      )
    ).rejects.toThrow(TemplateServiceError);
  });

  it('rejects duplicate template names (case-insensitive)', async () => {
    prismaMock.rtfTemplate.findFirst.mockResolvedValue({ id: 'existing-1' });

    await expect(
      createTemplate(
        { name: 'Master NDA', content: validRtfContent },
        'user-1'
      )
    ).rejects.toThrow('Template name already exists');
  });

  it('rejects invalid agency group', async () => {
    prismaMock.rtfTemplate.findFirst.mockResolvedValue(null);
    prismaMock.agencyGroup.findUnique.mockResolvedValue(null);

    await expect(
      createTemplate(
        {
          name: 'Template',
          content: validRtfContent,
          agencyGroupId: 'missing-group',
        },
        'user-1'
      )
    ).rejects.toThrow('Agency group not found');
  });

  it('creates template and audit log', async () => {
    prismaMock.rtfTemplate.findFirst.mockResolvedValue(null);
    prismaMock.agencyGroup.findUnique.mockResolvedValue({ id: 'group-1' });
    prismaMock.rtfTemplate.create.mockResolvedValue({
      id: 'template-1',
      name: 'Template',
      description: null,
      agencyGroupId: 'group-1',
      isDefault: false,
      isActive: true,
    });

    const result = await createTemplate(
      {
        name: 'Template',
        description: 'Desc',
        content: validRtfContent,
        htmlSource: Buffer.from('<p>Test</p>'),
        agencyGroupId: 'group-1',
        isDefault: true,
      },
      'user-1',
      { ipAddress: '127.0.0.1', userAgent: 'test' }
    );

    expect(result).toEqual({ id: 'template-1', name: 'Template' });
    expect(prismaMock.rtfTemplate.updateMany).toHaveBeenCalled();
    expect(prismaMock.rtfTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Template',
          htmlSource: expect.any(Uint8Array),
          isDefault: true,
        }),
      })
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });
});
