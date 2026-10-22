import { NextResponse } from 'next/server';

export interface WishRecord {
  id: string;
  experienceId: string;
  tenantId?: string;
  guestName: string;
  message: string;
  date: string;
  reactions: Record<string, number>;
  createdAt: string;
}

// In-memory store for wishes across API calls & live boards
const WISHES_CACHE: WishRecord[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guestName, message, experienceId, tenantId } = body;

    if (!guestName || !guestName.trim() || !message || !message.trim()) {
      return NextResponse.json({ error: 'Name and message are required' }, { status: 400 });
    }

    const recordedWish: WishRecord = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experienceId: experienceId || 'default',
      tenantId: tenantId || 'tenant_default',
      guestName: guestName.trim(),
      message: message.trim(),
      date: 'Just now',
      reactions: { heart: 1 },
      createdAt: new Date().toISOString(),
    };

    WISHES_CACHE.unshift(recordedWish);

    return NextResponse.json({ success: true, wish: recordedWish });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit wish' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const experienceId = searchParams.get('experienceId');

  const wishes = experienceId
    ? WISHES_CACHE.filter((w) => w.experienceId === experienceId)
    : WISHES_CACHE;

  return NextResponse.json({ success: true, wishes });
}
