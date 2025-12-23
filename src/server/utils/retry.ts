/**
 * Retry Utility
 * Story H-1 Task 11: Retry with exponential backoff
 *
 * Provides retry logic with configurable attempts and backoff
 * for transient failure recovery (e.g., S3 uploads, API calls)
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: () => true,
};

/**
 * Execute a function with retry and exponential backoff
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => uploadToS3(data),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!opts.shouldRetry(lastError)) {
        console.warn(
          `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed with non-retryable error:`,
          lastError.message
        );
        throw lastError;
      }

      console.warn(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed:`,
        lastError.message
      );

      // Don't delay after the last attempt
      if (attempt < opts.maxAttempts) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs
        );
        console.log(`[Retry] Waiting ${delay}ms before attempt ${attempt + 1}...`);
        await sleep(delay);
      }
    }
  }

  // All attempts exhausted
  console.error(
    `[Retry] All ${opts.maxAttempts} attempts failed. Last error:`,
    lastError?.message
  );
  throw lastError;
}

/**
 * Promise-based sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
