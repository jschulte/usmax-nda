/**
 * S3 Document Stream Tests
 * Story 4.5: Download All Versions as ZIP
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'stream';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock;
  },
  GetObjectCommand: class {},
  PutObjectCommand: class {},
  DeleteObjectCommand: class {},
}));

import { getDocumentStream } from '../s3Service.js';

describe('s3Service.getDocumentStream', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns a readable stream for a document', async () => {
    const body = new PassThrough();
    sendMock.mockResolvedValueOnce({ Body: body });

    const result = await getDocumentStream('ndas/nda-1/doc.rtf', 'us-east-1');

    expect(result).toBe(body);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the failover region when primary fails', async () => {
    const body = new PassThrough();
    sendMock
      .mockRejectedValueOnce(new Error('Primary unavailable'))
      .mockResolvedValueOnce({ Body: body });

    const result = await getDocumentStream('ndas/nda-1/doc.rtf', 'us-east-1');

    expect(result).toBe(body);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
