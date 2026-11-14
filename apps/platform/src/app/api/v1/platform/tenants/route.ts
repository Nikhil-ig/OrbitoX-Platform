import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { listTenants } from '@/server/tenants/tenants-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth(async (request: NextRequest, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const plugin = searchParams.get('plugin') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await listTenants({ search, status, plugin, page, limit }, session);
    return NextResponse.json({ success: true, data: result }, { headers: noStore });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list tenants' } },
      { status: 500, headers: noStore }
    );
  }
});
