import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('NDA displayId sequence', () => {
  it('starts at legacy baseline (>= 1590)', async () => {
    const migrationPath = resolve(
      'prisma/migrations/20260103050000_set_nda_display_id_sequence_start/migration.sql'
    );
    const contents = readFileSync(migrationPath, 'utf8');

    expect(contents.includes("setval('ndas_display_id_seq'")).toBe(true);
    expect(contents.includes('1589')).toBe(true);
  });
});
