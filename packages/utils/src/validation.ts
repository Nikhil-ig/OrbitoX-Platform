/**
 * Simple email validation regex (RFC 5322 approximation)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates if a string is a valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Slug validation regex (alphanumeric and hyphens only, no consecutive hyphens, starts/ends with alphanumeric)
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates if a string is a valid URL-friendly slug
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 63) return false;
  return SLUG_REGEX.test(slug);
}

/**
 * Generates a URL-friendly slug from an arbitrary string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose unicode characters (e.g., é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
}
