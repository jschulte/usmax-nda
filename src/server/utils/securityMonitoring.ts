/**
 * Security Monitoring Utilities
 * Story 6.4: Login Attempt Tracking
 *
 * Provides helper functions for analyzing failed login attempts
 * and detecting potential security threats.
 */

import type { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../db/index.js';

type AuditLogDetails = Prisma.JsonObject;

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDetailString(details: AuditLogDetails, key: string, fallback: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : fallback;
}

function getDetailNumber(details: AuditLogDetails, key: string): number | undefined {
  const value = details[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Get count of failed login attempts for an IP address
 *
 * Used to detect brute force attacks from a specific IP.
 *
 * @param ipAddress - IP address to check
 * @param since - Start of time window (default: last 24 hours)
 * @returns Count of failed login/MFA attempts
 *
 * @example
 * const failures = await getFailedLoginsByIp('192.168.1.100');
 * if (failures > 10) {
 *   // Potential brute force attack
 * }
 */
export async function getFailedLoginsByIp(
  ipAddress: string,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
): Promise<number> {
  const count = await prisma.auditLog.count({
    where: {
      action: { in: ['login_failed', 'mfa_failed'] },
      ipAddress,
      createdAt: { gte: since },
    },
  });
  return count;
}

/**
 * Get count of failed login attempts for an email address
 *
 * Used to detect account compromise attempts targeting a specific user.
 *
 * @param email - Email address to check
 * @param since - Start of time window (default: last 24 hours)
 * @returns Count of failed login/MFA attempts
 *
 * @example
 * const failures = await getFailedLoginsByEmail('admin@usmax.com');
 * if (failures > 5) {
 *   // Potential account compromise attempt
 * }
 */
export async function getFailedLoginsByEmail(
  email: string,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
): Promise<number> {
  // Query JSONB details field for email
  const count = await prisma.auditLog.count({
    where: {
      action: { in: ['login_failed', 'mfa_failed'] },
      details: {
        path: ['email'],
        equals: email,
      },
      createdAt: { gte: since },
    },
  });
  return count;
}

/**
 * Get recent failed login attempts with details
 *
 * Used for security monitoring dashboard or incident investigation.
 *
 * @param limit - Maximum number of records to return
 * @param since - Start of time window (default: last 24 hours)
 * @returns Array of failed login audit entries
 *
 * @example
 * const recentFailures = await getRecentFailedLogins(50);
 * // Returns: [{ email, ipAddress, timestamp, reason, ... }, ...]
 */
export async function getRecentFailedLogins(
  limit: number = 100,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
) {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 500)
    : 100;
  const entries = await prisma.auditLog.findMany({
    where: {
      action: { in: ['login_failed', 'mfa_failed'] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: normalizedLimit,
    select: {
      id: true,
      action: true,
      createdAt: true,
      ipAddress: true,
      userAgent: true,
      details: true,
    },
  });

  return entries.map((entry) => {
    const details: AuditLogDetails = isJsonObject(entry.details) ? entry.details : {};

    return {
      id: entry.id,
      action: entry.action,
      timestamp: entry.createdAt,
      ipAddress: entry.ipAddress ?? 'unknown',
      userAgent: entry.userAgent ?? 'unknown',
      email: getDetailString(details, 'email', 'unknown'),
      reason: getDetailString(details, 'reason', 'unknown'),
      attemptsRemaining: getDetailNumber(details, 'attemptsRemaining'),
    };
  });
}

/**
 * Check if an IP address should be blocked due to excessive failures
 *
 * Simple threshold-based check for demonstration.
 * In production, consider more sophisticated rate limiting.
 *
 * @param ipAddress - IP address to check
 * @param threshold - Failure count threshold (default: 10)
 * @param windowMinutes - Time window in minutes (default: 60)
 * @returns True if IP should be blocked
 *
 * @example
 * if (await shouldBlockIp('192.168.1.100')) {
 *   return res.status(429).json({ error: 'Too many failed attempts' });
 * }
 */
export async function shouldBlockIp(
  ipAddress: string,
  threshold: number = 10,
  windowMinutes: number = 60
): Promise<boolean> {
  const safeThreshold = Number.isFinite(threshold) ? Math.max(1, Math.trunc(threshold)) : 1;
  const safeWindowMinutes = Number.isFinite(windowMinutes)
    ? Math.max(1, Math.trunc(windowMinutes))
    : 60;
  const since = new Date(Date.now() - safeWindowMinutes * 60 * 1000);
  const failures = await getFailedLoginsByIp(ipAddress, since);
  return failures >= safeThreshold;
}
