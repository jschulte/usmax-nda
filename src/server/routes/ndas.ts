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
 * - POST   /api/ndas/:id/generate-document - Generate RTF document
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

import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { prisma } from '../db/index.js'; // Story 9.1: Internal notes
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission, requireAnyPermission } from '../middleware/checkPermissions.js';
import { scopeToAgencies } from '../middleware/scopeToAgencies.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  createNda,
  getNda,
  getNdaDetail,
  listNdas,
  exportNdas,
  updateNda,
  changeNdaStatus,
  cloneNda,
  updateDraft,
  getIncompleteFields,
  getFilterPresets,
  getFilterSuggestions,
  NdaServiceError,
  NdaStatus,
  NdaType,
  UsMaxPosition,
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
import { reportError } from '../services/errorReportingService.js';
import { getDownloadUrl } from '../services/s3Service.js';
import {
  getEmailPreview,
  queueEmail,
  getNdaEmails,
  EmailServiceError,
} from '../services/emailService.js';
import {
  generatePreview,
  saveEditedDocument,
  TemplateServiceError,
} from '../services/templateService.js';
import {
  getAllStatusDisplayInfo,
  getValidTransitionsFrom,
  isTerminalStatus,
  canReactivate,
} from '../services/statusTransitionService.js';
import {
  uploadNdaDocument,
  getNdaDocuments,
  getDocumentDownloadUrl,
  markDocumentFullyExecuted,
  createBulkDownload,
  DocumentServiceError,
} from '../services/documentService.js';
import {
  autoSubscribePocs,
  notifyStakeholders,
  NotificationEvent,
} from '../services/notificationService.js';
import { auditService, AuditAction } from '../services/auditService.js';
import { documentUpload } from '../middleware/fileUpload.js';

// Multer wrapper to ensure file upload errors return 400 responses
const documentUploadSingle = (req: Request, res: Response, next: NextFunction) => {
  documentUpload.single('file')(req, res, (error: unknown) => {
    if (!error) return next();

    if (error && typeof error === 'object' && (error as any).name === 'MulterError') {
      const code = (error as any).code as string | undefined;
      if (code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          code: 'FILE_TOO_LARGE',
        });
      }

      return res.status(400).json({
        error: 'Invalid upload',
        code: code || 'INVALID_UPLOAD',
      });
    }

    if (error instanceof Error && error.message.includes('Invalid file')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_FILE_TYPE',
      });
    }

    const userContextId = (req as Request & { userContext?: { id?: string } }).userContext?.id;
    reportError(error, {
      ndaId: req.params?.id,
      userId: userContextId,
      source: 'documentUploadSingle',
    });

    return res.status(500).json({
      error: 'Failed to process upload',
      code: 'INTERNAL_ERROR',
    });
  });
};

const router: Router = Router();

// All routes require authentication and user context
router.use(authenticateJWT);
router.use(attachUserContext);
router.use(scopeToAgencies);

/**
 * GET /api/ndas/status-info
 * Get status display information and transitions (Story 3.15)
 *
 * Returns status display config (colors, labels, variants)
 * and valid transitions for UI rendering
 */
router.get(
  '/status-info',
  requireAnyPermission([PERMISSIONS.NDA_VIEW, PERMISSIONS.NDA_CREATE]),
  async (_req, res) => {
    try {
      const statusInfo = getAllStatusDisplayInfo();

      // Enhance with valid transitions for each status
      const enhancedInfo = Object.entries(statusInfo).reduce(
        (acc, [status, info]) => {
          const enumStatus = status as NdaStatus;
          acc[enumStatus] = {
            ...info,
            validTransitions: getValidTransitionsFrom(enumStatus),
          };
          return acc;
        },
        {} as Record<NdaStatus, typeof statusInfo[NdaStatus] & { validTransitions: NdaStatus[] }>
      );

      return res.json({
        statuses: enhancedInfo,
        terminalStatuses: Object.entries(statusInfo)
          .filter(([status]) => isTerminalStatus(status as NdaStatus))
          .map(([status]) => status),
        reactivatableStatuses: Object.entries(statusInfo)
          .filter(([status]) => canReactivate(status as NdaStatus))
          .map(([status]) => status),
        hiddenByDefault: Object.entries(statusInfo)
          .filter(([_, info]) => info.hiddenByDefault)
          .map(([status]) => status),
      });
    } catch (error) {
      console.error('[NDA] Error getting status info:', error);
      return res.status(500).json({
        error: 'Failed to get status info',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

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
 * GET /api/ndas/export
 * Export NDAs to CSV format (Story 8.26: NDA List Export)
 *
 * Supports the same query params as GET /api/ndas but exports all matching
 * records (up to 10,000) as a CSV file.
 *
 * Query params:
 * - Same filters as GET /api/ndas (search, agencyGroupId, status, etc.)
 * - format: 'csv' (default) - future extensibility for xlsx
 *
 * Requires: nda:view permission (via any NDA permission)
 *
 * Returns: CSV file download
 */
router.get(
  '/export',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const params = {
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        search: req.query.search as string | undefined,
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
        companyCity: req.query.companyCity as string | undefined,
        companyState: req.query.companyState as string | undefined,
        stateOfIncorporation: req.query.stateOfIncorporation as string | undefined,
        agencyOfficeName: req.query.agencyOfficeName as string | undefined,
        isNonUsMax: req.query.isNonUsMax === undefined ? undefined : req.query.isNonUsMax === 'true',
        usMaxPosition: req.query.usMaxPosition as UsMaxPosition | undefined,
        createdDateFrom: req.query.createdDateFrom as string | undefined,
        createdDateTo: req.query.createdDateTo as string | undefined,
        opportunityPocName: req.query.opportunityPocName as string | undefined,
        contractsPocName: req.query.contractsPocName as string | undefined,
        relationshipPocName: req.query.relationshipPocName as string | undefined,
        preset: req.query.preset as
          | 'my-ndas'
          | 'expiring-soon'
          | 'drafts'
          | 'inactive'
          | 'waiting-on-third-party'
          | 'stale-no-activity'
          | 'active-ndas'
          | undefined,
      };

      const result = await exportNdas(params, req.userContext!);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `nda-export-${timestamp}.csv`;

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Total-Count', result.count.toString());

      // Send CSV content
      res.send(result.csv);
    } catch (error) {
      console.error('[NDAs] Error exporting NDAs:', error);
      res.status(500).json({
        error: 'Failed to export NDAs',
        code: 'INTERNAL_ERROR',
      });
    }
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
 * - search: Global search across all NDA fields (min 2 chars) (Story 5.1)
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
 * - ndaType: Filter by NDA type
 * - isNonUsMax: Filter by non-USmax flag
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
        // Global search (Story 5.1)
        search: req.query.search as string | undefined,
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
        ndaType: req.query.ndaType as NdaType | undefined,
        isNonUsMax: req.query.isNonUsMax === undefined ? undefined : req.query.isNonUsMax === 'true',
        usMaxPosition: req.query.usMaxPosition as UsMaxPosition | undefined,
        createdDateFrom: req.query.createdDateFrom as string | undefined,
        createdDateTo: req.query.createdDateTo as string | undefined,
        opportunityPocName: req.query.opportunityPocName as string | undefined,
        contractsPocName: req.query.contractsPocName as string | undefined,
        relationshipPocName: req.query.relationshipPocName as string | undefined,
        preset: req.query.preset as 'my-ndas' | 'expiring-soon' | 'drafts' | 'inactive' | undefined,
      };

      if (params.search) {
        const trimmedSearch = params.search.trim();
        if (trimmedSearch.length < 2 || trimmedSearch.length > 100) {
          return res.status(400).json({
            error: 'Search query must be between 2 and 100 characters',
            code: 'INVALID_SEARCH_QUERY',
          });
        }
        params.search = trimmedSearch;
      }

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
 * GET /api/ndas/filter-suggestions
 * Get distinct values for list filter typeahead
 *
 * Query params:
 * - field: companyCity | companyState | stateOfIncorporation | agencyOfficeName
 * - q: Search query (min 2 chars)
 * - limit: Max results (default: 10)
 *
 * Requires: nda:view permission (via any NDA permission)
 */
router.get(
  '/filter-suggestions',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
    PERMISSIONS.NDA_DELETE,
  ]),
  async (req, res) => {
    try {
      const field = req.query.field as
        | 'companyCity'
        | 'companyState'
        | 'stateOfIncorporation'
        | 'agencyOfficeName';
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const allowedFields = new Set([
        'companyCity',
        'companyState',
        'stateOfIncorporation',
        'agencyOfficeName',
      ]);

      if (!field || !allowedFields.has(field)) {
        return res.status(400).json({
          error: 'Invalid field for filter suggestions',
          code: 'VALIDATION_ERROR',
        });
      }

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          error: 'Search query must be at least 2 characters',
          code: 'VALIDATION_ERROR',
        });
      }

      const values = await getFilterSuggestions(field, query, req.userContext!, limit);
      res.json({ values });
    } catch (error) {
      console.error('[NDAs] Error getting filter suggestions:', error);
      res.status(500).json({
        error: 'Failed to get filter suggestions',
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
 * - typicalPosition: Most common USmax position
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
 * - usMaxPosition: 'PRIME' | 'SUB_CONTRACTOR' | 'OTHER' (optional, default: PRIME)
 * - isNonUsMax: boolean (optional, default: false)
 * - opportunityPocId: string (optional, defaults to current user)
 * - contractsPocId: string (optional)
 * - relationshipPocId: string (required)
 * - companyCity: string (optional)
 * - companyState: string (optional)
 * - stateOfIncorporation: string (optional)
 * - rtfTemplateId: string (optional)
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
      ndaType,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      opportunityPocId,
      contractsPocId,
      relationshipPocId,
      contactsPocId,
      rtfTemplateId,
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
        ndaType,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        opportunityPocId,
        contractsPocId,
        relationshipPocId,
        contactsPocId,
        rtfTemplateId,
      },
      req.userContext!,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    try {
      await autoSubscribePocs(nda.id);
      await notifyStakeholders(
        {
          ndaId: nda.id,
          displayId: nda.displayId,
          companyName: nda.companyName,
          event: NotificationEvent.NDA_CREATED,
          changedBy: {
            id: req.userContext!.contactId,
            name: req.userContext!.name ?? req.userContext!.email,
          },
          timestamp: new Date(),
        },
        req.userContext!
      );
    } catch (notifyError) {
      console.error('[NDAs] Failed to notify stakeholders on creation:', notifyError);
    }

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
              : error.code === 'INVALID_TEMPLATE'
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
 * - usMaxPosition: 'PRIME' | 'SUB_CONTRACTOR' | 'OTHER'
 * - isNonUsMax: boolean
 * - contractsPocId: string | null
 * - relationshipPocId: string
 * - companyCity: string
 * - companyState: string
 * - stateOfIncorporation: string
 * - rtfTemplateId: string | null
 *
 * Requires: nda:mark_status permission
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
      ndaType,
      abbreviatedName,
      authorizedPurpose,
      effectiveDate,
      usMaxPosition,
      isNonUsMax,
      contractsPocId,
      relationshipPocId,
      contactsPocId,
      rtfTemplateId,
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
        ndaType,
        abbreviatedName,
        authorizedPurpose,
        effectiveDate,
        usMaxPosition,
        isNonUsMax,
        contractsPocId,
        relationshipPocId,
        contactsPocId,
        rtfTemplateId,
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
              : error.code === 'INVALID_TEMPLATE'
                ? 400
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
 * - status: 'CREATED' | 'SENT_PENDING_SIGNATURE' | 'IN_REVISION' | 'FULLY_EXECUTED' | 'INACTIVE_CANCELED' | 'EXPIRED'
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
    const validStatuses = ['CREATED', 'SENT_PENDING_SIGNATURE', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE_CANCELED', 'EXPIRED'];
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

    try {
      const previousStatus =
        nda.statusHistory && nda.statusHistory.length > 1
          ? nda.statusHistory[nda.statusHistory.length - 2].status
          : undefined;
      const newStatus = nda.status as string;
      const event =
        newStatus === 'SENT_PENDING_SIGNATURE'
          ? NotificationEvent.NDA_EMAILED
          : newStatus === 'FULLY_EXECUTED'
            ? NotificationEvent.FULLY_EXECUTED
            : NotificationEvent.STATUS_CHANGED;

      await notifyStakeholders(
        {
          ndaId: nda.id,
          displayId: nda.displayId,
          companyName: nda.companyName,
          event,
          changedBy: {
            id: req.userContext!.contactId,
            name: req.userContext!.name ?? req.userContext!.email,
          },
          timestamp: new Date(),
          previousValue: previousStatus,
          newValue: newStatus,
        },
        req.userContext!
      );
    } catch (notifyError) {
      console.error('[NDAs] Failed to notify stakeholders on status change:', notifyError);
    }

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
              : error.code === 'INVALID_TEMPLATE'
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
 * - rtfTemplateId: string | null
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
      ndaType,
      usMaxPosition,
      isNonUsMax,
      opportunityPocId,
      contractsPocId,
      relationshipPocId,
      contactsPocId,
      rtfTemplateId,
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
        ndaType,
        usMaxPosition,
        isNonUsMax,
        opportunityPocId,
        contractsPocId,
        relationshipPocId,
        contactsPocId,
        rtfTemplateId,
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
 * Generate an RTF document for an NDA
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
      const { templateId } = req.body || {};
      const result = await generateDocument(
        { ndaId: req.params.id, templateId },
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
        reportError(error, {
          ndaId: req.params.id,
          code: error.code,
          templateId: req.body?.templateId,
          userId: req.userContext?.id,
        });
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

      reportError(error, {
        ndaId: req.params.id,
        templateId: req.body?.templateId,
        userId: req.userContext?.id,
      });
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
 * Story 3.5: RTF Document Generation / Story 4.4: Document Version History
 *
 * Requires: nda:view permission
 *
 * Returns: Array of document metadata with version history
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
      // Use new documentService for richer response (Story 4.4)
      const documents = await getNdaDocuments(req.params.id, req.userContext!);
      res.json({ documents });
	    } catch (error) {
	      if (error instanceof DocumentServiceError) {
        const statusCode = error.code === 'NDA_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error listing documents:', error);
      res.status(500).json({
        error: 'Failed to list documents',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas/:id/documents/upload
 * Upload a document to an NDA
 * Story 4.1: Document Upload with Drag-Drop
 *
 * Body (multipart/form-data):
 * - file: File (required) - RTF, PDF, or DOCX file
 * - isFullyExecuted: boolean (optional) - Mark as fully executed
 * - notes: string (optional) - Additional notes
 *
 * Requires: nda:create or nda:update permission
 *
 * Returns:
 * - document: Uploaded document metadata
 */
router.post(
  '/:id/documents/upload',
  requirePermission(PERMISSIONS.NDA_UPLOAD_DOCUMENT),
  documentUploadSingle,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'VALIDATION_ERROR',
        });
      }

      const isFullyExecutedRaw = req.body.isFullyExecuted;
      if (
        isFullyExecutedRaw !== undefined &&
        isFullyExecutedRaw !== 'true' &&
        isFullyExecutedRaw !== 'false'
      ) {
        return res.status(400).json({
          error: 'Invalid isFullyExecuted value',
          code: 'INVALID_INPUT',
        });
      }

      const isFullyExecuted = isFullyExecutedRaw === 'true';
      const notes = req.body.notes as string | undefined;

      const document = await uploadNdaDocument(
        {
          ndaId: req.params.id,
          filename: req.file.originalname,
          content: req.file.buffer,
          contentType: req.file.mimetype,
          fileSize: req.file.size,
          isFullyExecuted,
          notes,
        },
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );

      res.status(201).json({
        message: 'Document uploaded successfully',
        document,
      });
    } catch (error) {
      if (error instanceof DocumentServiceError) {
        const statusCode =
          error.code === 'NDA_NOT_FOUND'
            ? 404
            : error.code === 'ACCESS_DENIED'
              ? 403
              : error.code === 'INVALID_FILE_TYPE' || error.code === 'FILE_TOO_LARGE'
                ? 400
                : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
	      }

      console.error('[NDAs] Error uploading document:', error);
      res.status(500).json({
        error: 'Failed to upload document',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * PATCH /api/ndas/documents/:documentId/mark-executed
 * Mark a document as fully executed
 * Story 4.2: Mark Document as Fully Executed
 *
 * Marks the document as fully executed and auto-transitions NDA status.
 *
 * Requires: nda:update permission
 *
 * Returns:
 * - document: Updated document metadata
 */
router.patch(
  '/documents/:documentId/mark-executed',
  requirePermission(PERMISSIONS.NDA_MARK_STATUS),
  async (req, res) => {
    try {
      const document = await markDocumentFullyExecuted(
        req.params.documentId,
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );

      res.json({
        message: 'Document marked as fully executed',
        document,
      });
    } catch (error) {
      if (error instanceof DocumentServiceError) {
        const statusCode =
          error.code === 'DOCUMENT_NOT_FOUND'
            ? 404
            : error.code === 'INVALID_TRANSITION'
              ? 400
            : error.code === 'ACCESS_DENIED'
              ? 403
              : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error marking document executed:', error);
      res.status(500).json({
        error: 'Failed to mark document as executed',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/documents/:documentId/download-url
 * Get a pre-signed download URL for a document
 * Story 4.3: Document Download with Pre-Signed URLs
 *
 * Uses documentService for audit logging.
 *
 * Query params:
 * - expiresIn: URL expiration in seconds (default: 900 = 15 minutes)
 *
 * Requires: nda:view permission
 *
 * Returns: Pre-signed S3 URL for download
 */
router.get(
  '/documents/:documentId/download-url',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const expiresInParam = req.query.expiresIn
        ? parseInt(req.query.expiresIn as string, 10)
        : 900;
      const expiresIn = Number.isFinite(expiresInParam) && expiresInParam > 0
        ? expiresInParam
        : 900;

      const result = await getDocumentDownloadUrl(
        req.params.documentId,
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
        expiresIn
      );

      res.json({
        downloadUrl: result.url,
        filename: result.filename,
      });
    } catch (error) {
      if (error instanceof DocumentServiceError) {
        const statusCode =
          error.code === 'DOCUMENT_NOT_FOUND'
            ? 404
            : error.code === 'ACCESS_DENIED'
              ? 403
              : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error getting download URL:', error);
      res.status(500).json({
        error: 'Failed to generate download URL',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/documents/download-all
 * Download all documents for an NDA as a ZIP archive
 * Story 4.5: Download All Versions as ZIP
 *
 * Requires: nda:view permission
 *
 * Returns: ZIP file stream
 */
router.get(
  '/:id/documents/download-all',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const result = await createBulkDownload(req.params.id, req.userContext!, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      // Pipe the archive stream to the response
      result.stream.pipe(res);

      // Handle stream errors
      result.stream.on('error', (error) => {
        console.error('[NDAs] Error streaming ZIP:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to generate ZIP archive',
            code: 'INTERNAL_ERROR',
          });
        }
      });
    } catch (error) {
      if (error instanceof DocumentServiceError) {
        const statusCode =
          error.code === 'NDA_NOT_FOUND'
            ? 404
            : error.code === 'ACCESS_DENIED'
              ? 403
              : error.code === 'NO_DOCUMENTS'
                ? 404
                : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error creating bulk download:', error);
      res.status(500).json({
        error: 'Failed to create bulk download',
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
      const expiresInParam = req.query.expiresIn
        ? parseInt(req.query.expiresIn as string, 10)
        : 900;
      const expiresIn = Number.isFinite(expiresInParam) && expiresInParam > 0
        ? expiresInParam
        : 900;

      // Story 6.3: Use documentService for proper audit logging
      const { url, filename } = await getDocumentDownloadUrl(
        req.params.documentId,
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        expiresIn
      );

      res.json({
        downloadUrl: url,
        filename,
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
      const templateId = req.query.templateId as string | undefined;
      const preview = await getEmailPreview(req.params.id, req.userContext!, templateId);
      res.json({ preview });
    } catch (error) {
      if (error instanceof EmailServiceError) {
        const statusCode =
          error.code === 'NDA_NOT_FOUND'
            ? 404
            : error.code === 'TEMPLATE_NOT_FOUND'
              ? 404
              : 500;
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
      const { subject, toRecipients, ccRecipients, bccRecipients, body, templateId } = req.body;

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
          templateId,
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
            : error.code === 'VALIDATION_ERROR'
              ? 400
            : error.code === 'NO_RECIPIENTS'
              ? 400
            : error.code === 'NO_ATTACHMENT'
              ? 400
              : error.code === 'TEMPLATE_NOT_FOUND'
                ? 404
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
      const emails = await getNdaEmails(req.params.id, req.userContext!);
      res.json({ emails });
    } catch (error) {
      if (error instanceof EmailServiceError && error.code === 'NDA_NOT_FOUND') {
        return res.status(404).json({ error: error.message, code: error.code });
      }
      console.error('[NDAs] Error getting email history:', error);
      res.status(500).json({
        error: 'Failed to get email history',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// ============================================================================
// Story 3.13: RTF Template Selection & Preview
// ============================================================================

/**
 * POST /api/ndas/:id/preview-document
 * Generate document preview (Story 3.13)
 *
 * Body (optional):
 * - templateId: Template ID to use (uses recommended if not provided)
 *
 * Returns:
 * - previewUrl: Pre-signed S3 URL (expires in 15 min)
 * - mergedFields: Which fields were merged
 * - templateUsed: Template info
 */
router.post(
  '/:id/preview-document',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const { templateId } = req.body;

      const preview = await generatePreview(
        req.params.id,
        templateId,
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      res.json({
        message: 'Document preview generated',
        preview,
      });
    } catch (error) {
      if (error instanceof TemplateServiceError) {
        const statusCode =
          error.code === 'NOT_FOUND' ? 404 :
          error.code === 'ACCESS_DENIED' ? 403 :
          error.code === 'VALIDATION_ERROR' ? 400 : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error generating preview:', error);
      res.status(500).json({
        error: 'Failed to generate preview',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas/:id/save-edited-document
 * Save edited document (Story 3.13)
 *
 * Body:
 * - content: base64 encoded document content
 * - filename: Original filename
 *
 * Returns:
 * - documentId, filename, s3Key
 */
router.post(
  '/:id/save-edited-document',
  requireAnyPermission([
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const { content, filename } = req.body;

      if (!content || !filename) {
        return res.status(400).json({
          error: 'Content and filename are required',
          code: 'VALIDATION_ERROR',
        });
      }

      const contentBuffer = Buffer.from(content, 'base64');

      const result = await saveEditedDocument(
        req.params.id,
        contentBuffer,
        filename,
        req.userContext!,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      res.status(201).json({
        message: 'Edited document saved',
        document: result,
      });
    } catch (error) {
      if (error instanceof TemplateServiceError) {
        const statusCode =
          error.code === 'NOT_FOUND' ? 404 :
          error.code === 'ACCESS_DENIED' ? 403 : 500;

        return res.status(statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error('[NDAs] Error saving edited document:', error);
      res.status(500).json({
        error: 'Failed to save edited document',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/ndas/:id/notes
 * Get internal notes for an NDA
 * Story 9.1: Fix Internal Notes Display
 *
 * Returns array of internal notes (user's own notes only)
 * Requires: nda:view permission
 */
router.get(
  '/:id/notes',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      // Verify NDA exists and user has access
      const nda = await getNda(req.params.id, req.userContext!);
      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found',
          code: 'NDA_NOT_FOUND',
        });
      }

      // Get user's own notes only
      const notes = await prisma.internalNote.findMany({
        where: {
          ndaId: req.params.id,
          userId: req.userContext!.contactId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json({ notes });
    } catch (error) {
      console.error('[NDAs] Error getting internal notes:', error);
      res.status(500).json({
        error: 'Failed to get notes',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas/:id/notes
 * Create an internal note for an NDA
 * Story 9.1: Fix Internal Notes Display
 *
 * Body: { noteText: string }
 * Requires: nda:view permission
 */
router.post(
  '/:id/notes',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const { noteText } = req.body;

      if (!noteText || !noteText.trim()) {
        return res.status(400).json({
          error: 'Note text is required',
          code: 'VALIDATION_ERROR',
        });
      }

      // Verify NDA exists and user has access
      const nda = await getNda(req.params.id, req.userContext!);
      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found',
          code: 'NDA_NOT_FOUND',
        });
      }

      // Create note
      const note = await prisma.internalNote.create({
        data: {
          ndaId: req.params.id,
          userId: req.userContext!.contactId,
          noteText: noteText.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      await auditService.log({
        action: AuditAction.INTERNAL_NOTE_CREATED,
        entityType: 'internal_note',
        entityId: note.id,
        userId: req.userContext!.contactId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          ndaId: req.params.id,
          noteId: note.id,
        },
      });

      res.status(201).json({ note });
    } catch (error) {
      console.error('[NDAs] Error creating internal note:', error);
      res.status(500).json({
        error: 'Failed to create note',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * PUT /api/ndas/:id/notes/:noteId
 * Update an internal note
 * Story 9.1: Fix Internal Notes Display
 *
 * Body: { noteText: string }
 * Requires: User must own the note
 */
router.put(
  '/:id/notes/:noteId',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      const { noteText } = req.body;

      if (!noteText || !noteText.trim()) {
        return res.status(400).json({
          error: 'Note text is required',
          code: 'VALIDATION_ERROR',
        });
      }

      // Verify note exists and user owns it
      const existing = await prisma.internalNote.findUnique({
        where: { id: req.params.noteId },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      if (existing.ndaId !== req.params.id) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      if (existing.userId !== req.userContext!.contactId) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      // Verify NDA exists and user has access
      const nda = await getNda(existing.ndaId, req.userContext!);
      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found',
          code: 'NDA_NOT_FOUND',
        });
      }

      // Update note
      const note = await prisma.internalNote.update({
        where: { id: req.params.noteId },
        data: { noteText: noteText.trim() },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      await auditService.log({
        action: AuditAction.INTERNAL_NOTE_UPDATED,
        entityType: 'internal_note',
        entityId: note.id,
        userId: req.userContext!.contactId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          ndaId: existing.ndaId,
          noteId: note.id,
        },
      });

      res.json({ note });
    } catch (error) {
      console.error('[NDAs] Error updating internal note:', error);
      res.status(500).json({
        error: 'Failed to update note',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/ndas/:id/notes/:noteId
 * Delete an internal note
 * Story 9.1: Fix Internal Notes Display
 *
 * Requires: User must own the note
 */
router.delete(
  '/:id/notes/:noteId',
  requireAnyPermission([
    PERMISSIONS.NDA_VIEW,
    PERMISSIONS.NDA_CREATE,
    PERMISSIONS.NDA_UPDATE,
  ]),
  async (req, res) => {
    try {
      // Verify note exists and user owns it
      const existing = await prisma.internalNote.findUnique({
        where: { id: req.params.noteId },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      if (existing.ndaId !== req.params.id) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      if (existing.userId !== req.userContext!.contactId) {
        return res.status(404).json({
          error: 'Note not found',
          code: 'NOTE_NOT_FOUND',
        });
      }

      // Verify NDA exists and user has access
      const nda = await getNda(existing.ndaId, req.userContext!);
      if (!nda) {
        return res.status(404).json({
          error: 'NDA not found',
          code: 'NDA_NOT_FOUND',
        });
      }

      // Delete note
      await prisma.internalNote.delete({
        where: { id: req.params.noteId },
      });

      await auditService.log({
        action: AuditAction.INTERNAL_NOTE_DELETED,
        entityType: 'internal_note',
        entityId: existing.id,
        userId: req.userContext!.contactId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          ndaId: existing.ndaId,
          noteId: existing.id,
        },
      });

      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      console.error('[NDAs] Error deleting internal note:', error);
      res.status(500).json({
        error: 'Failed to delete note',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/ndas/:id/route-for-approval
 * Route NDA for approval
 * Story 10.6: Two-Step Approval Workflow
 */
router.post('/:id/route-for-approval', requirePermission(PERMISSIONS.NDA_CREATE), async (req, res) => {
  try {
    const nda = await changeNdaStatus(req.params.id, 'PENDING_APPROVAL', req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Story 10.18: Notify all users with approve permission for this agency
    await notifyStakeholders(
      {
        ndaId: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        event: NotificationEvent.APPROVAL_REQUESTED,
        changedBy: {
          id: req.userContext!.contactId,
          name: req.userContext!.name ?? req.userContext!.email,
        },
        timestamp: new Date(),
      },
      req.userContext!
    );

    res.json({
      message: 'NDA routed for approval',
      nda,
    });
  } catch (error) {
    console.error('[NDAs] Error routing for approval:', error);
    res.status(500).json({
      error: 'Failed to route NDA for approval',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/ndas/:id/approve
 * Approve a pending NDA
 * Story 10.6: Two-Step Approval Workflow
 */
router.post('/:id/approve', requirePermission(PERMISSIONS.NDA_APPROVE), async (req, res) => {
  try {
    // Set approval metadata
    await prisma.nda.update({
      where: { id: req.params.id },
      data: {
        approvedById: req.userContext!.contactId,
        approvedAt: new Date(),
      },
    });

    // Change status to SENT_PENDING_SIGNATURE (ready to send)
    const nda = await changeNdaStatus(req.params.id, 'SENT_PENDING_SIGNATURE', req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      message: 'NDA approved',
      nda,
    });
  } catch (error) {
    console.error('[NDAs] Error approving NDA:', error);
    res.status(500).json({
      error: 'Failed to approve NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/ndas/:id/reject
 * Reject a pending NDA
 * Story 10.6: Two-Step Approval Workflow
 */
router.post('/:id/reject', requirePermission(PERMISSIONS.NDA_APPROVE), async (req, res) => {
  try {
    const { reason } = req.body;

    // Store rejection reason
    await prisma.nda.update({
      where: { id: req.params.id },
      data: {
        rejectionReason: reason || 'No reason provided',
      },
    });

    // Change status back to CREATED
    const nda = await changeNdaStatus(req.params.id, 'CREATED', req.userContext!, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Story 10.18: Notify creator of rejection
    await notifyStakeholders(
      {
        ndaId: nda.id,
        displayId: nda.displayId,
        companyName: nda.companyName,
        event: NotificationEvent.NDA_REJECTED,
        changedBy: {
          id: req.userContext!.contactId,
          name: req.userContext!.name ?? req.userContext!.email,
        },
        timestamp: new Date(),
        newValue: reason || 'No reason provided', // Rejection reason
      },
      req.userContext!
    );

    res.json({
      message: 'NDA rejected',
      nda,
    });
  } catch (error) {
    console.error('[NDAs] Error rejecting NDA:', error);
    res.status(500).json({
      error: 'Failed to reject NDA',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================================================
// Workflow Guidance
// ============================================================================

/**
 * GET /api/ndas/:id/workflow-guidance
 * Get workflow guidance for an NDA (what to do next)
 *
 * Returns:
 * - nextAction: What should happen next
 * - approvalRequired: Whether approval is needed
 * - approvers: Who can approve
 * - guidanceText: Clear explanation
 * - availableActions: What user can do
 */
router.get(
  '/:id/workflow-guidance',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req, res) => {
    try {
      const { getWorkflowGuidance } = await import('../services/workflowService.js');
      const guidance = await getWorkflowGuidance(req.params.id, req.userContext!);
      res.json({ guidance });
    } catch (error) {
      console.error('[NDAs] Error getting workflow guidance:', error);
      res.status(500).json({
        error: 'Failed to get workflow guidance',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// ============================================================================
// Document Editing
// ============================================================================

/**
 * GET /api/ndas/:id/documents/:docId/edit-content
 * Get document content as RTF for editing
 *
 * Returns raw RTF content for use with @jonahschulte/rtf-editor
 */
router.get(
  '/:id/documents/:docId/edit-content',
  requirePermission(PERMISSIONS.NDA_VIEW),
  async (req, res) => {
    try {
      const { getDocumentContentWithAuth } = await import('../services/documentService.js');

      // Get RTF content from S3
      const rtfContent = await getDocumentContentWithAuth(
        req.params.id,
        req.params.docId,
        req.userContext!
      );

      // Return raw RTF content (frontend will handle conversion)
      res.json({ rtfContent });
    } catch (error) {
      console.error('[NDAs] Error loading document for editing:', error);
      res.status(500).json({
        error: 'Failed to load document',
        code: 'LOAD_ERROR',
      });
    }
  }
);

/**
 * PUT /api/ndas/:id/documents/:docId/save
 * Save edited document content
 *
 * Accepts RTF content from @jonahschulte/rtf-editor and creates new document version
 */
router.put(
  '/:id/documents/:docId/save',
  requirePermission(PERMISSIONS.NDA_UPDATE),
  async (req, res) => {
    try {
      const { rtfContent, htmlContent } = req.body;

      if (!rtfContent || typeof rtfContent !== 'string') {
        return res.status(400).json({
          error: 'rtfContent is required',
          code: 'MISSING_CONTENT',
        });
      }

      const { uploadDocument } = await import('../services/s3Service.js');

      // RTF content is already provided by the editor
      // htmlContent is optional and used for preview/search purposes

      // Create new document version
      const filename = `NDA_${req.params.id}_v${Date.now()}.rtf`;
      const uploadResult = await uploadDocument({
        ndaId: req.params.id,
        filename,
        content: Buffer.from(rtfContent),
        contentType: 'application/rtf',
      });

      // Create database record
      const document = await prisma.document.create({
        data: {
          ndaId: req.params.id,
          filename,
          fileType: 'application/rtf',
          fileSize: Buffer.byteLength(rtfContent),
          s3Key: uploadResult.s3Key,
          documentType: 'GENERATED',
          uploadedById: req.userContext!.contactId,
          versionNumber: await getNextVersionNumber(req.params.id),
          notes: 'Edited in browser',
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Audit log
      await auditService.log({
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'document',
        entityId: document.id,
        userId: req.userContext!.contactId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          ndaId: req.params.id,
          documentId: document.id,
          filename: document.filename,
          versionNumber: document.versionNumber,
        },
      });

      res.json({
        message: 'Document saved successfully',
        document,
      });
    } catch (error) {
      console.error('[NDAs] Error saving document:', error);
      res.status(500).json({
        error: 'Failed to save document',
        code: 'SAVE_ERROR',
      });
    }
  }
);

async function getNextVersionNumber(ndaId: string): Promise<number> {
  const maxVersion = await prisma.document.findFirst({
    where: { ndaId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  return (maxVersion?.versionNumber || 0) + 1;
}

export default router;
