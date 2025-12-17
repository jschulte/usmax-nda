/**
 * Admin Configuration Routes
 * Epic 7: Templates & Configuration
 * Stories 7.14-7.19: Admin Configuration
 *
 * REST API endpoints for system configuration:
 * - GET/PUT /api/admin/config/dashboard      - Dashboard thresholds
 * - GET/PUT /api/admin/config/email          - Email defaults
 * - GET/PUT /api/admin/config/dropdowns/:field - Dropdown values
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { attachUserContext } from '../middleware/attachUserContext.js';
import { requirePermission } from '../middleware/checkPermissions.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getDashboardThresholds,
  setDashboardThresholds,
  getEmailDefaults,
  setEmailDefaults,
  getDropdownValues,
  setDropdownValues,
  addDropdownValue,
  updateDropdownValue,
  reorderDropdownValues,
  ConfigServiceError,
} from '../services/systemConfigService.js';

const router = Router();

// All routes require authentication, user context, and admin permission
router.use(authenticateJWT);
router.use(attachUserContext);
router.use(requirePermission(PERMISSIONS.ADMIN_MANAGE_AGENCIES));

// === Dashboard Thresholds (Story 7.17) ===

/**
 * GET /api/admin/config/dashboard
 * Get dashboard alert thresholds
 */
router.get('/dashboard', async (_req, res) => {
  try {
    const thresholds = await getDashboardThresholds();
    res.json({ thresholds });
  } catch (error) {
    console.error('[AdminConfig] Error getting dashboard thresholds:', error);
    res.status(500).json({
      error: 'Failed to get dashboard thresholds',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/config/dashboard
 * Update dashboard alert thresholds
 *
 * Body (all optional):
 * - staleCreatedDays: number
 * - staleEmailedDays: number
 * - expirationWarningDays: number
 * - expirationInfoDays: number
 */
router.put('/dashboard', async (req, res) => {
  try {
    const { staleCreatedDays, staleEmailedDays, expirationWarningDays, expirationInfoDays } = req.body;

    // Validate values are positive integers
    const validate = (val: any, name: string) => {
      if (val !== undefined && (typeof val !== 'number' || val < 1 || !Number.isInteger(val))) {
        throw new ConfigServiceError(`${name} must be a positive integer`, 'VALIDATION_ERROR');
      }
    };

    validate(staleCreatedDays, 'staleCreatedDays');
    validate(staleEmailedDays, 'staleEmailedDays');
    validate(expirationWarningDays, 'expirationWarningDays');
    validate(expirationInfoDays, 'expirationInfoDays');

    await setDashboardThresholds(
      { staleCreatedDays, staleEmailedDays, expirationWarningDays, expirationInfoDays },
      req.userContext!
    );

    const thresholds = await getDashboardThresholds();
    res.json({
      message: 'Dashboard thresholds updated',
      thresholds,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error updating dashboard thresholds:', error);
    res.status(500).json({
      error: 'Failed to update dashboard thresholds',
      code: 'INTERNAL_ERROR',
    });
  }
});

// === Email Defaults (Story 7.18) ===

/**
 * GET /api/admin/config/email
 * Get default email recipients
 */
router.get('/email', async (_req, res) => {
  try {
    const defaults = await getEmailDefaults();
    res.json({ defaults });
  } catch (error) {
    console.error('[AdminConfig] Error getting email defaults:', error);
    res.status(500).json({
      error: 'Failed to get email defaults',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/config/email
 * Update default email recipients
 *
 * Body:
 * - defaultCc: string[] (optional)
 * - defaultBcc: string[] (optional)
 */
router.put('/email', async (req, res) => {
  try {
    const { defaultCc, defaultBcc } = req.body;

    // Validate email arrays
    const validateEmails = (emails: any, name: string) => {
      if (emails !== undefined) {
        if (!Array.isArray(emails)) {
          throw new ConfigServiceError(`${name} must be an array`, 'VALIDATION_ERROR');
        }
        for (const email of emails) {
          if (typeof email !== 'string' || !email.includes('@')) {
            throw new ConfigServiceError(`Invalid email in ${name}: ${email}`, 'VALIDATION_ERROR');
          }
        }
      }
    };

    validateEmails(defaultCc, 'defaultCc');
    validateEmails(defaultBcc, 'defaultBcc');

    await setEmailDefaults({ defaultCc, defaultBcc }, req.userContext!);

    const defaults = await getEmailDefaults();
    res.json({
      message: 'Email defaults updated',
      defaults,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error updating email defaults:', error);
    res.status(500).json({
      error: 'Failed to update email defaults',
      code: 'INTERNAL_ERROR',
    });
  }
});

// === Dropdown Values (Story 7.19) ===

/**
 * GET /api/admin/config/dropdowns/:field
 * Get dropdown values for a field
 *
 * Params:
 * - field: 'nda_types' | 'usmax_positions'
 */
router.get('/dropdowns/:field', async (req, res) => {
  try {
    const field = req.params.field;
    if (field !== 'nda_types' && field !== 'usmax_positions') {
      return res.status(400).json({
        error: 'Invalid field. Must be "nda_types" or "usmax_positions"',
        code: 'VALIDATION_ERROR',
      });
    }

    const values = await getDropdownValues(field);
    res.json({ field, values });
  } catch (error) {
    console.error('[AdminConfig] Error getting dropdown values:', error);
    res.status(500).json({
      error: 'Failed to get dropdown values',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/config/dropdowns/:field
 * Replace all dropdown values for a field
 *
 * Body:
 * - values: Array<{ value: string, label: string, isActive: boolean, sortOrder?: number }>
 */
router.put('/dropdowns/:field', async (req, res) => {
  try {
    const field = req.params.field;
    if (field !== 'nda_types' && field !== 'usmax_positions') {
      return res.status(400).json({
        error: 'Invalid field. Must be "nda_types" or "usmax_positions"',
        code: 'VALIDATION_ERROR',
      });
    }

    const { values } = req.body;
    if (!Array.isArray(values)) {
      return res.status(400).json({
        error: 'values must be an array',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate each value
    for (const val of values) {
      if (!val.value || !val.label) {
        return res.status(400).json({
          error: 'Each value must have "value" and "label" properties',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    await setDropdownValues(field, values, req.userContext!);

    const updatedValues = await getDropdownValues(field);
    res.json({
      message: 'Dropdown values updated',
      field,
      values: updatedValues,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error updating dropdown values:', error);
    res.status(500).json({
      error: 'Failed to update dropdown values',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/admin/config/dropdowns/:field
 * Add a new dropdown value
 *
 * Body:
 * - value: string
 * - label: string
 * - isActive: boolean (default true)
 */
router.post('/dropdowns/:field', async (req, res) => {
  try {
    const field = req.params.field;
    if (field !== 'nda_types' && field !== 'usmax_positions') {
      return res.status(400).json({
        error: 'Invalid field. Must be "nda_types" or "usmax_positions"',
        code: 'VALIDATION_ERROR',
      });
    }

    const { value, label, isActive = true } = req.body;
    if (!value || !label) {
      return res.status(400).json({
        error: 'value and label are required',
        code: 'VALIDATION_ERROR',
      });
    }

    await addDropdownValue(field, { value, label, isActive }, req.userContext!);

    const values = await getDropdownValues(field);
    res.status(201).json({
      message: 'Dropdown value added',
      field,
      values,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      const status = error.code === 'VALIDATION_ERROR' ? 400 : 500;
      return res.status(status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error adding dropdown value:', error);
    res.status(500).json({
      error: 'Failed to add dropdown value',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/admin/config/dropdowns/:field/:value
 * Update a specific dropdown value
 *
 * Body (all optional):
 * - label: string
 * - isActive: boolean
 * - sortOrder: number
 */
router.patch('/dropdowns/:field/:value', async (req, res) => {
  try {
    const { field, value } = req.params;
    if (field !== 'nda_types' && field !== 'usmax_positions') {
      return res.status(400).json({
        error: 'Invalid field. Must be "nda_types" or "usmax_positions"',
        code: 'VALIDATION_ERROR',
      });
    }

    const { label, isActive, sortOrder } = req.body;

    await updateDropdownValue(
      field,
      value,
      { label, isActive, sortOrder },
      req.userContext!
    );

    const values = await getDropdownValues(field);
    res.json({
      message: 'Dropdown value updated',
      field,
      values,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error updating dropdown value:', error);
    res.status(500).json({
      error: 'Failed to update dropdown value',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/config/dropdowns/:field/reorder
 * Reorder dropdown values
 *
 * Body:
 * - order: string[] (array of value codes in desired order)
 */
router.put('/dropdowns/:field/reorder', async (req, res) => {
  try {
    const field = req.params.field;
    if (field !== 'nda_types' && field !== 'usmax_positions') {
      return res.status(400).json({
        error: 'Invalid field. Must be "nda_types" or "usmax_positions"',
        code: 'VALIDATION_ERROR',
      });
    }

    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({
        error: 'order must be an array of value codes',
        code: 'VALIDATION_ERROR',
      });
    }

    await reorderDropdownValues(field, order, req.userContext!);

    const values = await getDropdownValues(field);
    res.json({
      message: 'Dropdown values reordered',
      field,
      values,
    });
  } catch (error) {
    if (error instanceof ConfigServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('[AdminConfig] Error reordering dropdown values:', error);
    res.status(500).json({
      error: 'Failed to reorder dropdown values',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
