/**
 * POC Service
 * Story 3.14: POC Management & Validation
 *
 * Service for managing Points of Contact:
 * - Internal user lookup (Opportunity POC)
 * - External contact management (Relationship POC, Contracts POC)
 * - Copy POC functionality
 */

import { prisma } from '../db/index.js';
import type { Contact } from '../../generated/prisma/index.js';
import { validateEmail, validatePhone, normalizePhone } from '../validators/pocValidator.js';

/**
 * Service error class
 */
export class PocServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PocServiceError';
  }
}

/**
 * Internal user result type
 */
export interface InternalUserResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailSignature: string | null;
  jobTitle: string | null;
  displayName: string;
}

/**
 * External contact input type
 */
export interface ExternalContactInput {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  fax?: string;
  jobTitle?: string;
}

/**
 * Search internal users for Opportunity POC
 * AC1: Dropdown shows internal USmax users only (where isInternal=true)
 * Auto-complete works (type 3 letters → matches)
 *
 * @param search - Search query (min 3 characters)
 * @returns List of matching internal users
 */
export async function searchInternalUsers(search: string): Promise<InternalUserResult[]> {
  if (!search || search.length < 3) {
    return [];
  }

  const searchLower = search.toLowerCase();

  const contacts = await prisma.contact.findMany({
    where: {
      isInternal: true,
      active: true,
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailSignature: true,
      jobTitle: true,
    },
    take: 10,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return contacts.map((c) => ({
    ...c,
    displayName: formatDisplayName(c.firstName, c.lastName, c.email),
  }));
}

/**
 * Get an internal user by ID with email signature
 * Used when selecting Opportunity POC to include signature in email template
 *
 * @param id - Contact ID
 * @returns Internal user details or null
 */
export async function getInternalUser(id: string): Promise<InternalUserResult | null> {
  const contact = await prisma.contact.findUnique({
    where: {
      id,
      isInternal: true,
      active: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailSignature: true,
      jobTitle: true,
    },
  });

  if (!contact) {
    return null;
  }

  return {
    ...contact,
    displayName: formatDisplayName(contact.firstName, contact.lastName, contact.email),
  };
}

/**
 * List all active internal users
 * Used for dropdown population
 */
export async function listInternalUsers(): Promise<InternalUserResult[]> {
  const contacts = await prisma.contact.findMany({
    where: {
      isInternal: true,
      active: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailSignature: true,
      jobTitle: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return contacts.map((c) => ({
    ...c,
    displayName: formatDisplayName(c.firstName, c.lastName, c.email),
  }));
}

/**
 * Find or create an external contact (Relationship POC or Contracts POC)
 * AC2: Validates email and phone formats
 *
 * @param input - Contact details
 * @returns Contact record
 */
export async function findOrCreateExternalContact(
  input: ExternalContactInput
): Promise<Contact> {
  // Validate email format
  const emailError = validateEmail(input.email);
  if (emailError) {
    throw new PocServiceError(emailError.message, 'INVALID_EMAIL');
  }

  // Validate phone format if provided
  if (input.phone) {
    const phoneError = validatePhone(input.phone);
    if (phoneError) {
      throw new PocServiceError(phoneError.message, 'INVALID_PHONE');
    }
  }

  // Normalize phone numbers
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedFax = normalizePhone(input.fax);

  // Try to find existing contact by email
  const existing = await prisma.contact.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (existing) {
    // Update with any new information
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName ?? existing.firstName,
        lastName: input.lastName ?? existing.lastName,
        workPhone: normalizedPhone ?? existing.workPhone,
        fax: normalizedFax ?? existing.fax,
        jobTitle: input.jobTitle ?? existing.jobTitle,
        // Don't change isInternal - external contacts stay external
      },
    });
  }

  // Create new external contact
  return prisma.contact.create({
    data: {
      email: input.email.toLowerCase().trim(),
      firstName: input.firstName,
      lastName: input.lastName,
      workPhone: normalizedPhone,
      fax: normalizedFax,
      jobTitle: input.jobTitle,
      isInternal: false, // External contact
      active: true,
    },
  });
}

/**
 * Get contact details by ID
 * Includes all POC-relevant fields
 */
export async function getContactDetails(
  id: string
): Promise<{
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  fax: string | null;
  jobTitle: string | null;
  isInternal: boolean;
  emailSignature: string | null;
} | null> {
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      workPhone: true,
      fax: true,
      jobTitle: true,
      isInternal: true,
      emailSignature: true,
    },
  });

  if (!contact) {
    return null;
  }

  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.workPhone,
    fax: contact.fax,
    jobTitle: contact.jobTitle,
    isInternal: contact.isInternal,
    emailSignature: contact.emailSignature,
  };
}

/**
 * Copy contact details for POC copy functionality
 * AC3: Copy all Contracts POC fields to Relationship POC fields
 *
 * @param sourceContactId - ID of the source contact
 * @returns Contact details suitable for copying
 */
export async function copyContactDetails(sourceContactId: string): Promise<{
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  fax: string | null;
  jobTitle: string | null;
} | null> {
  const contact = await prisma.contact.findUnique({
    where: { id: sourceContactId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      workPhone: true,
      fax: true,
      jobTitle: true,
    },
  });

  if (!contact) {
    return null;
  }

  return {
    name: formatDisplayName(contact.firstName, contact.lastName, contact.email),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.workPhone,
    fax: contact.fax,
    jobTitle: contact.jobTitle,
  };
}

/**
 * Validate that a contact ID refers to an internal user
 * Used to validate Opportunity POC selection
 */
export async function validateInternalUser(contactId: string): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { isInternal: true, active: true },
  });

  return contact?.isInternal === true && contact?.active === true;
}

/**
 * Update internal user's email signature
 */
export async function updateEmailSignature(
  contactId: string,
  signature: string
): Promise<void> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { isInternal: true },
  });

  if (!contact?.isInternal) {
    throw new PocServiceError('Only internal users can have email signatures', 'NOT_INTERNAL');
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: { emailSignature: signature },
  });
}

/**
 * Helper: Format display name from contact fields
 */
function formatDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return email;
}

/**
 * Search external contacts for autocomplete
 * Used for Relationship POC and Contracts POC
 */
export async function searchExternalContacts(search: string): Promise<{
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
}[]> {
  if (!search || search.length < 3) {
    return [];
  }

  const contacts = await prisma.contact.findMany({
    where: {
      isInternal: false,
      active: true,
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      workPhone: true,
    },
    take: 10,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return contacts.map((c) => ({
    id: c.id,
    displayName: formatDisplayName(c.firstName, c.lastName, c.email),
    email: c.email,
    phone: c.workPhone,
  }));
}
