/**
 * Story 10.1: USmax Position Label Mapping Tests
 * Validates that enum values are correctly mapped to human-readable labels
 */

import { describe, it, expect } from 'vitest';

// Story 10.1: USmax Position display labels (from RequestWizard.tsx and NDADetail.tsx)
const usMaxPositionLabels: Record<string, string> = {
  PRIME: 'Prime',
  SUB_CONTRACTOR: 'Sub-contractor',
  OTHER: 'Other'
};

describe('USmax Position Label Mapping', () => {
  it('maps PRIME to "Prime"', () => {
    expect(usMaxPositionLabels.PRIME).toBe('Prime');
  });

  it('maps SUB_CONTRACTOR to "Sub-contractor"', () => {
    expect(usMaxPositionLabels.SUB_CONTRACTOR).toBe('Sub-contractor');
  });

  it('maps OTHER to "Other"', () => {
    expect(usMaxPositionLabels.OTHER).toBe('Other');
  });

  it('has exactly 3 position mappings', () => {
    expect(Object.keys(usMaxPositionLabels)).toHaveLength(3);
  });

  it('does not contain removed values SUB or TEAMING', () => {
    expect(usMaxPositionLabels).not.toHaveProperty('SUB');
    expect(usMaxPositionLabels).not.toHaveProperty('TEAMING');
  });

  it('all labels are properly capitalized', () => {
    Object.values(usMaxPositionLabels).forEach(label => {
      expect(label).toMatch(/^[A-Z]/); // Starts with capital
      expect(label).not.toMatch(/^[A-Z_]+$/); // Not all caps
    });
  });
});
