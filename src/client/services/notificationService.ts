/**
 * Notification Service
 *
 * Handles notification preferences and NDA subscriptions
 */

import { get, put, post, del } from './api';

export interface NotificationPreferences {
  onNdaCreated: boolean;
  onNdaEmailed: boolean;
  onDocumentUploaded: boolean;
  onStatusChanged: boolean;
  onFullyExecuted: boolean;
}

export interface UpdateNotificationPreferencesData {
  onNdaCreated?: boolean;
  onNdaEmailed?: boolean;
  onDocumentUploaded?: boolean;
  onStatusChanged?: boolean;
  onFullyExecuted?: boolean;
}

export interface NdaSubscription {
  id: string;
  ndaId: string;
  nda: {
    displayId: string;
    companyName: string;
    status: string;
  };
  subscribedAt: string;
}

export interface Subscriber {
  id: string;
  contactId: string;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  subscribedAt?: string;
}

/**
 * Get current user's notification preferences
 */
export async function getPreferences(): Promise<{ preferences: NotificationPreferences }> {
  return get<{ preferences: NotificationPreferences }>('/api/me/notification-preferences');
}

/**
 * Update current user's notification preferences
 */
export async function updatePreferences(
  preferences: UpdateNotificationPreferencesData
): Promise<{ message: string; preferences: NotificationPreferences }> {
  return put<{ message: string; preferences: NotificationPreferences }>(
    '/api/me/notification-preferences',
    preferences
  );
}

/**
 * Get current user's NDA subscriptions
 */
export async function getUserSubscriptions(): Promise<{ subscriptions: NdaSubscription[] }> {
  return get<{ subscriptions: NdaSubscription[] }>('/api/me/subscriptions');
}

/**
 * Get NDA subscriptions for a specific NDA
 */
export async function getNDASubscriptions(ndaId: string): Promise<{ subscribers: Subscriber[] }> {
  return get<{ subscribers: Subscriber[] }>(`/api/ndas/${ndaId}/subscribers`);
}

/**
 * Subscribe to NDA notifications
 */
export async function subscribe(ndaId: string): Promise<{ message: string }> {
  return post<{ message: string }>(`/api/ndas/${ndaId}/subscribe`);
}

/**
 * Unsubscribe from NDA notifications
 */
export async function unsubscribe(ndaId: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/ndas/${ndaId}/subscribe`);
}
