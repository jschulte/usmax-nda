/**
 * System Configuration Service
 * Epic 7: Templates & Configuration
 * Stories 7.14-7.19: Admin Configuration
 *
 * Handles system-wide configuration:
 * - Dashboard alert thresholds
 * - Default email recipients (CC/BCC)
 * - Dropdown field values (NDA Type, USmax Position)
 * - Notification rules
 */

import { prisma } from '../db/index.js';
import { auditService, AuditAction } from './auditService.js';
import type { UserContext } from '../types/auth.js';

/**
 * System configuration keys
 */
export enum ConfigKey {
  // Dashboard thresholds (Story 7.17)
  DASHBOARD_STALE_CREATED_DAYS = 'dashboard.stale_created_days',
  DASHBOARD_STALE_EMAILED_DAYS = 'dashboard.stale_emailed_days',
  DASHBOARD_EXPIRATION_WARNING_DAYS = 'dashboard.expiration_warning_days',
  DASHBOARD_EXPIRATION_INFO_DAYS = 'dashboard.expiration_info_days',
  NDA_DEFAULT_TERM_DAYS = 'nda.default_term_days',

  // Email defaults (Story 7.18)
  EMAIL_DEFAULT_CC = 'email.default_cc',
  EMAIL_DEFAULT_BCC = 'email.default_bcc',
  EMAIL_ADMIN_ALERTS = 'email.admin_alerts',

  // Dropdown values (Story 7.19)
  DROPDOWN_NDA_TYPES = 'dropdown.nda_types',
  DROPDOWN_USMAX_POSITIONS = 'dropdown.usmax_positions',
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Record<string, string> = {
  [ConfigKey.DASHBOARD_STALE_CREATED_DAYS]: '7',
  [ConfigKey.DASHBOARD_STALE_EMAILED_DAYS]: '14',
  [ConfigKey.DASHBOARD_EXPIRATION_WARNING_DAYS]: '30',
  [ConfigKey.DASHBOARD_EXPIRATION_INFO_DAYS]: '60',
  [ConfigKey.NDA_DEFAULT_TERM_DAYS]: '365',
  [ConfigKey.EMAIL_DEFAULT_CC]: '',
  [ConfigKey.EMAIL_DEFAULT_BCC]: '',
  [ConfigKey.EMAIL_ADMIN_ALERTS]: '',
  [ConfigKey.DROPDOWN_NDA_TYPES]: JSON.stringify([
    { value: 'MUTUAL', label: 'Mutual NDA', isActive: true },
    { value: 'CONSULTANT', label: 'Consultant', isActive: true },
  ]),
  [ConfigKey.DROPDOWN_USMAX_POSITIONS]: JSON.stringify([
    { value: 'PRIME', label: 'Prime', isActive: true },
    { value: 'SUB_CONTRACTOR', label: 'Sub-contractor', isActive: true },
    { value: 'OTHER', label: 'Other', isActive: true },
  ]),
};

/**
 * System configuration service error
 */
export class ConfigServiceError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ConfigServiceError';
  }
}

/**
 * Get a configuration value
 */
export async function getConfig(key: string): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    return config?.value ?? DEFAULT_CONFIG[key] ?? '';
  } catch {
    // If table doesn't exist, return default
    return DEFAULT_CONFIG[key] ?? '';
  }
}

/**
 * Get multiple configuration values
 */
export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, string> = {};
    for (const key of keys) {
      const found = configs.find((c) => c.key === key);
      result[key] = found?.value ?? DEFAULT_CONFIG[key] ?? '';
    }
    return result;
  } catch {
    // If table doesn't exist, return defaults
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = DEFAULT_CONFIG[key] ?? '';
    }
    return result;
  }
}

/**
 * Get all configuration values
 */
export async function getAllConfigs(): Promise<Record<string, string>> {
  try {
    const configs = await prisma.systemConfig.findMany();

    // Start with defaults, override with stored values
    const result: Record<string, string> = { ...DEFAULT_CONFIG };
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  } catch {
    // If table doesn't exist, return defaults
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Set a configuration value
 */
export async function setConfig(
  key: string,
  value: string,
  userContext: UserContext
): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    await auditService.log({
      action: AuditAction.NDA_UPDATED, // Could add SYSTEM_CONFIG_CHANGED
      entityType: 'system_config',
      entityId: key,
      userId: userContext.contactId,
      details: { key, newValue: value },
    });
  } catch (error) {
    console.error('[SystemConfig] Error setting config:', error);
    throw new ConfigServiceError('Failed to save configuration', 'INTERNAL_ERROR');
  }
}

/**
 * Set multiple configuration values
 */
export async function setConfigs(
  configs: Record<string, string>,
  userContext: UserContext
): Promise<void> {
  try {
    const operations = Object.entries(configs).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    );

    await prisma.$transaction(operations);

    await auditService.log({
      action: AuditAction.NDA_UPDATED,
      entityType: 'system_config',
      userId: userContext.contactId,
      details: { keys: Object.keys(configs) },
    });
  } catch (error) {
    console.error('[SystemConfig] Error setting configs:', error);
    throw new ConfigServiceError('Failed to save configurations', 'INTERNAL_ERROR');
  }
}

// === Dashboard Thresholds (Story 7.17) ===

export interface DashboardThresholds {
  staleCreatedDays: number;
  staleEmailedDays: number;
  expirationWarningDays: number;
  expirationInfoDays: number;
}

export async function getDashboardThresholds(): Promise<DashboardThresholds> {
  const configs = await getConfigs([
    ConfigKey.DASHBOARD_STALE_CREATED_DAYS,
    ConfigKey.DASHBOARD_STALE_EMAILED_DAYS,
    ConfigKey.DASHBOARD_EXPIRATION_WARNING_DAYS,
    ConfigKey.DASHBOARD_EXPIRATION_INFO_DAYS,
  ]);

  return {
    staleCreatedDays: parseInt(configs[ConfigKey.DASHBOARD_STALE_CREATED_DAYS], 10),
    staleEmailedDays: parseInt(configs[ConfigKey.DASHBOARD_STALE_EMAILED_DAYS], 10),
    expirationWarningDays: parseInt(configs[ConfigKey.DASHBOARD_EXPIRATION_WARNING_DAYS], 10),
    expirationInfoDays: parseInt(configs[ConfigKey.DASHBOARD_EXPIRATION_INFO_DAYS], 10),
  };
}

export async function setDashboardThresholds(
  thresholds: Partial<DashboardThresholds>,
  userContext: UserContext
): Promise<void> {
  const configs: Record<string, string> = {};

  if (thresholds.staleCreatedDays !== undefined) {
    configs[ConfigKey.DASHBOARD_STALE_CREATED_DAYS] = String(thresholds.staleCreatedDays);
  }
  if (thresholds.staleEmailedDays !== undefined) {
    configs[ConfigKey.DASHBOARD_STALE_EMAILED_DAYS] = String(thresholds.staleEmailedDays);
  }
  if (thresholds.expirationWarningDays !== undefined) {
    configs[ConfigKey.DASHBOARD_EXPIRATION_WARNING_DAYS] = String(thresholds.expirationWarningDays);
  }
  if (thresholds.expirationInfoDays !== undefined) {
    configs[ConfigKey.DASHBOARD_EXPIRATION_INFO_DAYS] = String(thresholds.expirationInfoDays);
  }

  await setConfigs(configs, userContext);
}

// === Email Defaults (Story 7.18) ===

export interface EmailDefaults {
  defaultCc: string[];
  defaultBcc: string[];
}

function parseEmailList(value: string): string[] {
  return value ? value.split(',').map((e) => e.trim()).filter(Boolean) : [];
}

export async function getEmailDefaults(): Promise<EmailDefaults> {
  const configs = await getConfigs([
    ConfigKey.EMAIL_DEFAULT_CC,
    ConfigKey.EMAIL_DEFAULT_BCC,
  ]);

  return {
    defaultCc: parseEmailList(configs[ConfigKey.EMAIL_DEFAULT_CC]),
    defaultBcc: parseEmailList(configs[ConfigKey.EMAIL_DEFAULT_BCC]),
  };
}

export async function getEmailAdminAlerts(): Promise<string[]> {
  const value = await getConfig(ConfigKey.EMAIL_ADMIN_ALERTS);
  return parseEmailList(value);
}

export async function setEmailDefaults(
  defaults: Partial<EmailDefaults>,
  userContext: UserContext
): Promise<void> {
  const configs: Record<string, string> = {};

  if (defaults.defaultCc !== undefined) {
    configs[ConfigKey.EMAIL_DEFAULT_CC] = defaults.defaultCc.join(',');
  }
  if (defaults.defaultBcc !== undefined) {
    configs[ConfigKey.EMAIL_DEFAULT_BCC] = defaults.defaultBcc.join(',');
  }

  await setConfigs(configs, userContext);
}

// === Dropdown Values (Story 7.19) ===

export interface DropdownValue {
  value: string;
  label: string;
  isActive: boolean;
  sortOrder?: number;
}

export async function getDropdownValues(field: 'nda_types' | 'usmax_positions'): Promise<DropdownValue[]> {
  const key = field === 'nda_types' ? ConfigKey.DROPDOWN_NDA_TYPES : ConfigKey.DROPDOWN_USMAX_POSITIONS;
  const configValue = await getConfig(key);

  try {
    const values = JSON.parse(configValue) as DropdownValue[];
    // Sort by sortOrder if present, then by label
    return values.sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return a.label.localeCompare(b.label);
    });
  } catch {
    return [];
  }
}

export async function setDropdownValues(
  field: 'nda_types' | 'usmax_positions',
  values: DropdownValue[],
  userContext: UserContext
): Promise<void> {
  const key = field === 'nda_types' ? ConfigKey.DROPDOWN_NDA_TYPES : ConfigKey.DROPDOWN_USMAX_POSITIONS;

  // Add sort order if not present
  const valuesWithOrder = values.map((v, i) => ({
    ...v,
    sortOrder: v.sortOrder ?? i,
  }));

  await setConfig(key, JSON.stringify(valuesWithOrder), userContext);
}

export async function addDropdownValue(
  field: 'nda_types' | 'usmax_positions',
  value: Omit<DropdownValue, 'sortOrder'>,
  userContext: UserContext
): Promise<void> {
  const existingValues = await getDropdownValues(field);

  // Check for duplicate
  if (existingValues.some((v) => v.value === value.value)) {
    throw new ConfigServiceError('Value already exists', 'VALIDATION_ERROR');
  }

  const newValues = [
    ...existingValues,
    { ...value, sortOrder: existingValues.length },
  ];

  await setDropdownValues(field, newValues, userContext);
}

export async function updateDropdownValue(
  field: 'nda_types' | 'usmax_positions',
  valueCode: string,
  updates: Partial<Omit<DropdownValue, 'value'>>,
  userContext: UserContext
): Promise<void> {
  const existingValues = await getDropdownValues(field);

  const index = existingValues.findIndex((v) => v.value === valueCode);
  if (index === -1) {
    throw new ConfigServiceError('Value not found', 'NOT_FOUND');
  }

  existingValues[index] = {
    ...existingValues[index],
    ...updates,
  };

  await setDropdownValues(field, existingValues, userContext);
}

export async function reorderDropdownValues(
  field: 'nda_types' | 'usmax_positions',
  valueOrder: string[],
  userContext: UserContext
): Promise<void> {
  const existingValues = await getDropdownValues(field);

  const reorderedValues = valueOrder.map((code, index) => {
    const existing = existingValues.find((v) => v.value === code);
    if (!existing) {
      throw new ConfigServiceError(`Value ${code} not found`, 'NOT_FOUND');
    }
    return { ...existing, sortOrder: index };
  });

  // Add any values not in the order list at the end
  for (const existing of existingValues) {
    if (!valueOrder.includes(existing.value)) {
      reorderedValues.push({ ...existing, sortOrder: reorderedValues.length });
    }
  }

  await setDropdownValues(field, reorderedValues, userContext);
}
