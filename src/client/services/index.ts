/**
 * Service Layer Index
 *
 * Central export for all API services
 */

// Base API client
export { api, ApiError } from './api';

// NDA Service
export * from './ndaService';

// Agency Service
export * from './agencyService';

// User Service
export * from './userService';

// Dashboard Service
export * from './dashboardService';

// Template Service
export * from './templateService';

// Audit Service
export * from './auditService';

// Admin Service
export * from './adminService';

// Notification Service
export * from './notificationService';
