/**
 * Error Reporting Service Tests
 * Story 8.1: Error Monitoring with Sentry
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(() => 'test-event-id'),
  captureMessage: vi.fn(() => 'test-event-id'),
  setUser: vi.fn(),
  setContext: vi.fn(),
}));

describe('errorReportingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SENTRY_DSN;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('initializeErrorReporting', () => {
    it('should not initialize Sentry when no DSN provided', async () => {
      const { initializeErrorReporting } = await import('../errorReportingService.js');

      initializeErrorReporting();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should initialize Sentry when DSN provided', async () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'test';

      const { initializeErrorReporting } = await import('../errorReportingService.js');

      initializeErrorReporting();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'test',
        })
      );
    });
  });

  describe('reportError', () => {
    it('should not report when no DSN configured', async () => {
      const { reportError } = await import('../errorReportingService.js');

      const error = new Error('Test error');
      const result = reportError(error);

      expect(result).toBeUndefined();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should report error with full context when DSN configured', async () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      const { reportError } = await import('../errorReportingService.js');

      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        email: 'test@example.com',
        path: '/api/test',
        method: 'POST',
      };

      const result = reportError(error, context, 'error');

      expect(result).toBe('test-event-id');
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        contactId: undefined,
      });
      expect(Sentry.setContext).toHaveBeenCalledWith('request', expect.objectContaining({
        path: '/api/test',
        method: 'POST',
      }));
      expect(Sentry.captureException).toHaveBeenCalledWith(error, { level: 'error' });
    });

    it('should handle string errors', async () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      const { reportError } = await import('../errorReportingService.js');

      const result = reportError('String error message', undefined, 'warning');

      expect(result).toBe('test-event-id');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('String error message', 'warning');
    });
  });

  describe('isErrorReportingEnabled', () => {
    it('should return false when no DSN', async () => {
      const { isErrorReportingEnabled } = await import('../errorReportingService.js');

      expect(isErrorReportingEnabled()).toBe(false);
    });

    it('should return true when DSN configured', async () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      const { isErrorReportingEnabled } = await import('../errorReportingService.js');

      expect(isErrorReportingEnabled()).toBe(true);
    });
  });

  describe('getErrorReportingStatus', () => {
    it('should return disabled status when no DSN', async () => {
      const { getErrorReportingStatus } = await import('../errorReportingService.js');

      const status = getErrorReportingStatus();

      expect(status).toEqual({
        enabled: false,
        environment: expect.any(String),
        dsn: undefined,
      });
    });

    it('should return enabled status when DSN configured', async () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'production';

      const { getErrorReportingStatus } = await import('../errorReportingService.js');

      const status = getErrorReportingStatus();

      expect(status).toEqual({
        enabled: true,
        environment: 'production',
        dsn: '(configured)',
      });
    });
  });
});
