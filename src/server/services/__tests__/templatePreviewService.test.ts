/**
 * Template Preview Tests
 * Story 9.18: RTF Template Rich Text Editor
 */

import { describe, it, expect } from 'vitest';
import * as templateService from '../templateService.js';
import {
  sampleRtfContent,
  samplePreviewData,
} from '../../../test/factories/rtfTemplateFactory';

describe('template preview generation', () => {
  it('generates a preview using sample merge data', async () => {
    const previewFn = (templateService as any).generateTemplatePreview;

    expect(previewFn).toBeTypeOf('function');

    if (typeof previewFn === 'function') {
      const result = await previewFn({
        content: sampleRtfContent,
        sampleData: samplePreviewData,
      });

      expect(result.previewContent).toBeInstanceOf(Buffer);
      expect(result.previewContent.toString('utf-8')).toContain(samplePreviewData.companyName);
      expect(result.mergedFields.companyName).toBe(samplePreviewData.companyName);
    }
  });
});
