import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';

export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'account',
  'accounts',
  'billing',
  'cdn',
  'console',
  'control',
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

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function normalizeSubdomainSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function generateSubdomainSlugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

export function validateSlugSyntax(slug: string): { valid: boolean; reason?: string } {
  if (!slug) {
    return { valid: false, reason: 'Subdomain slug cannot be empty.' };
  }
  if (slug.length < 3) {
    return { valid: false, reason: 'Subdomain must be at least 3 characters.' };
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
      reason: 'Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).',
    };
  }
  if (RESERVED_SUBDOMAINS.has(slug)) {
    return {
      valid: false,
      reason: `"${slug}" is a reserved system keyword and cannot be used as a restaurant subdomain.`,
    };
  }
  return { valid: true };
}

async function isSlugAvailableAuthoritative(slug: string): Promise<boolean> {
  // Check 1: Platform database PlatformProject
  const existingProject = await prisma.platformProject.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existingProject) {
    return false;
  }

  // Check 2: RestaurantOS runtime internal check if configured/reachable
  const runtimeUrl =
    process.env.RESTAURANTOS_RUNTIME_URL ||
    process.env.RESTAURANT_STORE_URL ||
    'http://127.0.0.1:4010';
  const platformToken =
    process.env.RESTAURANTOS_PLATFORM_TOKEN ||
    'orbitox_platform_token_restaurant_os_master_key_2026_super_secret_v1';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const checkUrl = new URL(`/internal/tenants/${encodeURIComponent(slug)}`, runtimeUrl);
    const res = await fetch(checkUrl.toString(), {
      headers: { Authorization: `Bearer ${platformToken}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 200) {
      return false;
    }
  } catch {
    // If runtime is not online, platform DB serves as source of truth
  }

  return true;
}

async function generateSuggestions(baseSlug: string): Promise<string[]> {
  const suffixes = ['dining', 'cafe', 'bistro', 'blr', 'in', 'live', 'hq'];
  const suggestions: string[] = [];
  for (const suffix of suffixes) {
    const candidate = `${baseSlug}-${suffix}`;
    if (candidate.length <= 32 && validateSlugSyntax(candidate).valid) {
      const available = await isSlugAvailableAuthoritative(candidate);
      if (available) {
        suggestions.push(candidate);
        if (suggestions.length >= 3) break;
      }
    }
  }
  return suggestions;
}

export const GET = withCustomerAuth(
  async (request: NextRequest, session) => {
    if (!session.emailVerified) {
      return NextResponse.json(
        { ok: false, error: 'VERIFIED_EMAIL_REQUIRED' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('slug') || '';
    const normalized = normalizeSubdomainSlug(raw);

    const syntaxCheck = validateSlugSyntax(normalized);
    if (!syntaxCheck.valid) {
      return NextResponse.json(
        {
          ok: true,
          available: false,
          slug: normalized,
          reason: syntaxCheck.reason,
        },
        { status: 200, headers: noStoreHeaders() },
      );
    }

    const available = await isSlugAvailableAuthoritative(normalized);
    if (!available) {
      const suggestions = await generateSuggestions(normalized);
      return NextResponse.json(
        {
          ok: true,
          available: false,
          slug: normalized,
          reason: `Subdomain "${normalized}.orbitox.io" is already taken.`,
          suggestions,
        },
        { status: 200, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        available: true,
        slug: normalized,
        url: `${normalized}.orbitox.io`,
      },
      { status: 200, headers: noStoreHeaders() },
    );
  },
  { write: false, allowMfaSetup: true },
);
