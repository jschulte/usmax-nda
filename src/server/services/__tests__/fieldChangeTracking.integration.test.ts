/**
 * Field Change Tracking Integration Tests
 * Story 6.2: Verify audit logs include field changes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditService } from '../auditService.js';
import type { FieldChange } from '../../utils/detectFieldChanges.js';

// Mock the audit service to capture log calls
vi.mock('../auditService.js', async () => {
  const actual = await vi.importActual<typeof import('../auditService.js')>('../auditService.js');
  return {
    ...actual,
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Field Change Tracking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectFieldChanges utility', () => {
    it('detects multiple field changes correctly', async () => {
      const { detectFieldChanges } = await import('../../utils/detectFieldChanges.js');

      const before = {
        companyName: 'ACME Corp',
        companyCity: 'NYC',
        status: 'Created',
      };

      const after = {
        companyName: 'ACME Corporation',
        companyCity: 'NYC',
        status: 'Emailed',
      };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual({
        field: 'companyName',
        before: 'ACME Corp',
        after: 'ACME Corporation',
      });
      expect(changes).toContainEqual({
        field: 'status',
        before: 'Created',
        after: 'Emailed',
      });
    });

    it('returns empty array when no changes', async () => {
      const { detectFieldChanges } = await import('../../utils/detectFieldChanges.js');

      const before = { name: 'ACME', city: 'NYC' };
      const after = { name: 'ACME', city: 'NYC' };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(0);
    });

    it('handles null values correctly', async () => {
      const { detectFieldChanges } = await import('../../utils/detectFieldChanges.js');

      const before = { city: 'NYC' };
      const after = { city: null };

      const changes = detectFieldChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'city',
        before: 'NYC',
        after: null,
      });
    });
  });

  describe('formatFieldChanges utility', () => {
    it('formats field changes for human reading', async () => {
      const { formatFieldChange } = await import('../../utils/formatFieldChanges.js');

      const change: FieldChange = {
        field: 'companyName',
        before: 'ACME Corp',
        after: 'ACME Corporation',
      };

      const formatted = formatFieldChange(change);

      expect(formatted).toBe("Company Name changed from 'ACME Corp' to 'ACME Corporation'");
    });

    it('handles null values in formatting', async () => {
      const { formatFieldChange } = await import('../../utils/formatFieldChanges.js');

      const change: FieldChange = {
        field: 'companyCity',
        before: null,
        after: 'New York',
      };

      const formatted = formatFieldChange(change);

      expect(formatted).toBe("Company City changed from (empty) to 'New York'");
    });

    it('formats boolean changes', async () => {
      const { formatFieldChange } = await import('../../utils/formatFieldChanges.js');

      const change: FieldChange = {
        field: 'isActive',
        before: false,
        after: true,
      };

      const formatted = formatFieldChange(change);

      expect(formatted).toBe("Is Active changed from No to Yes");
    });
  });

  describe('AuditLogDetails interface', () => {
    it('supports changes array in details', async () => {
      const { auditService, AuditAction } = await import('../auditService.js');

      const changes: FieldChange[] = [
        { field: 'companyName', before: 'ACME', after: 'ACME Corp' },
        { field: 'status', before: 'Created', after: 'Emailed' },
      ];

      await auditService.log({
        action: AuditAction.NDA_UPDATED,
        entityType: 'nda',
        entityId: 'test-id',
        userId: 'user-123',
        details: {
          result: 'success',
          changes,
        },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            changes: expect.arrayContaining([
              expect.objectContaining({
                field: 'companyName',
                before: 'ACME',
                after: 'ACME Corp',
              }),
              expect.objectContaining({
                field: 'status',
                before: 'Created',
                after: 'Emailed',
              }),
            ]),
          }),
        })
      );
    });

    it('supports empty changes array', async () => {
      const { auditService, AuditAction } = await import('../auditService.js');

      await auditService.log({
        action: AuditAction.NDA_UPDATED,
        entityType: 'nda',
        entityId: 'test-id',
        userId: 'user-123',
        details: {
          result: 'success',
          changes: [],
        },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            changes: [],
          }),
        })
      );
    });

    it('supports status changes with structured format', async () => {
      const { auditService, AuditAction } = await import('../auditService.js');

      const statusChange: FieldChange[] = [
        { field: 'status', before: 'Created', after: 'Emailed' },
      ];

      await auditService.log({
        action: AuditAction.NDA_STATUS_CHANGED,
        entityType: 'nda',
        entityId: 'test-id',
        userId: 'user-123',
        details: {
          result: 'success',
          changes: statusChange,
        },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.NDA_STATUS_CHANGED,
          details: expect.objectContaining({
            changes: expect.arrayContaining([
              expect.objectContaining({
                field: 'status',
                before: 'Created',
                after: 'Emailed',
              }),
            ]),
          }),
        })
      );
    });
  });
});
