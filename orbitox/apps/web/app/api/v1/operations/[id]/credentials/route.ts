import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { operationStore, oneTimeSecretStore } from '@/lib/tenant-provisioning/operation-store';

/**
 * Ephemeral Credential Retrieval Endpoint (Self-Guarded).
 *
 * Provides a short-lived (15-minute TTL) fallback to retrieve the provisioned
 * raw customer API key secret exactly once if the client dropped or failed to parse
 * the initial synchronous 202 Accepted response.
 *
 * NOTE: The in-memory one-time store is per-server instance (in-memory process state).
 * The primary delivery mechanism is the raw secret returned once in the 202 response.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  // 1. Authenticate customer API key (self-guarded)
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
        code: 'TENANT_SCOPE_VIOLATION',
        message: 'A customer API key cannot retrieve credentials for another organisation',
      },
      { status: 403 }
    );
  }

  // 4. Retrieve single-use secret
  const oneTime = oneTimeSecretStore.consumeOneTimeSecret(id);
  if (!oneTime) {
    return NextResponse.json(
      {
        error: 'CREDENTIALS_EXPIRED_OR_CONSUMED',
        code: 'SECRET_ALREADY_RETRIEVED_OR_EXPIRED',
        message: 'The API key secret for this operation has already been retrieved or expired. Secrets are never persisted in the database.',
      },
      { status: 410 }
    );
  }

  const operatorId = authRecord.key.keyId || authRecord.key.name || authRecord.key.id;
  try {
    await platformRepository.recordPlatformAdminAudit({
      action: 'TENANT_CREDENTIALS_CONSUMED',
      entityType: 'TENANT_CREDENTIALS',
      entityId: id,
      actorId: operatorId,
      organizationId: op.organizationId,
      requestId: req.headers.get('x-request-id') || `req_${Date.now()}`,
      metadata: { operationId: id, tenantId: op.tenantId, operatorId },
    });
  } catch {}

  return NextResponse.json({
    operationId: id,
    tenantId: op.tenantId,
    apiKey: {
      id: oneTime.id,
      prefix: oneTime.prefix,
      secret: oneTime.secret,
      expiresAt: oneTime.expiresAt,
    },
    retrievedAt: new Date().toISOString(),
    warning: 'Store this secret securely now. It cannot be retrieved again.',
  });
}
