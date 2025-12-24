/**
 * Story 10.4: Auto-Expiration Background Job
 * Automatically expires NDAs when current date >= expirationDate
 */

import { PgBoss } from 'pg-boss';
import { prisma } from '../db/index.js';
import { changeNdaStatus } from '../services/ndaService.js';
import type { UserContext } from '../types/auth.js';

const JOB_NAME = 'expire-ndas-daily';

let boss: PgBoss | null = null;

/**
 * Start the expiration job scheduler
 * Runs daily at midnight to check for expired NDAs
 */
export async function startExpirationJob(): Promise<void> {
  if (boss) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[ExpirationJob] DATABASE_URL not set; skipping job startup');
    return;
  }

  boss = new PgBoss({ connectionString });
  boss.on('error', (error: Error) => {
    console.error('[ExpirationJob] pg-boss error:', error);
  });

  await boss.start();

  // Schedule daily job at midnight
  await boss.schedule(JOB_NAME, '0 0 * * *'); // Cron: daily at 00:00

  // Register job handler
  await boss.work(JOB_NAME, async () => {
    console.log('[ExpirationJob] Running daily expiration check...');

    try {
      const expiredCount = await expireNdas();
      console.log(`[ExpirationJob] Expired ${expiredCount} NDAs`);
    } catch (error) {
      console.error('[ExpirationJob] Error processing expirations:', error);
      throw error; // pg-boss will retry
    }
  });

  console.log('[ExpirationJob] Daily expiration job scheduled (runs at midnight)');
}

/**
 * Find and expire NDAs that have passed their expiration date
 * Returns count of NDAs expired
 */
export async function expireNdas(): Promise<number> {
  const now = new Date();

  // Find NDAs that should be expired
  const expiredNdas = await prisma.nda.findMany({
    where: {
      expirationDate: {
        lte: now, // Expiration date is in the past
      },
      status: {
        not: 'EXPIRED', // Not already expired
      },
    },
    select: {
      id: true,
      displayId: true,
      companyName: true,
      expirationDate: true,
      createdById: true,
    },
  });

  if (expiredNdas.length === 0) {
    return 0;
  }

  console.log(`[ExpirationJob] Found ${expiredNdas.length} NDAs to expire`);

  // Create system user context for automated status changes
  const systemUserContext: UserContext = {
    id: 'system',
    email: 'system@usmax.com',
    contactId: 'system', // System-initiated change
    name: 'System (Auto-Expiration)',
    active: true,
    permissions: new Set(['nda:mark_status']),
    roles: ['System'],
    authorizedAgencyGroups: [],
    authorizedSubagencies: [], // Will bypass security for system operations
  };

  // Expire each NDA
  for (const nda of expiredNdas) {
    try {
      await changeNdaStatus(nda.id, 'EXPIRED', systemUserContext, {
        ipAddress: 'system',
        userAgent: 'auto-expiration-job',
      });

      console.log(`[ExpirationJob] Expired NDA #${nda.displayId} (${nda.companyName})`);
    } catch (error) {
      console.error(`[ExpirationJob] Failed to expire NDA ${nda.id}:`, error);
      // Continue with other NDAs even if one fails
    }
  }

  return expiredNdas.length;
}

/**
 * Stop the expiration job scheduler (for graceful shutdown)
 */
export async function stopExpirationJob(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
