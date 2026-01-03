/**
 * Document Generation Service Tests
 * Story 3.5: RTF Document Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDocument,
  getDocumentById,
  listNdaDocuments,
  DocumentGenerationError,
} from '../documentGenerationService.js';
import type { UserContext } from '../../types/auth.js';
import { ROLE_NAMES } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    nda: {
      findUnique: vi.fn(),
    },
    rtfTemplate: {
      findFirst: vi.fn(),
    },
    systemConfig: {
      findUnique: vi.fn(),
    },
    document: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

// Mock S3 service
vi.mock('../s3Service.js', () => ({
  uploadDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
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

vi.mock('../utils/scopedQuery.js', () => ({
  findNdaWithScope: vi.fn(),
}));

vi.mock('../ndaService.js', () => ({
  buildSecurityFilter: vi.fn().mockResolvedValue({}),
}));

import { prisma } from '../../db/index.js';
import { uploadDocument } from '../s3Service.js';
import { auditService } from '../auditService.js';
import { findNdaWithScope } from '../utils/scopedQuery.js';

const mockPrisma = prisma as any;
const mockUploadDocument = uploadDocument as any;
const mockAuditService = auditService as any;

describe('documentGenerationService', () => {
  // Sample user context
  const mockUserContext: UserContext = {
    id: 'user-1',
    email: 'test@example.com',
    contactId: 'contact-1',
    name: 'Test User',
    roles: [ROLE_NAMES.NDA_USER],
    permissions: new Set(['nda:create', 'nda:view', 'nda:update']),
    authorizedAgencyGroups: ['agency-dod', 'agency-nasa'],
    authorizedSubagencies: ['sub-army'],
  };

  // Admin context
  const adminContext: UserContext = {
    ...mockUserContext,
    roles: [ROLE_NAMES.ADMIN],
    permissions: new Set(),
  };

  // Sample NDA with relations
  const mockNda = {
    id: 'nda-123',
    displayId: 1001,
    companyName: 'Test Company Inc.',
    companyCity: 'Washington',
    companyState: 'DC',
    stateOfIncorporation: 'Delaware',
    agencyGroupId: 'agency-dod',
    subagencyId: 'sub-army',
    agencyOfficeName: 'Pentagon',
    abbreviatedName: 'TC-DOD-2024',
    authorizedPurpose: 'Software development services',
    effectiveDate: new Date('2024-01-15'),
    usMaxPosition: 'PRIME',
    ndaType: 'MUTUAL',
    isNonUsMax: false,
    agencyGroup: { name: 'Department of Defense' },
    subagency: { name: 'Army' },
    opportunityPoc: { firstName: 'John', lastName: 'Doe' },
    contractsPoc: { firstName: 'Jane', lastName: 'Smith' },
    relationshipPoc: { firstName: 'Bob', lastName: 'Johnson' },
    contactsPoc: { firstName: 'Pat', lastName: 'Lee' },
    createdById: 'contact-1',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.rtfTemplate.findFirst.mockResolvedValue({
      id: 'template-1',
      name: 'Default Template',
      content: Buffer.from('Hello {{companyName}}'),
    });
    mockPrisma.systemConfig.findUnique.mockResolvedValue(null);
    mockPrisma.document.aggregate.mockResolvedValue({
      _max: { versionNumber: 0 },
    } as any);
  });

  describe('generateDocument', () => {
    it('generates document successfully', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      mockPrisma.document.aggregate.mockResolvedValue({
        _max: { versionNumber: 2 },
      } as any);
      mockUploadDocument.mockResolvedValue({
        s3Key: 'ndas/nda-123/doc-456-NDA-001001-Test_Company_Inc.rtf',
        documentId: 'doc-456',
        bucket: 'usmax-nda-documents',
      });
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-456',
        ndaId: 'nda-123',
        filename: 'NDA-001001-Test_Company_Inc.rtf',
        s3Key: 'ndas/nda-123/doc-456-NDA-001001-Test_Company_Inc.rtf',
        documentType: 'GENERATED',
        uploadedById: 'contact-1',
        uploadedAt: new Date(),
      });

      const result = await generateDocument(
        { ndaId: 'nda-123' },
        mockUserContext
      );

      expect(result.documentId).toBe('doc-456');
      expect(result.filename).toContain('NDA-001001');
      expect(result.s3Key).toContain('nda-123');

      // Verify upload was called
      expect(mockUploadDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          ndaId: 'nda-123',
          filename: expect.stringContaining('NDA-001001'),
          content: expect.any(Buffer),
          contentType: 'application/rtf',
          uploadedById: 'contact-1',
          documentType: 'GENERATED',
          versionNumber: 3,
        })
      );

      // Verify document record was created
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ndaId: 'nda-123',
          documentType: 'GENERATED',
          uploadedById: 'contact-1',
          versionNumber: 3,
          fileSize: expect.any(Number),
          notes: expect.any(String),
        }),
      });

      // Verify audit log
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document_generated',
          entityType: 'document',
          entityId: 'doc-456',
        })
      );
    });

    it('throws error when NDA not found', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(
        generateDocument({ ndaId: 'nonexistent' }, mockUserContext)
      ).rejects.toThrow(DocumentGenerationError);

      await expect(
        generateDocument({ ndaId: 'nonexistent' }, mockUserContext)
      ).rejects.toMatchObject({ code: 'NDA_NOT_FOUND' });
    });

    it('denies access to unauthorized agency', async () => {
      const unauthorizedNda = {
        ...mockNda,
        agencyGroupId: 'agency-commercial', // Not in user's authorized agencies
        subagencyId: null,
      };
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(
        generateDocument({ ndaId: 'nda-123' }, mockUserContext)
      ).rejects.toThrow(DocumentGenerationError);
    });

    it('allows admin to access any agency', async () => {
      const unauthorizedNda = {
        ...mockNda,
        agencyGroupId: 'agency-commercial',
        subagencyId: null,
      };
      vi.mocked(findNdaWithScope).mockResolvedValue(unauthorizedNda as any);
      mockUploadDocument.mockResolvedValue({
        s3Key: 'test-key',
        documentId: 'doc-789',
        bucket: 'test-bucket',
      });
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-789',
        ndaId: 'nda-123',
        filename: 'test.rtf',
        s3Key: 'test-key',
        documentType: 'GENERATED',
      });

      const result = await generateDocument({ ndaId: 'nda-123' }, adminContext);

      expect(result.documentId).toBe('doc-789');
    });

    it('generates document without subagency', async () => {
      const ndaWithoutSubagency = {
        ...mockNda,
        subagencyId: null,
        subagency: null,
      };
      vi.mocked(findNdaWithScope).mockResolvedValue(ndaWithoutSubagency as any);
      mockUploadDocument.mockResolvedValue({
        s3Key: 'test-key',
        documentId: 'doc-123',
        bucket: 'test-bucket',
      });
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-123',
        filename: 'test.rtf',
        s3Key: 'test-key',
      });

      const result = await generateDocument({ ndaId: 'nda-123' }, mockUserContext);

      expect(result.documentId).toBe('doc-123');
    });

    it('generates document without optional fields', async () => {
      const minimalNda = {
        ...mockNda,
        companyCity: null,
        companyState: null,
        stateOfIncorporation: null,
        agencyOfficeName: null,
        effectiveDate: null,
        contractsPoc: null,
      };
      vi.mocked(findNdaWithScope).mockResolvedValue(minimalNda as any);
      mockUploadDocument.mockResolvedValue({
        s3Key: 'test-key',
        documentId: 'doc-123',
        bucket: 'test-bucket',
      });
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-123',
        filename: 'test.rtf',
        s3Key: 'test-key',
      });

      const result = await generateDocument({ ndaId: 'nda-123' }, mockUserContext);

      expect(result.documentId).toBe('doc-123');
    });
  });

  describe('getDocumentById', () => {
    it('returns document when user has access', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 'doc-123',
        ndaId: 'nda-123',
        filename: 'test.rtf',
        s3Key: 'ndas/nda-123/doc-123-test.rtf',
        documentType: 'GENERATED',
        uploadedAt: new Date(),
      });

      const result = await getDocumentById('doc-123', mockUserContext);

      expect(result).toBeDefined();
      expect(result?.id).toBe('doc-123');
      expect(result?.filename).toBe('test.rtf');
    });

    it('returns null when document not found', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const result = await getDocumentById('nonexistent', mockUserContext);

      expect(result).toBeNull();
    });

    it('returns null when user lacks access to NDA agency', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const result = await getDocumentById('doc-123', mockUserContext);

      expect(result).toBeNull();
    });

    it('allows admin to access any document', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 'doc-123',
        ndaId: 'nda-123',
        filename: 'test.rtf',
        s3Key: 'test-key',
        documentType: 'GENERATED',
        uploadedAt: new Date(),
      });

      const result = await getDocumentById('doc-123', adminContext);

      expect(result).toBeDefined();
    });
  });

  describe('listNdaDocuments', () => {
    it('returns documents for authorized NDA', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue({ id: 'nda-123' } as any);
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          filename: 'generated.rtf',
          s3Key: 'key1',
          documentType: 'GENERATED',
          uploadedAt: new Date('2024-01-15'),
          uploadedBy: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'doc-2',
          filename: 'uploaded.pdf',
          s3Key: 'key2',
          documentType: 'UPLOADED',
          uploadedAt: new Date('2024-01-16'),
          uploadedBy: { firstName: 'Jane', lastName: 'Smith' },
        },
      ]);

      const result = await listNdaDocuments('nda-123', mockUserContext);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('generated.rtf');
      expect(result[0].uploadedBy.firstName).toBe('John');
    });

    it('returns empty array when NDA not found', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      const result = await listNdaDocuments('nonexistent', mockUserContext);

      expect(result).toEqual([]);
    });

    it('returns empty array when user lacks access', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      const result = await listNdaDocuments('nda-123', mockUserContext);

      expect(result).toEqual([]);
    });

    it('allows admin to list any NDA documents', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue({ id: 'nda-123' } as any);
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          filename: 'test.rtf',
          s3Key: 'key1',
          documentType: 'GENERATED',
          uploadedAt: new Date(),
          uploadedBy: { firstName: 'Admin', lastName: 'User' },
        },
      ]);

      const result = await listNdaDocuments('nda-123', adminContext);

      expect(result).toHaveLength(1);
    });
  });
});
