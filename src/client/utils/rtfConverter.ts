/**
 * RTF to HTML Conversion Utility
 *
 * Provides bidirectional conversion between RTF and HTML for template editing:
 * - RTF → HTML: Load existing templates into WYSIWYG editor
 * - HTML → RTF: Save edited content back to database
 *
 * Preserves placeholder tokens ({{fieldName}}) through conversions
 */

import { RtfStreamParser } from 'rtf-stream-parser';
import { convertHtmlToRtf } from 'html-to-rtf';

/**
 * Convert RTF content to HTML for display in WYSIWYG editor
 *
 * @param rtfContent - RTF content as Buffer or base64 string
 * @returns HTML string suitable for Quill editor
 */
export async function convertRtfToHtml(rtfContent: Buffer | string): Promise<string> {
  try {
    // Convert base64 to Buffer if needed
    const buffer = typeof rtfContent === 'string'
      ? Buffer.from(rtfContent, 'base64')
      : rtfContent;

    // Convert Buffer to string
    const rtfString = buffer.toString('utf-8');

    // Parse RTF to HTML using rtf-stream-parser
    return new Promise((resolve, reject) => {
      const parser = new RtfStreamParser();
      let htmlOutput = '';

      parser.on('data', (chunk: any) => {
        if (chunk.type === 'text') {
          htmlOutput += chunk.value;
        } else if (chunk.type === 'control') {
          // Handle RTF control words and convert to HTML
          switch (chunk.word) {
            case 'par':
            case 'line':
              htmlOutput += '<br>';
              break;
            case 'tab':
              htmlOutput += '&nbsp;&nbsp;&nbsp;&nbsp;';
              break;
            case 'b':
              htmlOutput += chunk.param === 0 ? '</strong>' : '<strong>';
              break;
            case 'i':
              htmlOutput += chunk.param === 0 ? '</em>' : '<em>';
              break;
            case 'ul':
              htmlOutput += chunk.param === 0 ? '</u>' : '<u>';
              break;
          }
        }
      });

      parser.on('end', () => {
        // Clean up and format HTML
        let formattedHtml = htmlOutput
          // Replace multiple <br> with paragraphs
          .split('<br><br>')
          .map(para => para.trim())
          .filter(para => para.length > 0)
          .map(para => `<p>${para.replace(/<br>/g, ' ')}</p>`)
          .join('\n');

        // Preserve placeholder tokens
        formattedHtml = preservePlaceholders(formattedHtml);

        resolve(formattedHtml);
      });

      parser.on('error', (err: Error) => {
        console.error('[RTF Converter] Parse error:', err);
        reject(new Error(`Failed to parse RTF: ${err.message}`));
      });

      // Write RTF string to parser
      parser.write(rtfString);
      parser.end();
    });
  } catch (error) {
    console.error('[RTF Converter] Conversion error:', error);
    throw error;
  }
}

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
