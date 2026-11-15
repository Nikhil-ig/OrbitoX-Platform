import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';

import {
  RESERVED_SUBDOMAINS,
  SLUG_REGEX,
  normalizeSubdomainSlug,
  generateSubdomainSlugFromName,
  validateSlugSyntax,
} from '@/lib/slug-utils';

export {
  RESERVED_SUBDOMAINS,
  SLUG_REGEX,
  normalizeSubdomainSlug,
  generateSubdomainSlugFromName,
  validateSlugSyntax,
};

async function isSlugAvailableAuthoritative(slug: string): Promise<{ available: boolean; error?: string }> {
  // Check 1: Platform database PlatformProject
  const existingProject = await prisma.platformProject.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existingProject) {
    return { available: false };
  }

  // Check 2: RestaurantOS runtime internal check if configured/reachable
  const runtimeUrl =
    process.env.RESTAURANTOS_RUNTIME_URL ||
    process.env.RESTAURANT_STORE_URL ||
    'http://127.0.0.1:4010';
  const platformToken =
    process.env.RESTAURANTOS_PLATFORM_TOKEN ||
    process.env.ORBITOX_RUNTIME_TOKEN;

  if (!platformToken) {
    return { available: false, error: 'SERVICE_UNAVAILABLE' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const checkUrl = new URL(`/internal/tenants/${encodeURIComponent(slug)}`, runtimeUrl);
    const res = await fetch(checkUrl.toString(), {
      headers: { Authorization: `Bearer ${platformToken}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 200) {
      return { available: false };
    }
    if (res.status === 404) {
      return { available: true };
    }
    // Fail-closed on 5xx or unexpected status
    return { available: false, error: 'SERVICE_UNAVAILABLE' };
  } catch {
    // Fail-closed: If runtime is unreachable, availability cannot be authoritatively guaranteed
    return { available: false, error: 'SERVICE_UNAVAILABLE' };
  }
}

async function generateSuggestions(baseSlug: string): Promise<string[]> {
  const suffixes = ['dining', 'cafe', 'bistro', 'blr', 'in', 'live', 'hq'];
  const suggestions: string[] = [];
  for (const suffix of suffixes) {
    const candidate = `${baseSlug}-${suffix}`;
    if (candidate.length <= 32 && validateSlugSyntax(candidate).valid) {
      const res = await isSlugAvailableAuthoritative(candidate);
      if (res.available) {
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

    const status = await isSlugAvailableAuthoritative(normalized);
    if (status.error === 'SERVICE_UNAVAILABLE') {
      return NextResponse.json(
        {
          ok: false,
          available: false,
          error: 'SERVICE_UNAVAILABLE',
          reason: 'Unable to authoritatively verify subdomain availability with restaurant runtime. Please retry.',
        },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    if (!status.available) {
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
