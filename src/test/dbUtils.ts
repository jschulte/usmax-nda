import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../server/db/index.js';

const BASE_PERMISSIONS = [
  { code: 'nda:view', name: 'View NDA', description: 'View NDA details', category: 'nda' },
  { code: 'nda:create', name: 'Create NDA', description: 'Create new NDAs', category: 'nda' },
  { code: 'admin:manage_agencies', name: 'Manage Agencies', description: 'Manage agency groups', category: 'admin' },
  { code: 'admin:manage_users', name: 'Manage Users', description: 'Manage user directory', category: 'admin' },
];

const BASE_ROLES = [
  { name: 'Admin', description: 'Admin role', isSystemRole: true },
  { name: 'NDA User', description: 'NDA user role', isSystemRole: true },
  { name: 'Read-Only', description: 'Read-only role', isSystemRole: true },
];

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resetDatabase(client: DbClient = prisma): Promise<void> {
  const tables = await client.$queryRaw<{ tablename: string }[]>`
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

  await client.$executeRaw(
    Prisma.sql`TRUNCATE TABLE ${Prisma.raw(tableList)} RESTART IDENTITY CASCADE;`
  );
}

const TEST_DB_LOCK_ID = 987654321;

export async function seedBaseAuth(client: DbClient = prisma) {
  await client.permission.createMany({
    data: BASE_PERMISSIONS,
    skipDuplicates: true,
  });

  await client.role.createMany({
    data: BASE_ROLES,
    skipDuplicates: true,
  });

  const roles = await client.role.findMany({
    where: { name: { in: BASE_ROLES.map((r) => r.name) } },
  });

  const permissions = await client.permission.findMany({
    where: { code: { in: BASE_PERMISSIONS.map((p) => p.code) } },
  });

  const byRole = Object.fromEntries(roles.map((r) => [r.name, r]));
  const byPerm = Object.fromEntries(permissions.map((p) => [p.code, p]));

  await client.rolePermission.createMany({
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
        roleId: byRole['Admin'].id,
        permissionId: byPerm['admin:manage_users'].id,
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

  const contactsData = [
    {
      cognitoId: 'mock-user-001',
      email: 'admin@usmax.com',
      firstName: 'Admin',
      lastName: 'User',
    },
    {
      cognitoId: 'mock-user-002',
      email: 'test@usmax.com',
      firstName: 'Test',
      lastName: 'User',
    },
    {
      cognitoId: 'mock-user-003',
      email: 'noaccess@usmax.com',
      firstName: 'No',
      lastName: 'Access',
    },
  ];

  await client.contact.createMany({
    data: contactsData,
    skipDuplicates: true,
  });

  const contacts = await client.contact.findMany({
    where: { cognitoId: { in: contactsData.map((c) => c.cognitoId) } },
  });

  const byCognitoId = Object.fromEntries(
    contacts.map((contact) => [contact.cognitoId, contact])
  );

  const admin = byCognitoId['mock-user-001'];
  const ndaUser = byCognitoId['mock-user-002'];
  const noAccessUser = byCognitoId['mock-user-003'];

  if (!admin || !ndaUser || !noAccessUser) {
    throw new Error('Failed to seed base auth contacts');
  }

  await client.contactRole.createMany({
    data: [
      { contactId: admin.id, roleId: byRole['Admin'].id },
      { contactId: ndaUser.id, roleId: byRole['NDA User'].id },
    ],
    skipDuplicates: true,
  });

  return { admin, ndaUser, noAccessUser };
}

export async function resetDatabaseAndSeedBaseAuth() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TEST_DB_LOCK_ID})`;
    await resetDatabase(tx);
    return await seedBaseAuth(tx);
  }, { timeout: 20000 });
}
