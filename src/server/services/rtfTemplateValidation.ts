/**
 * RTF Template Validation Service
 * Story 9.18: RTF Template Rich Text Editor (WYSIWYG)
 *
 * Validates RTF template content for structure and placeholder usage.
 * Ensures templates meet quality standards before saving to database.
 */

import { SAMPLE_MERGE_FIELDS, validatePlaceholders as validatePlaceholderNames } from './templatePreviewService.js';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate RTF document structure
 *
 * Checks that the content is valid RTF format:
 * - Must start with {\rtf control word
 * - Must have balanced braces
 * - Must contain actual content (not just RTF header)
 *
 * @param rtfContent - RTF content string to validate
 * @returns Validation result with any errors found
 */
export function validateRtfStructure(rtfContent: string): ValidationResult {
  const errors: string[] = [];

  // Check if content is empty or too short
  if (!rtfContent || rtfContent.trim().length < 10) {
    errors.push('RTF content is empty or too short');
    return { valid: false, errors };
  }

  // Check for RTF header
  if (!rtfContent.trim().startsWith('{\\rtf')) {
    errors.push('RTF content must start with {\\rtf control word');
  }

  // Check for balanced braces
  let braceDepth = 0;
  for (const char of rtfContent) {
    if (char === '{') {
      braceDepth++;
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth < 0) {
        errors.push('RTF content has unbalanced braces (too many closing braces)');
        break;
      }
    }
  }

  if (braceDepth > 0) {
    errors.push('RTF content has unbalanced braces (too many opening braces)');
  } else if (braceDepth === 0 && errors.length === 0) {
    // Braces are balanced, but check if there's actual content beyond the header
    const contentWithoutHeader = rtfContent.replace(/^\{\\rtf[^}]*\}/, '').trim();
    if (contentWithoutHeader.length === 0) {
      errors.push('RTF content has no body content beyond the header');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate HTML content for placeholder usage
 *
 * Checks that:
 * - Only allowed placeholders are used
 * - Placeholders are properly formatted as {{fieldName}}
 *
 * @param htmlContent - HTML content string to validate
 * @returns Validation result with any errors found
 */
export function validateHtmlPlaceholders(htmlContent: string): ValidationResult {
  const errors: string[] = [];

  // Check for unknown placeholders
  const unknownPlaceholders = validatePlaceholderNames(htmlContent);
  if (unknownPlaceholders.length > 0) {
    errors.push(
      `Unknown placeholders found: ${unknownPlaceholders.join(', ')}. ` +
        `Allowed placeholders: ${Object.keys(SAMPLE_MERGE_FIELDS).join(', ')}`
    );
  }

  // Check for malformed placeholders (single braces)
  const singleBraceRegex = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g;
  const singleBraceMatches = htmlContent.match(singleBraceRegex);
  if (singleBraceMatches) {
    errors.push(
      'Malformed placeholders detected. Placeholders must use double braces: {{fieldName}}'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation of template content
 *
 * Validates both HTML (for placeholders) and RTF (for structure).
 * Used when saving templates to ensure quality.
 *
 * @param htmlContent - HTML content from editor
 * @param rtfContent - Converted RTF content
 * @returns Combined validation result
 */
export function validateTemplate(
  htmlContent: string,
  rtfContent: string
): ValidationResult {
  const errors: string[] = [];

  // Validate HTML placeholders
  const htmlValidation = validateHtmlPlaceholders(htmlContent);
  if (!htmlValidation.valid) {
    errors.push(...htmlValidation.errors);
  }

  // Validate RTF structure
  const rtfValidation = validateRtfStructure(rtfContent);
  if (!rtfValidation.valid) {
    errors.push(...rtfValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize HTML content before processing
 *
 * Removes potentially dangerous HTML while preserving formatting and placeholders.
 * Enhanced sanitization to prevent XSS attacks through various vectors.
 *
 * @param htmlContent - Raw HTML content
 * @returns Sanitized HTML content
 */
export function sanitizeHtml(htmlContent: string): string {
  let sanitized = htmlContent;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags (can contain CSS-based attacks)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: URLs in href and src
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');

  // Remove data: URLs (can contain executable content)
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

  // Remove srcdoc attribute (can contain HTML/scripts)
  sanitized = sanitized.replace(/\s*srcdoc\s*=\s*["'][^"']*["']/gi, '');

  // Remove form action to prevent form hijacking
  sanitized = sanitized.replace(/<form\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/form>/gi, '');

  // Remove iframe, embed, object tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  return sanitized;
}
