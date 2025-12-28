import { describe, it, expect } from 'vitest';
import { RTF_PLACEHOLDER_TOKENS } from '../../../test/factories/rtfTemplateFactory';

describe('RTF editor configuration', () => {
  it('exposes toolbar controls required for formatting', async () => {
    const module = await import('../rtfEditorConfig');

    expect(Array.isArray(module.RTF_EDITOR_TOOLBAR_CONTROLS)).toBe(true);
    expect(module.RTF_EDITOR_TOOLBAR_CONTROLS).toEqual(
      expect.arrayContaining([
        'bold',
        'italic',
        'underline',
        'fontSize',
        'fontFamily',
        'bulletList',
        'orderedList',
        'table',
      ])
    );
  });

  it('exposes allowed placeholder tokens for insertion', async () => {
    const module = await import('../rtfEditorConfig');

    const tokens = (module.RTF_PLACEHOLDER_OPTIONS || []).map((option: any) => option.token);
    expect(tokens).toEqual(expect.arrayContaining(RTF_PLACEHOLDER_TOKENS));
  });

  it('wraps and unwraps placeholders as non-editable tokens', async () => {
    const module = await import('../rtfEditorConfig');

    const wrapPlaceholderTokens = module.wrapPlaceholderTokens as (content: string) => string;
    const unwrapPlaceholderTokens = module.unwrapPlaceholderTokens as (content: string) => string;

    const content = 'Hello {{companyName}}';
    const wrapped = wrapPlaceholderTokens(content);

    expect(wrapped).toMatch(/data-placeholder="companyName"/);
    expect(wrapped).toMatch(/contenteditable="false"/);
    expect(wrapped).toContain('{{companyName}}');

    const unwrapped = unwrapPlaceholderTokens(wrapped);
    expect(unwrapped).toBe(content);
  });

  it('handles multiple placeholders in sequence', async () => {
    const module = await import('../rtfEditorConfig');
    const wrapPlaceholderTokens = module.wrapPlaceholderTokens as (content: string) => string;

    const content = '{{companyName}} in {{companyCity}}, {{companyState}}';
    const wrapped = wrapPlaceholderTokens(content);

    expect(wrapped).toMatch(/data-placeholder="companyName"/);
    expect(wrapped).toMatch(/data-placeholder="companyCity"/);
    expect(wrapped).toMatch(/data-placeholder="companyState"/);
  });

  it('validates placeholders correctly', async () => {
    const module = await import('../rtfEditorConfig');
    const validatePlaceholders = module.validatePlaceholders as (html: string) => string[];

    const validHtml = '<p>{{companyName}} {{effectiveDate}}</p>';
    expect(validatePlaceholders(validHtml)).toEqual([]);

    const invalidHtml = '<p>{{invalidField}} {{anotherBadField}}</p>';
    const unknownFields = validatePlaceholders(invalidHtml);
    expect(unknownFields).toContain('invalidField');
    expect(unknownFields).toContain('anotherBadField');
  });

  it('handles empty content gracefully', async () => {
    const module = await import('../rtfEditorConfig');
    const extractPlaceholders = module.extractPlaceholders as (html: string) => string[];

    expect(extractPlaceholders('')).toEqual([]);
    expect(extractPlaceholders('<p></p>')).toEqual([]);
  });
});
