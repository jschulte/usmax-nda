/**
 * Admin Routes
 * Story 1.3: RBAC Permission System
 *
 * Admin endpoints for managing roles and permissions:
 * - GET /api/admin/roles - List all roles
 * - GET /api/admin/permissions - List all permissions
 * - GET /api/admin/users/:id/roles - Get user's roles
 * - POST /api/admin/users/:id/roles - Assign role to user
 * - DELETE /api/admin/users/:id/roles/:roleId - Remove role from user
 *
 * All routes require admin:manage_users permission (AC: 5.5)
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { prisma } from '../db/index.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS, PERMISSION_DESCRIPTIONS, type Permission } from '../constants/permissions.js';
import { auditService, AuditAction } from '../services/auditService.js';
import { invalidateUserContext } from '../services/userContextService.js';
import { exportAllUsersAccess, convertToCSV } from '../services/accessSummaryService.js';
import adminEmailTemplatesRouter from './admin/emailTemplates.js';
import adminTestNotificationsRouter from './admin/testNotifications.js';

const router: RouterType = Router();

// Apply authentication and permission check to all admin routes
router.use(authenticateJWT);
router.use(attachUserContext);

// Story 9.16: Email template management
router.use('/email-templates', adminEmailTemplatesRouter);

// Story 9.17: Test notifications
router.use('/test-notifications', adminTestNotificationsRouter);

/**
 * GET /api/admin/access-export
 * Export all users' access for CMMC compliance audit
 * Story 2.6 Task 2
 *
 * Returns CSV file with columns:
 * User Name, Email, Roles, Agency Groups, Subagencies, Granted By, Granted At
 */
router.get(
  '/access-export',
  requireAnyPermission([PERMISSIONS.ADMIN_MANAGE_USERS, PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]),
  async (req: Request, res: Response) => {
    try {
      const data = await exportAllUsersAccess();
      const csv = convertToCSV(data);

      // Audit log the export
      await auditService.log({
        action: AuditAction.ACCESS_EXPORT,
        entityType: 'access_control',
        entityId: null,
        userId: req.userContext!.contactId,
        details: {
          rowCount: data.length,
          exportedAt: new Date().toISOString(),
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const filename = `access-export-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (error) {
      console.error('[Admin] Error exporting access:', error);
      return res.status(500).json({
        error: 'Failed to export access data',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS));

/**
 * GET /api/admin/roles
 * List all available roles with their permissions
 * Task 5.1
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        category: rp.permission.category,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return res.json({ roles: formattedRoles });
  } catch (error) {
    console.error('[Admin] Error fetching roles:', error);
    return res.status(500).json({
      error: 'Failed to fetch roles',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/permissions
 * List all available permissions with descriptions
 * Task 5.2
 */
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    const formattedPermissions = permissions.map((perm) => ({
      id: perm.id,
      code: perm.code,
      name: perm.name,
      description: PERMISSION_DESCRIPTIONS[perm.code as Permission] || perm.description,
      category: perm.category,
    }));

    return res.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error('[Admin] Error fetching permissions:', error);
    return res.status(500).json({
      error: 'Failed to fetch permissions',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/users/:id/roles
 * Get roles assigned to a specific user
 */
router.get('/users/:id/roles', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    const roles = contact.contactRoles.map((cr) => ({
      id: cr.role.id,
      name: cr.role.name,
      description: cr.role.description,
      isSystemRole: cr.role.isSystemRole,
      grantedAt: cr.grantedAt,
      permissions: cr.role.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        name: rp.permission.name,
      })),
    }));

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null;

    return res.json({
      userId: id,
      email: contact.email,
      name: fullName,
      roles,
    });
  } catch (error) {
    console.error('[Admin] Error fetching user roles:', error);
    return res.status(500).json({
      error: 'Failed to fetch user roles',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/admin/users/:id/roles
 * Assign a role to a user
 * Task 5.3
 *
 * Body: { roleId: string }
 */
router.post('/users/:id/roles', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roleId } = req.body;

  if (!roleId) {
    return res.status(400).json({
      error: 'roleId is required',
      code: 'MISSING_ROLE_ID',
    });
  }

  try {
    // Verify user exists
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }

    // Story 9.5: Check if already assigned with better error logging
    const existing = await prisma.contactRole.findUnique({
      where: {
        contactId_roleId: { contactId: id, roleId },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'User already has this role',
        code: 'ROLE_ALREADY_ASSIGNED',
      });
    }

    // Assign role
    await prisma.contactRole.create({
      data: {
        contactId: id,
        roleId,
        grantedBy: req.userContext!.contactId,
      },
    });

    // Invalidate user context cache so they get updated permissions
    if (contact.cognitoId) {
      invalidateUserContext(contact.cognitoId);
    }

    // Audit log
    await auditService.log({
      action: AuditAction.ROLE_ASSIGNED,
      entityType: 'contact_role',
      entityId: id,
      userId: req.userContext!.contactId,
      details: {
        targetUserId: id,
        targetUserEmail: contact.email,
        roleId,
        roleName: role.name,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: `Role '${role.name}' assigned to user`,
      userId: id,
      roleId,
      roleName: role.name,
    });
  } catch (error) {
    console.error('[Admin] Error assigning role:', error);
    return res.status(500).json({
      error: 'Failed to assign role',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/admin/users/:id/roles/:roleId
 * Remove a role from a user
 * Task 5.4
 */
router.delete('/users/:id/roles/:roleId', async (req: Request, res: Response) => {
  const { id, roleId } = req.params;

  try {
    // Verify user exists
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }

    // Check if assignment exists
    const existing = await prisma.contactRole.findUnique({
      where: {
        contactId_roleId: { contactId: id, roleId },
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: 'User does not have this role',
        code: 'ROLE_NOT_ASSIGNED',
      });
    }

    // Prevent removing the last role from a user
    const roleCount = await prisma.contactRole.count({
      where: { contactId: id },
    });

    if (roleCount <= 1) {
      return res.status(400).json({
        error: 'Cannot remove the last role from a user',
        code: 'LAST_ROLE',
      });
    }

    // Remove role
    await prisma.contactRole.delete({
      where: {
        contactId_roleId: { contactId: id, roleId },
      },
    });

    // Invalidate user context cache
    if (contact.cognitoId) {
      invalidateUserContext(contact.cognitoId);
    }

    // Audit log
    await auditService.log({
      action: AuditAction.ROLE_REMOVED,
      entityType: 'contact_role',
      entityId: id,
      userId: req.userContext!.contactId,
      details: {
        targetUserId: id,
        targetUserEmail: contact.email,
        roleId,
        roleName: role.name,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `Role '${role.name}' removed from user`,
      userId: id,
      roleId,
      roleName: role.name,
    });
  } catch (error) {
    console.error('[Admin] Error removing role:', error);
    return res.status(500).json({
      error: 'Failed to remove role',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
