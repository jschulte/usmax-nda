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
 */
export interface UploadDocumentInput {
  ndaId: string;
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
}

/**
 * Result of document upload
 */
export interface UploadDocumentResult {
  s3Key: string;
  documentId: string;
  bucket: string;
}

// Initialize S3 client - configured for us-east-1 with CRR to us-west-2
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials come from environment or IAM role
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }),
});

// S3 bucket name from environment
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'usmax-nda-documents';

/**
 * Upload a document to S3
 *
 * @param input - Document upload parameters
 * @returns S3 key and document ID
 * @throws S3ServiceError on upload failure
 */
export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const documentId = randomUUID();
  const s3Key = buildS3Key(input.ndaId, documentId, input.filename);

  try {
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
      },
    });

    await s3Client.send(command);

    return {
      s3Key,
      documentId,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    throw new S3ServiceError(
      'Failed to upload document to S3',
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
  expiresInSeconds: number = 900
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return url;
  } catch (error) {
    throw new S3ServiceError(
      'Failed to generate download URL',
      'URL_GENERATION_FAILED',
      error instanceof Error ? error : undefined
    );
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
 * Delete a document from S3
 *
 * @param s3Key - S3 key of the document to delete
 * @throws S3ServiceError on deletion failure
 */
export async function deleteDocument(s3Key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error) {
    throw new S3ServiceError(
      'Failed to delete document from S3',
      'DELETE_FAILED',
      error instanceof Error ? error : undefined
    );
  }
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
