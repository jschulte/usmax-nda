/**
 * Agency Scope Service Tests
 * Story 1.4: Row-Level Security Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserContext } from '../../types/auth.js';
import { ROLE_NAMES } from '../../types/auth.js';

vi.mock('../userContextService.js', () => ({
  getAuthorizedSubagencyIdsByContactId: vi.fn(),
}));

import { getUserAgencyScope, scopeNDAsToUser } from '../agencyScopeService.js';
import { getAuthorizedSubagencyIdsByContactId } from '../userContextService.js';

describe('agencyScopeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserAgencyScope', () => {
    it('returns scope with authorized subagency IDs', async () => {
      vi.mocked(getAuthorizedSubagencyIdsByContactId).mockResolvedValue([
        'sub-1',
        'sub-2',
      ]);

      const scope = await getUserAgencyScope('contact-123');

      expect(scope).toEqual({ subagencyId: { in: ['sub-1', 'sub-2'] } });
    });

    it('returns empty scope when scope computation fails', async () => {
      vi.mocked(getAuthorizedSubagencyIdsByContactId).mockRejectedValue(new Error('boom'));

      const scope = await getUserAgencyScope('contact-123');

      expect(scope).toEqual({ subagencyId: { in: [] } });
    });
  });

  describe('scopeNDAsToUser', () => {
    it('returns empty filter for admin users', async () => {
      const adminContext: UserContext = {
        id: 'admin-1',
        email: 'admin@usmax.com',
        contactId: 'contact-admin',
        roles: [ROLE_NAMES.ADMIN],
        permissions: new Set(),
        authorizedAgencyGroups: [],
        authorizedSubagencies: [],
      };

      const scope = await scopeNDAsToUser(adminContext);

      expect(scope).toEqual({});
      expect(getAuthorizedSubagencyIdsByContactId).not.toHaveBeenCalled();
    });

    it('returns scoped filter for non-admin users', async () => {
      const userContext: UserContext = {
        id: 'user-1',
        email: 'user@usmax.com',
        contactId: 'contact-123',
        roles: [ROLE_NAMES.NDA_USER],
        permissions: new Set(['nda:view']),
        authorizedAgencyGroups: ['agency-1'],
        authorizedSubagencies: ['sub-1'],
      };

      vi.mocked(getAuthorizedSubagencyIdsByContactId).mockResolvedValue(['sub-1', 'sub-2']);

      const scope = await scopeNDAsToUser(userContext);

      expect(scope).toEqual({ subagencyId: { in: ['sub-1', 'sub-2'] } });
    });
  });
});
