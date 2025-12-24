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
  // Story 3.15 additions
  isHiddenByDefault,
  canReactivate,
  getStatusDisplayInfo,
  getAllStatusDisplayInfo,
  HIDDEN_BY_DEFAULT_STATUSES,
  STATUS_DISPLAY,
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
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(true);
      });

      it('should allow CREATED → INACTIVE', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.INACTIVE)).toBe(true);
      });

      it('should allow CREATED → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.CREATED, NdaStatus.INACTIVE_CANCELED)).toBe(true);
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
        expect(isValidTransition(NdaStatus.SENT_PENDING_SIGNATURE, NdaStatus.IN_REVISION)).toBe(true);
      });

      it('should allow EMAILED → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.SENT_PENDING_SIGNATURE, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should allow EMAILED → INACTIVE', () => {
        expect(isValidTransition(NdaStatus.SENT_PENDING_SIGNATURE, NdaStatus.INACTIVE)).toBe(true);
      });

      it('should allow EMAILED → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.SENT_PENDING_SIGNATURE, NdaStatus.INACTIVE_CANCELED)).toBe(true);
      });

      it('should NOT allow EMAILED → CREATED', () => {
        expect(isValidTransition(NdaStatus.SENT_PENDING_SIGNATURE, NdaStatus.CREATED)).toBe(false);
      });
    });

    describe('from IN_REVISION', () => {
      it('should allow IN_REVISION → EMAILED', () => {
        expect(isValidTransition(NdaStatus.IN_REVISION, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(true);
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
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(false);
        expect(isValidTransition(NdaStatus.FULLY_EXECUTED, NdaStatus.INACTIVE_CANCELED)).toBe(false);
      });
    });

    describe('from INACTIVE', () => {
      it('should allow INACTIVE → CREATED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.CREATED)).toBe(true);
      });

      it('should allow INACTIVE → EMAILED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(true);
      });

      it('should allow INACTIVE → FULLY_EXECUTED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should NOT allow INACTIVE → CANCELLED', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.INACTIVE_CANCELED)).toBe(false);
      });
    });

    describe('from CANCELLED (terminal state)', () => {
      it('should NOT allow CANCELLED → any status', () => {
        expect(isValidTransition(NdaStatus.INACTIVE_CANCELED, NdaStatus.CREATED)).toBe(false);
        expect(isValidTransition(NdaStatus.INACTIVE_CANCELED, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(false);
        expect(isValidTransition(NdaStatus.INACTIVE_CANCELED, NdaStatus.IN_REVISION)).toBe(false);
        expect(isValidTransition(NdaStatus.INACTIVE_CANCELED, NdaStatus.FULLY_EXECUTED)).toBe(false);
        expect(isValidTransition(NdaStatus.INACTIVE_CANCELED, NdaStatus.INACTIVE)).toBe(false);
      });
    });
  });

  describe('getAutoTransitionTarget', () => {
    it('should return EMAILED for EMAIL_SENT from CREATED', () => {
      expect(getAutoTransitionTarget(NdaStatus.CREATED, StatusTrigger.EMAIL_SENT))
        .toBe(NdaStatus.SENT_PENDING_SIGNATURE);
    });

    it('should return undefined for EMAIL_SENT from EMAILED (already emailed)', () => {
      expect(getAutoTransitionTarget(NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.EMAIL_SENT))
        .toBeUndefined();
    });

    it('should return IN_REVISION for DOCUMENT_UPLOADED from EMAILED', () => {
      expect(getAutoTransitionTarget(NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.DOCUMENT_UPLOADED))
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
      expect(getAutoTransitionTarget(NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.FULLY_EXECUTED_UPLOAD))
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
        status: 'SENT_PENDING_SIGNATURE',
      } as any);

      const result = await transitionStatus(
        'nda-123',
        NdaStatus.SENT_PENDING_SIGNATURE,
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result.previousStatus).toBe(NdaStatus.CREATED);
      expect(result.newStatus).toBe(NdaStatus.SENT_PENDING_SIGNATURE);
      expect(result.trigger).toBe(StatusTrigger.EMAIL_SENT);
      expect(mockPrisma.nda.update).toHaveBeenCalled();
    });

    it('should set fullyExecutedDate when transitioning to FULLY_EXECUTED', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'SENT_PENDING_SIGNATURE',
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
        transitionStatus('nonexistent', NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);

      try {
        await transitionStatus('nonexistent', NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.MANUAL_CHANGE, mockUserContext);
      } catch (error) {
        expect((error as StatusTransitionError).code).toBe('NDA_NOT_FOUND');
      }
    });

    it('should throw ALREADY_IN_STATUS when transitioning to same status', async () => {
      mockPrisma.nda.findUnique.mockResolvedValue({
        id: 'nda-123',
        displayId: 1590,
        status: 'SENT_PENDING_SIGNATURE',
      } as any);

      await expect(
        transitionStatus('nda-123', NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.MANUAL_CHANGE, mockUserContext)
      ).rejects.toThrow(StatusTransitionError);

      try {
        await transitionStatus('nda-123', NdaStatus.SENT_PENDING_SIGNATURE, StatusTrigger.MANUAL_CHANGE, mockUserContext);
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
        status: 'INACTIVE_CANCELED',
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
        status: 'SENT_PENDING_SIGNATURE',
      } as any);

      const result = await attemptAutoTransition(
        'nda-123',
        StatusTrigger.EMAIL_SENT,
        mockUserContext
      );

      expect(result).toBeDefined();
      expect(result?.newStatus).toBe(NdaStatus.SENT_PENDING_SIGNATURE);
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
        status: 'SENT_PENDING_SIGNATURE',
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
      expect(transitions).toContain(NdaStatus.SENT_PENDING_SIGNATURE);
      expect(transitions).toContain(NdaStatus.INACTIVE);
      expect(transitions).toContain(NdaStatus.INACTIVE_CANCELED);
      expect(transitions).not.toContain(NdaStatus.IN_REVISION);
    });

    it('should return empty array for CANCELLED', () => {
      const transitions = getValidTransitionsFrom(NdaStatus.INACTIVE_CANCELED);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for CANCELLED', () => {
      expect(isTerminalStatus(NdaStatus.INACTIVE_CANCELED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isTerminalStatus(NdaStatus.CREATED)).toBe(false);
      expect(isTerminalStatus(NdaStatus.SENT_PENDING_SIGNATURE)).toBe(false);
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

  // ========================================================================
  // Story 3.15: Inactive & Cancelled Status Management
  // ========================================================================

  describe('Story 3.15: Inactive & Cancelled Status Management', () => {
    describe('isHiddenByDefault', () => {
      it('should return true for INACTIVE', () => {
        expect(isHiddenByDefault(NdaStatus.INACTIVE)).toBe(true);
      });

      it('should return true for CANCELLED', () => {
        expect(isHiddenByDefault(NdaStatus.INACTIVE_CANCELED)).toBe(true);
      });

      it('should return false for active statuses', () => {
        expect(isHiddenByDefault(NdaStatus.CREATED)).toBe(false);
        expect(isHiddenByDefault(NdaStatus.SENT_PENDING_SIGNATURE)).toBe(false);
        expect(isHiddenByDefault(NdaStatus.IN_REVISION)).toBe(false);
        expect(isHiddenByDefault(NdaStatus.FULLY_EXECUTED)).toBe(false);
      });
    });

    describe('canReactivate', () => {
      it('should return true for INACTIVE (reversible)', () => {
        expect(canReactivate(NdaStatus.INACTIVE)).toBe(true);
      });

      it('should return false for CANCELLED (terminal)', () => {
        expect(canReactivate(NdaStatus.INACTIVE_CANCELED)).toBe(false);
      });

      it('should return false for other statuses', () => {
        expect(canReactivate(NdaStatus.CREATED)).toBe(false);
        expect(canReactivate(NdaStatus.SENT_PENDING_SIGNATURE)).toBe(false);
        expect(canReactivate(NdaStatus.FULLY_EXECUTED)).toBe(false);
      });
    });

    describe('HIDDEN_BY_DEFAULT_STATUSES', () => {
      it('should contain INACTIVE and CANCELLED', () => {
        expect(HIDDEN_BY_DEFAULT_STATUSES).toContain(NdaStatus.INACTIVE);
        expect(HIDDEN_BY_DEFAULT_STATUSES).toContain(NdaStatus.INACTIVE_CANCELED);
      });

      it('should not contain active statuses', () => {
        expect(HIDDEN_BY_DEFAULT_STATUSES).not.toContain(NdaStatus.CREATED);
        expect(HIDDEN_BY_DEFAULT_STATUSES).not.toContain(NdaStatus.SENT_PENDING_SIGNATURE);
        expect(HIDDEN_BY_DEFAULT_STATUSES).not.toContain(NdaStatus.FULLY_EXECUTED);
      });
    });

    describe('STATUS_DISPLAY', () => {
      it('should mark INACTIVE as hidden by default', () => {
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE].hiddenByDefault).toBe(true);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE].canReactivate).toBe(true);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE].isTerminal).toBe(false);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE].variant).toBe('muted');
      });

      it('should mark CANCELLED as terminal and hidden', () => {
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE_CANCELED].hiddenByDefault).toBe(true);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE_CANCELED].canReactivate).toBe(false);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE_CANCELED].isTerminal).toBe(true);
        expect(STATUS_DISPLAY[NdaStatus.INACTIVE_CANCELED].variant).toBe('danger');
      });

      it('should mark active statuses as not hidden', () => {
        expect(STATUS_DISPLAY[NdaStatus.CREATED].hiddenByDefault).toBe(false);
        expect(STATUS_DISPLAY[NdaStatus.SENT_PENDING_SIGNATURE].hiddenByDefault).toBe(false);
        expect(STATUS_DISPLAY[NdaStatus.FULLY_EXECUTED].hiddenByDefault).toBe(false);
      });

      it('should have appropriate variants for each status', () => {
        expect(STATUS_DISPLAY[NdaStatus.CREATED].variant).toBe('default');
        expect(STATUS_DISPLAY[NdaStatus.SENT_PENDING_SIGNATURE].variant).toBe('default');
        expect(STATUS_DISPLAY[NdaStatus.IN_REVISION].variant).toBe('warning');
        expect(STATUS_DISPLAY[NdaStatus.FULLY_EXECUTED].variant).toBe('success');
      });
    });

    describe('getStatusDisplayInfo', () => {
      it('should return correct display info for each status', () => {
        const inactiveInfo = getStatusDisplayInfo(NdaStatus.INACTIVE);
        expect(inactiveInfo.label).toBe('Inactive');
        expect(inactiveInfo.color).toBe('gray');

        const cancelledInfo = getStatusDisplayInfo(NdaStatus.INACTIVE_CANCELED);
        expect(cancelledInfo.label).toBe('Cancelled');
        expect(cancelledInfo.color).toBe('red');
      });
    });

    describe('getAllStatusDisplayInfo', () => {
      it('should return info for all statuses', () => {
        const allInfo = getAllStatusDisplayInfo();
        const allStatuses = Object.values(NdaStatus);

        for (const status of allStatuses) {
          expect(allInfo).toHaveProperty(status);
          expect(allInfo[status]).toHaveProperty('label');
          expect(allInfo[status]).toHaveProperty('color');
          expect(allInfo[status]).toHaveProperty('variant');
        }
      });
    });

    describe('Reactivation transitions', () => {
      it('should allow INACTIVE to transition back to active statuses', () => {
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.CREATED)).toBe(true);
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.SENT_PENDING_SIGNATURE)).toBe(true);
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.IN_REVISION)).toBe(true);
        expect(isValidTransition(NdaStatus.INACTIVE, NdaStatus.FULLY_EXECUTED)).toBe(true);
      });

      it('should NOT allow CANCELLED to transition anywhere', () => {
        // CANCELLED is terminal - verify no outgoing transitions
        const cancelledTransitions = getValidTransitionsFrom(NdaStatus.INACTIVE_CANCELED);
        expect(cancelledTransitions).toHaveLength(0);
      });
    });
  });
});
