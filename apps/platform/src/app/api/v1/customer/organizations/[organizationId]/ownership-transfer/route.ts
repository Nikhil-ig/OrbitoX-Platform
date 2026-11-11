import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { transferCustomerOwnership } from '@/server/accounts/account-service';
import { platformRepository } from '@/server/db/platform-repository';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.newOwnerUserId !== 'string' || !body.newOwnerUserId) {
    return NextResponse.json({ ok: false, error: 'newOwnerUserId is required.' }, { status: 422, headers: noStore });
  }
  try {
    await transferCustomerOwnership({
      organizationId,
      currentOwnerId: session.userId,
      newOwnerId: body.newOwnerUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const expected = [
      'Choose a different organization member.',
      'Only the current organization owner can transfer ownership.',
      'The new owner must already be an organization member.',
    ].includes(message);
    if (!expected) throw error;
    return NextResponse.json({ ok: false, error: message }, { status: 403, headers: noStore });
  }
  await platformRepository.recordPlatformAdminAudit({
    action: 'customer.organization.ownership_transferred',
    entityType: 'PlatformOrganization',
    entityId: organizationId,
    organizationId,
    actorId: session.userId,
    actorEmail: session.email,
    ipAddress: resolveClientIp(request.headers),
    metadata: { newOwnerUserId: body.newOwnerUserId },
  });
  return NextResponse.json({ ok: true }, { headers: noStore });
}, { write: true, reauth: true });

const noStore = { 'Cache-Control': 'no-store' };
