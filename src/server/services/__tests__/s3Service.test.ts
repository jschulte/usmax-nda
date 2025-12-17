/**
 * S3 Service Tests
 * Story 3.5: RTF Document Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildS3Key, S3ServiceError } from '../s3Service.js';

// Note: uploadDocument, getDownloadUrl, deleteDocument are tested via integration tests
// as they require actual AWS SDK mocking which is complex to set up in unit tests.
// These tests focus on the pure utility functions.

describe('s3Service', () => {
  describe('buildS3Key', () => {
    it('builds correct key structure', () => {
      const result = buildS3Key('nda-123', 'doc-456', 'test-document.docx');

      expect(result).toBe('ndas/nda-123/doc-456-test-document.docx');
    });

    it('sanitizes special characters in filename', () => {
      const result = buildS3Key('nda-123', 'doc-456', 'Test Doc (v2) [Final].docx');

      // Special chars become underscores, consecutive underscores are collapsed
      expect(result).toBe('ndas/nda-123/doc-456-Test_Doc_v2_Final_.docx');
    });

    it('removes consecutive underscores', () => {
      const result = buildS3Key('nda-123', 'doc-456', 'test   multiple   spaces.pdf');

      expect(result).toBe('ndas/nda-123/doc-456-test_multiple_spaces.pdf');
    });

    it('preserves valid characters', () => {
      const result = buildS3Key('nda-abc', 'doc-xyz', 'NDA-2024-01_FINAL.docx');

      expect(result).toBe('ndas/nda-abc/doc-xyz-NDA-2024-01_FINAL.docx');
    });

    it('handles filenames with dots', () => {
      const result = buildS3Key('nda-123', 'doc-456', 'file.backup.docx');

      expect(result).toBe('ndas/nda-123/doc-456-file.backup.docx');
    });

    it('handles unicode characters', () => {
      const result = buildS3Key('nda-123', 'doc-456', '文档.docx');

      expect(result).toBe('ndas/nda-123/doc-456-_.docx');
    });
  });

  describe('S3ServiceError', () => {
    it('creates error with code', () => {
      const error = new S3ServiceError('Upload failed', 'UPLOAD_FAILED');

      expect(error.message).toBe('Upload failed');
      expect(error.code).toBe('UPLOAD_FAILED');
      expect(error.name).toBe('S3ServiceError');
    });

    it('creates error with original error', () => {
      const original = new Error('AWS error');
      const error = new S3ServiceError('Upload failed', 'UPLOAD_FAILED', original);

      expect(error.originalError).toBe(original);
    });
  });
});
