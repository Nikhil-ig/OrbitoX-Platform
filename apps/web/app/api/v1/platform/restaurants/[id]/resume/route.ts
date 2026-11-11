import { NextRequest, NextResponse } from 'next/server';
import { restaurantBridgeClient } from '@/lib/restaurant-bridge-client';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await restaurantBridgeClient.resumeTenant(id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.statusCode || 500 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
