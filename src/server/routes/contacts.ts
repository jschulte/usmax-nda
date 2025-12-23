/**
 * Contacts Routes
 * Story 3.14: POC Management & Validation
 *
 * REST endpoints for contact/POC management:
 * - GET /api/contacts/internal-users - List internal users (Opportunity POC dropdown)
 * - GET /api/contacts/internal-users/search - Search internal users (autocomplete)
 * - GET /api/contacts/external/search - Search external contacts
 * - GET /api/contacts/:id - Get contact details
 * - GET /api/contacts/:id/copy - Get contact details for copy functionality
 * - POST /api/contacts/external - Create/find external contact
 */

import { Router, type Request, type Response } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  searchInternalUsers,
  getInternalUser,
  listInternalUsers,
  searchExternalContacts,
  getContactDetails,
  copyContactDetails,
  findOrCreateExternalContact,
  PocServiceError,
} from '../services/pocService.js';
import {
  validateEmail,
  validatePhone,
  POC_FORMAT_HINTS,
} from '../validators/pocValidator.js';

const router: Router = Router();

// Apply authentication middleware
router.use(authenticateJWT);
router.use(attachUserContext);

// =============================================================================
// INTERNAL USER ROUTES (Opportunity POC)
// =============================================================================

/**
 * GET /api/contacts/internal-users
 * List all active internal users for dropdown
 * AC1: Dropdown shows internal USMax users only
 */
router.get(
  '/internal-users',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    try {
      const users = await listInternalUsers();
      return res.json({ users });
    } catch (error) {
      console.error('[Contacts] Error listing internal users:', error);
      return res.status(500).json({
        error: 'Failed to list internal users',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/contacts/internal-users/search?q=<query>
 * Search internal users for autocomplete
 * AC1: Auto-complete works (type 3 letters → matches)
 */
router.get(
  '/internal-users/search',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.length < 3) {
      return res.status(400).json({
        error: 'Search query must be at least 3 characters',
        code: 'QUERY_TOO_SHORT',
      });
    }

    try {
      const users = await searchInternalUsers(query);
      return res.json({ users });
    } catch (error) {
      console.error('[Contacts] Error searching internal users:', error);
      return res.status(500).json({
        error: 'Failed to search internal users',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/contacts/internal-users/:id
 * Get internal user details including email signature
 * AC1: Selected user's email signature included in email template
 */
router.get(
  '/internal-users/:id',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const user = await getInternalUser(id);

      if (!user) {
        return res.status(404).json({
          error: 'Internal user not found',
          code: 'USER_NOT_FOUND',
        });
      }

      return res.json({ user });
    } catch (error) {
      console.error('[Contacts] Error getting internal user:', error);
      return res.status(500).json({
        error: 'Failed to get internal user',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// =============================================================================
// EXTERNAL CONTACT ROUTES (Relationship POC, Contracts POC)
// =============================================================================

/**
 * GET /api/contacts/external/search?q=<query>
 * Search external contacts for autocomplete
 */
router.get(
  '/external/search',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.length < 3) {
      return res.status(400).json({
        error: 'Search query must be at least 3 characters',
        code: 'QUERY_TOO_SHORT',
      });
    }

    try {
      const contacts = await searchExternalContacts(query);
      return res.json({ contacts });
    } catch (error) {
      console.error('[Contacts] Error searching external contacts:', error);
      return res.status(500).json({
        error: 'Failed to search external contacts',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/contacts/external
 * Find or create external contact
 * AC2: Validates email and phone formats
 *
 * Body: { email: string, firstName?: string, lastName?: string, phone?: string, fax?: string, jobTitle?: string }
 */
router.post(
  '/external',
  requirePermission(PERMISSIONS.NDA_CREATE),
  async (req: Request, res: Response) => {
    const { email, firstName, lastName, phone, fax, jobTitle } = req.body;

    // Validate required email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
    }

    // Real-time validation feedback
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({
        error: emailError.message,
        code: 'INVALID_EMAIL',
        hint: emailError.hint,
      });
    }

    if (phone) {
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return res.status(400).json({
          error: phoneError.message,
          code: 'INVALID_PHONE',
          hint: POC_FORMAT_HINTS.phone,
        });
      }
    }

    try {
      const contact = await findOrCreateExternalContact({
        email,
        firstName,
        lastName,
        phone,
        fax,
        jobTitle,
      });

      return res.status(201).json({
        contact: {
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.workPhone,
          fax: contact.fax,
          jobTitle: contact.jobTitle,
        },
      });
    } catch (error) {
      if (error instanceof PocServiceError) {
        return res.status(400).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[Contacts] Error creating external contact:', error);
      return res.status(500).json({
        error: 'Failed to create external contact',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// =============================================================================
// GENERAL CONTACT ROUTES
// =============================================================================

/**
 * GET /api/contacts/:id
 * Get contact details by ID
 */
router.get(
  '/:id',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const contact = await getContactDetails(id);

      if (!contact) {
        return res.status(404).json({
          error: 'Contact not found',
          code: 'CONTACT_NOT_FOUND',
        });
      }

      return res.json({ contact });
    } catch (error) {
      console.error('[Contacts] Error getting contact:', error);
      return res.status(500).json({
        error: 'Failed to get contact',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/contacts/:id/copy
 * Get contact details formatted for copy functionality
 * AC3: Copy POC details between fields
 */
router.get(
  '/:id/copy',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const details = await copyContactDetails(id);

      if (!details) {
        return res.status(404).json({
          error: 'Contact not found',
          code: 'CONTACT_NOT_FOUND',
        });
      }

      return res.json({ contact: details });
    } catch (error) {
      console.error('[Contacts] Error copying contact details:', error);
      return res.status(500).json({
        error: 'Failed to copy contact details',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/contacts/validation-rules
 * Get validation rules and format hints for frontend
 */
router.get(
  '/validation/rules',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (_req: Request, res: Response) => {
    return res.json({
      rules: {
        email: {
          required: true,
          hint: POC_FORMAT_HINTS.email,
          message: 'Please enter a valid email address',
        },
        phone: {
          required: false,
          hint: POC_FORMAT_HINTS.phone,
          message: 'Please enter phone in format (XXX) XXX-XXXX',
        },
        fax: {
          required: false,
          hint: POC_FORMAT_HINTS.fax,
          message: 'Please enter fax in format (XXX) XXX-XXXX',
        },
      },
    });
  }
);

export default router;
