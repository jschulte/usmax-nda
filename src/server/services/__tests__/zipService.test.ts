/**
 * ZIP Service Tests
 * Story 4.5: Download All Versions as ZIP
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'stream';

const appendMock = vi.fn();
const pipeMock = vi.fn();
const finalizeMock = vi.fn();

vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    pipe: pipeMock,
    append: appendMock,
    finalize: finalizeMock,
  })),
}));

vi.mock('../s3Service.js', () => ({
  getDocumentStream: vi.fn().mockResolvedValue(new PassThrough()),
}));

import { createDocumentZip } from '../zipService.js';

describe('zipService', () => {
  beforeEach(() => {
    appendMock.mockClear();
    pipeMock.mockClear();
    finalizeMock.mockClear();
  });

  it('creates a ZIP stream with a friendly filename', async () => {
    const result = await createDocumentZip(
      [
        { id: 'doc-1', filename: 'agreement.rtf', s3Key: 'docs/1', versionNumber: 1 },
      ],
      { displayId: '1590', companyName: 'TechCorp' }
    );

    expect(result.stream).toBeInstanceOf(PassThrough);
    expect(result.filename).toBe('NDA-1590-TechCorp-All-Versions.zip');
    expect(appendMock).toHaveBeenCalled();
    expect(finalizeMock).toHaveBeenCalled();
  });

  it('deduplicates filenames when duplicates exist', async () => {
    await createDocumentZip(
      [
        { id: 'doc-1', filename: 'agreement.rtf', s3Key: 'docs/1', versionNumber: 1 },
        { id: 'doc-2', filename: 'agreement.rtf', s3Key: 'docs/2', versionNumber: 2 },
      ],
      { displayId: '1591', companyName: 'ACME Corp' }
    );

    const names = appendMock.mock.calls.map((call) => call[1]?.name);
    expect(names.filter((name) => name === 'agreement.rtf')).toHaveLength(1);
    expect(names.some((name) => name?.includes('_v2'))).toBe(true);
  });
});
