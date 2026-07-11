/**
 * pi-brandly retry utility
 * Exponential backoff for transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> & {
  onRetry?: (attempt: number, error: Error) => void;
} = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  onRetry: undefined,
};

/**
 * Retry an async operation with exponential backoff.
 * @param fn - The async function to retry
 * @param opts - Retry configuration
 * @returns The result of fn on success
 * @throws The last error after all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...opts };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === config.maxRetries) {
        break;
      }

      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );

      if (config.onRetry) {
        config.onRetry(attempt + 1, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
