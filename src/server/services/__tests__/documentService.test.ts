/**
 * Document Service Tests
 * Story 4.1-4.6: Document Management & Execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFileType,
  validateFileSize,
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  DocumentServiceError,
} from '../documentService.js';

// Mock dependencies
vi.mock('../../db/index.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    nda: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../s3Service.js', () => ({
  uploadDocument: vi.fn(),
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

vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    DOCUMENT_UPLOADED: 'document_uploaded',
    DOCUMENT_DOWNLOADED: 'document_downloaded',
    DOCUMENT_MARKED_EXECUTED: 'document_marked_executed',
    NDA_STATUS_CHANGED: 'nda_status_changed',
  },
}));

vi.mock('../statusTransitionService.js', () => ({
  transitionStatus: vi.fn(),
  isValidTransition: vi.fn(),
  StatusTrigger: {
    FULLY_EXECUTED_UPLOAD: 'fully_executed_upload',
    MANUAL_CHANGE: 'manual_change',
  },
}));

vi.mock('../../utils/scopedQuery.js', () => ({
  findNdaWithScope: vi.fn(),
}));

vi.mock('../ndaService.js', () => ({
  buildSecurityFilter: vi.fn().mockResolvedValue({}),
}));

import { prisma } from '../../db/index.js';
import { uploadDocument, getDownloadUrl } from '../s3Service.js';
import { auditService } from '../auditService.js';
import { transitionStatus, isValidTransition } from '../statusTransitionService.js';
import { findNdaWithScope } from '../../utils/scopedQuery.js';
import {
  uploadNdaDocument,
  getNdaDocuments,
  getDocumentDownloadUrl,
  getDocument,
  markDocumentFullyExecuted,
} from '../documentService.js';
import type { UserContext } from '../../types/auth.js';

// Test fixtures
const mockUserContext: UserContext = {
  contactId: 'contact-123',
  email: 'test@example.com',
  cognitoSub: 'cognito-sub-123',
  permissions: new Set(['nda:view', 'nda:create', 'nda:update']),
  authorizedAgencyGroups: ['agency-group-1'],
  authorizedSubagencies: [],
  roles: ['AGENCY_USER'],
};

const mockAdminContext: UserContext = {
  ...mockUserContext,
  permissions: new Set(['admin:manage_agencies']),
};

const mockStatusContext: UserContext = {
  ...mockUserContext,
  permissions: new Set(['nda:view', 'nda:create', 'nda:update', 'nda:mark_status']),
};

const mockNda = {
  id: 'nda-123',
  displayId: 1001,
  status: 'CREATED',
  agencyGroupId: 'agency-group-1',
  subagencyId: null,
};

const mockDocument = {
  id: 'doc-123',
  ndaId: 'nda-123',
  filename: 'test-document.pdf',
  s3Key: 'documents/nda-123/test-document.pdf',
  s3Region: 'us-east-1',
  fileType: 'application/pdf',
  fileSize: 1024,
  documentType: 'UPLOADED',
  isFullyExecuted: false,
  versionNumber: 1,
  notes: 'Test upload',
  uploadedById: 'contact-123',
  uploadedAt: new Date(),
  uploadedBy: {
    id: 'contact-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  },
};

describe('Document Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)
    );
  });

  describe('File Validation', () => {
    describe('validateFileType', () => {
      it('should accept valid PDF files', () => {
        expect(() => validateFileType('document.pdf', 'application/pdf')).not.toThrow();
      });

      it('should accept valid RTF files', () => {
        expect(() => validateFileType('document.rtf', 'application/rtf')).not.toThrow();
        expect(() => validateFileType('document.rtf', 'text/rtf')).not.toThrow();
      });

      it('should accept valid DOCX files', () => {
        expect(() =>
          validateFileType(
            'document.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )
        ).not.toThrow();
      });

      it('should accept valid DOC files', () => {
        expect(() => validateFileType('document.doc', 'application/msword')).not.toThrow();
      });

      it('should reject invalid file extensions', () => {
        expect(() => validateFileType('document.exe', 'application/pdf')).toThrow(
          DocumentServiceError
        );
        expect(() => validateFileType('document.js', 'text/javascript')).toThrow(
          DocumentServiceError
        );
        expect(() => validateFileType('document.txt', 'text/plain')).toThrow(
          DocumentServiceError
        );
      });

      it('should reject invalid MIME types', () => {
        expect(() => validateFileType('document.pdf', 'text/plain')).toThrow(
          DocumentServiceError
        );
        expect(() => validateFileType('document.pdf', 'application/json')).toThrow(
          DocumentServiceError
        );
      });

      it('should handle case-insensitive extensions', () => {
        expect(() => validateFileType('document.PDF', 'application/pdf')).not.toThrow();
        expect(() => validateFileType('document.Pdf', 'application/pdf')).not.toThrow();
        expect(() => validateFileType('DOCUMENT.DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).not.toThrow();
      });

      it('should handle files with multiple dots in name', () => {
        expect(() => validateFileType('my.document.v2.pdf', 'application/pdf')).not.toThrow();
        expect(() => validateFileType('draft.nda.2024.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).not.toThrow();
      });
    });

    describe('validateFileSize', () => {
      it('should accept files within size limit', () => {
        expect(() => validateFileSize(1024)).not.toThrow();
        expect(() => validateFileSize(MAX_FILE_SIZE)).not.toThrow();
        expect(() => validateFileSize(MAX_FILE_SIZE - 1)).not.toThrow();
      });

      it('should reject files exceeding size limit', () => {
        expect(() => validateFileSize(MAX_FILE_SIZE + 1)).toThrow(DocumentServiceError);
        expect(() => validateFileSize(100 * 1024 * 1024)).toThrow(DocumentServiceError);
      });

      it('should have correct error code for oversized files', () => {
        try {
          validateFileSize(MAX_FILE_SIZE + 1);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentServiceError);
          expect((error as DocumentServiceError).code).toBe('FILE_TOO_LARGE');
        }
      });
    });

    describe('Constants', () => {
      it('should have correct allowed file types', () => {
        expect(ALLOWED_FILE_TYPES).toContain('application/pdf');
        expect(ALLOWED_FILE_TYPES).toContain('application/rtf');
        expect(ALLOWED_FILE_TYPES).toContain('text/rtf');
        expect(ALLOWED_FILE_TYPES).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(ALLOWED_FILE_TYPES).toContain('application/msword');
      });

      it('should have correct allowed extensions', () => {
        expect(ALLOWED_EXTENSIONS).toContain('.pdf');
        expect(ALLOWED_EXTENSIONS).toContain('.rtf');
        expect(ALLOWED_EXTENSIONS).toContain('.docx');
        expect(ALLOWED_EXTENSIONS).toContain('.doc');
      });

      it('should have 50MB max file size', () => {
        expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
      });
    });
  });

  describe('uploadNdaDocument', () => {
    it('should upload document successfully', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.aggregate).mockResolvedValue({
        _max: { versionNumber: null },
      } as any);
      vi.mocked(uploadDocument).mockResolvedValue({
        s3Key: 'documents/nda-123/test.pdf',
        etag: 'abc123',
      });
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...mockDocument,
        versionNumber: 1,
      } as any);

      const result = await uploadNdaDocument(
        {
          ndaId: 'nda-123',
          filename: 'test.pdf',
          content: Buffer.from('test content'),
          contentType: 'application/pdf',
          fileSize: 1024,
          notes: 'Test upload',
        },
        mockUserContext
      );

      expect(result.filename).toBe('test-document.pdf');
      expect(result.versionNumber).toBe(1);
      expect(uploadDocument).toHaveBeenCalledWith({
        ndaId: 'nda-123',
        filename: 'test.pdf',
        content: expect.any(Buffer),
        contentType: 'application/pdf',
        uploadedById: mockUserContext.contactId,
        documentType: 'UPLOADED',
        versionNumber: 1,
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should increment version number for subsequent uploads', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.aggregate).mockResolvedValue({
        _max: { versionNumber: 3 },
      } as any);
      vi.mocked(uploadDocument).mockResolvedValue({
        s3Key: 'documents/nda-123/test.pdf',
        etag: 'abc123',
      });
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...mockDocument,
        versionNumber: 4,
      } as any);

      const result = await uploadNdaDocument(
        {
          ndaId: 'nda-123',
          filename: 'test.pdf',
          content: Buffer.from('test content'),
          contentType: 'application/pdf',
          fileSize: 1024,
        },
        mockUserContext
      );

      expect(result.versionNumber).toBe(4);
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Uploaded by ${mockUserContext.email}`,
          }),
        })
      );
    });

    it('should reject upload to non-existent NDA', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(
        uploadNdaDocument(
          {
            ndaId: 'nda-invalid',
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf',
            fileSize: 1024,
          },
          mockUserContext
        )
      ).rejects.toThrow('NDA not found');
    });

    it('should reject upload when NDA is not accessible', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(
        uploadNdaDocument(
          {
            ndaId: 'nda-123',
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf',
            fileSize: 1024,
          },
          mockUserContext
        )
      ).rejects.toThrow('NDA not found');
    });

    it('should allow admin to upload to any NDA', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue({
        ...mockNda,
        agencyGroupId: 'other-agency-group',
      } as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
      vi.mocked(uploadDocument).mockResolvedValue({
        s3Key: 'documents/nda-123/test.pdf',
        etag: 'abc123',
      });
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);

      const result = await uploadNdaDocument(
        {
          ndaId: 'nda-123',
          filename: 'test.pdf',
          content: Buffer.from('test content'),
          contentType: 'application/pdf',
          fileSize: 1024,
        },
        mockAdminContext
      );

      expect(result).toBeDefined();
    });

    it('should mark document as fully executed when flag is set', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
      vi.mocked(uploadDocument).mockResolvedValue({
        s3Key: 'documents/nda-123/test.pdf',
        etag: 'abc123',
      });
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...mockDocument,
        isFullyExecuted: true,
        documentType: 'FULLY_EXECUTED',
      } as any);
      vi.mocked(transitionStatus).mockResolvedValue(undefined);

      const result = await uploadNdaDocument(
        {
          ndaId: 'nda-123',
          filename: 'test.pdf',
          content: Buffer.from('test content'),
          contentType: 'application/pdf',
          fileSize: 1024,
          isFullyExecuted: true,
        },
        mockStatusContext
      );

      expect(result.isFullyExecuted).toBe(true);
      expect(transitionStatus).toHaveBeenCalled();
    });

    it('should reject fully executed upload without status permission', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);

      await expect(
        uploadNdaDocument(
          {
            ndaId: 'nda-123',
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf',
            fileSize: 1024,
            isFullyExecuted: true,
          },
          mockUserContext
        )
      ).rejects.toThrow('Permission denied');
    });

    it('should reject invalid file types', async () => {
      await expect(
        uploadNdaDocument(
          {
            ndaId: 'nda-123',
            filename: 'test.exe',
            content: Buffer.from('test content'),
            contentType: 'application/x-executable',
            fileSize: 1024,
          },
          mockUserContext
        )
      ).rejects.toThrow('Invalid file');
    });

    it('should reject oversized files', async () => {
      await expect(
        uploadNdaDocument(
          {
            ndaId: 'nda-123',
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf',
            fileSize: MAX_FILE_SIZE + 1,
          },
          mockUserContext
        )
      ).rejects.toThrow('File size exceeds');
    });
  });

  describe('getNdaDocuments', () => {
    it('should return documents for accessible NDA', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument] as any);

      const result = await getNdaDocuments('nda-123', mockUserContext);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test-document.pdf');
    });

    it('should order documents by upload date descending', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(mockNda as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument] as any);

      await getNdaDocuments('nda-123', mockUserContext);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploadedAt: 'desc' },
        })
      );
    });

    it('should reject access to non-existent NDA', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(getNdaDocuments('nda-invalid', mockUserContext)).rejects.toThrow('NDA not found');
    });

    it('should reject access when NDA is not accessible', async () => {
      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(getNdaDocuments('nda-123', mockUserContext)).rejects.toThrow('NDA not found');
    });
  });

  describe('getDocumentDownloadUrl', () => {
    it('should return pre-signed URL for accessible document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      const result = await getDocumentDownloadUrl('doc-123', mockUserContext);

      expect(result.url).toBe('https://s3.amazonaws.com/presigned-url');
      expect(result.filename).toBe('test-document.pdf');
      expect(getDownloadUrl).toHaveBeenCalledWith(mockDocument.s3Key, 900, mockDocument.s3Region || undefined);
    });

    it('should respect custom expiresIn when provided', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      await getDocumentDownloadUrl('doc-123', mockUserContext, undefined, 300);

      expect(getDownloadUrl).toHaveBeenCalledWith(mockDocument.s3Key, 300, mockDocument.s3Region || undefined);
    });

    it('should log audit entry for download', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      await getDocumentDownloadUrl('doc-123', mockUserContext, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test/1.0',
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document_downloaded',
          entityType: 'document',
          entityId: 'doc-123',
        })
      );
    });

    it('should reject access to non-existent document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(getDocumentDownloadUrl('doc-invalid', mockUserContext)).rejects.toThrow(
        'Document not found'
      );
    });

    it('should reject access when document is not accessible', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(getDocumentDownloadUrl('doc-123', mockUserContext)).rejects.toThrow(
        'Document not found'
      );
    });
  });

  describe('getDocument', () => {
    it('should return document for accessible document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);

      const result = await getDocument('doc-123', mockUserContext);

      expect(result).not.toBeNull();
      expect(result?.filename).toBe('test-document.pdf');
    });

    it('should return null for non-existent document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      const result = await getDocument('doc-invalid', mockUserContext);

      expect(result).toBeNull();
    });

    it('should return null when document is not accessible', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      const result = await getDocument('doc-123', mockUserContext);

      expect(result).toBeNull();
    });
  });

  describe('markDocumentFullyExecuted', () => {
    it('should mark document as fully executed', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(isValidTransition).mockReturnValue(true);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        isFullyExecuted: true,
        documentType: 'FULLY_EXECUTED',
      } as any);
      vi.mocked(prisma.nda.update).mockResolvedValue({
        ...mockNda,
        status: 'FULLY_EXECUTED',
      } as any);

      const result = await markDocumentFullyExecuted('doc-123', mockStatusContext);

      expect(result.isFullyExecuted).toBe(true);
      expect(prisma.document.update).toHaveBeenCalled();
      expect(prisma.nda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nda-123' },
          data: expect.objectContaining({
            status: 'FULLY_EXECUTED',
          }),
        })
      );
    });

    it('should update NDA status when transitioning to fully executed', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(isValidTransition).mockReturnValue(true);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        isFullyExecuted: true,
        documentType: 'FULLY_EXECUTED',
      } as any);
      vi.mocked(prisma.nda.update).mockResolvedValue({
        ...mockNda,
        status: 'FULLY_EXECUTED',
      } as any);

      await markDocumentFullyExecuted('doc-123', mockStatusContext);

      expect(prisma.nda.update).toHaveBeenCalled();
    });

    it('should log audit entry', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(isValidTransition).mockReturnValue(true);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        isFullyExecuted: true,
        documentType: 'FULLY_EXECUTED',
      } as any);
      vi.mocked(prisma.nda.update).mockResolvedValue({
        ...mockNda,
        status: 'FULLY_EXECUTED',
      } as any);

      await markDocumentFullyExecuted('doc-123', mockStatusContext, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test/1.0',
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document_marked_executed',
          entityType: 'document',
          entityId: 'doc-123',
        })
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'nda_status_changed',
          entityType: 'nda',
          entityId: 'nda-123',
        })
      );
    });

    it('should reject for non-existent document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(markDocumentFullyExecuted('doc-invalid', mockStatusContext)).rejects.toThrow(
        'Document not found'
      );
    });

    it('should reject access when document is not accessible', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

      await expect(markDocumentFullyExecuted('doc-123', mockStatusContext)).rejects.toThrow(
        'Document not found'
      );
    });

    it('should reject without status permission', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);

      await expect(markDocumentFullyExecuted('doc-123', mockUserContext)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should not call transition helper for manual status change', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...mockDocument,
        nda: mockNda,
      } as any);
      vi.mocked(isValidTransition).mockReturnValue(true);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        isFullyExecuted: true,
        documentType: 'FULLY_EXECUTED',
      } as any);
      vi.mocked(prisma.nda.update).mockResolvedValue({
        ...mockNda,
        status: 'FULLY_EXECUTED',
      } as any);

      await markDocumentFullyExecuted('doc-123', mockStatusContext);

      expect(transitionStatus).not.toHaveBeenCalled();
    });
  });

  describe('Access Control', () => {
    it('should allow access via subagency authorization', async () => {
      const userWithSubagency: UserContext = {
        ...mockUserContext,
        authorizedAgencyGroups: [],
        authorizedSubagencies: ['subagency-1'],
      };

      vi.mocked(findNdaWithScope).mockResolvedValue({
        ...mockNda,
        agencyGroupId: 'other-agency',
        subagencyId: 'subagency-1',
      } as any);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument] as any);

      const result = await getNdaDocuments('nda-123', userWithSubagency);

      expect(result).toHaveLength(1);
    });

    it('should deny access when no NDA is accessible', async () => {
      const userWithNoAccess: UserContext = {
        ...mockUserContext,
        authorizedAgencyGroups: ['different-agency'],
        authorizedSubagencies: ['different-subagency'],
      };

      vi.mocked(findNdaWithScope).mockResolvedValue(null);

      await expect(getNdaDocuments('nda-123', userWithNoAccess)).rejects.toThrow('NDA not found');
    });
  });
});
