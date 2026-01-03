import { prisma } from '../db/index.js';

export async function getNextVersionNumber(
  ndaId: string,
  client: typeof prisma = prisma
): Promise<number> {
  const result = await client.document.aggregate({
    where: { ndaId },
    _max: { versionNumber: true },
  });

  return (result._max.versionNumber ?? 0) + 1;
}
