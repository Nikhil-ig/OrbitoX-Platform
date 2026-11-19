export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'billing',
  'cdn',
  'console',
  'dashboard',
  'dev',
  'dine',
  'health',
  'help',
  'internal',
  'login',
  'mail',
  'orbitox',
  'order',
  'platform',
  'portal',
  'root',
  'signup',
  'smtp',
  'staging',
  'static',
  'status',
  'store',
  'support',
  'test',
  'webhook',
  'www',
]);

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function normalizeSubdomainSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function generateSubdomainSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function validateSlugSyntax(slug: string): { valid: boolean; reason?: string } {
  if (!slug || slug.length < 3) {
    return { valid: false, reason: 'Subdomain must be at least 3 characters long.' };
  }
  if (slug.length > 32) {
    return { valid: false, reason: 'Subdomain cannot exceed 32 characters.' };
  }
  if (slug.includes('--')) {
    return { valid: false, reason: 'Subdomain cannot contain consecutive hyphens.' };
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      reason: 'Subdomain must contain only lowercase letters, numbers, and hyphens (no trailing or leading hyphens).',
    };
  }
  if (RESERVED_SUBDOMAINS.has(slug)) {
    return {
      valid: false,
      reason: `"${slug}" is a reserved system keyword and cannot be used as a custom subdomain.`,
    };
  }
  return { valid: true };
}
