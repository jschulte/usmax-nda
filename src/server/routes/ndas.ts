/**
 * NDA Routes
 * Story 3.1: Create NDA with Basic Form
 * Story 3.2: Smart Form Auto-Fill (Company-First Entry Path)
 * Story 3.3: Clone/Duplicate NDA (Second Entry Path)
 * Story 3.4: Agency-First Entry Path with Suggestions
 * Story 3.5: RTF Document Generation
 * Story 3.6: Draft Management & Auto-Save
 * Story 3.7: NDA List with Filtering
 * Story 3.8: NDA Detail View
 * Story 3.10: Email Composition & Sending
 *
 * REST API endpoints for NDA operations:
 * - GET    /api/ndas                    - List NDAs with pagination and filtering
 * - GET    /api/ndas/filter-presets     - Get available filter presets
 * - GET    /api/ndas/company-suggestions - Get recent companies
 * - GET    /api/ndas/company-defaults   - Get auto-fill defaults for company
 * - GET    /api/ndas/company-search     - Search companies
 * - GET    /api/ndas/agency-suggestions - Get suggestions for an agency
 * - GET    /api/ndas/agency-subagencies - Get common subagencies for agency
 * - GET    /api/ndas/:id                - Get NDA details
 * - POST   /api/ndas                    - Create new NDA
 * - POST   /api/ndas/:id/clone          - Clone an existing NDA
 * - PATCH  /api/ndas/:id/draft          - Update draft (auto-save)
 * - POST   /api/ndas/:id/generate-document - Generate DOCX document
 * - GET    /api/ndas/:id/documents      - List documents for an NDA
 * - GET    /api/ndas/documents/:documentId/download - Get download URL
 * - PUT    /api/ndas/:id                - Update NDA
 * - PATCH  /api/ndas/:id/status         - Change NDA status
 * - GET    /api/ndas/:id/email-preview  - Get email preview data (Story 3.10)
 * - POST   /api/ndas/:id/send-email     - Queue and send email (Story 3.10)
 * - GET    /api/ndas/:id/emails         - Get email history (Story 3.10)
 *
 * All endpoints require authentication and appropriate permissions.
 * Row-level security is enforced via agency access grants.
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  createNda,
  getNda,
  getNdaDetail,
  listNdas,
  updateNda,
  changeNdaStatus,
  cloneNda,
  updateDraft,
  getIncompleteFields,
  getFilterPresets,
  NdaServiceError,
  NdaStatus,
} from '../services/ndaService.js';
import {
  getRecentCompanies,
  getCompanyDefaults,
  searchCompanies,
  getMostCommonAgency,
} from '../services/companySuggestionsService.js';
import {
  getAgencySuggestions,
  getCommonSubagencies,
} from '../services/agencySuggestionsService.js';
import {
  generateDocument,
  getDocumentById,
  listNdaDocuments,
  DocumentGenerationError,
} from '../services/documentGenerationService.js';
import { getDownloadUrl } from '../services/s3Service.js';
import {
  getEmailPreview,
  queueEmail,
  getNdaEmails,
  EmailServiceError,
} from '../services/emailService.js';

const router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);

/**
 * GET /api/ndas/filter-presets
 * Get available filter presets for NDA list (Story 3.7)
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/filter-presets',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  (req, res) => {
    res.json({ presets: getFilterPresets() });
  }
);

/**
 * GET /api/ndas
 * List NDAs with pagination and filtering (Story 3.7)
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Column to sort by (default: createdAt)
 * - sortOrder: 'asc' or 'desc' (default: desc)
 * - agencyGroupId: Filter by agency group
 * - subagencyId: Filter by subagency
 * - companyName: Filter by company (partial match)
 * - status: Filter by status
 * - createdById: Filter by creator
 * - effectiveDateFrom: Filter by effective date >=
 * - effectiveDateTo: Filter by effective date <=
 * - showInactive: Include inactive NDAs (default: false)
 * - showCancelled: Include cancelled NDAs (default: false)
 * - draftsOnly: Only show CREATED status NDAs (Story 3.6)
 * - myDrafts: Only show drafts created by current user (Story 3.6)
 * - companyCity: Filter by company city (partial match)
 * - companyState: Filter by company state (partial match)
 * - stateOfIncorporation: Filter by state of incorporation (partial match)
 * - agencyOfficeName: Filter by agency office name (partial match)
 * - isNonUsMax: Filter by non-USMax flag
 * - createdDateFrom: Filter by creation date >=
 * - createdDateTo: Filter by creation date <=
 * - opportunityPocName: Filter by opportunity POC name (partial match)
 * - contractsPocName: Filter by contracts POC name (partial match)
 * - relationshipPocName: Filter by relationship POC name (partial match)
 * - preset: Apply filter preset (my-ndas, expiring-soon, drafts, inactive)
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        agencyGroupId: req.query.agencyGroupId as string | undefined,
        subagencyId: req.query.subagencyId as string | undefined,
        companyName: req.query.companyName as string | undefined,
        status: req.query.status as NdaStatus | undefined,
        createdById: req.query.createdById as string | undefined,
        effectiveDateFrom: req.query.effectiveDateFrom as string | undefined,
        effectiveDateTo: req.query.effectiveDateTo as string | undefined,
        showInactive: req.query.showInactive === 'true',
        showCancelled: req.query.showCancelled === 'true',
        draftsOnly: req.query.draftsOnly === 'true',
        myDrafts: req.query.myDrafts === 'true',
        // Extended filters (Story 3.7)
        companyCity: req.query.companyCity as string | undefined,
        companyState: req.query.companyState as string | undefined,
        stateOfIncorporation: req.query.stateOfIncorporation as string | undefined,
        agencyOfficeName: req.query.agencyOfficeName as string | undefined,
        isNonUsMax: req.query.isNonUsMax === undefined ? undefined : req.query.isNonUsMax === 'true',
        createdDateFrom: req.query.createdDateFrom as string | undefined,
        createdDateTo: req.query.createdDateTo as string | undefined,
        opportunityPocName: req.query.opportunityPocName as string | undefined,
        contractsPocName: req.query.contractsPocName as string | undefined,
        relationshipPocName: req.query.relationshipPocName as string | undefined,
        preset: req.query.preset as 'my-ndas' | 'expiring-soon' | 'drafts' | 'inactive' | undefined,
      };

      const result = await listNdas(params, req.userContext!);

      res.json(result);
    } catch (error) {
      console.error('[NDAs] Error listing NDAs:', error);
      res.status(500).json({
        error: 'Failed to list NDAs',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/company-suggestions
 * Get recent companies used by the current user
 * Story 3.2: Smart Form Auto-Fill
 *
 * Query params:
 * - limit: Max companies to return (default: 10)
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/company-suggestions',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const companies = await getRecentCompanies(req.userContext!, limit);
      res.json({ companies });
    } catch (error) {
      console.error('[NDAs] Error getting company suggestions:', error);
      res.status(500).json({
        error: 'Failed to get company suggestions',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/company-defaults
 * Get auto-fill defaults for a company name
 * Story 3.2: Smart Form Auto-Fill
 *
 * Query params:
 * - name: Company name (required)
 *
 * Returns historical defaults for:
 * - companyCity, companyState, stateOfIncorporation
 * - lastRelationshipPocId/Name, lastContractsPocId/Name
 * - mostCommonAgencyGroupId/Name, mostCommonSubagencyId/Name
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/company-defaults',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const companyName = req.query.name as string;

      if (!companyName) {
        return res.status(400).json({
          error: 'Company name is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const defaults = await getCompanyDefaults(companyName, req.userContext!);
      res.json({ defaults });
    } catch (error) {
      console.error('[NDAs] Error getting company defaults:', error);
      res.status(500).json({
        error: 'Failed to get company defaults',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/company-search
 * Search companies by partial name match
 * Story 3.2: Smart Form Auto-Fill
 *
 * Query params:
 * - q: Search query (required)
 * - limit: Max results (default: 20)
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/company-search',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      if (!query || query.length < 2) {
        return res.status(400).json({
          error: 'Search query must be at least 2 characters',
          code: 'VALIDATION_ERROR',
        });
      }

      const companies = await searchCompanies(query, req.userContext!, limit);
      res.json({ companies });
    } catch (error) {
      console.error('[NDAs] Error searching companies:', error);
      res.status(500).json({
        error: 'Failed to search companies',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/company-agency
 * Get the most common agency for a company
 * Story 3.2: Smart Form Auto-Fill
 *
 * Query params:
 * - name: Company name (required)
 *
 * Returns: { agencyGroupId, agencyGroupName, frequency }
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/company-agency',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const companyName = req.query.name as string;

      if (!companyName) {
        return res.status(400).json({
          error: 'Company name is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const agency = await getMostCommonAgency(companyName, req.userContext!);
      res.json({ agency });
    } catch (error) {
      console.error('[NDAs] Error getting company agency:', error);
      res.status(500).json({
        error: 'Failed to get company agency',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/agency-suggestions
 * Get intelligent suggestions for an agency
 * Story 3.4: Agency-First Entry Path with Suggestions
 *
 * Query params:
 * - agencyGroupId: Agency group ID (required)
 *
 * Returns:
 * - commonCompanies: Top 5 companies for this agency
 * - typicalPosition: Most common USMax position
 * - positionCounts: Counts for all positions
 * - defaultTemplateId/Name: Most used template (when available)
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/agency-suggestions',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const agencyGroupId = req.query.agencyGroupId as string;

      if (!agencyGroupId) {
        return res.status(400).json({
          error: 'Agency group ID is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const suggestions = await getAgencySuggestions(agencyGroupId, req.userContext!);
      res.json({ suggestions });
    } catch (error) {
      console.error('[NDAs] Error getting agency suggestions:', error);
      res.status(500).json({
        error: 'Failed to get agency suggestions',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/agency-subagencies
 * Get common subagencies for an agency
 * Story 3.4: Agency-First Entry Path with Suggestions
 *
 * Query params:
 * - agencyGroupId: Agency group ID (required)
 * - limit: Max results (default: 5)
 *
 * Requires: nda:create or nda:update permission
 */
router.get(
  '/agency-subagencies',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const agencyGroupId = req.query.agencyGroupId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      if (!agencyGroupId) {
        return res.status(400).json({
          error: 'Agency group ID is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const subagencies = await getCommonSubagencies(agencyGroupId, req.userContext!, limit);
      res.json({ subagencies });
    } catch (error) {
      console.error('[NDAs] Error getting agency subagencies:', error);
      res.status(500).json({
        error: 'Failed to get agency subagencies',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id
 * Get NDA details by ID (Story 3.8)
 *
 * Returns comprehensive NDA data including:
 * - Full NDA record with relations
 * - Documents list
 * - Email history (placeholder for Story 3-10)
 * - Audit trail
 * - Status history
 * - Available actions based on user permissions
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/:id',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const detail = await getNdaDetail(req.params.id, req.userContext!);

      if (!detail) {
        return res.status(404).json({
          error: 'NDA not found or access denied',
          code: 'NOT_FOUND',
        });
      }

      res.json(detail);
    } catch (error) {
      console.error('[NDAs] Error getting NDA detail:', error);
      res.status(500).json({
        error: 'Failed to get NDA details',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas
 * Create a new NDA
 *
 * Body:
 * - companyName: string (required)
 * - agencyGroupId: string (required)
 * - subagencyId: string (optional)
 * - agencyOfficeName: string (optional)
 * - abbreviatedName: string (required)
 * - authorizedPurpose: string (required, max 255 chars)
 * - effectiveDate: ISO date string (optional)
 * - usMaxPosition: 'PRIME' | 'SUB' | 'TEAMING' | 'OTHER' (optional, default: PRIME)
 * - isNonUsMax: boolean (optional, default: false)
 * - opportunityPocId: string (optional, defaults to current user)
 * - contractsPocId: string (optional)
 * - relationshipPocId: string (required)
 * - companyCity: string (optional)
 * - companyState: string (optional)
 * - stateOfIncorporation: string (optional)
 *
 * Requires: nda:create permission
 */
router.post('/', requirePermission(PERMISSIONS.NDA_CREATE), async (req, res) => {
  try {
    const {
      companyName,
      companyCity,
      companyState,
      stateOfIncorporation,
      agencyGroupId,
      subagencyId,
      agencyOfficeName,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      opportunityPocId,
      contractsPocId,
      relationshipPocId,
    } = req.body;

    const nda = await createNda(
      {
        companyName,
        companyCity,
        companyState,
        stateOfIncorporation,
        agencyGroupId,
        subagencyId,
        agencyOfficeName,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        opportunityPocId,
        contractsPocId,
        relationshipPocId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.status(201).json({
      message: 'NDA created successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        status: nda.status,
        agencyGroup: nda.agencyGroup,
        subagency: nda.subagency,
        createdAt: nda.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'VALIDATION_ERROR'
          ? 400
          : error.code === 'UNAUTHORIZED_AGENCY'
            ? 403
            : error.code === 'INVALID_SUBAGENCY'
              ? 400
              : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error creating NDA:', error);
    res.status(500).json({
      error: 'Failed to create NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/ndas/:id
 * Update an existing NDA
 *
 * Body (all optional):
 * - companyName: string
 * - agencyGroupId: string
 * - subagencyId: string | null
 * - agencyOfficeName: string
 * - abbreviatedName: string
 * - authorizedPurpose: string (max 255 chars)
 * - effectiveDate: ISO date string | null
 * - usMaxPosition: 'PRIME' | 'SUB' | 'TEAMING' | 'OTHER'
 * - isNonUsMax: boolean
 * - contractsPocId: string | null
 * - relationshipPocId: string
 * - companyCity: string
 * - companyState: string
 * - stateOfIncorporation: string
 *
 * Requires: nda:update permission
 */
router.put('/:id', requirePermission(PERMISSIONS.NDA_UPDATE), async (req, res) => {
  try {
    const {
      companyName,
      companyCity,
      companyState,
      stateOfIncorporation,
      agencyGroupId,
      subagencyId,
      agencyOfficeName,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      contractsPocId,
      relationshipPocId,
    } = req.body;

    const nda = await updateNda(
      req.params.id,
      {
        companyName,
        companyCity,
        companyState,
        stateOfIncorporation,
        agencyGroupId,
        subagencyId,
        agencyOfficeName,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        contractsPocId,
        relationshipPocId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.json({
      message: 'NDA updated successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        status: nda.status,
        agencyGroup: nda.agencyGroup,
        subagency: nda.subagency,
        updatedAt: nda.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'VALIDATION_ERROR'
            ? 400
            : error.code === 'UNAUTHORIZED_AGENCY'
              ? 403
              : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error updating NDA:', error);
    res.status(500).json({
      error: 'Failed to update NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/ndas/:id/status
 * Change NDA status
 *
 * Body:
 * - status: 'CREATED' | 'EMAILED' | 'IN_REVISION' | 'FULLY_EXECUTED' | 'INACTIVE' | 'CANCELLED'
 *
 * Requires: nda:mark_status permission
 */
router.patch('/:id/status', requirePermission(PERMISSIONS.NDA_MARK_STATUS), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate status value
    const validStatuses = ['CREATED', 'EMAILED', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const nda = await changeNdaStatus(req.params.id, status as NdaStatus, req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      message: 'NDA status updated successfully',
      nda: {
        id: nda.id,
        displayId: nda.displayId,
        status: nda.status,
        statusHistory: nda.statusHistory,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error changing NDA status:', error);
    res.status(500).json({
      error: 'Failed to change NDA status',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/ndas/:id/draft
 * Update NDA draft (auto-save)
 * Story 3.6: Draft Management & Auto-Save
 *
 * Body (all optional - partial save):
 * - Any NDA fields that need to be saved
 *
 * Only works on NDAs with status=CREATED
 *
 * Returns:
 * - savedAt: Timestamp of save
 * - incompleteFields: Array of required fields that are still empty
 *
 * Requires: nda:update permission
 */
router.patch('/:id/draft', requirePermission(PERMISSIONS.NDA_UPDATE), async (req, res) => {
  try {
    const result = await updateDraft(req.params.id, req.body, req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      savedAt: result.savedAt,
      incompleteFields: result.incompleteFields,
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'INVALID_STATUS'
            ? 400
            : error.code === 'VALIDATION_ERROR'
              ? 400
              : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error saving draft:', error);
    res.status(500).json({
      error: 'Failed to save draft',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/ndas/:id/clone
 * Clone an existing NDA
 * Story 3.3: Clone/Duplicate NDA (Second Entry Path)
 *
 * Body (all optional - override values from source NDA):
 * - abbreviatedName: string
 * - authorizedPurpose: string (max 255 chars)
 * - effectiveDate: ISO date string
 * - companyName: string
 * - agencyGroupId: string
 * - subagencyId: string | null
 * - other fields as needed
 *
 * Returns cloned NDA with clonedFromId pointing to source
 *
 * Requires: nda:create permission
 */
router.post('/:id/clone', requirePermission(PERMISSIONS.NDA_CREATE), async (req, res) => {
  try {
    const {
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      companyName,
      companyCity,
      companyState,
      stateOfIncorporation,
      agencyGroupId,
      subagencyId,
      agencyOfficeName,
      usMaxPosition,
      isNonUsMax,
      opportunityPocId,
      contractsPocId,
      relationshipPocId,
    } = req.body;

    const clonedNda = await cloneNda(
      req.params.id,
      {
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        companyName,
        companyCity,
        companyState,
        stateOfIncorporation,
        agencyGroupId,
        subagencyId,
        agencyOfficeName,
        usMaxPosition,
        isNonUsMax,
        opportunityPocId,
        contractsPocId,
        relationshipPocId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    res.status(201).json({
      message: 'NDA cloned successfully',
      nda: {
        id: clonedNda.id,
        displayId: clonedNda.displayId,
        companyName: clonedNda.companyName,
        status: clonedNda.status,
        agencyGroup: clonedNda.agencyGroup,
        subagency: clonedNda.subagency,
        clonedFrom: clonedNda.clonedFrom,
        createdAt: clonedNda.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof NdaServiceError) {
      const statusCode =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'VALIDATION_ERROR'
            ? 400
            : error.code === 'UNAUTHORIZED_AGENCY'
              ? 403
              : error.code === 'INVALID_SUBAGENCY'
                ? 400
                : 500;

      return res.status(statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[NDAs] Error cloning NDA:', error);
    res.status(500).json({
      error: 'Failed to clone NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/ndas/:id/generate-document
 * Generate a DOCX document for an NDA
 * Story 3.5: RTF Document Generation
 *
 * Requires: nda:create or nda:update permission
 *
 * Returns:
 * - documentId: UUID of the generated document
 * - filename: Generated filename
 * - s3Key: S3 storage key
 */
router.post(
  '/:id/generate-document',
  requireAnyPermission([PERMISSIONS.NDA_CREATE, PERMISSIONS.NDA_UPDATE]),
  async (req, res) => {
    try {
      const result = await generateDocument(
        { ndaId: req.params.id },
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );

      res.status(201).json({
        message: 'Document generated successfully',
        document: result,
      });
    } catch (error) {
      if (error instanceof DocumentGenerationError) {
        const statusCode =
          error.code === 'NDA_NOT_FOUND'
            ? 404
            : error.code === 'NON_USMAX_SKIP'
              ? 400
              : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error generating document:', error);
      res.status(500).json({
        error: 'Document generation failed, please try again',
        code: 'GENERATION_FAILED',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/documents
 * List all documents for an NDA
 * Story 3.5: RTF Document Generation
 *
 * Requires: nda:view permission
 *
 * Returns: Array of document metadata
 */
router.get(
  '/:id/documents',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const documents = await listNdaDocuments(req.params.id, req.userContext!);
      res.json({ documents });
    } catch (error) {
      console.error('[NDAs] Error listing documents:', error);
      res.status(500).json({
        error: 'Failed to list documents',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/documents/:documentId/download
 * Get a pre-signed download URL for a document
 * Story 3.5: RTF Document Generation
 *
 * Query params:
 * - expiresIn: URL expiration in seconds (default: 900 = 15 minutes)
 *
 * Requires: nda:view permission
 *
 * Returns: Pre-signed S3 URL for download
 */
router.get(
  '/documents/:documentId/download',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const document = await getDocumentById(req.params.documentId, req.userContext!);

      if (!document) {
        return res.status(404).json({
          error: 'Document not found or access denied',
          code: 'NOT_FOUND',
        });
      }

      const expiresIn = req.query.expiresIn
        ? parseInt(req.query.expiresIn as string, 10)
        : 900;

      const downloadUrl = await getDownloadUrl(document.s3Key, expiresIn);

      res.json({
        downloadUrl,
        filename: document.filename,
        expiresIn,
      });
    } catch (error) {
      console.error('[NDAs] Error getting download URL:', error);
      res.status(500).json({
        error: 'Failed to generate download URL',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/email-preview
 * Get email preview data for the composer
 * Story 3.10: Email Composition & Sending
 *
 * Returns:
 * - subject: Pre-filled subject line
 * - toRecipients: Array of TO recipients
 * - ccRecipients: Array of CC recipients
 * - bccRecipients: Array of BCC recipients
 * - body: Pre-filled email body
 * - attachments: Array of attachable documents
 *
 * Requires: nda:send_email permission
 */
router.get(
  '/:id/email-preview',
  requirePermission(PERMISSIONS.NDA_SEND_EMAIL),
  async (req, res) => {
    try {
      const preview = await getEmailPreview(req.params.id, req.userContext!);
      res.json({ preview });
    } catch (error) {
      if (error instanceof EmailServiceError) {
        const statusCode = error.code === 'NDA_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error getting email preview:', error);
      res.status(500).json({
        error: 'Failed to get email preview',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas/:id/send-email
 * Queue and send email for an NDA
 * Story 3.10: Email Composition & Sending
 *
 * Body:
 * - subject: string (required)
 * - toRecipients: string[] (required, at least one)
 * - ccRecipients: string[] (optional)
 * - bccRecipients: string[] (optional)
 * - body: string (required)
 *
 * Returns:
 * - emailId: UUID of created email record
 * - status: Current email status
 *
 * Requires: nda:send_email permission
 */
router.post(
  '/:id/send-email',
  requirePermission(PERMISSIONS.NDA_SEND_EMAIL),
  async (req, res) => {
    try {
      const { subject, toRecipients, ccRecipients, bccRecipients, body } = req.body;

      // Validate required fields
      if (!subject || !toRecipients || toRecipients.length === 0 || !body) {
        return res.status(400).json({
          error: 'Subject, at least one recipient, and body are required',
          code: 'VALIDATION_ERROR',
        });
      }

      const result = await queueEmail(
        {
          ndaId: req.params.id,
          subject,
          toRecipients,
          ccRecipients: ccRecipients || [],
          bccRecipients: bccRecipients || [],
          body,
        },
        req.userContext!
      );

      res.status(201).json({
        message: 'Email queued successfully',
        emailId: result.emailId,
        status: result.status,
      });
    } catch (error) {
      if (error instanceof EmailServiceError) {
        const statusCode =
          error.code === 'NDA_NOT_FOUND'
            ? 404
            : error.code === 'NO_RECIPIENTS'
              ? 400
              : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error sending email:', error);
      res.status(500).json({
        error: 'Failed to send email',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/emails
 * Get email history for an NDA
 * Story 3.10: Email Composition & Sending
 *
 * Returns array of emails with:
 * - id, subject, toRecipients, sentAt, status, sentBy
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/:id/emails',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const emails = await getNdaEmails(req.params.id);
      res.json({ emails });
    } catch (error) {
      console.error('[NDAs] Error getting email history:', error);
      res.status(500).json({
        error: 'Failed to get email history',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
