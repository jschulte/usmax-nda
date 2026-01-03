/**
 * S3 Service
 * Story 3.5: RTF Document Generation
 *
 * Handles S3 document storage operations:
 * - Upload documents to S3 (us-east-1)
 * - Generate pre-signed URLs for downloads
 * - Delete documents
 * - Key structure: ndas/{nda_id}/{doc_id}-{filename}
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { retryWithBackoff } from '../utils/retry.js';
import { reportError } from './errorReportingService.js';

/**
 * S3 Service Error
 */
export class S3ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'S3ServiceError';
  }
}

/**
 * Document metadata for upload
 * Story H-1 Task 10: Added uploadedById for metadata tracking
 */
export interface UploadDocumentInput {
  ndaId: string;
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
  uploadedById?: string; // Story H-1: User ID for audit trail
  documentType?: string;
  versionNumber?: number;
}

/**
 * Result of document upload
 */
export interface UploadDocumentResult {
  s3Key: string;
  documentId: string;
  bucket: string;
}

const DEFAULT_REGION = process.env.AWS_REGION || 'us-east-1';
const FAILOVER_REGION = process.env.S3_FAILOVER_REGION || 'us-west-2';

const baseClientConfig = {
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }),
};

const s3Clients = new Map<string, S3Client>();

function getOrCreateS3Client(region: string): S3Client {
  const resolvedRegion = region || DEFAULT_REGION;
  const existing = s3Clients.get(resolvedRegion);
  if (existing) {
    return existing;
  }

  const client = new S3Client({
    region: resolvedRegion,
    ...baseClientConfig,
  });
  s3Clients.set(resolvedRegion, client);
  return client;
}

// Initialize S3 client - configured for us-east-1 with CRR to us-west-2
const s3Client = getOrCreateS3Client(DEFAULT_REGION);

// S3 bucket name from environment
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'usmax-nda-documents';
const FAILOVER_BUCKET_NAME = process.env.S3_FAILOVER_BUCKET_NAME || BUCKET_NAME;

/**
 * Upload a document to S3
 * Story H-1 Task 11: Added retry with exponential backoff (3 attempts)
 *
 * @param input - Document upload parameters
 * @returns S3 key and document ID
 * @throws S3ServiceError on upload failure after all retries
 */
export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const documentId = randomUUID();
  const s3Key = buildS3Key(input.ndaId, documentId, input.filename);

  try {
    // Story H-1 Task 10: Enhanced metadata with upload timestamp and user ID
    const uploadTimestamp = new Date().toISOString();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: input.content,
      ContentType: input.contentType || 'application/octet-stream',
      // Server-side encryption with AWS managed keys
      ServerSideEncryption: 'AES256',
      // Add metadata for tracking
      Metadata: {
        'nda-id': input.ndaId,
        'document-id': documentId,
        'original-filename': input.filename,
        // Story H-1 Task 10: New metadata fields
        'upload-timestamp': uploadTimestamp,
        ...(input.uploadedById && { 'uploaded-by-id': input.uploadedById }),
        ...(input.documentType && { 'document-type': input.documentType }),
        ...(input.versionNumber !== undefined && { 'version-number': String(input.versionNumber) }),
      },
    });

    // Story H-1 Task 11: Retry with exponential backoff (3 attempts)
    await retryWithBackoff(
      () => s3Client.send(command),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
      }
    );

    return {
      s3Key,
      documentId,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    throw new S3ServiceError(
      'Failed to upload document to S3 after retries',
      'UPLOAD_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate a pre-signed URL for document download
 *
 * @param s3Key - S3 key of the document
 * @param expiresInSeconds - URL expiration time (default: 15 minutes)
 * @returns Pre-signed URL for download
 * @throws S3ServiceError on URL generation failure
 */
export async function getDownloadUrl(
  s3Key: string,
  expiresInSeconds: number = 900,
  primaryRegion: string = DEFAULT_REGION
): Promise<string> {
  const normalizedPrimary = primaryRegion || DEFAULT_REGION;
  const fallbackRegion =
    normalizedPrimary === FAILOVER_REGION ? DEFAULT_REGION : FAILOVER_REGION;

  const resolveBucket = (region: string) =>
    region === FAILOVER_REGION ? FAILOVER_BUCKET_NAME : BUCKET_NAME;

  const generateSignedUrl = async (region: string) => {
    const command = new GetObjectCommand({
      Bucket: resolveBucket(region),
      Key: s3Key,
    });

    return getSignedUrl(getOrCreateS3Client(region), command, {
      expiresIn: expiresInSeconds,
    });
  };

  const shouldFailover = (error: unknown) => {
    const code = (error as { name?: string; code?: string; Code?: string })?.name ||
      (error as { code?: string })?.code ||
      (error as { Code?: string })?.Code;
    const nonFailoverCodes = new Set([
      'AccessDenied',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
    ]);
    return !code || !nonFailoverCodes.has(code);
  };

  try {
    return await generateSignedUrl(normalizedPrimary);
  } catch (error) {
    if (!shouldFailover(error) || fallbackRegion === normalizedPrimary) {
      throw new S3ServiceError(
        'Failed to generate download URL',
        'URL_GENERATION_FAILED',
        error instanceof Error ? error : undefined
      );
    }

    console.warn('[S3] Primary region failed, attempting failover', {
      s3Key,
      primaryRegion: normalizedPrimary,
      fallbackRegion,
    });
    reportError(error, {
      message: 'S3 download URL failover triggered',
      s3Key,
      primaryRegion: normalizedPrimary,
      fallbackRegion,
    });

    try {
      return await generateSignedUrl(fallbackRegion);
    } catch (fallbackError) {
      throw new S3ServiceError(
        'Failed to generate download URL',
        'URL_GENERATION_FAILED',
        fallbackError instanceof Error ? fallbackError : undefined
      );
    }
  }
}

/**
 * Get document content from S3
 * Story 4.5: Download All Versions as ZIP
 *
 * @param s3Key - S3 key of the document
 * @returns Document content as Buffer
 * @throws S3ServiceError on download failure
 */
export async function getDocumentContent(s3Key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new S3ServiceError('Empty response body', 'DOWNLOAD_FAILED');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - Body is a stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof S3ServiceError) {
      throw error;
    }
    throw new S3ServiceError(
      'Failed to download document from S3',
      'DOWNLOAD_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get document stream from S3 (streaming download)
 * Story 4.5: Download All Versions as ZIP
 */
export async function getDocumentStream(
  s3Key: string,
  primaryRegion: string = DEFAULT_REGION
): Promise<Readable> {
  const normalizedPrimary = primaryRegion || DEFAULT_REGION;
  const fallbackRegion =
    normalizedPrimary === FAILOVER_REGION ? DEFAULT_REGION : FAILOVER_REGION;

  const shouldFailover = (error: unknown) => {
    const code = (error as { name?: string; code?: string; Code?: string })?.name ||
      (error as { code?: string })?.code ||
      (error as { Code?: string })?.Code;
    const nonFailoverCodes = new Set([
      'AccessDenied',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
    ]);
    return !code || !nonFailoverCodes.has(code);
  };

  const getStream = async (region: string): Promise<Readable> => {
    const bucket = region === FAILOVER_REGION ? FAILOVER_BUCKET_NAME : BUCKET_NAME;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    const response = await getOrCreateS3Client(region).send(command);
    if (!response.Body) {
      throw new S3ServiceError('Empty response body', 'DOWNLOAD_FAILED');
    }

    return response.Body as Readable;
  };

  try {
    return await getStream(normalizedPrimary);
  } catch (error) {
    if (!shouldFailover(error) || fallbackRegion === normalizedPrimary) {
      throw new S3ServiceError(
        'Failed to stream document from S3',
        'DOWNLOAD_FAILED',
        error instanceof Error ? error : undefined
      );
    }

    console.warn('[S3] Primary region failed, attempting stream failover', {
      s3Key,
      primaryRegion: normalizedPrimary,
      fallbackRegion,
    });
    reportError(error, {
      message: 'S3 streaming failover triggered',
      s3Key,
      primaryRegion: normalizedPrimary,
      fallbackRegion,
    });

    try {
      return await getStream(fallbackRegion);
    } catch (fallbackError) {
      throw new S3ServiceError(
        'Failed to stream document from S3',
        'DOWNLOAD_FAILED',
        fallbackError instanceof Error ? fallbackError : undefined
      );
    }
  }
}

/**
 * Delete a document from S3
 *
 * @deprecated Story H-1 Task 8: Document deletion is not allowed in production.
 * Documents must be retained indefinitely per compliance requirements.
 * This function is kept only for emergency situations requiring direct DBA intervention.
 * DO NOT call this function from application code or expose through any API.
 *
 * @param s3Key - S3 key of the document to delete
 * @throws S3ServiceError on deletion failure
 * @internal This function should never be used in normal application flow
 */
export async function deleteDocument(s3Key: string): Promise<void> {
  // Log warning for any usage
  console.warn(
    '[S3Service] DEPRECATED: deleteDocument called for key:',
    s3Key,
    '- Document deletion is disabled per compliance requirements'
  );

  // Story H-1: Prevent deletion by throwing error
  throw new S3ServiceError(
    'Document deletion is not allowed. Documents must be retained indefinitely per compliance requirements.',
    'DELETE_NOT_ALLOWED'
  );

  // Original implementation kept for reference only:
  // try {
  //   const command = new DeleteObjectCommand({
  //     Bucket: BUCKET_NAME,
  //     Key: s3Key,
  //   });
  //   await s3Client.send(command);
  // } catch (error) {
  //   throw new S3ServiceError(
  //     'Failed to delete document from S3',
  //     'DELETE_FAILED',
  //     error instanceof Error ? error : undefined
  //   );
  // }
}

/**
 * Build S3 key for a document
 *
 * Key structure: ndas/{nda_id}/{doc_id}-{filename}
 *
 * @param ndaId - NDA UUID
 * @param documentId - Document UUID
 * @param filename - Original filename
 * @returns S3 key
 */
export function buildS3Key(
  ndaId: string,
  documentId: string,
  filename: string
): string {
  // Sanitize filename to remove problematic characters
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  return `ndas/${ndaId}/${documentId}-${sanitizedFilename}`;
}

/**
 * Get the S3 client instance for testing/mocking
 */
export function getS3Client(): S3Client {
  return s3Client;
}

/**
 * Get the bucket name
 */
export function getBucketName(): string {
  return BUCKET_NAME;
}
