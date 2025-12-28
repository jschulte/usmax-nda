export const RTF_PLACEHOLDER_KEYS = [
  'companyName',
  'companyCity',
  'companyState',
  'stateOfIncorporation',
  'agencyGroupName',
  'subagencyName',
  'agencyOfficeName',
  'abbreviatedName',
  'authorizedPurpose',
  'effectiveDate',
  'usMaxPosition',
  'opportunityPocName',
  'contractsPocName',
  'relationshipPocName',
  'generatedDate',
];

export const RTF_PLACEHOLDER_TOKENS = RTF_PLACEHOLDER_KEYS.map(
  (key) => `{{${key}}}`
);

export function buildRtfContent(body: string): Buffer {
  return Buffer.from(`{\\rtf1\\ansi ${body}}`, 'utf-8');
}

export const sampleRtfContent = buildRtfContent('Hello {{companyName}}');

export const sampleRtfContentWithUnknownPlaceholder = buildRtfContent(
  'Hello {{unknownField}}'
);

export const invalidRtfContent = Buffer.from('Not an RTF document', 'utf-8');

export const samplePreviewData = {
  companyName: 'Acme Corp',
  companyCity: 'Denver',
  companyState: 'CO',
  stateOfIncorporation: 'Delaware',
  agencyGroupName: 'Department of Defense',
  subagencyName: 'Army',
  agencyOfficeName: 'Pentagon',
  abbreviatedName: 'ACME-DOD-2025',
  authorizedPurpose: 'Research and development',
  effectiveDate: 'January 1, 2025',
  usMaxPosition: 'Prime Contractor',
  opportunityPocName: 'Jordan Lee',
  contractsPocName: 'Taylor Reed',
  relationshipPocName: 'Avery Kim',
  generatedDate: 'January 2, 2025',
};
