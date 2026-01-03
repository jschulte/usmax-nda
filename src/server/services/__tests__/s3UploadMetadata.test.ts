/**
 * S3 Upload Metadata Tests
 * Story 4.6: Document Metadata Tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn().mockResolvedValue({});
const capturedInputs: any[] = [];

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock;
  },
  PutObjectCommand: class {
    input: any;
    constructor(input: any) {
      this.input = input;
      capturedInputs.push(input);
    }
  },
  GetObjectCommand: class {},
  DeleteObjectCommand: class {},
}));

import { uploadDocument } from '../s3Service.js';

describe('s3Service.uploadDocument', () => {
  beforeEach(() => {
    sendMock.mockClear();
    capturedInputs.length = 0;
  });

  it('includes metadata tags for upload context', async () => {
    await uploadDocument({
      ndaId: 'nda-123',
      filename: 'nda.pdf',
      content: Buffer.from('test'),
      contentType: 'application/pdf',
      uploadedById: 'contact-1',
      documentType: 'UPLOADED',
      versionNumber: 2,
    });

    expect(sendMock).toHaveBeenCalled();
    expect(capturedInputs[0].Metadata).toMatchObject({
      'nda-id': 'nda-123',
      'original-filename': 'nda.pdf',
      'uploaded-by-id': 'contact-1',
      'document-type': 'UPLOADED',
      'version-number': '2',
    });
  });
});
