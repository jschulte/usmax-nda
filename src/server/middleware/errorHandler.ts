/**
 * Global Error Handler Middleware
 * Story 8.1: Error Monitoring with Sentry
 *
 * Catches all unhandled errors and reports them to Sentry with full context.
 * Must be registered AFTER all routes in Express app.
 */

import type { Request, Response, NextFunction } from 'express';
import { reportError, type ErrorContext } from '../services/errorReportingService.js';

/**
 * Global error handling middleware
 * Story 8.1: AC 2,3,4 - Captures errors with full context and reports to Sentry
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error to console
  console.error('[ErrorHandler] Unhandled error:', err);

  // Build error context from request
  const context: ErrorContext = {
    // User context (if authenticated)
    userId: (req as any).userContext?.id,
    email: (req as any).userContext?.email,
    contactId: (req as any).userContext?.contactId,

    // Request context
    requestId: req.headers['x-request-id'] as string,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,

    // Additional context
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
  };

  // Determine severity level
  const isCritical = 
    err.message?.includes('database') ||
    err.message?.includes('auth') ||
    err.message?.includes('security') ||
    (err as any).statusCode >= 500;

  const level = isCritical ? 'fatal' : 'error';

  // Report to Sentry (Story 8.1: AC 4 - critical errors trigger alerts)
  reportError(err, context, level);

  // Send user-friendly error response
  const statusCode = (err as any).statusCode || 500;
  const message = 
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * Handle 404 Not Found errors
 * Separate from error handler to avoid reporting every 404 to Sentry
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error: any = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
}
