/**
 * Users Bulk Operations Integration Tests
 * Story 2.7: Bulk User Operations
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { resetDatabase, seedBaseAuth } from '../../../test/dbUtils';
import { clearAllUserContextCache } from '../../services/userContextService.js';
import { prisma } from '../../db/index.js';

function makeMockToken(sub: string, email: string) {
  const payload = {
    sub,
    email,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
}

describe('Users Bulk Operations (integration)', () => {
  let app: express.Express;
  let seededUsers: Awaited<ReturnType<typeof seedBaseAuth>>;

  beforeEach(async () => {
    clearAllUserContextCache();
    await resetDatabase();
    seededUsers = await seedBaseAuth();

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: usersRouter } = await import('../users');
    app.use('/api/users', usersRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bulk assigns roles and skips existing assignments', async () => {
    const role = await prisma.role.findFirst({ where: { name: 'NDA User' } });
    if (!role) throw new Error('Role seed missing');

    const user = await prisma.contact.create({
      data: { email: 'bulk.role@usmax.com', firstName: 'Bulk', lastName: 'Role' },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .post('/api/users/bulk/assign-role')
      .set('Cookie', [`access_token=${token}`])
      .send({ userIds: [seededUsers.ndaUser.id, user.id], roleId: role.id })
      .expect(200);

    expect(response.body.assignedCount).toBe(1);
    expect(response.body.skippedCount).toBe(1);

    const created = await prisma.contactRole.findUnique({
      where: { contactId_roleId: { contactId: user.id, roleId: role.id } },
    });
    expect(created).not.toBeNull();
  });

  it('bulk grants agency group access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });

    const extraUser = await prisma.contact.create({
      data: { email: 'bulk.access@usmax.com', firstName: 'Bulk', lastName: 'Access' },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .post('/api/users/bulk/grant-access')
      .set('Cookie', [`access_token=${token}`])
      .send({ userIds: [seededUsers.ndaUser.id, extraUser.id], agencyGroupId: group.id })
      .expect(200);

    expect(response.body.grantedCount).toBe(2);

    const grants = await prisma.agencyGroupGrant.findMany({
      where: { agencyGroupId: group.id },
    });
    expect(grants).toHaveLength(2);
  });

  it('bulk deactivates users and skips self', async () => {
    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .post('/api/users/bulk/deactivate')
      .set('Cookie', [`access_token=${token}`])
      .send({ userIds: [seededUsers.admin.id, seededUsers.ndaUser.id] })
      .expect(200);

    expect(response.body.deactivatedCount).toBe(1);
    expect(response.body.skippedSelf).toBe(true);

    const updated = await prisma.contact.findUnique({ where: { id: seededUsers.ndaUser.id } });
    expect(updated?.active).toBe(false);
  });
});
