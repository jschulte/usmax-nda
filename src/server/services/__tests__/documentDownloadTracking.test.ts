/**
 * Document Download Tracking Tests
 * Story 6.3: Verify audit logging for document downloads
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService, AuditAction } from '../auditService.js';
import type { UserContext } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => {
  const prismaMock = {
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    nda: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    agencyGroupGrant: {
      findMany: vi.fn(),
    },
    subagencyGrant: {
      findMany: vi.fn(),
    },
  };

  return { prisma: prismaMock, default: prismaMock };
});

// Mock ndaService
vi.mock('../ndaService.js', () => ({
  buildSecurityFilter: vi.fn().mockResolvedValue({}),
}));

// Mock userContextService
vi.mock('../userContextService.js', () => ({
  getAuthorizedSubagencyIdsByContactId: vi.fn().mockResolvedValue([]),
}));

// Mock S3 Service
vi.mock('../s3Service.js', () => ({
  getDownloadUrl: vi.fn(),
  getDocumentContent: vi.fn(),
  S3ServiceError: class S3ServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('../zipService.js', () => ({
  createDocumentZip: vi.fn(),
}));

// Mock auditService
vi.mock('../auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../auditService.js')>('../auditService.js');
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock scopedQuery
vi.mock('../../utils/scopedQuery.js', () => ({
  findNdaWithScope: vi.fn(),
}));

describe('Document Download Tracking', () => {
  const mockUserContext: UserContext = {
    id: 'cognito-123',
    email: 'test@example.com',
    contactId: 'contact-456',
    name: 'Test User',
    roles: ['NDA User'],
    permissions: new Set(['nda:view']),
    authorizedAgencyGroups: ['group-1'],
    authorizedSubagencies: ['sub-1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentDownloadUrl', () => {
    it('should log audit entry with all required fields', async () => {
      const { getDocumentDownloadUrl } = await import('../documentService.js');
      const { prisma } = await import('../../db/index.js');
      const { getDownloadUrl } = await import('../s3Service.js');

      const mockDocument = {
        id: 'doc-123',
        filename: 'nda_draft_v1.rtf',
        s3Key: 'documents/abc-123/nda.rtf',
        ndaId: 'nda-456',
        nda: {
          id: 'nda-456',
          displayId: 'NDA-2024-001',
        },
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      await getDocumentDownloadUrl('doc-123', mockUserContext, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Verify audit log called with all required fields
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOCUMENT_DOWNLOADED,
          entityType: 'document',
          entityId: 'doc-123',
          userId: 'contact-456',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: expect.objectContaining({
            ndaId: 'nda-456',
            ndaDisplayId: 'NDA-2024-001',
            filename: 'nda_draft_v1.rtf',
          }),
        })
      );
    });

    it('should log audit BEFORE generating pre-signed URL (AC2 compliance)', async () => {
      const { getDocumentDownloadUrl } = await import('../documentService.js');
      const { prisma } = await import('../../db/index.js');
      const { getDownloadUrl } = await import('../s3Service.js');

      const callOrder: string[] = [];

      const mockDocument = {
        id: 'doc-123',
        filename: 'test.rtf',
        s3Key: 'documents/test.rtf',
        ndaId: 'nda-456',
        nda: { id: 'nda-456', displayId: 'NDA-001' },
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);

      vi.mocked(auditService.log).mockImplementation(async () => {
        callOrder.push('audit-log');
      });

      vi.mocked(getDownloadUrl).mockImplementation(async () => {
        callOrder.push('generate-url');
        return 'https://s3.amazonaws.com/url';
      });

      await getDocumentDownloadUrl('doc-123', mockUserContext);

      // Verify audit log was called BEFORE URL generation
      expect(callOrder).toEqual(['audit-log', 'generate-url']);
    });

    it('should still return download URL even if audit logging fails', async () => {
      const { getDocumentDownloadUrl } = await import('../documentService.js');
      const { prisma } = await import('../../db/index.js');
      const { getDownloadUrl } = await import('../s3Service.js');

      const mockDocument = {
        id: 'doc-123',
        filename: 'test.rtf',
        s3Key: 'documents/test.rtf',
        ndaId: 'nda-456',
        nda: { id: 'nda-456', displayId: 'NDA-001' },
      };

      vi.mocked(prisma.document.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(auditService.log).mockRejectedValue(new Error('Database unavailable'));
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/url');

      // Should not throw - download should still work
      const result = await getDocumentDownloadUrl('doc-123', mockUserContext);

      expect(result.url).toBe('https://s3.amazonaws.com/url');
      expect(result.filename).toBe('test.rtf');
    });
  });

  describe('createBulkDownload (ZIP)', () => {
    it('should call audit logging with correct parameters for ZIP downloads', async () => {
      const { createBulkDownload } = await import('../documentService.js');
      const { findNdaWithScope } = await import('../../utils/scopedQuery.js');
      const { prisma } = await import('../../db/index.js');
      const { createDocumentZip } = await import('../zipService.js');
      const { PassThrough } = await import('stream');

      const mockNda = {
        id: 'nda-456',
        displayId: 'NDA-2024-001',
        companyName: 'ACME Corporation',
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'v1.rtf',
          s3Key: 'docs/v1.rtf',
          versionNumber: 1,
          uploadedAt: new Date(),
        },
        {
          id: 'doc-2',
          filename: 'v2.rtf',
          s3Key: 'docs/v2.rtf',
          versionNumber: 2,
          uploadedAt: new Date(),
        },
      ];

      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as any);
      vi.mocked(createDocumentZip).mockResolvedValue({
        stream: new PassThrough(),
        filename: 'NDA-NDA-2024-001-ACME-Corporation-All-Versions.zip',
      } as any);

      // Reset auditService.log mock to return success
      vi.mocked(auditService.log).mockResolvedValue(undefined);

      const result = await createBulkDownload('nda-456', mockUserContext, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Verify audit log was called with ZIP download details
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOCUMENT_BULK_DOWNLOADED,
          entityType: 'nda',
          entityId: 'nda-456',
          userId: 'contact-456',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          details: expect.objectContaining({
            ndaId: 'nda-456',
            ndaDisplayId: 'NDA-2024-001',
            downloadType: 'bulk_zip',
            documentCount: 2,
            documentIds: ['doc-1', 'doc-2'],
          }),
        })
      );

      // Verify ZIP stream returned
      expect(result.stream).toBeDefined();
      expect(result.filename).toContain('NDA-2024-001');
      expect(result.documentCount).toBe(2);
    });
  });
});
