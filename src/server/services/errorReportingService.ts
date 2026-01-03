/**
 * Error Reporting Service - Sentry Integration
 * Story 8.1: Error Monitoring with Sentry
 *
 * Provides Sentry integration for server-side error reporting with:
 * - User context (email, userId, contactId)
 * - Request context (path, method, headers, IP)
 * - Environment context (NODE_ENV, release version)
 * - Sensitive data filtering (cookies, auth headers)
 * - Critical error alerting configuration
 *
 * If SENTRY_DSN is not set, reporting is a no-op.
 */

import * as Sentry from '@sentry/node';

export interface ErrorContext {
  userId?: string;
  email?: string;
  contactId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

let sentryInitialized = false;

/**
 * Initialize Sentry error monitoring
 * Should be called once on server startup
 *
 * Story 8.1: AC 1 - Sentry is integrated
 */
export function initializeErrorReporting(): void {
  if (sentryInitialized) return;

  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Skip initialization if no DSN provided (development/testing)
  if (!sentryDsn) {
    console.log('[Sentry] No SENTRY_DSN configured - error reporting disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,

    // Performance monitoring (Story 8.1: AC 3 - Environment context)
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Release tracking for versioning
    release: process.env.APP_VERSION,

    // Story 8.1: AC 3 - Filter sensitive data from error reports
    beforeSend(event, hint) {
      // Remove sensitive headers (cookies, authorization)
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }

      // Remove sensitive user data, keep only safe identifiers
      if (event.user) {
        event.user = {
          id: event.user.id,
          email: event.user.email,
        };
      }

      return event;
    },
  });

  sentryInitialized = true;
  console.log(`[Sentry] Error reporting initialized for ${environment}`);
}

/**
 * Report an error to Sentry with full context
 *
 * Story 8.1: AC 2,3 - Captures error message/stack, user context, request context, environment
 *
 * @param error - Error object or message to report
 * @param context - Additional context (user, request, custom data)
 * @param level - Severity level (Story 8.1: AC 4 - critical errors trigger alerts)
 * @returns Sentry event ID for tracking
 */
export function reportError(
  error: Error | string | unknown,
  context?: ErrorContext,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error'
): string | undefined {
  const dsn = process.env.SENTRY_DSN;

  // Skip if Sentry not configured
  if (!dsn) {
    console.error('[Sentry] Error not reported (no DSN):', error);
    return undefined;
  }

  // Ensure Sentry is initialized
  initializeErrorReporting();

  // Story 8.1: AC 3 - Capture user context
  if (context?.userId || context?.email) {
    Sentry.setUser({
      id: context.userId,
      email: context.email,
      contactId: context.contactId,
    });
  }

  // Story 8.1: AC 3 - Capture request context
  if (context?.requestId || context?.path) {
    Sentry.setContext('request', {
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });
  }

  // Add any additional custom context
  const customContext = { ...context };
  delete customContext.userId;
  delete customContext.email;
  delete customContext.contactId;
  delete customContext.requestId;
  delete customContext.path;
  delete customContext.method;
  delete customContext.userAgent;
  delete customContext.ipAddress;

  if (Object.keys(customContext).length > 0) {
    Sentry.setContext('custom', customContext);
  }

  // Story 8.1: AC 2 - Capture error message/stack
  // Story 8.1: AC 4 - Critical errors trigger immediate alerts via Sentry dashboard
  const eventId = error instanceof Error || typeof error === 'string'
    ? (typeof error === 'string'
        ? Sentry.captureMessage(error, level)
        : Sentry.captureException(error, { level }))
    : Sentry.captureException(new Error(String(error)), { level });

  // Clear context for next error
  Sentry.setUser(null);
  Sentry.setContext('request', null);
  Sentry.setContext('custom', null);

  return eventId;
}

/**
 * Check if error reporting is enabled
 */
export function isErrorReportingEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

/**
 * Get Sentry status (for health checks)
 */
export function getErrorReportingStatus(): {
  enabled: boolean;
  environment: string;
  dsn?: string;
} {
  const enabled = isErrorReportingEnabled();
  return {
    enabled,
    environment: process.env.NODE_ENV || 'development',
    dsn: enabled ? '(configured)' : undefined,
  };
}
