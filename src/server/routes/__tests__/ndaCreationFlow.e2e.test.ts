import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/index.js';

let testUserContext: any = null;

vi.mock('../../middleware/authenticateJWT.js', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/attachUserContext.js', () => ({
  attachUserContext: (req: any, _res: any, next: any) => {
    req.userContext = testUserContext;
    next();
  },
}));

vi.mock('../../middleware/checkPermissions.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/scopeToAgencies.js', () => ({
  scopeToAgencies: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../services/notificationService.js', () => ({
  autoSubscribePocs: vi.fn(),
  notifyStakeholders: vi.fn(),
  NotificationEvent: { NDA_CREATED: 'nda_created' },
}));

describe('NDA creation flow (E2E)', () => {
  let app: express.Express;
  let agencyGroupId: string;
  let subagencyId: string;
  let contactId: string;
  let relationshipPocId: string;
  let createdNdaId: string | null = null;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    const { default: ndaRouter } = await import('../ndas');
    app.use('/api/ndas', ndaRouter);

    agencyGroupId = randomUUID();
    subagencyId = randomUUID();
    contactId = randomUUID();
    relationshipPocId = randomUUID();

    await prisma.agencyGroup.create({
      data: {
        id: agencyGroupId,
        name: `Test Agency ${agencyGroupId.slice(0, 6)}`,
        code: `T${agencyGroupId.slice(0, 3)}`,
      },
    });

    await prisma.subagency.create({
      data: {
        id: subagencyId,
        agencyGroupId,
        name: `Test Subagency ${subagencyId.slice(0, 6)}`,
        code: `S${subagencyId.slice(0, 3)}`,
      },
    });

    await prisma.contact.create({
      data: {
        id: contactId,
        email: `user-${contactId.slice(0, 6)}@usmax.test`,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    await prisma.contact.create({
      data: {
        id: relationshipPocId,
        email: `poc-${relationshipPocId.slice(0, 6)}@usmax.test`,
        firstName: 'Relationship',
        lastName: 'POC',
      },
    });

    await prisma.subagencyGrant.create({
      data: {
        id: randomUUID(),
        contactId,
        subagencyId,
      },
    });

    testUserContext = {
      id: contactId,
      contactId,
      email: `user-${contactId.slice(0, 6)}@usmax.test`,
      name: 'Test User',
      active: true,
      roles: ['NDA User'],
      permissions: new Set(['nda:create', 'nda:view']),
      authorizedAgencyGroups: [agencyGroupId],
      authorizedSubagencies: [subagencyId],
    };
    createdNdaId = null;
  });

  afterEach(async () => {
    if (createdNdaId) {
      await prisma.nda.deleteMany({ where: { id: createdNdaId } });
    }
    if (contactId) {
      await prisma.auditLog.deleteMany({ where: { userId: contactId } });
      await prisma.subagencyGrant.deleteMany({ where: { contactId, subagencyId } });
      await prisma.contact.deleteMany({ where: { id: contactId } });
    }
    if (relationshipPocId) {
      await prisma.contact.deleteMany({ where: { id: relationshipPocId } });
    }
    if (subagencyId) {
      await prisma.subagency.deleteMany({ where: { id: subagencyId } });
    }
    if (agencyGroupId) {
      await prisma.agencyGroup.deleteMany({ where: { id: agencyGroupId } });
    }
  });

  it('creates an NDA and retrieves it via detail endpoint', async () => {
    const createResponse = await request(app).post('/api/ndas').send({
      companyName: 'E2E Corp',
      agencyGroupId,
      subagencyId,
      abbreviatedName: 'E2E-CORP',
      authorizedPurpose: 'E2E NDA creation test',
      relationshipPocId,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.nda.companyName).toBe('E2E Corp');

    const ndaId = createResponse.body.nda.id as string;
    createdNdaId = ndaId;
    expect(Number(createResponse.body.nda.displayId)).toBeGreaterThanOrEqual(1590);
    const detailResponse = await request(app).get(`/api/ndas/${ndaId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.nda.id).toBe(ndaId);
  });
});
