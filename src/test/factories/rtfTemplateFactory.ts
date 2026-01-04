export const RTF_PLACEHOLDER_KEYS = [
  'companyName',
  'companyCity',
  'companyState',
  'city',
  'state',
  'stateOfIncorporation',
  'agencyGroupName',
  'subagencyName',
  'agencyOfficeName',
  'abbreviatedName',
  'authorizedPurpose',
  'effectiveDate',
  'expirationDate',
  'createdDate',
  'requestedDate',
  'usMaxPosition',
  'usmaxPosition',
  'displayId',
  'ndaType',
  'opportunityContactName',
  'opportunityContactEmail',
  'opportunityContactPhone',
  'contractsContactName',
  'contractsContactEmail',
  'contractsContactPhone',
  'relationshipContactName',
  'relationshipContactEmail',
  'relationshipContactPhone',
  'contactsContactName',
  'opportunityPocName',
  'contractsPocName',
  'relationshipPocName',
  'contactsPocName',
  'generatedDate',
  'createdByName',
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
  city: 'Denver',
  state: 'CO',
  stateOfIncorporation: 'Delaware',
  agencyGroupName: 'Department of Defense',
  subagencyName: 'Army',
  agencyOfficeName: 'Pentagon',
  abbreviatedName: 'ACME-DOD-2025',
  authorizedPurpose: 'Research and development',
  effectiveDate: '01/01/2025',
  expirationDate: '01/01/2026',
  createdDate: '12/31/2024',
  requestedDate: '12/31/2024',
  usMaxPosition: 'Prime Contractor',
  usmaxPosition: 'Prime Contractor',
  displayId: '100321',
  ndaType: 'MUTUAL',
  opportunityContactName: 'Jordan Lee',
  opportunityContactEmail: 'jordan.lee@example.com',
  opportunityContactPhone: '(555) 111-2222',
  contractsContactName: 'Taylor Reed',
  contractsContactEmail: 'taylor.reed@example.com',
  contractsContactPhone: '(555) 222-3333',
  relationshipContactName: 'Avery Kim',
  relationshipContactEmail: 'avery.kim@example.com',
  relationshipContactPhone: '(555) 333-4444',
  contactsContactName: 'Morgan Patel',
  opportunityPocName: 'Jordan Lee',
  contractsPocName: 'Taylor Reed',
  relationshipPocName: 'Avery Kim',
  contactsPocName: 'Morgan Patel',
  generatedDate: '01/02/2025',
  createdByName: 'Alex Morgan',
};
