/**
 * Users Routes Integration Tests (DB-backed)
 * Story 2.5: User/Contact Management
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

describe('Users Routes (integration)', () => {
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

  it('blocks users without permissions', async () => {
    const token = makeMockToken('mock-user-003', 'noaccess@usmax.com');

    const response = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  it('lists users with roles and access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });

    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'Air Force', code: 'USAF' },
    });

    const user = await prisma.contact.create({
      data: {
        email: 'jane.doe@usmax.com',
        firstName: 'Jane',
        lastName: 'Doe',
      },
    });

    const role = await prisma.role.findFirst({ where: { name: 'NDA User' } });
    if (!role) throw new Error('Role seed missing');

    await prisma.contactRole.create({
      data: { contactId: user.id, roleId: role.id },
    });

    await prisma.agencyGroupGrant.create({
      data: { contactId: user.id, agencyGroupId: group.id, grantedBy: seededUsers.admin.id },
    });

    await prisma.subagencyGrant.create({
      data: { contactId: user.id, subagencyId: subagency.id, grantedBy: seededUsers.admin.id },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${token}`])
      .expect(200);

    const listed = response.body.users.find((u: { id: string }) => u.id === user.id);
    expect(listed).toBeDefined();
    expect(listed.roles).toContain('NDA User');
    expect(listed.agencyAccess.groups).toContain('DoD');
    expect(listed.agencyAccess.subagencies).toContain('Air Force');
  });

  it('creates a user and marks them internal', async () => {
    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .post('/api/users')
      .set('Cookie', [`access_token=${token}`])
      .send({
        firstName: 'Jennifer',
        lastName: 'Park',
        email: 'Jennifer.Park@usmax.com',
        workPhone: '555-1111',
        jobTitle: 'IT Services',
      })
      .expect(201);

    expect(response.body.user.email).toBe('jennifer.park@usmax.com');

    const created = await prisma.contact.findUnique({
      where: { email: 'jennifer.park@usmax.com' },
    });
    expect(created).not.toBeNull();
    expect(created?.isInternal).toBe(true);
    expect(created?.active).toBe(true);
  });

  it('updates a user', async () => {
    const user = await prisma.contact.create({
      data: {
        email: 'edit.user@usmax.com',
        firstName: 'Edit',
        lastName: 'User',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    await request(app)
      .put(`/api/users/${user.id}`)
      .set('Cookie', [`access_token=${token}`])
      .send({ jobTitle: 'Legal Counsel', workPhone: '555-2222' })
      .expect(200);

    const updated = await prisma.contact.findUnique({ where: { id: user.id } });
    expect(updated?.jobTitle).toBe('Legal Counsel');
    expect(updated?.workPhone).toBe('555-2222');
  });

  it('deactivates a user via DELETE and PATCH', async () => {
    const user = await prisma.contact.create({
      data: {
        email: 'inactive.user@usmax.com',
        firstName: 'Inactive',
        lastName: 'User',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    await request(app)
      .delete(`/api/users/${user.id}`)
      .set('Cookie', [`access_token=${token}`])
      .expect(200);

    const deleted = await prisma.contact.findUnique({ where: { id: user.id } });
    expect(deleted?.active).toBe(false);

    const user2 = await prisma.contact.create({
      data: {
        email: 'inactive.user2@usmax.com',
        firstName: 'Inactive',
        lastName: 'User2',
      },
    });

    await request(app)
      .patch(`/api/users/${user2.id}/deactivate`)
      .set('Cookie', [`access_token=${token}`])
      .expect(204);

    const patched = await prisma.contact.findUnique({ where: { id: user2.id } });
    expect(patched?.active).toBe(false);
  });

  it('searches users with type-ahead', async () => {
    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .get('/api/users/search?q=jen')
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.users)).toBe(true);
  });
});
