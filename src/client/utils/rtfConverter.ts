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
 * Convert HTML to RTF format
 * Custom implementation - browser-compatible and handles our use case
 * IMPORTANT: Preserves {{placeholder}} tokens for template merging
 */
export function convertHtmlToRtf(html: string): string {
  console.log('[RTF Converter] Converting HTML to RTF');

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

  // STEP 2: Convert HTML tags to RTF control codes
  content = content
    // Bold
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '{\\b $1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '{\\b $1}')

    // Italic
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '{\\i $1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '{\\i $1}')

    // Underline
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '{\\ul $1}')

    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '{\\b\\fs32 $1}\\par\\par')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '{\\b\\fs28 $1}\\par\\par')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '{\\b\\fs24 $1}\\par\\par')

    // Lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\tab $1\\par')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\\par')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\\par')

    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\\par\\par')

    // Line breaks
    .replace(/<br\s*\/?>/gi, '\\line ')

    // Remove placeholder span wrappers (from Quill)
    .replace(/<span[^>]*class="ql-placeholder"[^>]*>(.*?)<\/span>/gi, '$1')

    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')

    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // STEP 3: Restore placeholder tokens (they remain as {{fieldName}} in RTF)
  Object.entries(placeholderMap).forEach(([marker, placeholder]) => {
    content = content.replace(marker, placeholder);
  });

  // STEP 4: Escape remaining special characters that aren't in placeholders
  // Only escape backslashes that aren't already part of RTF control codes
  content = content.replace(/\\/g, (match, offset) => {
    // Check if this backslash is already part of a control code
    const nextChars = content.substring(offset, offset + 5);
    if (nextChars.match(/^\\(par|line|tab|b|i|ul|fs\d+)/)) {
      return match; // Keep RTF control codes
    }
    return '\\\\'; // Escape standalone backslashes
  });

  // Clean up excessive whitespace
  content = content
    .replace(/\\par\\par\\par+/g, '\\par\\par')
    .replace(/\\line\\s*\\line/g, '\\line')
    .trim();

  // STEP 5: Build complete RTF document
  const rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 ${content}}`;

  console.log('[RTF Converter] RTF generated, length:', rtf.length);
  console.log('[RTF Converter] RTF preview:', rtf.substring(0, 150));

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
