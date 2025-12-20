/**
 * Agency Access Routes Integration Tests (DB-backed)
 * Stories 2.3 & 2.4
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

describe('Agency Access Routes (integration)', () => {
  let app: express.Express;
  let seededUsers: Awaited<ReturnType<typeof seedBaseAuth>>;

  beforeEach(async () => {
    clearAllUserContextCache();
    await resetDatabase();
    seededUsers = await seedBaseAuth();

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: agencyAccessRouter } = await import('../agencyAccess');
    app.use('/api', agencyAccessRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('blocks non-admin users', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });
    const token = makeMockToken('mock-user-002', 'test@usmax.com');

    const response = await request(app)
      .get(`/api/agency-groups/${group.id}/access`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  it('grants and lists agency group access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });

    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const grantResponse = await request(app)
      .post(`/api/agency-groups/${group.id}/access`)
      .set('Cookie', [`access_token=${adminToken}`])
      .send({ contactId: seededUsers.ndaUser.id });

    expect(grantResponse.status).toBe(201);

    const listResponse = await request(app)
      .get(`/api/agency-groups/${group.id}/access`)
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.users).toHaveLength(1);
    expect(listResponse.body.users[0].contactId).toBe(seededUsers.ndaUser.id);
  });

  it('revokes agency group access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Commercial', code: 'COMM' },
    });

    await prisma.agencyGroupGrant.create({
      data: {
        contactId: seededUsers.ndaUser.id,
        agencyGroupId: group.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .delete(`/api/agency-groups/${group.id}/access/${seededUsers.ndaUser.id}`)
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(response.status).toBe(204);

    const remaining = await prisma.agencyGroupGrant.findMany({ where: { agencyGroupId: group.id } });
    expect(remaining).toHaveLength(0);
  });

  it('lists subagency access with direct and inherited users', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'Air Force', code: 'USAF' },
    });

    const directContact = await prisma.contact.create({
      data: { email: 'john@test.com', firstName: 'John', lastName: 'Smith', active: true },
    });

    await prisma.subagencyGrant.create({
      data: {
        contactId: directContact.id,
        subagencyId: subagency.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    await prisma.agencyGroupGrant.create({
      data: {
        contactId: seededUsers.ndaUser.id,
        agencyGroupId: group.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .get(`/api/subagencies/${subagency.id}/access`)
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ contactId: directContact.id, accessType: 'direct' }),
        expect.objectContaining({ contactId: seededUsers.ndaUser.id, accessType: 'inherited' }),
      ])
    );
  });

  it('grants and revokes subagency access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Commercial', code: 'COMM' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'Retail', code: 'RTL' },
    });

    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const grantResponse = await request(app)
      .post(`/api/subagencies/${subagency.id}/access`)
      .set('Cookie', [`access_token=${adminToken}`])
      .send({ contactId: seededUsers.ndaUser.id });

    expect(grantResponse.status).toBe(201);

    const revokeResponse = await request(app)
      .delete(`/api/subagencies/${subagency.id}/access/${seededUsers.ndaUser.id}`)
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(revokeResponse.status).toBe(204);
  });

  it('searches contacts for autocomplete', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'NDA User' } });
    const contact = await prisma.contact.create({
      data: {
        email: 'kelly@test.com',
        firstName: 'Kelly',
        lastName: 'Davidson',
        active: true,
        contactRoles: role
          ? { create: { roleId: role.id } }
          : undefined,
      },
    });

    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .get('/api/contacts/search?q=kel')
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: contact.id, email: 'kelly@test.com' }),
      ])
    );
  });

  it('rejects short autocomplete queries', async () => {
    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .get('/api/contacts/search?q=ke')
      .set('Cookie', [`access_token=${adminToken}`]);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('QUERY_TOO_SHORT');
  });
});
