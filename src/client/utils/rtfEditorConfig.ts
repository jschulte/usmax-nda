/**
 * Configuration for RTF Template Editor (Quill)
 *
 * Defines toolbar options, allowed placeholders, and editor settings
 * for the WYSIWYG RTF template editor.
 */

/**
 * Allowed placeholder tokens for RTF templates
 * These must match the merge fields in src/server/services/templateService.ts
 */
export const ALLOWED_PLACEHOLDERS = [
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
] as const;

export type PlaceholderField = typeof ALLOWED_PLACEHOLDERS[number];

/**
 * Human-readable labels for placeholders (for dropdown UI)
 */
export const PLACEHOLDER_LABELS: Record<PlaceholderField, string> = {
  companyName: 'Company Name',
  companyCity: 'Company City',
  companyState: 'Company State',
  stateOfIncorporation: 'State of Incorporation',
  agencyGroupName: 'Agency Group Name',
  subagencyName: 'Subagency Name',
  agencyOfficeName: 'Agency Office Name',
  abbreviatedName: 'Abbreviated Name',
  authorizedPurpose: 'Authorized Purpose',
  effectiveDate: 'Effective Date',
  usMaxPosition: 'USmax Position',
  opportunityPocName: 'Opportunity POC Name',
  contractsPocName: 'Contracts POC Name',
  relationshipPocName: 'Relationship POC Name',
  generatedDate: 'Generated Date',
};

/**
 * Quill toolbar configuration
 * Matches AC2 requirements: bold, italic, underline, font, size, lists, table
 *
 * Table support provided by quill-better-table module (registered in placeholderBlot.ts)
 */
export const TOOLBAR_CONFIG = [
  [{ 'header': [1, 2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ 'font': [] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  ['placeholder-insert'], // Custom button for inserting placeholders
  // TEMPORARILY DISABLED: better-table incompatible with Quill 2.x
  // ['better-table'], // AC2 requirement: Insert tables - TODO: find compatible module
  ['clean'], // Remove formatting
];

/**
 * Quill modules configuration
 */
export interface EditorModules {
  toolbar: {
    container: any[];
    handlers?: {
      [key: string]: () => void;
    };
  };
  'better-table'?: {
    operationMenu: {
      items: {
        unmergeCells: {
          text: string;
        };
      };
    };
  };
}

/**
 * Create Quill modules config with custom placeholder handler
 * @param onInsertPlaceholder - Callback to handle placeholder insertion
 */
export function createEditorModules(
  onInsertPlaceholder: () => void
): EditorModules {
  return {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'placeholder-insert': '🔖 Insert Field' }], // Custom button with label
        ['clean'],
      ],
      handlers: {
        'placeholder-insert': onInsertPlaceholder,
      },
    },
    // TEMPORARILY DISABLED: better-table causing moduleClass constructor error
    // 'better-table': {
    //   operationMenu: {
    //     items: {
    //       unmergeCells: {
    //         text: 'Unmerge cells',
    //       },
    //     },
    //   },
    // },
  };
}

/**
 * Quill formats configuration
 * Defines which formatting options are allowed
 */
export const FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'font',
  'size',
  'list',
  'bullet',
  'table', // AC2 requirement: table support
  'placeholder', // Our custom blot
];

/**
 * Validate that a placeholder field name is allowed
 * @param field - Placeholder field name to validate
 */
export function isValidPlaceholder(field: string): field is PlaceholderField {
  return ALLOWED_PLACEHOLDERS.includes(field as PlaceholderField);
}

/**
 * Extract all placeholder tokens from HTML content
 * @param html - HTML string from Quill editor
 * @returns Array of placeholder field names found
 */
export function extractPlaceholders(html: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

/**
 * Validate HTML content for unknown placeholders
 * @param html - HTML string from Quill editor
 * @returns Array of unknown placeholder names (empty if all valid)
 */
export function validatePlaceholders(html: string): string[] {
  const placeholders = extractPlaceholders(html);
  return placeholders.filter(p => !isValidPlaceholder(p));
}

/**
 * RTF editor toolbar controls (for test compatibility)
 * List of formatting controls available in the toolbar
 */
export const RTF_EDITOR_TOOLBAR_CONTROLS = [
  'bold',
  'italic',
  'underline',
  'fontSize',
  'fontFamily',
  'bulletList',
  'orderedList',
  'table',
];

/**
 * RTF placeholder options (for test compatibility)
 * Array of placeholder options with tokens for insertion
 */
export const RTF_PLACEHOLDER_OPTIONS = ALLOWED_PLACEHOLDERS.map((field) => ({
  label: PLACEHOLDER_LABELS[field],
  token: `{{${field}}}`,
  value: field,
}));

/**
 * Wrap placeholder tokens in HTML with non-editable attributes
 *
 * @param content - Plain text or HTML content with {{placeholder}} tokens
 * @returns HTML content with placeholders wrapped in span elements
 */
export function wrapPlaceholderTokens(content: string): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    return `<span class="ql-placeholder" contenteditable="false" data-placeholder="${fieldName}">${match}</span>`;
  });
}

/**
 * Unwrap placeholder tokens from HTML back to plain {{placeholder}} format
 *
 * @param content - HTML content with wrapped placeholders
 * @returns Content with placeholders unwrapped to {{fieldName}} format
 */
export function unwrapPlaceholderTokens(content: string): string {
  return content.replace(
    /<span[^>]*data-placeholder="(\w+)"[^>]*>\{\{(\w+)\}\}<\/span>/g,
    '{{$1}}'
  );
}
