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
 */
export function convertHtmlToRtf(html: string): string {
  console.log('[RTF Converter] Converting HTML to RTF');

  // Remove wrapper tags if present
  let content = html.trim();

  // Convert HTML tags to RTF control codes
  content = content
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '{\\b\\fs32 $1}\\par\\par')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '{\\b\\fs28 $1}\\par\\par')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '{\\b\\fs24 $1}\\par\\par')

    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\\par\\par')

    // Line breaks
    .replace(/<br\s*\/?>/gi, '\\line ')

    // Bold
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '{\\b $1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '{\\b $1}')

    // Italic
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '{\\i $1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '{\\i $1}')

    // Underline
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '{\\ul $1}')

    // Lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\tab $1\\par')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\\par')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\\par')

    // Remove other HTML tags
    .replace(/<[^>]+>/g, '')

    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Build complete RTF document
  const rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}}
\\f0\\fs24
${content}
}`;

  console.log('[RTF Converter] RTF generated, length:', rtf.length);
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
