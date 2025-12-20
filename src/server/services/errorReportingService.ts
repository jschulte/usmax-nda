/**
 * Error Reporting Service
 *
 * Provides optional Sentry integration for server-side error reporting.
 * If SENTRY_DSN is not set, reporting is a no-op.
 */

import * as Sentry from '@sentry/node';

let sentryInitialized = false;

function initSentry() {
  if (sentryInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
  });

  sentryInitialized = true;
}

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  initSentry();

  Sentry.withScope((scope) => {
    scope.setContext('context', context);
    Sentry.captureException(error);
  });
}
