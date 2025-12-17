/**
 * File Upload Middleware
 * Story 4.1: Document Upload with Drag-Drop
 *
 * Configures multer for handling multipart form data uploads.
 * Stores files in memory buffer for direct upload to S3.
 */

import multer from 'multer';
import type { Request } from 'express';
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '../services/documentService.js';

/**
 * Filter files by allowed types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Check extension
  const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return callback(
      new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
    );
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return callback(
      new Error('Invalid file type. Only RTF, PDF, and DOCX files are allowed.')
    );
  }

  callback(null, true);
};

/**
 * Multer configuration for document uploads
 * - Stores in memory buffer for S3 upload
 * - Limits file size to MAX_FILE_SIZE
 * - Only allows RTF, PDF, DOCX files
 */
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Single file uploads only
  },
  fileFilter,
});

/**
 * Multer configuration for bulk uploads
 * - Allows up to 10 files at once
 */
export const bulkDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});
