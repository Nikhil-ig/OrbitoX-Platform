import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { operationStore, oneTimeSecretStore } from '@/lib/tenant-provisioning/operation-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Authenticate API key
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

  if (!rawKey) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'API key required via Authorization or x-api-key header' },
      { status: 401 }
    );
  }

  let authRecord;
  try {
    authRecord = await platformRepository.authorizeApiKey(rawKey);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid or revoked API key' },
      { status: 401 }
    );
  }

  if (!authRecord || !authRecord.key || !authRecord.project) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  // 2. Fetch operation
  const op = await operationStore.getOperation(id);
  if (!op) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: `Operation ${id} not found` },
      { status: 404 }
    );
  }

  // 3. Organization boundary check
  const isPlatformAdmin =
    (authRecord.key.keyType as string) === 'PLATFORM_ROOT' ||
    (authRecord.key.keyType as string) === 'SYSTEM' ||
    authRecord.key.capabilities?.includes('platform:admin') ||
    authRecord.key.capabilities?.includes('*');

  const authOrg = await platformRepository.getOrganization(authRecord.project.organizationId);
  const authorizedOrgId = authOrg ? authOrg.id : authRecord.project.organizationId;

  if (!isPlatformAdmin && authorizedOrgId !== op.organizationId) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        message: 'You are not authorized to view credentials for this operation',
      },
      { status: 403 }
    );
  }

  // 4. Consume one-time ephemeral secret (single-use, 15-min TTL)
  const creds = oneTimeSecretStore.consumeOneTimeSecret(id);
  if (!creds) {
    return NextResponse.json(
      {
        error: 'CREDENTIALS_EXPIRED_OR_CONSUMED',
        message: 'Credentials have already been retrieved or have expired (15-minute TTL).',
      },
      { status: 410 }
    );
  }

  return NextResponse.json({
    operationId: id,
    tenantId: op.tenantId,
    apiKey: {
      id: creds.id,
      prefix: creds.prefix,
      secret: creds.secret,
      expiresAt: creds.expiresAt,
    },
  });
}
