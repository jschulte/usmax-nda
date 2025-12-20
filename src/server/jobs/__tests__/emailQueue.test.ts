import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const workSpy = vi.fn();
const startSpy = vi.fn().mockResolvedValue(undefined);
const sendSpy = vi.fn().mockResolvedValue('job-1');
const onSpy = vi.fn();

vi.mock('pg-boss', () => ({
  default: vi.fn().mockImplementation(() => ({
    start: startSpy,
    work: workSpy,
    send: sendSpy,
    on: onSpy,
  })),
}));

describe('emailQueue', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('configures work handler with retry/backoff metadata', async () => {
    const { startEmailQueue } = await import('../emailQueue.js');

    await startEmailQueue(async () => {});

    expect(workSpy).toHaveBeenCalledWith(
      'send-nda-email',
      expect.objectContaining({
        retryLimit: 3,
        retryDelay: 1000,
        retryBackoff: true,
        includeMetadata: true,
      }),
      expect.any(Function)
    );
  });

  it('invokes permanent failure handler on final attempt', async () => {
    const { startEmailQueue } = await import('../emailQueue.js');
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const onPermanentFailure = vi.fn().mockResolvedValue(undefined);

    await startEmailQueue(handler, onPermanentFailure);

    const workHandler = workSpy.mock.calls[0][2];
    await expect(
      workHandler({
        data: { emailId: 'email-1' },
        retryCount: 3,
        retryLimit: 3,
      })
    ).rejects.toThrow('boom');

    expect(onPermanentFailure).toHaveBeenCalledWith(
      { emailId: 'email-1' },
      expect.any(Error),
      3
    );
  });
});
