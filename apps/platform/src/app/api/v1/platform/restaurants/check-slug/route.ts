import { NextRequest, NextResponse } from 'next/server';

const RESERVED_WORDS = new Set([
  'www', 'admin', 'api', 'platform', 'app', 'static', 'assets', 'cdn',
  'mail', 'smtp', 'auth', 'login', 'signup', 'dashboard', 'control',
  'orbitox', 'root', 'support', 'help', 'status', 'health', 'internal'
]);

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawSlug = url.searchParams.get('slug') || '';
  const slug = rawSlug.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ available: false, error: 'Slug cannot be empty.' });
  }

  if (slug.length < 3 || slug.length > 32) {
    return NextResponse.json({ available: false, error: 'Slug must be between 3 and 32 characters.' });
  }

  if (!SLUG_REGEX.test(slug) || slug.startsWith('-') || slug.endsWith('-')) {
    return NextResponse.json({
      available: false,
      error: 'Slug must contain only lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen.'
    });
  }

  if (RESERVED_WORDS.has(slug)) {
    return NextResponse.json({
      available: false,
      error: `"${slug}" is a reserved system keyword and cannot be used as a restaurant subdomain.`
    });
  }

  // Check against RestaurantOS runtime if available
  const RUNTIME_BASE_URL =
    process.env.RESTAURANTOS_RUNTIME_URL ||
    process.env.RESTAURANT_STORE_URL ||
    'http://127.0.0.1:4010';
  const PLATFORM_TOKEN =
    process.env.RESTAURANTOS_PLATFORM_TOKEN ||
    'orbitox_platform_token_restaurant_os_master_key_2026_super_secret_v1';

  try {
    const checkUrl = new URL(`/internal/tenants/${encodeURIComponent(slug)}`, RUNTIME_BASE_URL);
    const res = await fetch(checkUrl.toString(), {
      headers: { Authorization: `Bearer ${PLATFORM_TOKEN}` },
      cache: 'no-store',
    });

    if (res.status === 200) {
      return NextResponse.json({ available: false, slug, error: `Subdomain "${slug}" is already taken.` });
    }
  } catch (e) {
    // Runtime unreachable, proceed with syntactic availability
  }

  return NextResponse.json({ available: true, slug });
}
