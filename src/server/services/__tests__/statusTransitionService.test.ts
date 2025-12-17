/**
 * Status Transition Service Tests
 * Story 3.12: Status Management & Auto-Transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidTransition,
  getAutoTransitionTarget,
  transitionStatus,
  attemptAutoTransition,
  getValidTransitionsFrom,
  isTerminalStatus,
  StatusTrigger,
  NdaStatus,
  StatusTransitionError,
  VALID_TRANSITIONS,
} from '../statusTransitionService.js';
import type { UserContext } from '../../types/auth.js';

// Mock Prisma
vi.mock('../../db/index.js', () => ({
  prisma: {
    nda: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock audit service
vi.mock('../auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
  AuditAction: {
    NDA_STATUS_CHANGED: 'nda_status_changed',
  },
}));

import { prisma } from '../../db/index.js';
const mockPrisma = vi.mocked(prisma);

describe('Status Transition Service', () => {
  const mockUserContext: UserContext = {
    userId: 'user-123',
    email: 'user@test.com',
    permissions: new Set(['nda:mark_status']),
    agencyScope: {
      type: 'all',
      agencyGroupIds: [],
      subagencyIds: [],
    },
    contactId: 'contact-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidTransition', () => {
    describe('from CREATED', () => {
      it('should allow CREATED → EMAILED', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.EMAILED)).toBe(true);
      });

      it('should allow CREATED → INACTIVE', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.INACTIVE)).toBe(true);
      });

      it('should allow CREATED → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.CANCELLED)).toBe(true);
      });

      it('should NOT allow CREATED → IN_REVISION', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.IN_REVISION)).toBe(false);
      });

      it('should NOT allow CREATED → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.FULLY_EXECUTED)).toBe(false);
      });
    });

    describe('from EMAILED', () => {
      it('should allow EMAILED → IN_REVISION', () => {
        expect(isValidTransition(NdaStatus.EMAILED, NdaStatus.IN_REVISION)).toBe(true);
      });

      it('should allow EMAILED → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.EMAILED, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should allow EMAILED → INACTIVE', () => {
        expect(isValidTransition(NdaStatus.EMAILED, NdaStatus.INACTIVE)).toBe(true);
      });

      it('should allow EMAILED → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.EMAILED, NdaStatus.CANCELLED)).toBe(true);
      });

      it('should NOT allow EMAILED → CREATED', () => {
        expect(isValidTransition(NdaStatus.EMAILED, NdaStatus.CREATED)).toBe(false);
      });
    });

    describe('from IN_REVISION', () => {
      it('should allow IN_REVISION → EMAILED', () => {
        expect(isValidTransition(NdaStatus.IN_REVISION, NdaStatus.EMAILED)).toBe(true);
      });

      it('should allow IN_REVISION → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.IN_REVISION, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should NOT allow IN_REVISION → CREATED', () => {
        expect(isValidTransition(NdaStatus.IN_REVISION, NdaStatus.CREATED)).toBe(false);
      });
    });

    describe('from FULLY_EXECUTED', () => {
      it('should allow FULLY_EXECUTED → INACTIVE', () => {
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.INACTIVE)).toBe(true);
      });

      it('should NOT allow FULLY_EXECUTED → any other status', () => {
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.CREATED)).toBe(false);
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.EMAILED)).toBe(false);
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.CANCELLED)).toBe(false);
      });
    });

    describe('from INACTIVE', () => {
      it('should allow INACTIVE → CREATED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.CREATED)).toBe(true);
      });

      it('should allow INACTIVE → EMAILED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.EMAILED)).toBe(true);
      });

      it('should allow INACTIVE → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should NOT allow INACTIVE → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.CANCELLED)).toBe(false);
      });
    });

    describe('from CANCELLED (terminal state)', () => {
      it('should NOT allow CANCELLED → any status', () => {
        expect(isValidTransition(NdaStatus.CANCELLED, NdaStatus.CREATED)).toBe(false);
        expect(isValidTransition(NdaStatus.CANCELLED, NdaStatus.EMAILED)).toBe(false);
        expect(isValidTransition(NdaStatus.CANCELLED, NdaStatus.IN_REVISION)).toBe(false);
        expect(isValidTransition(NdaStatus.CANCELLED, NdaStatus.FULLY_EXECUTED)).toBe(false);
        expect(isValidTransition(NdaStatus.CANCELLED, NdaStatus.INACTIVE)).toBe(false);
      });
    });
  });

  describe('getAutoTransitionTarget', () => {
    it('should return EMAILED for EMAIL_SENT from CREATED', () => {
      expect(getAutoTransitionTarget(NdaStatus.CREATED, StatusTrigger.EMAIL_SENT))
        .toBe(NdaStatus.EMAILED);
    });

    it('should return undefined for EMAIL_SENT from EMAILED (already emailed)', () => {
      expect(getAutoTransitionTarget(NdaStatus.EMAILED, StatusTrigger.EMAIL_SENT))
        .toBeUndefined();
    });

    it('should return IN_REVISION for DOCUMENT_UPLOADED from EMAILED', () => {
      expect(getAutoTransitionTarget(NdaStatus.EMAILED, StatusTrigger.DOCUMENT_UPLOADED))
        .toBe(NdaStatus.IN_REVISION);
    });

    it('should return undefined for DOCUMENT_UPLOADED from CREATED', () => {
      expect(getAutoTransitionTarget(NdaStatus.CREATED, StatusTrigger.DOCUMENT_UPLOADED))
        .toBeUndefined();
    });

    it('should return FULLY_EXECUTED for FULLY_EXECUTED_UPLOAD from CREATED', () => {
      expect(getAutoTransitionTarget(NdaStatus.CREATED, StatusTrigger.FULLY_EXECUTED_UPLOAD))
        .toBe(NdaStatus.FULLY_EXECUTED);
    });

    it('should return FULLY_EXECUTED for FULLY_EXECUTED_UPLOAD from EMAILED', () => {
      expect(getAutoTransitionTarget(NdaStatus.EMAILED, StatusTrigger.FULLY_EXECUTED_UPLOAD))
        .toBe(NdaStatus.FULLY_EXECUTED);
    });

    it('should return FULLY_EXECUTED for FULLY_EXECUTED_UPLOAD from IN_REVISION', () => {
      expect(getAutoTransitionTarget(NdaStatus.IN_REVISION, StatusTrigger.FULLY_EXECUTED_UPLOAD))
        .toBe(NdaStatus.FULLY_EXECUTED);
    });

    it('should return undefined for MANUAL_CHANGE (no auto-transition)', () => {
      expect(getAutoTransitionTarget(NdaStatus.CREATED, StatusTrigger.MANUAL_CHANGE))
        .toBeUndefined();
    });
  });

  describe('transitionStatus', () => {
    it('should successfully transition status', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'CREATED',
      } as any);

      mockPrisma.nda.update.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'EMAILED',
      } as any);

      const result = await transitionStatus(
        'nda-123',
        NdaStatus.EMAILED,
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result.previousStatus).toBe(NdaStatus.CREATED);
      expect(result.newStatus).toBe(NdaStatus.EMAILED);
      expect(result.trigger).toBe(StatusTrigger.EMAIL_SENT);
      expect(mockPrisma.nda.update).toHaveBeenCalled();
    });

    it('should set fullyExecutedDate when transitioning to FULLY_EXECUTED', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'EMAILED',
      } as any);

      mockPrisma.nda.update.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'FULLY_EXECUTED',
      } as any);

      await transitionStatus(
        'nda-123',
        NdaStatus.FULLY_EXECUTED,
        StatusTrigger.FULLY_EXECUTED_UPLOAD,
        mockUserContext
      );

      expect(mockPrisma.nda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullyExecutedDate: expect.any(Date),
          }),
        })
      );
    });

    it('should throw NDA_NOT_FOUND for non-existent NDA', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue(null);

      await expect(
        transitionStatus('nonexistent', NdaStatus.EMAILED, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);

      try {
        await transitionStatus('nonexistent', NdaStatus.EMAILED, StatusTrigger.MANUAL_CHANGE, mockUserContext);
      } catch (error) {
        expect((error as StatusTransitionError).code).toBe('NDA_NOT_FOUND');
      }
    });

    it('should throw ALREADY_IN_STATUS when transitioning to same status', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'EMAILED',
      } as any);

      await expect(
        transitionStatus('nda-123', NdaStatus.EMAILED, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);

      try {
        await transitionStatus('nda-123', NdaStatus.EMAILED, StatusTrigger.MANUAL_CHANGE, mockUserContext);
      } catch (error) {
        expect((error as StatusTransitionError).code).toBe('ALREADY_IN_STATUS');
      }
    });

    it('should throw INVALID_TRANSITION for disallowed transitions', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'CREATED',
      } as any);

      // CREATED → IN_REVISION is not allowed
      await expect(
        transitionStatus('nda-123', NdaStatus.IN_REVISION, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);

      try {
        await transitionStatus('nda-123', NdaStatus.IN_REVISION, StatusTrigger.MANUAL_CHANGE, mockUserContext);
      } catch (error) {
        expect((error as StatusTransitionError).code).toBe('INVALID_TRANSITION');
      }
    });

    it('should throw for transitions from CANCELLED (terminal state)', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'CANCELLED',
      } as any);

      await expect(
        transitionStatus('nda-123', NdaStatus.CREATED, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);
    });
  });

  describe('attemptAutoTransition', () => {
    it('should auto-transition when rules match', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'CREATED',
      } as any);

      mockPrisma.nda.update.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'EMAILED',
      } as any);

      const result = await attemptAutoTransition(
        'nda-123',
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result).toBeDefined();
      expect(result?.newStatus).toBe(NdaStatus.EMAILED);
    });

    it('should return undefined when NDA not found', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue(null);

      const result = await attemptAutoTransition(
        'nonexistent',
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when no auto-transition rule applies', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'EMAILED',
      } as any);

      // EMAIL_SENT from EMAILED has no auto-transition
      const result = await attemptAutoTransition(
        'nda-123',
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result).toBeUndefined();
      expect(mockPrisma.nda.update).not.toHaveBeenCalled();
    });
  });

  describe('getValidTransitionsFrom', () => {
    it('should return valid transitions for CREATED', () => {
      const transitions = getValidTransitionsFrom(NdaStatus.CREATED);
      expect(transitions).toContain(NdaStatus.EMAILED);
      expect(transitions).toContain(NdaStatus.INACTIVE);
      expect(transitions).toContain(NdaStatus.CANCELLED);
      expect(transitions).not.toContain(NdaStatus.IN_REVISION);
    });

    it('should return empty array for CANCELLED', () => {
      const transitions = getValidTransitionsFrom(NdaStatus.CANCELLED);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for CANCELLED', () => {
      expect(isTerminalStatus(NdaStatus.CANCELLED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isTerminalStatus(NdaStatus.CREATED)).toBe(false);
      expect(isTerminalStatus(NdaStatus.EMAILED)).toBe(false);
      expect(isTerminalStatus(NdaStatus.FULLY_EXECUTED)).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS matrix completeness', () => {
    it('should have an entry for every NdaStatus', () => {
      const allStatuses = Object.values(NdaStatus);
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      }
    });
  });
});
