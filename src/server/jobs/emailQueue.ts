import { PgBoss, type JobWithMetadata } from 'pg-boss';

export interface EmailJobPayload {
  emailId: string;
}

let boss: PgBoss | null = null;

export async function startEmailQueue(
  handler: (payload: EmailJobPayload) => Promise<void>,
  onPermanentFailure?: (payload: EmailJobPayload, error: unknown, retryCount?: number) => Promise<void>
): Promise<void> {
  if (boss) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[EmailQueue] DATABASE_URL not set; skipping queue startup');
    return;
  }

  boss = new PgBoss({ connectionString });
  boss.on('error', (error: Error) => {
    console.error('[EmailQueue] pg-boss error', error);
  });

  await boss.start();
  await boss.createQueue('send-nda-email');
  await boss.work<EmailJobPayload>(
    'send-nda-email',
    { batchSize: 1 },
    async (jobs: JobWithMetadata<EmailJobPayload>[]) => {
      for (const job of jobs) {
        try {
          await handler(job.data);
        } catch (error) {
          if (onPermanentFailure) {
            await onPermanentFailure(job.data, error, job.retryCount);
          }
          throw error;
        }
      }
    }
  );
}

export async function enqueueEmailJob(payload: EmailJobPayload): Promise<string | null> {
  if (!boss) {
    return null;
  }

  return boss.send('send-nda-email', payload, {
    retryLimit: 3,
    retryDelay: 1000,
    retryBackoff: true,
  });
}

export function isEmailQueueReady(): boolean {
  return !!boss;
}
