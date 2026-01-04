/**
 * RTF template placeholder definitions.
 *
 * Each placeholder includes a description, example, and nullability to aid documentation.
 */

export const PLACEHOLDER_DEFINITIONS = {
  /** Legal company name. Example: "Acme Corporation". */
  companyName: {
    description: 'Legal company name.',
    example: 'Acme Corporation',
    nullable: false,
  },
  /** Company city (legacy alias for city). Example: "Washington". */
  companyCity: {
    description: 'Company city (legacy alias for city).',
    example: 'Washington',
    nullable: true,
  },
  /** Company state (legacy alias for state). Example: "DC". */
  companyState: {
    description: 'Company state (legacy alias for state).',
    example: 'DC',
    nullable: true,
  },
  /** Company city. Example: "Washington". */
  city: {
    description: 'Company city.',
    example: 'Washington',
    nullable: true,
  },
  /** Company state. Example: "DC". */
  state: {
    description: 'Company state.',
    example: 'DC',
    nullable: true,
  },
  /** State of incorporation. Example: "Delaware". */
  stateOfIncorporation: {
    description: 'State of incorporation.',
    example: 'Delaware',
    nullable: true,
  },
  /** Agency group name. Example: "Department of Defense". */
  agencyGroupName: {
    description: 'Agency group name.',
    example: 'Department of Defense',
    nullable: true,
  },
  /** Subagency name. Example: "U.S. Air Force". */
  subagencyName: {
    description: 'Subagency name.',
    example: 'U.S. Air Force',
    nullable: true,
  },
  /** Agency office name. Example: "Office of the Secretary". */
  agencyOfficeName: {
    description: 'Agency office name.',
    example: 'Office of the Secretary',
    nullable: true,
  },
  /** Abbreviated NDA name. Example: "ACME". */
  abbreviatedName: {
    description: 'Abbreviated NDA name.',
    example: 'ACME',
    nullable: false,
  },
  /** Authorized purpose text. Example: "Proposal Development...". */
  authorizedPurpose: {
    description: 'Authorized purpose text.',
    example: 'Proposal Development for Contract XYZ-2024',
    nullable: false,
  },
  /** NDA effective date formatted as MM/DD/YYYY. */
  effectiveDate: {
    description: 'NDA effective date formatted as MM/DD/YYYY.',
    example: '01/15/2024',
    nullable: true,
  },
  /** NDA expiration date formatted as MM/DD/YYYY. */
  expirationDate: {
    description: 'NDA expiration date formatted as MM/DD/YYYY.',
    example: '01/15/2025',
    nullable: true,
  },
  /** NDA created date formatted as MM/DD/YYYY. */
  createdDate: {
    description: 'NDA created date formatted as MM/DD/YYYY.',
    example: '01/10/2024',
    nullable: true,
  },
  /** NDA requested date formatted as MM/DD/YYYY (alias of created date). */
  requestedDate: {
    description: 'NDA requested date formatted as MM/DD/YYYY (alias of created date).',
    example: '01/10/2024',
    nullable: true,
  },
  /** Document generated date formatted as MM/DD/YYYY. */
  generatedDate: {
    description: 'Document generated date formatted as MM/DD/YYYY.',
    example: '01/20/2024',
    nullable: true,
  },
  /** NDA display identifier. Example: "100123". */
  displayId: {
    description: 'NDA display identifier.',
    example: '100123',
    nullable: false,
  },
  /** USmax position (legacy alias). Example: "Prime Contractor". */
  usMaxPosition: {
    description: 'USmax position (legacy alias).',
    example: 'Prime Contractor',
    nullable: true,
  },
  /** USmax position. Example: "Prime Contractor". */
  usmaxPosition: {
    description: 'USmax position.',
    example: 'Prime Contractor',
    nullable: true,
  },
  /** NDA type. Example: "MUTUAL". */
  ndaType: {
    description: 'NDA type.',
    example: 'MUTUAL',
    nullable: true,
  },
  /** Opportunity contact full name. Example: "John Smith". */
  opportunityContactName: {
    description: 'Opportunity contact full name.',
    example: 'John Smith',
    nullable: true,
  },
  /** Opportunity contact email. */
  opportunityContactEmail: {
    description: 'Opportunity contact email.',
    example: 'john.smith@example.com',
    nullable: true,
  },
  /** Opportunity contact phone. */
  opportunityContactPhone: {
    description: 'Opportunity contact phone.',
    example: '(555) 123-4567',
    nullable: true,
  },
  /** Contracts contact full name. */
  contractsContactName: {
    description: 'Contracts contact full name.',
    example: 'Jane Doe',
    nullable: true,
  },
  /** Contracts contact email. */
  contractsContactEmail: {
    description: 'Contracts contact email.',
    example: 'jane.doe@example.com',
    nullable: true,
  },
  /** Contracts contact phone. */
  contractsContactPhone: {
    description: 'Contracts contact phone.',
    example: '(555) 222-3333',
    nullable: true,
  },
  /** Relationship contact full name. */
  relationshipContactName: {
    description: 'Relationship contact full name.',
    example: 'Robert Johnson',
    nullable: true,
  },
  /** Relationship contact email. */
  relationshipContactEmail: {
    description: 'Relationship contact email.',
    example: 'robert.johnson@example.com',
    nullable: true,
  },
  /** Relationship contact phone. */
  relationshipContactPhone: {
    description: 'Relationship contact phone.',
    example: '(555) 444-5555',
    nullable: true,
  },
  /** Contacts contact full name. */
  contactsContactName: {
    description: 'Contacts contact full name.',
    example: 'Linda Carter',
    nullable: true,
  },
  /** Opportunity POC name (legacy alias). */
  opportunityPocName: {
    description: 'Opportunity POC name (legacy alias).',
    example: 'John Smith',
    nullable: true,
  },
  /** Contracts POC name (legacy alias). */
  contractsPocName: {
    description: 'Contracts POC name (legacy alias).',
    example: 'Jane Doe',
    nullable: true,
  },
  /** Relationship POC name (legacy alias). */
  relationshipPocName: {
    description: 'Relationship POC name (legacy alias).',
    example: 'Robert Johnson',
    nullable: true,
  },
  /** Contacts POC name (legacy alias). */
  contactsPocName: {
    description: 'Contacts POC name (legacy alias).',
    example: 'Linda Carter',
    nullable: true,
  },
  /** NDA created by name. */
  createdByName: {
    description: 'NDA created by name.',
    example: 'Alex Morgan',
    nullable: true,
  },
} as const;

export type PlaceholderName = keyof typeof PLACEHOLDER_DEFINITIONS;

export const VALID_PLACEHOLDERS = Object.keys(
  PLACEHOLDER_DEFINITIONS
) as PlaceholderName[];
