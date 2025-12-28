/**
 * Custom Quill Embed blot for non-editable placeholder tokens
 *
 * Renders {{fieldName}} placeholders as distinct visual chips that cannot
 * be edited or split by the user. Placeholders are preserved through HTML-to-RTF
 * conversion for template merge operations.
 */
import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';
import 'quill-better-table/dist/quill-better-table.css';

const Embed = Quill.import('blots/embed') as any;

// Register Better Table module for table support (AC2 requirement)
Quill.register('modules/better-table', QuillBetterTable);

export class PlaceholderBlot extends Embed {
  static blotName = 'placeholder';
  static tagName = 'span';
  static className = 'ql-placeholder';

  /**
   * Create a non-editable placeholder element
   * @param value - The placeholder field name (e.g., 'companyName')
   */
  static create(value: string): HTMLElement {
    // Validate input
    if (!value || typeof value !== 'string' || value.trim() === '') {
      console.warn('[PlaceholderBlot] Invalid value provided:', value);
      value = 'unknown';
    }

    const node = super.create() as HTMLElement;

    // Make non-editable
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('spellcheck', 'false');
    node.setAttribute('data-placeholder', value);
    node.setAttribute('data-testid', 'rtf-placeholder-token');

    // Render as {{fieldName}}
    node.innerText = `{{${value}}}`;

    // Apply visual styling
    node.style.backgroundColor = '#e3f2fd';
    node.style.border = '1px solid #2196f3';
    node.style.borderRadius = '3px';
    node.style.padding = '2px 6px';
    node.style.color = '#1976d2';
    node.style.fontFamily = 'monospace';
    node.style.cursor = 'default';
    node.style.userSelect = 'none';
    node.style.display = 'inline-block';
    node.style.margin = '0 2px';

    return node;
  }

  /**
   * Extract the placeholder value from the DOM node
   * @param node - The placeholder DOM element
   */
  static value(node: HTMLElement): string {
    return node.getAttribute('data-placeholder') || '';
  }

  /**
   * Prevent the blot from being split when the user types
   */
  length(): number {
    return 1;
  }
}

// Register the custom blot with Quill
Quill.register(PlaceholderBlot);

export default PlaceholderBlot;
