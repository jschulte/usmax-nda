import { prisma } from '../server/db/index.js';

const BASE_PERMISSIONS = [
  { code: 'nda:view', name: 'View NDA', description: 'View NDA details', category: 'nda' },
  { code: 'nda:create', name: 'Create NDA', description: 'Create new NDAs', category: 'nda' },
  { code: 'admin:manage_agencies', name: 'Manage Agencies', description: 'Manage agency groups', category: 'admin' },
];

const BASE_ROLES = [
  { name: 'Admin', description: 'Admin role', isSystemRole: true },
  { name: 'NDA User', description: 'NDA user role', isSystemRole: true },
  { name: 'Read-Only', description: 'Read-only role', isSystemRole: true },
];

export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (!tables.length) {
    return;
  }

  const tableList = tables
    .map((t) => `"public"."${t.tablename}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

export async function seedBaseAuth() {
  await prisma.permission.createMany({
    data: BASE_PERMISSIONS,
    skipDuplicates: true,
  });

  await prisma.role.createMany({
    data: BASE_ROLES,
    skipDuplicates: true,
  });

  const roles = await prisma.role.findMany({
    where: { name: { in: BASE_ROLES.map((r) => r.name) } },
  });

  const permissions = await prisma.permission.findMany({
    where: { code: { in: BASE_PERMISSIONS.map((p) => p.code) } },
  });

  const byRole = Object.fromEntries(roles.map((r) => [r.name, r]));
  const byPerm = Object.fromEntries(permissions.map((p) => [p.code, p]));

  await prisma.rolePermission.createMany({
    data: [
      {
        roleId: byRole['Admin'].id,
        permissionId: byPerm['nda:view'].id,
      },
      {
        roleId: byRole['Admin'].id,
        permissionId: byPerm['nda:create'].id,
      },
      {
        roleId: byRole['Admin'].id,
        permissionId: byPerm['admin:manage_agencies'].id,
      },
      {
        roleId: byRole['NDA User'].id,
        permissionId: byPerm['nda:view'].id,
      },
      {
        roleId: byRole['NDA User'].id,
        permissionId: byPerm['nda:create'].id,
      },
      {
        roleId: byRole['Read-Only'].id,
        permissionId: byPerm['nda:view'].id,
      },
    ],
    skipDuplicates: true,
  });

  const admin = await prisma.contact.create({
    data: {
      cognitoId: 'mock-user-001',
      email: 'admin@usmax.com',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const ndaUser = await prisma.contact.create({
    data: {
      cognitoId: 'mock-user-002',
      email: 'test@usmax.com',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  const noAccessUser = await prisma.contact.create({
    data: {
      cognitoId: 'mock-user-003',
      email: 'noaccess@usmax.com',
      firstName: 'No',
      lastName: 'Access',
    },
  });

  await prisma.contactRole.createMany({
    data: [
      { contactId: admin.id, roleId: byRole['Admin'].id },
      { contactId: ndaUser.id, roleId: byRole['NDA User'].id },
    ],
  });

  return { admin, ndaUser, noAccessUser };
}
