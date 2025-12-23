/**
 * Internal Notes Service
 * Story 9.1: Fix Internal Notes Display
 *
 * Provides API calls for managing internal notes on NDAs
 */

import { get, post, put, del } from './api';

export interface InternalNote {
  id: string;
  ndaId: string;
  userId: string;
  noteText: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

/**
 * Get all internal notes for an NDA (user's own notes only)
 */
export async function getNotes(ndaId: string): Promise<{ notes: InternalNote[] }> {
  return get<{ notes: InternalNote[] }>(`/api/ndas/${ndaId}/notes`);
}

/**
 * Create a new internal note
 */
export async function createNote(
  ndaId: string,
  noteText: string
): Promise<{ note: InternalNote }> {
  return post<{ note: InternalNote }>(`/api/ndas/${ndaId}/notes`, { noteText });
}

/**
 * Update an existing internal note
 */
export async function updateNote(
  ndaId: string,
  noteId: string,
  noteText: string
): Promise<{ note: InternalNote }> {
  return put<{ note: InternalNote }>(`/api/ndas/${ndaId}/notes/${noteId}`, { noteText });
}

/**
 * Delete an internal note
 */
export async function deleteNote(
  ndaId: string,
  noteId: string
): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/ndas/${ndaId}/notes/${noteId}`);
}
