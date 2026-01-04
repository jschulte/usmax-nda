import { describe, it, expect } from 'vitest';
import {
  mergeTemplateContent,
  formatDate,
  formatContactName,
  escapeRtf,
  extractPlaceholders,
  MergeError,
  TemplateError,
  type NdaMergeInput,
} from '../rtfMergeService.js';

const baseNda = {
  companyName: 'Acme Corporation',
  companyCity: 'Denver',
  companyState: 'CO',
  stateOfIncorporation: 'Delaware',
  agencyOfficeName: 'Pentagon',
  abbreviatedName: 'ACME',
  authorizedPurpose: 'Research and development',
  effectiveDate: new Date('2024-01-15'),
  expirationDate: new Date('2025-01-15'),
  createdAt: new Date('2024-01-10'),
  usMaxPosition: 'PRIME',
  ndaType: 'MUTUAL',
  displayId: 1001,
  agencyGroup: { name: 'Department of Defense' },
  subagency: { name: 'Army' },
  opportunityPoc: {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    workPhone: '(555) 111-2222',
    cellPhone: null,
  },
  contractsPoc: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    workPhone: null,
    cellPhone: '(555) 222-3333',
  },
  relationshipPoc: {
    firstName: 'Pat',
    lastName: 'Lee',
    email: 'pat@example.com',
    workPhone: null,
    cellPhone: null,
  },
  contactsPoc: {
    firstName: 'Taylor',
    lastName: 'Reed',
    email: 'taylor@example.com',
    workPhone: null,
    cellPhone: null,
  },
  createdBy: {
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex@example.com',
  },
} as unknown as NdaMergeInput;

describe('rtfMergeService', () => {
  it('replaces placeholders with NDA data', () => {
    const template = '{\\rtf1\\ansi Company {{companyName}} - {{agencyGroupName}} on {{effectiveDate}}}';

    const result = mergeTemplateContent(template, baseNda, {
      generatedAt: new Date('2024-01-20'),
      timeZone: 'UTC',
    });

    expect(result.unknownPlaceholders).toEqual([]);
    expect(result.mergedContent).toContain('Company Acme Corporation');
    expect(result.mergedContent).toContain('Department of Defense');
    expect(result.mergedContent).toContain('01/15/2024');
  });

  it('returns unknown placeholders without failing by default', () => {
    const template = '{\\rtf1\\ansi {{unknownField}} {{companyName}}}';

    const result = mergeTemplateContent(template, baseNda, {
      generatedAt: new Date('2024-01-20'),
      timeZone: 'UTC',
    });

    expect(result.unknownPlaceholders).toEqual(['unknownField']);
    expect(result.mergedContent).toContain('{{unknownField}}');
    expect(result.mergedContent).toContain('Acme Corporation');
  });

  it('can replace unknown placeholders when configured', () => {
    const template = '{\\rtf1\\ansi {{unknownField}}}';

    const result = mergeTemplateContent(
      template,
      baseNda,
      { generatedAt: new Date('2024-01-20'), timeZone: 'UTC' },
      { unknownPlaceholderBehavior: 'replace', unknownPlaceholderReplacement: '[Unknown]' }
    );

    expect(result.mergedContent).toContain('[Unknown]');
  });

  it('extracts placeholders uniquely', () => {
    const placeholders = extractPlaceholders('{{companyName}} {{companyName}} {{effectiveDate}}');
    expect(placeholders).toEqual(['companyName', 'effectiveDate']);
  });

  it('formats dates as MM/DD/YYYY', () => {
    const formatted = formatDate(new Date('2024-01-15'), { fieldName: 'effectiveDate' });
    expect(formatted).toBe('01/15/2024');
  });

  it('returns empty string for null dates', () => {
    expect(formatDate(null, { fieldName: 'effectiveDate' })).toBe('');
  });

  it('throws MergeError for invalid dates', () => {
    expect(() => formatDate(new Date('invalid'), { fieldName: 'effectiveDate' })).toThrow(MergeError);
  });

  it('formats contact names with missing parts', () => {
    expect(formatContactName({ firstName: 'Jane', lastName: null } as any)).toBe('Jane');
    expect(formatContactName(null)).toBe('');
  });

  it('escapes RTF special characters and newlines', () => {
    const escaped = escapeRtf('Hello \\\\ {World}\nLine2');
    expect(escaped).toBe('Hello \\\\\\\\ \\{World\\}\\\\line Line2');
  });

  it('throws TemplateError when template is invalid', () => {
    expect(() =>
      mergeTemplateContent('Not an RTF document', baseNda, { generatedAt: new Date() })
    ).toThrow(TemplateError);
  });
});
