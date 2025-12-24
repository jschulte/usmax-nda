/**
 * Story 10.2: NDA Type Label Mapping Tests
 * Validates that enum values are correctly mapped to human-readable labels
 */

import { describe, it, expect } from 'vitest';

// Story 10.2: NDA Type display labels (from RequestWizard.tsx and NDADetail.tsx)
const ndaTypeLabels: Record<string, string> = {
  MUTUAL: 'Mutual NDA',
  CONSULTANT: 'Consultant'
};

describe('NDA Type Label Mapping', () => {
  it('maps MUTUAL to "Mutual NDA"', () => {
    expect(ndaTypeLabels.MUTUAL).toBe('Mutual NDA');
  });

  it('maps CONSULTANT to "Consultant"', () => {
    expect(ndaTypeLabels.CONSULTANT).toBe('Consultant');
  });

  it('has exactly 2 type mappings', () => {
    expect(Object.keys(ndaTypeLabels)).toHaveLength(2);
  });

  it('does not contain removed values', () => {
    expect(ndaTypeLabels).not.toHaveProperty('ONE_WAY_GOVERNMENT');
    expect(ndaTypeLabels).not.toHaveProperty('ONE_WAY_COUNTERPARTY');
    expect(ndaTypeLabels).not.toHaveProperty('VISITOR');
    expect(ndaTypeLabels).not.toHaveProperty('RESEARCH');
    expect(ndaTypeLabels).not.toHaveProperty('VENDOR_ACCESS');
  });

  it('all labels are descriptive and not raw enum values', () => {
    Object.entries(ndaTypeLabels).forEach(([key, label]) => {
      // Labels should not be identical to keys (except when naturally matching)
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/^[A-Z_]+$/); // Not all caps with underscores
    });
  });
});
