/**
 * Retry Utility Tests
 * Story H-1 Task 15.2: Test for S3 retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff } from '../retry.js';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

    const resultPromise = retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 100 });
    const assertion = expect(resultPromise).rejects.toThrow('Always fails');
    await vi.runAllTimersAsync();

    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1000 });

    // First attempt - immediate
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // After first delay (1000ms)
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // After second delay (2000ms - exponential)
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('respects maxDelayMs cap', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, {
      maxAttempts: 4,
      baseDelayMs: 5000,
      maxDelayMs: 8000
    });

    // First attempt - immediate
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // After first delay (5000ms - baseDelay)
    await vi.advanceTimersByTimeAsync(5000);
    expect(fn).toHaveBeenCalledTimes(2);

    // After second delay (8000ms - capped at maxDelay, not 10000ms)
    await vi.advanceTimersByTimeAsync(8000);
    expect(fn).toHaveBeenCalledTimes(3);

    // After third delay (8000ms - still capped)
    await vi.advanceTimersByTimeAsync(8000);
    expect(fn).toHaveBeenCalledTimes(4);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Retryable error'))
      .mockRejectedValue(new Error('Non-retryable error'));

    const shouldRetry = vi.fn((err: Error) => err.message === 'Retryable error');

    const resultPromise = retryWithBackoff(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry
    });
    const assertion = expect(resultPromise).rejects.toThrow('Non-retryable error');

    // Run timers and catch the expected rejection
    await vi.runAllTimersAsync();
    await assertion;

    // Should stop after 2 attempts (first retried, second not retryable)
    expect(fn).toHaveBeenCalledTimes(2);
    expect(shouldRetry).toHaveBeenCalledTimes(2);
  });

  it('uses default options when not provided', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    // Default maxAttempts is 3
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('converts non-Error exceptions to Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    const resultPromise = retryWithBackoff(fn, { maxAttempts: 1 });
    const assertion = expect(resultPromise).rejects.toThrow('string error');
    await vi.runAllTimersAsync();
    await assertion;
  });
});
