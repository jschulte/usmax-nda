import { describe, it, expect } from 'vitest';
import { prisma } from '../../db/index.js';
import { Prisma } from '../../generated/prisma/index.js';

describe('NDA displayId sequence', () => {
  it('starts at legacy baseline (>= 1590)', async () => {
    const seqResult = await prisma.$queryRaw<Array<{ seq: string | null }>>`
      SELECT pg_get_serial_sequence('ndas', 'display_id') AS seq
    `;

    const seqName = seqResult[0]?.seq;
    expect(seqName).toBeTruthy();

    const valueResult = await prisma.$queryRaw<Array<{ last_value: bigint | number | string }>>(
      Prisma.sql`SELECT last_value FROM ${Prisma.raw(seqName!)}`
    );

    const lastValue = BigInt(valueResult[0]?.last_value ?? 0);
    expect(lastValue).toBeGreaterThanOrEqual(BigInt(1589));
  });
});
