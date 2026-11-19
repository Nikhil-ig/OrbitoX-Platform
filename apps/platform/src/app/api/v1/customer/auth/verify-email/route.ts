import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerEmail } from '@/server/accounts/account-service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.token !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid or expired verification link.' }, { status: 400, headers: noStore });
  }
  const verified = await verifyCustomerEmail(body.token);
  return NextResponse.json(
    verified ? { ok: true } : { ok: false, error: 'Invalid or expired verification link.' },
    { status: verified ? 200 : 400, headers: noStore },
  );
}

const noStore = { 'Cache-Control': 'no-store' };
