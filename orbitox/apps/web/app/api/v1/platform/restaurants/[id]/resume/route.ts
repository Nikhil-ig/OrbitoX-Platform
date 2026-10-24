import { NextRequest, NextResponse } from 'next/server';

const RUNTIME_BASE_URL =
  process.env.RESTAURANTOS_RUNTIME_URL ||
  process.env.RESTAURANT_STORE_URL ||
  'http://127.0.0.1:4010';

const PLATFORM_TOKEN =
  process.env.RESTAURANTOS_PLATFORM_TOKEN ||
  'orbitox_platform_token_restaurant_os_master_key_2026_super_secret_v1';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targetUrl = new URL(`/internal/tenants/${encodeURIComponent(id)}/resume`, RUNTIME_BASE_URL);

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PLATFORM_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.message || data.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
