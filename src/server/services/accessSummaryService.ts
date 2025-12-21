/**
 * Access Summary Service
 * Story 2.6: Access Control Summary View
 *
 * Provides access summary and export functionality:
 * - User access summary with roles, permissions, and agency access
 * - CSV export for CMMC compliance audits
 */

import { prisma } from '../db/index.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface PermissionSummary {
  code: string;
  name: string;
  category: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  permissions: PermissionSummary[];
  grantedAt: Date;
}

export interface AgencyGroupAccessSummary {
  id: string;
  name: string;
  code: string;
  subagencies: { id: string; name: string; code: string }[];
  grantedBy: { id: string; name: string } | null;
  grantedAt: Date;
}

export interface SubagencyAccessSummary {
  id: string;
  name: string;
  code: string;
  agencyGroup: { id: string; name: string; code: string };
  grantedBy: { id: string; name: string } | null;
  grantedAt: Date;
}

export interface UserAccessSummary {
  user: {
    id: string;
    name: string;
    email: string;
  };
  roles: RoleSummary[];
  effectivePermissions: string[];
  agencyGroupAccess: AgencyGroupAccessSummary[];
  subagencyAccess: SubagencyAccessSummary[];
}

export interface AccessExportRow {
  userName: string;
  email: string;
  roles: string;
  agencyGroups: string;
  subagencies: string;
  grantedBy: string;
  grantedAt: string;
}

// =============================================================================
// ACCESS SUMMARY OPERATIONS
// =============================================================================

/**
 * Get complete access summary for a user
 */
export async function getUserAccessSummary(userId: string): Promise<UserAccessSummary | null> {
  const user = await prisma.contact.findUnique({
    where: { id: userId },
    include: {
      contactRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            include: {
              subagencies: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          grantedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      subagencyGrants: {
        include: {
          subagency: {
            include: {
              agencyGroup: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          grantedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Build roles with permissions
  const roles: RoleSummary[] = user.contactRoles.map((cr) => ({
    id: cr.role.id,
    name: cr.role.name,
    description: cr.role.description,
    permissions: cr.role.rolePermissions.map((rp) => ({
      code: rp.permission.code,
      name: rp.permission.name,
      category: rp.permission.category,
    })),
    grantedAt: cr.grantedAt,
  }));

  // Calculate effective permissions (deduplicated from all roles)
  const permissionSet = new Set<string>();
  for (const role of roles) {
    for (const perm of role.permissions) {
      permissionSet.add(perm.code);
    }
  }
  const effectivePermissions = Array.from(permissionSet).sort();

  // Build agency group access
  const agencyGroupAccess: AgencyGroupAccessSummary[] = user.agencyGroupGrants.map((grant) => ({
    id: grant.agencyGroup.id,
    name: grant.agencyGroup.name,
    code: grant.agencyGroup.code,
    subagencies: grant.agencyGroup.subagencies,
    grantedBy: grant.grantedByUser
      ? {
          id: grant.grantedByUser.id,
          name: [grant.grantedByUser.firstName, grant.grantedByUser.lastName].filter(Boolean).join(' '),
        }
      : null,
    grantedAt: grant.grantedAt,
  }));

  // Build subagency access (direct only, not inherited)
  const subagencyAccess: SubagencyAccessSummary[] = user.subagencyGrants.map((grant) => ({
    id: grant.subagency.id,
    name: grant.subagency.name,
    code: grant.subagency.code,
    agencyGroup: grant.subagency.agencyGroup,
    grantedBy: grant.grantedByUser
      ? {
          id: grant.grantedByUser.id,
          name: [grant.grantedByUser.firstName, grant.grantedByUser.lastName].filter(Boolean).join(' '),
        }
      : null,
    grantedAt: grant.grantedAt,
  }));

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return {
    user: {
      id: user.id,
      name: userName,
      email: user.email,
    },
    roles,
    effectivePermissions,
    agencyGroupAccess,
    subagencyAccess,
  };
}

/**
 * Export all users' access for CMMC compliance audit
 * Returns data suitable for CSV generation
 */
export async function exportAllUsersAccess(): Promise<AccessExportRow[]> {
  const users = await prisma.contact.findMany({
    include: {
      contactRoles: {
        include: {
          role: {
            select: { name: true },
          },
        },
      },
      agencyGroupGrants: {
        include: {
          agencyGroup: {
            select: {
              name: true,
              subagencies: { select: { id: true, name: true } },
            },
          },
          grantedByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      subagencyGrants: {
        include: {
          subagency: {
            select: {
              id: true,
              name: true,
              agencyGroup: { select: { id: true, name: true } },
            },
          },
          grantedByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  return users.map((user) => {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const roles = user.contactRoles.map((cr) => cr.role.name).join(', ');
    const agencyGroups = user.agencyGroupGrants.map((g) => g.agencyGroup.name).join(', ');

    const directSubagencyIds = new Set(user.subagencyGrants.map((g) => g.subagency.id));
    const inheritedSubagencies = user.agencyGroupGrants.flatMap((g) =>
      g.agencyGroup.subagencies.map((sub) => ({
        id: sub.id,
        name: sub.name,
        groupName: g.agencyGroup.name,
      }))
    );

    const subagencies = [
      ...user.subagencyGrants.map((g) => `${g.subagency.name} (direct)`),
      ...inheritedSubagencies
        .filter((sub) => !directSubagencyIds.has(sub.id))
        .map((sub) => `${sub.name} (via ${sub.groupName})`),
    ].join(', ');

    const formatGrantor = (grantor: { firstName: string | null; lastName: string | null; email: string | null } | null) => {
      if (!grantor) return 'Unknown';
      const name = [grantor.firstName, grantor.lastName].filter(Boolean).join(' ');
      return name || grantor.email || 'Unknown';
    };

    const formatDate = (value: Date) => value.toISOString().split('T')[0];

    const grantedBy = [
      ...user.agencyGroupGrants.map((g) => `${g.agencyGroup.name}: ${formatGrantor(g.grantedByUser)}`),
      ...user.subagencyGrants.map((g) => `${g.subagency.name}: ${formatGrantor(g.grantedByUser)}`),
    ].join('; ');

    const grantedAt = [
      ...user.agencyGroupGrants.map((g) => `${g.agencyGroup.name}: ${formatDate(g.grantedAt)}`),
      ...user.subagencyGrants.map((g) => `${g.subagency.name}: ${formatDate(g.grantedAt)}`),
    ].join('; ');

    return {
      userName,
      email: user.email,
      roles: roles || 'None',
      agencyGroups: agencyGroups || 'None',
      subagencies: subagencies || 'None',
      grantedBy: grantedBy || 'None',
      grantedAt: grantedAt || 'None',
    };
  });
}

/**
 * Convert export data to CSV string
 */
export function convertToCSV(data: AccessExportRow[]): string {
  const headers = ['User Name', 'Email', 'Roles', 'Agency Groups', 'Subagencies', 'Granted By', 'Granted At'];

  const escapeCSV = (value: string | boolean): string => {
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) => [
    escapeCSV(row.userName),
    escapeCSV(row.email),
    escapeCSV(row.roles),
    escapeCSV(row.agencyGroups),
    escapeCSV(row.subagencies),
    escapeCSV(row.grantedBy),
    escapeCSV(row.grantedAt),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
