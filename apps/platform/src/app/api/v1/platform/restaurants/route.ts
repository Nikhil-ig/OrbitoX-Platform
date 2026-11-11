import { NextRequest, NextResponse } from 'next/server';

const RUNTIME_BASE_URL =
  process.env.RESTAURANTOS_RUNTIME_URL ||
  process.env.RESTAURANT_STORE_URL ||
  'http://127.0.0.1:4010';

const PLATFORM_TOKEN =
  process.env.RESTAURANTOS_PLATFORM_TOKEN ||
  'orbitox_platform_token_restaurant_os_master_key_2026_super_secret_v1';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = new URL('/internal/tenants', RUNTIME_BASE_URL);
  url.searchParams.forEach((val, key) => targetUrl.searchParams.set(key, val));

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PLATFORM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errJson.message || `Runtime returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to connect to RestaurantOS runtime: ${err.message}`,
        items: [],
        total: 0,
        offline: true,
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.restaurantName || !body.slug || !body.ownerName || !body.ownerEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: restaurantName, slug, ownerName, ownerEmail' },
        { status: 400 }
      );
    }

    const targetUrl = new URL('/internal/tenants', RUNTIME_BASE_URL);
    const res = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PLATFORM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.message || data.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, tenant: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Provisioning error: ${err.message}` },
      { status: 500 }
    );
  }
}
