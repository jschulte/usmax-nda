/**
 * Subagencies Routes Integration Tests (DB-backed)
 * Story 2.2: Subagencies CRUD
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

describe('Subagencies Routes (integration)', () => {
  let app: express.Express;
  let seededUsers: Awaited<ReturnType<typeof seedBaseAuth>>;

  beforeEach(async () => {
    clearAllUserContextCache();
    await resetDatabase();
    seededUsers = await seedBaseAuth();

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: subagenciesRouter } = await import('../subagencies');
    app.use('/api', subagenciesRouter);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('blocks users without permissions', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });
    const token = makeMockToken('mock-user-003', 'noaccess@usmax.com');

    const response = await request(app)
      .get(`/api/agency-groups/${group.id}/subagencies`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  it('lists subagencies for NDA users with group access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });
    await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'Air Force', code: 'USAF' },
    });

    await prisma.agencyGroupGrant.create({
      data: {
        contactId: seededUsers.ndaUser.id,
        agencyGroupId: group.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    const token = makeMockToken('mock-user-002', 'test@usmax.com');
    const response = await request(app)
      .get(`/api/agency-groups/${group.id}/subagencies`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.subagencies).toHaveLength(1);
    expect(response.body.subagencies[0].code).toBe('USAF');
  });

  it('creates a subagency (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Commercial', code: 'COMM' },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .post(`/api/agency-groups/${group.id}/subagencies`)
      .set('Cookie', [`access_token=${token}`])
      .send({ name: 'Retail', code: 'RET', description: 'Retail orgs' });

    expect(response.status).toBe(201);
    expect(response.body.subagency).toBeDefined();

    const created = await prisma.subagency.findFirst({
      where: { code: 'RET', agencyGroupId: group.id },
    });
    expect(created).not.toBeNull();
  });

  it('updates a subagency (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Federal Civ', code: 'FEDCIV' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'USDA', code: 'USDA' },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .put(`/api/subagencies/${subagency.id}`)
      .set('Cookie', [`access_token=${token}`])
      .send({ name: 'USDA Updated', description: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.subagency.name).toBe('USDA Updated');
  });

  it('returns subagency details when user has access', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Healthcare', code: 'HLTH' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'NIH', code: 'NIH' },
    });

    await prisma.subagencyGrant.create({
      data: {
        contactId: seededUsers.ndaUser.id,
        subagencyId: subagency.id,
        grantedBy: seededUsers.admin.id,
      },
    });

    const token = makeMockToken('mock-user-002', 'test@usmax.com');
    const response = await request(app)
      .get(`/api/subagencies/${subagency.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.subagency.code).toBe('NIH');
  });

  it('blocks delete when NDAs exist (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'DoD', code: 'DOD' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'USAF', code: 'USAF' },
    });

    await prisma.nda.create({
      data: {
        companyName: 'Acme Corp',
        agencyGroupId: group.id,
        subagencyId: subagency.id,
        abbreviatedName: 'ACME',
        authorizedPurpose: 'Test NDA',
        opportunityPocId: seededUsers.admin.id,
        relationshipPocId: seededUsers.admin.id,
        createdById: seededUsers.admin.id,
      },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .delete(`/api/subagencies/${subagency.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('HAS_NDAS');
    expect(response.body.ndaCount).toBe(1);
  });

  it('deletes subagency when no NDAs exist (admin)', async () => {
    const group = await prisma.agencyGroup.create({
      data: { name: 'Commercial', code: 'COMM' },
    });
    const subagency = await prisma.subagency.create({
      data: { agencyGroupId: group.id, name: 'Retail', code: 'RTL' },
    });

    const token = makeMockToken('mock-user-001', 'admin@usmax.com');
    const response = await request(app)
      .delete(`/api/subagencies/${subagency.id}`)
      .set('Cookie', [`access_token=${token}`]);

    expect(response.status).toBe(204);

    const exists = await prisma.subagency.findUnique({ where: { id: subagency.id } });
    expect(exists).toBeNull();
  });
});
