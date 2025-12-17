/**
 * Email Service Tests
 * Story 3.10: Email Composition & Sending
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateEmailSubject,
  generateEmailBody,
  getEmailPreview,
  queueEmail,
  getNdaEmails,
  EmailServiceError,
} from '../emailService.js';
import type { UserContext } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    nda: {
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
    ndaEmail: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    ndaStatusHistory: {
      create: vi.fn(),
    },
  },
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    EMAIL_QUEUED: 'email_queued',
    EMAIL_SENT: 'email_sent',
    EMAIL_FAILED: 'email_failed',
  },
}));

// Mock SES client
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
  })),
  SendRawEmailCommand: vi.fn(),
}));

import { prisma } from '../../db/index.js';
const mockPrisma = vi.mocked(prisma);

describe('Email Service', () => {
  const mockUserContext: UserContext = {
    userId: 'user-123',
    email: 'user@test.com',
    permissions: new Set(['nda:send_email']),
    agencyScope: {
      type: 'all',
      agencyGroupIds: [],
      subagencyIds: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEmailSubject', () => {
    it('should generate subject with all fields', () => {
      const nda = {
        companyName: 'TechCorp',
        abbreviatedName: 'OREM TMA 2025',
        agencyOfficeName: 'DHS CBP',
        agencyGroup: { name: 'Department of Homeland Security' },
      };

      const subject = generateEmailSubject(nda);

      expect(subject).toBe('NDA from USMax - for TechCorp for OREM TMA 2025 at DHS CBP');
    });

    it('should fallback to agency group name when office name is missing', () => {
      const nda = {
        companyName: 'TechCorp',
        abbreviatedName: 'OREM TMA 2025',
        agencyOfficeName: null,
        agencyGroup: { name: 'Department of Defense' },
      };

      const subject = generateEmailSubject(nda);

      expect(subject).toBe('NDA from USMax - for TechCorp for OREM TMA 2025 at Department of Defense');
    });

    it('should use "Agency" when both are missing', () => {
      const nda = {
        companyName: 'TechCorp',
        abbreviatedName: 'Project X',
        agencyOfficeName: null,
        agencyGroup: undefined,
      };

      const subject = generateEmailSubject(nda);

      expect(subject).toBe('NDA from USMax - for TechCorp for Project X at Agency');
    });
  });

  describe('generateEmailBody', () => {
    it('should generate body with POC name', () => {
      const nda = {
        displayId: 1590,
        companyName: 'TechCorp',
        abbreviatedName: 'OREM TMA 2025',
        agencyOfficeName: 'DHS CBP',
        relationshipPoc: {
          firstName: 'John',
          lastName: 'Smith',
        },
      };

      const body = generateEmailBody(nda);

      expect(body).toContain('Dear John Smith');
      expect(body).toContain('TechCorp');
      expect(body).toContain('OREM TMA 2025');
      expect(body).toContain('NDA Reference: #1590');
    });

    it('should use "Partner" when POC is missing', () => {
      const nda = {
        displayId: 1590,
        companyName: 'TechCorp',
        abbreviatedName: 'OREM TMA 2025',
        agencyOfficeName: null,
        relationshipPoc: undefined,
      };

      const body = generateEmailBody(nda);

      expect(body).toContain('Dear Partner');
    });
  });

  describe('getEmailPreview', () => {
    it('should return preview with pre-filled data', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        companyName: 'TechCorp',
        abbreviatedName: 'OREM TMA 2025',
        agencyOfficeName: 'DHS CBP',
        agencyGroup: { id: 'ag-1', name: 'DHS', code: 'DHS' },
        relationshipPoc: {
          id: 'poc-1',
          email: 'poc@techcorp.com',
          firstName: 'John',
          lastName: 'Smith',
        },
        documents: [
          { id: 'doc-1', filename: 'NDA_TechCorp.docx' },
        ],
      } as any);

      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'currentuser@usmax.com',
      } as any);

      const preview = await getEmailPreview('nda-123', mockUserContext);

      expect(preview.subject).toContain('TechCorp');
      expect(preview.toRecipients).toContain('poc@techcorp.com');
      expect(preview.ccRecipients).toContain('currentuser@usmax.com');
      expect(preview.body).toContain('Dear John Smith');
      expect(preview.attachments).toHaveLength(1);
      expect(preview.attachments[0].filename).toBe('NDA_TechCorp.docx');
    });

    it('should throw error when NDA not found', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue(null);

      await expect(getEmailPreview('nonexistent', mockUserContext))
        .rejects.toThrow(EmailServiceError);
    });
  });

  describe('queueEmail', () => {
    it('should create email record and return status', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
      } as any);

      mockPrisma.ndaEmail.create.mockResolvedValue({
        id: 'email-123',
        ndaId: 'nda-123',
        subject: 'Test Subject',
        toRecipients: ['test@example.com'],
        ccRecipients: [],
        bccRecipients: [],
        body: 'Test body',
        sentById: 'user-123',
        status: 'QUEUED',
      } as any);

      // Mock the full findUnique for sendEmail
      mockPrisma.ndaEmail.findUnique.mockResolvedValue({
        id: 'email-123',
        ndaId: 'nda-123',
        subject: 'Test Subject',
        toRecipients: ['test@example.com'],
        ccRecipients: [],
        bccRecipients: [],
        body: 'Test body',
        nda: {
          id: 'nda-123',
          documents: [],
        },
      } as any);

      mockPrisma.ndaEmail.update.mockResolvedValue({
        id: 'email-123',
        status: 'SENT',
      } as any);

      const result = await queueEmail(
        {
          ndaId: 'nda-123',
          subject: 'Test Subject',
          toRecipients: ['test@example.com'],
          ccRecipients: [],
          bccRecipients: [],
          body: 'Test body',
        },
        mockUserContext
      );

      expect(result.emailId).toBe('email-123');
      expect(mockPrisma.ndaEmail.create).toHaveBeenCalled();
    });

    it('should throw error when NDA not found', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue(null);

      await expect(
        queueEmail(
          {
            ndaId: 'nonexistent',
            subject: 'Test',
            toRecipients: ['test@example.com'],
            ccRecipients: [],
            bccRecipients: [],
            body: 'Test',
          },
          mockUserContext
        )
      ).rejects.toThrow(EmailServiceError);
    });

    it('should throw error when no recipients', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
      } as any);

      await expect(
        queueEmail(
          {
            ndaId: 'nda-123',
            subject: 'Test',
            toRecipients: [],
            ccRecipients: [],
            bccRecipients: [],
            body: 'Test',
          },
          mockUserContext
        )
      ).rejects.toThrow('At least one recipient is required');
    });
  });

  describe('getNdaEmails', () => {
    it('should return email history for NDA', async () => {
      mockPrisma.ndaEmail.findMany.mockResolvedValue([
        {
          id: 'email-1',
          subject: 'First Email',
          toRecipients: ['first@example.com'],
          sentAt: new Date('2024-01-15'),
          status: 'SENT',
          sentBy: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: 'email-2',
          subject: 'Second Email',
          toRecipients: ['second@example.com'],
          sentAt: new Date('2024-01-16'),
          status: 'DELIVERED',
          sentBy: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ] as any);

      const emails = await getNdaEmails('nda-123');

      expect(emails).toHaveLength(2);
      expect(emails[0].subject).toBe('First Email');
      expect(emails[1].subject).toBe('Second Email');
    });

    it('should return empty array when no emails', async () => {
      mockPrisma.ndaEmail.findMany.mockResolvedValue([]);

      const emails = await getNdaEmails('nda-123');

      expect(emails).toHaveLength(0);
    });
  });
});
