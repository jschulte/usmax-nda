/**
 * Database Seed Script
 * Story 1.2: JWT Middleware & User Context
 *
 * Seeds the database with:
 * - 4 default roles (Admin, NDA User, Limited User, Read-Only)
 * - 11 permissions (7 NDA + 4 admin)
 * - Role-permission mappings as defined in the architecture
 * - Sample agency groups and subagencies for development
 *
 * Run with: pnpm exec prisma db seed
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

const PERMISSIONS = [
  // NDA Permissions (7)
  { code: 'nda:create', name: 'Create NDA', description: 'Create new NDAs', category: 'nda' },
  { code: 'nda:update', name: 'Update NDA', description: 'Edit existing NDAs', category: 'nda' },
  { code: 'nda:upload_document', name: 'Upload Document', description: 'Upload documents to NDAs', category: 'nda' },
  { code: 'nda:send_email', name: 'Send Email', description: 'Send emails related to NDAs', category: 'nda' },
  { code: 'nda:mark_status', name: 'Mark Status', description: 'Change NDA status', category: 'nda' },
  { code: 'nda:view', name: 'View NDA', description: 'View NDA details', category: 'nda' },
  { code: 'nda:delete', name: 'Delete NDA', description: 'Delete NDAs', category: 'nda' },

  // Admin Permissions (4)
  { code: 'admin:manage_users', name: 'Manage Users', description: 'Create, edit, deactivate users', category: 'admin' },
  { code: 'admin:manage_agencies', name: 'Manage Agencies', description: 'Create, edit agency groups and subagencies', category: 'admin' },
  { code: 'admin:manage_templates', name: 'Manage Templates', description: 'Create, edit RTF and email templates', category: 'admin' },
  { code: 'admin:view_audit_logs', name: 'View Audit Logs', description: 'Access centralized audit log viewer', category: 'admin' },
];

// =============================================================================
// ROLE DEFINITIONS WITH PERMISSION MAPPINGS
// =============================================================================

const ROLES = [
  {
    name: 'Admin',
    description: 'Full system access - can manage users, agencies, templates, and all NDA operations',
    isSystemRole: true,
    permissions: [
      // All 11 permissions
      'nda:create', 'nda:update', 'nda:upload_document', 'nda:send_email',
      'nda:mark_status', 'nda:view', 'nda:delete',
      'admin:manage_users', 'admin:manage_agencies', 'admin:manage_templates', 'admin:view_audit_logs',
    ],
  },
  {
    name: 'NDA User',
    description: 'Can create, edit, and send NDAs within their authorized agencies',
    isSystemRole: true,
    permissions: [
      'nda:create', 'nda:update', 'nda:upload_document', 'nda:send_email',
      'nda:mark_status', 'nda:view',
    ],
  },
  {
    name: 'Limited User',
    description: 'Can view NDAs and upload documents, but cannot create or edit',
    isSystemRole: true,
    permissions: [
      'nda:upload_document', 'nda:view',
    ],
  },
  {
    name: 'Read-Only',
    description: 'Can only view NDAs - default role for new users',
    isSystemRole: true,
    permissions: [
      'nda:view',
    ],
  },
];

// =============================================================================
// SAMPLE AGENCY STRUCTURE (for development)
// =============================================================================

const AGENCY_GROUPS = [
  {
    name: 'Department of Defense',
    code: 'DoD',
    description: 'Military and defense agencies',
    subagencies: [
      { name: 'US Air Force', code: 'USAF', description: 'United States Air Force' },
      { name: 'US Army', code: 'USA', description: 'United States Army' },
      { name: 'US Navy', code: 'USN', description: 'United States Navy' },
      { name: 'US Marine Corps', code: 'USMC', description: 'United States Marine Corps' },
      { name: 'Defense Logistics Agency', code: 'DLA', description: 'Defense Logistics Agency' },
    ],
  },
  {
    name: 'Federal Civilian',
    code: 'FedCiv',
    description: 'Non-defense federal agencies',
    subagencies: [
      { name: 'Department of Homeland Security', code: 'DHS', description: 'DHS and its components' },
      { name: 'Department of Veterans Affairs', code: 'VA', description: 'Veterans Affairs' },
      { name: 'General Services Administration', code: 'GSA', description: 'GSA' },
      { name: 'NASA', code: 'NASA', description: 'National Aeronautics and Space Administration' },
    ],
  },
  {
    name: 'Commercial',
    code: 'COMM',
    description: 'Commercial and private sector clients',
    subagencies: [
      { name: 'Fortune 500', code: 'F500', description: 'Fortune 500 companies' },
      { name: 'Small Business', code: 'SMB', description: 'Small and medium businesses' },
      { name: 'Healthcare', code: 'HLTH', description: 'Healthcare industry' },
    ],
  },
  {
    name: 'Healthcare',
    code: 'HHS',
    description: 'Healthcare and human services agencies',
    subagencies: [
      { name: 'Centers for Medicare & Medicaid', code: 'CMS', description: 'CMS' },
      { name: 'National Institutes of Health', code: 'NIH', description: 'NIH' },
      { name: 'Food and Drug Administration', code: 'FDA', description: 'FDA' },
    ],
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedPermissions() {
  console.log('Seeding permissions...');

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        category: permission.category,
      },
      create: permission,
    });
  }

  console.log(`  Created/updated ${PERMISSIONS.length} permissions`);
}

async function seedRoles() {
  console.log('Seeding roles...');

  for (const roleData of ROLES) {
    // Create or update the role
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
      },
    });

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: { code: { in: roleData.permissions } },
    });

    // Clear existing role permissions and create new ones
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });

    console.log(`  Created/updated role: ${roleData.name} with ${permissions.length} permissions`);
  }
}

async function seedAgencyStructure() {
  console.log('Seeding agency structure...');

  for (const groupData of AGENCY_GROUPS) {
    // Create agency group
    const agencyGroup = await prisma.agencyGroup.upsert({
      where: { code: groupData.code },
      update: {
        name: groupData.name,
        description: groupData.description,
      },
      create: {
        name: groupData.name,
        code: groupData.code,
        description: groupData.description,
      },
    });

    // Create subagencies
    for (const subData of groupData.subagencies) {
      await prisma.subagency.upsert({
        where: {
          agencyGroupId_code: {
            agencyGroupId: agencyGroup.id,
            code: subData.code,
          },
        },
        update: {
          name: subData.name,
          description: subData.description,
        },
        create: {
          agencyGroupId: agencyGroup.id,
          name: subData.name,
          code: subData.code,
          description: subData.description,
        },
      });
    }

    console.log(`  Created/updated agency group: ${groupData.name} with ${groupData.subagencies.length} subagencies`);
  }
}

async function seedDevUsers() {
  // Only create dev users in development mode
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping dev users in production');
    return;
  }

  console.log('Seeding development users...');

  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  const ndaUserRole = await prisma.role.findUnique({ where: { name: 'NDA User' } });
  const dodAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'DoD' } });

  if (!adminRole || !ndaUserRole || !dodAgencyGroup) {
    console.warn('  Skipping dev users - required roles/agencies not found');
    return;
  }

  // Admin user (matches mock auth)
  const adminUser = await prisma.contact.upsert({
    where: { email: 'admin@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-001',
      email: 'admin@usmax.com',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  // Assign Admin role
  await prisma.contactRole.upsert({
    where: {
      contactId_roleId: {
        contactId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      contactId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  // Give admin access to all agency groups
  const allAgencyGroups = await prisma.agencyGroup.findMany();
  for (const ag of allAgencyGroups) {
    await prisma.agencyGroupGrant.upsert({
      where: {
        contactId_agencyGroupId: {
          contactId: adminUser.id,
          agencyGroupId: ag.id,
        },
      },
      update: {},
      create: {
        contactId: adminUser.id,
        agencyGroupId: ag.id,
      },
    });
  }

  console.log(`  Created admin user: ${adminUser.email}`);

  // Test user (matches mock auth)
  const testUser = await prisma.contact.upsert({
    where: { email: 'test@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-002',
      email: 'test@usmax.com',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  // Assign NDA User role
  await prisma.contactRole.upsert({
    where: {
      contactId_roleId: {
        contactId: testUser.id,
        roleId: ndaUserRole.id,
      },
    },
    update: {},
    create: {
      contactId: testUser.id,
      roleId: ndaUserRole.id,
    },
  });

  // Give test user access to DoD only
  await prisma.agencyGroupGrant.upsert({
    where: {
      contactId_agencyGroupId: {
        contactId: testUser.id,
        agencyGroupId: dodAgencyGroup.id,
      },
    },
    update: {},
    create: {
      contactId: testUser.id,
      agencyGroupId: dodAgencyGroup.id,
    },
  });

  console.log(`  Created test user: ${testUser.email}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Starting database seed...\n');

  await seedPermissions();
  await seedRoles();
  await seedAgencyStructure();
  await seedDevUsers();

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
