import type { DocumentType } from '../../generated/prisma/index.js';

interface DocumentNotesContext {
  uploaderName: string;
  templateName?: string;
  executedAt?: Date;
}

export function generateDocumentNotes(
  documentType: DocumentType,
  context: DocumentNotesContext
): string {
  switch (documentType) {
    case 'GENERATED':
      return `Generated from template "${context.templateName || 'Default Template'}"`;
    case 'FULLY_EXECUTED': {
      const executedAt = (context.executedAt || new Date()).toLocaleDateString();
      return `Marked as fully executed by ${context.uploaderName} on ${executedAt}`;
    }
    case 'UPLOADED':
    default:
      return `Uploaded by ${context.uploaderName}`;
  }
}
