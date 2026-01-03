/**
 * ZIP Service
 * Story 4.5: Download All Versions as ZIP
 */

import archiver from 'archiver';
import { PassThrough } from 'stream';
import { getDocumentStream } from './s3Service.js';

export interface ZipDocumentInput {
  id: string;
  filename: string;
  s3Key: string;
  s3Region?: string | null;
  versionNumber?: number | null;
}

export interface ZipNdaInfo {
  displayId: string | number;
  companyName: string;
}

export interface ZipResult {
  stream: PassThrough;
  filename: string;
}

export async function createDocumentZip(
  documents: ZipDocumentInput[],
  nda: ZipNdaInfo
): Promise<ZipResult> {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  const usedNames = new Set<string>();
  for (const doc of documents) {
    try {
      const stream = await getDocumentStream(doc.s3Key, doc.s3Region || undefined);
      const safeName = ensureUniqueFilename(
        sanitizeZipEntryName(doc.filename, `document_${doc.id}`),
        usedNames,
        doc.versionNumber ?? undefined
      );
      archive.append(stream, { name: safeName });
    } catch (error) {
      console.error('[ZipService] Failed to add document to ZIP', {
        documentId: doc.id,
        error,
      });
    }
  }

  void archive.finalize();

  const filename = buildZipFilename(nda.displayId, nda.companyName);

  return { stream: passthrough, filename };
}

function buildZipFilename(displayId: string | number, companyName: string): string {
  const sanitizedCompany = sanitizeCompanyName(companyName);
  const displayValue = String(displayId).replace(/^NDA[-_]?/i, '');
  return `NDA-${displayValue}-${sanitizedCompany}-All-Versions.zip`;
}

function sanitizeCompanyName(companyName: string): string {
  const normalized = companyName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized.length > 0 ? normalized : 'Company';
}

function ensureUniqueFilename(
  filename: string,
  usedNames: Set<string>,
  versionNumber?: number
): string {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const suffix = versionNumber ? `_v${versionNumber}` : `_copy`;
  const extIndex = filename.lastIndexOf('.');
  const base = extIndex >= 0 ? filename.slice(0, extIndex) : filename;
  const ext = extIndex >= 0 ? filename.slice(extIndex) : '';
  const candidate = `${base}${suffix}${ext}`;

  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  let counter = 2;
  let next = `${base}${suffix}_${counter}${ext}`;
  while (usedNames.has(next)) {
    counter += 1;
    next = `${base}${suffix}_${counter}${ext}`;
  }
  usedNames.add(next);
  return next;
}

function sanitizeZipEntryName(filename: string, fallback: string): string {
  const normalized = filename
    .replace(/[\0\r\n]/g, '')
    .replace(/\\/g, '/');

  let base = normalized.split('/').pop()?.trim() || '';
  if (!base || base === '.' || base === '..') {
    base = fallback;
  }

  if (base.length > 200) {
    const extIndex = base.lastIndexOf('.');
    const ext = extIndex >= 0 ? base.slice(extIndex) : '';
    const stem = base.slice(0, 200 - ext.length);
    base = `${stem}${ext}`;
  }

  return base;
}
