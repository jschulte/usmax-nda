/**
 * RTF to HTML Conversion Utility
 *
 * Provides bidirectional conversion between RTF and HTML for template editing:
 * - RTF → HTML: Load existing templates into WYSIWYG editor
 * - HTML → RTF: Save edited content back to database
 *
 * Preserves placeholder tokens ({{fieldName}}) through conversions
 *
 * Uses simple regex-based parsing - good enough for basic templates
 * For complex RTF files, recommend uploading and re-editing in Word/LibreOffice
 */

import { convertHtmlToRtf } from 'html-to-rtf';

/**
 * Preserve placeholder tokens during HTML conversion
 * Wraps {{fieldName}} in span elements for Quill editor
 */
function preservePlaceholders(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    return `<span class="ql-placeholder" contenteditable="false" data-placeholder="${fieldName}">${match}</span>`;
  });
}

/**
 * Export HTML to RTF (uses existing html-to-rtf library)
 * This is already used by RTFTemplateEditor component
 */
export { convertHtmlToRtf };

/**
 * Simple fallback RTF-to-HTML converter for basic formatting
 * Used when stream parser fails or for simple templates
 */
export function simpleRtfToHtml(rtfContent: Buffer | string): string {
  const buffer = typeof rtfContent === 'string'
    ? Buffer.from(rtfContent, 'base64')
    : rtfContent;

  let text = buffer.toString('utf-8');

  // Remove RTF header and control characters
  text = text
    .replace(/\{\\rtf1[^}]*\}/g, '') // Remove RTF header
    .replace(/\{\\fonttbl[^}]*\}/g, '') // Remove font table
    .replace(/\{\\colortbl[^}]*\}/g, '') // Remove color table
    .replace(/\\par\s*/g, '<br>') // Paragraph breaks
    .replace(/\\line\s*/g, '<br>') // Line breaks
    .replace(/\\tab\s*/g, '&nbsp;&nbsp;&nbsp;&nbsp;') // Tabs
    .replace(/\{\\b\s+([^}]+)\}/g, '<strong>$1</strong>') // Bold
    .replace(/\{\\i\s+([^}]+)\}/g, '<em>$1</em>') // Italic
    .replace(/\{\\ul\s+([^}]+)\}/g, '<u>$1</u>') // Underline
    .replace(/\\[a-z]+\d*\s*/g, '') // Remove other control words
    .replace(/[{}]/g, '') // Remove braces
    .trim();

  // Wrap in paragraphs
  const paragraphs = text
    .split('<br><br>')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p}</p>`)
    .join('\n');

  return preservePlaceholders(paragraphs);
}
