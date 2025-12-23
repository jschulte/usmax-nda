/**
 * Security Monitoring Utilities
 * Story 6.4: Login Attempt Tracking
 *
 * Provides helper functions for analyzing failed login attempts
 * and detecting potential security threats.
 */

import { prisma } from '../db/index.js';

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
  const entries = await prisma.auditLog.findMany({
    where: {
      action: { in: ['login_failed', 'mfa_failed'] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      createdAt: true,
      ipAddress: true,
      userAgent: true,
      details: true,
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    timestamp: entry.createdAt,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    email: (entry.details as any)?.email || 'unknown',
    reason: (entry.details as any)?.reason || 'unknown',
    attemptsRemaining: (entry.details as any)?.attemptsRemaining,
  }));
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
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const failures = await getFailedLoginsByIp(ipAddress, since);
  return failures >= threshold;
}
