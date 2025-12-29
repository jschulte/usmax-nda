/**
 * Phone Number Formatting Utilities
 * Auto-formats phone numbers to (XXX) XXX-XXXX format
 */

/**
 * Format a phone number string to (XXX) XXX-XXXX format
 * Handles partial input gracefully for real-time formatting as user types
 *
 * @param value - Raw phone number input (digits, spaces, dashes, etc.)
 * @returns Formatted phone number or partially formatted string
 *
 * @example
 * formatPhoneNumber('5551234567') // '(555) 123-4567'
 * formatPhoneNumber('555') // '(555) '
 * formatPhoneNumber('5551') // '(555) 1'
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Handle empty input
  if (digits.length === 0) {
    return '';
  }

  // Format progressively as user types
  if (digits.length <= 3) {
    // Just area code: (555
    return `(${digits}`;
  } else if (digits.length <= 6) {
    // Area code + prefix: (555) 123
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    // Full number: (555) 123-4567
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

/**
 * Validate if a phone number is complete and properly formatted
 *
 * @param phone - Phone number string
 * @returns true if matches (XXX) XXX-XXXX format
 */
export function isValidPhoneFormat(phone: string): boolean {
  const pattern = /^\(\d{3}\) \d{3}-\d{4}$/;
  return pattern.test(phone);
}

/**
 * Extract just the digits from a formatted phone number
 *
 * @param formatted - Formatted phone number string
 * @returns Just the 10 digits
 *
 * @example
 * stripPhoneFormatting('(555) 123-4567') // '5551234567'
 */
export function stripPhoneFormatting(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

/**
 * React onChange handler for phone input fields
 * Automatically formats as user types
 *
 * @param e - React change event
 * @param setValue - State setter function
 */
export function handlePhoneInput(
  e: React.ChangeEvent<HTMLInputElement>,
  setValue: (value: string) => void
): void {
  const formatted = formatPhoneNumber(e.target.value);
  setValue(formatted);
}
