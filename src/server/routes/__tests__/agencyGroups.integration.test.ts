/**
 * Agency Groups Routes Integration Tests (DB-backed)
 * Story 2.1: Agency Groups CRUD
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

describe('Agency Groups Routes (integration)', () => {
  let app: express.Express;
  let seededUsers: Awaited<ReturnType<typeof seedBaseAuth>>;

  beforeEach(async () => {
    clearAllUserContextCache();
    await resetDatabase();
    seededUsers = await seedBaseAuth();

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: agencyGroupsRouter } = await import('../agencyGroups');
    app.use('/api/agency-groups', agencyGroupsRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('blocks users without permissions', async () => {
    const token = makeMockToken('mock-user-003', 'noaccess@usmax.com');

    const response = await request(app)
      .get('/api/agency-groups')
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  it('lists agency groups for NDA users', async () => {
    const adminToken = makeMockToken('mock-user-001', 'admin@usmax.com');
    const createResponse = await request(app)
      .post('/api/agency-groups')
      .set('Cookie', [`access_token=${adminToken}`])
      .send({ name: 'Department of Defense', code: 'DOD', description: 'Test group' })
      .expect(201);

    await prisma.agencyGroupGrant.create({
      data: {
        contactId: seededUsers.ndaUser.id,
        agencyGroupId: createResponse.body.agencyGroup.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    const token = makeMockToken('mock-user-002', 'test@usmax.com');
    const response = await request(app)
      .get('/api/agency-groups')
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.agencyGroups).toHaveLength(1);
    expect(response.body.agencyGroups[0].code).toBe('DOD');
  });

  it('creates an agency group (admin)', async () => {
    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .post('/api/agency-groups')
      .set('Cookie', [`access_token=${token}`])
      .send({ name: 'Commercial', code: 'COMM', description: 'Commercial agencies' });

    expect(response.status).toBe(201);
    expect(response.body.agencyGroup).toBeDefined();

    const created = await prisma.agencyGroup.findUnique({
      where: { code: 'COMM' },
    });
    expect(created).not.toBeNull();
  });

  it('updates an agency group (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: {
        name: 'Federal Civ',
        code: 'FEDCIV',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .put(`/api/agency-groups/${group.id}`)
      .set('Cookie', [`access_token=${token}`])
      .send({ name: 'Federal Civilian', description: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.agencyGroup.name).toBe('Federal Civilian');
  });

  it('returns agency group details with subagencies (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: {
        name: 'Healthcare',
        code: 'HLTH',
      },
    });

    await prisma.subagency.create({
      data: {
        agencyGroupId: group.id,
        name: 'NIH',
        code: 'NIH',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .get(`/api/agency-groups/${group.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.agencyGroup.subagencies).toHaveLength(1);
  });

  it('deletes agency group when no subagencies exist (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: {
        name: 'Commercial',
        code: 'COMM',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .delete(`/api/agency-groups/${group.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(204);

    const exists = await prisma.agencyGroup.findUnique({ where: { id: group.id } });
    expect(exists).toBeNull();
  });

  it('blocks delete when subagencies exist (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: {
        name: 'DoD',
        code: 'DOD',
      },
    });

    await prisma.subagency.create({
      data: {
        agencyGroupId: group.id,
        name: 'USAF',
        code: 'USAF',
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');

    const response = await request(app)
      .delete(`/api/agency-groups/${group.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('HAS_SUBAGENCIES');
  });
});
