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

import { convertHTMLToRTF } from '@jonahschulte/rtf-toolkit';

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
 * Convert HTML to RTF format
 * Uses @jonahschulte/rtf-toolkit for conversion
 * IMPORTANT: Preserves {{placeholder}} tokens for template merging
 */
export function convertHtmlToRtf(html: string): string {
  console.log('[RTF Converter] Converting HTML to RTF using toolkit');

  let content = html.trim();

  // STEP 1: Protect placeholder tokens by converting to temporary markers
  const placeholderMap: Record<string, string> = {};
  let placeholderIndex = 0;

  content = content.replace(/\{\{(\w+)\}\}/g, (match) => {
    const marker = `___PLACEHOLDER_${placeholderIndex}___`;
    placeholderMap[marker] = match;
    placeholderIndex++;
    return marker;
  });

  // STEP 2: Remove placeholder span wrappers (from Quill)
  content = content.replace(/<span[^>]*class="ql-placeholder"[^>]*>(.*?)<\/span>/gi, '$1');

  // STEP 3: Use toolkit for conversion
  let rtf = convertHTMLToRTF(content);

  // STEP 4: Restore placeholder tokens (they remain as {{fieldName}} in RTF)
  Object.entries(placeholderMap).forEach(([marker, placeholder]) => {
    rtf = rtf.replace(marker, placeholder);
  });

  console.log('[RTF Converter] RTF generated with placeholders preserved, length:', rtf.length);

  return rtf;
}

/**
 * Simple fallback RTF-to-HTML converter for basic formatting
 * Used when stream parser fails or for simple templates
 */
export function simpleRtfToHtml(rtfContent: Buffer | string): string {
  console.log('[RTF Converter] Input type:', typeof rtfContent);

  let rtfString: string;

  if (typeof rtfContent === 'string') {
    // If it's a string, it's base64 encoded
    console.log('[RTF Converter] Decoding base64, length:', rtfContent.length);
    try {
      rtfString = atob(rtfContent); // Decode base64 to binary string
    } catch (e) {
      console.error('[RTF Converter] Base64 decode error:', e);
      throw new Error('Invalid base64 content');
    }
  } else {
    // If it's a Buffer, convert to string
    rtfString = rtfContent.toString('utf-8');
  }

  console.log('[RTF Converter] RTF string preview:', rtfString.substring(0, 100));
  let text = rtfString;

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
