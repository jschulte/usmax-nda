/**
 * Document Notes Generator Tests
 * Story 4.6: Document Metadata Tracking
 */

import { describe, it, expect } from 'vitest';
import { generateDocumentNotes } from '../documentNotesGenerator.js';

describe('generateDocumentNotes', () => {
  it('generates notes for uploaded documents', () => {
    const result = generateDocumentNotes('UPLOADED', { uploaderName: 'Test User' });
    expect(result).toContain('Uploaded by Test User');
  });

  it('generates notes for generated documents', () => {
    const result = generateDocumentNotes('GENERATED', {
      uploaderName: 'Test User',
      templateName: 'Standard Template',
    });
    expect(result).toContain('Generated from template "Standard Template"');
  });

  it('generates notes for fully executed documents', () => {
    const result = generateDocumentNotes('FULLY_EXECUTED', {
      uploaderName: 'Test User',
      executedAt: new Date('2026-01-03T00:00:00Z'),
    });
    expect(result).toContain('Marked as fully executed by Test User');
  });
});
