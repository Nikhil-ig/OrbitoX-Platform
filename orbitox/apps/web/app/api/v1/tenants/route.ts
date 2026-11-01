import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { provisioningSaga } from '@/lib/tenant-provisioning/provisioning-saga';
import { TenantProvisionRequest } from '@/lib/tenant-provisioning/types';

export async function POST(req: NextRequest) {
  // 1. Authenticate customer API key (self-guarded)
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

  if (!rawKey) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Customer API key required via Authorization or x-api-key header' },
      { status: 401 }
    );
  }

  let authRecord;
  try {
    authRecord = await platformRepository.authorizeApiKey(rawKey);
  } catch (err: any) {
    console.error('[POST /api/v1/tenants] API key authorization failed:', err);
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid or revoked customer API key' },
      { status: 401 }
    );
  }

  if (!authRecord || !authRecord.key || !authRecord.project) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid customer API key' },
      { status: 401 }
    );
  }

  const authOrg = await platformRepository.getOrganization(authRecord.project.organizationId);
  if (!authOrg) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Organization bound to API key does not exist' },
      { status: 401 }
    );
  }

  // 2. Parse and validate payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const requestedOrg = (body.organisation || body.organization || body.organizationId || '').trim();
  let targetOrgId = authOrg.id;

  // 3. Authorization check: Customer API key can create tenants within its own organisation only
  if (requestedOrg) {
    const orgMatches = requestedOrg === authOrg.id || requestedOrg === authOrg.slug;
    if (!orgMatches) {
      const isPlatformAdmin =
        (authRecord.key.keyType as string) === 'PLATFORM_ROOT' ||
        (authRecord.key.keyType as string) === 'SYSTEM' ||
        authRecord.key.capabilities?.includes('platform:admin') ||
        authRecord.key.capabilities?.includes('*');

      if (isPlatformAdmin) {
        const found = await platformRepository.getOrganization(requestedOrg);
        if (!found) {
          return NextResponse.json(
            { error: 'NOT_FOUND', message: `Organization "${requestedOrg}" not found` },
            { status: 404 }
          );
        }
        targetOrgId = found.id;
      } else {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            code: 'TENANT_SCOPE_VIOLATION',
            message: 'A customer API key cannot create a tenant in another organisation',
          },
          { status: 403 }
        );
      }
    }
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Field "name" is required' },
      { status: 400 }
    );
  }

  if (!body.slug || typeof body.slug !== 'string' || body.slug.trim().length < 2) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Field "slug" must be at least 2 characters' },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.plugins) || body.plugins.length === 0) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Field "plugins" must be a non-empty array' },
      { status: 400 }
    );
  }

  const idempotencyKey =
    req.headers.get('idempotency-key') ||
    req.headers.get('x-idempotency-key') ||
    undefined;

  const requestId =
    req.headers.get('x-request-id') ||
    req.headers.get('request-id') ||
    `req_${Date.now()}`;

  const operatorId = authRecord.key.keyId || authRecord.key.name || authRecord.key.id;

  // 4. Start durable provisioning saga with exact stored organization ID
  const input: TenantProvisionRequest = {
    organizationId: targetOrgId,
    name: body.name.trim(),
    slug: body.slug.trim().toLowerCase(),
    environment: (body.environment || 'production').trim().toLowerCase(),
    plugins: body.plugins,
    region: body.region || 'ap-south-1',
  };

  let operation;
  try {
    operation = await provisioningSaga.startProvisioning(input, {
      idempotencyKey,
      operatorId,
      requestId,
    });
  } catch (err: any) {
    console.error('[POST /api/v1/tenants error]:', err?.message || err);
    return NextResponse.json(
      {
        error: 'PROVISIONING_FAILED',
        message: err?.message || 'Provisioning workflow encountered a fatal step error',
      },
      { status: 500 }
    );
  }

  if (operation.status === 'FAILED') {
    return NextResponse.json(
      {
        error: 'PROVISIONING_FAILED',
        operationId: operation.id,
        status: 'FAILED',
        message: operation.error || 'Provisioning failed',
      },
      { status: 500 }
    );
  }

  try {
    await platformRepository.recordPlatformAdminAudit({
      action: 'TENANT_PROVISION_REQUESTED',
      entityType: 'TENANT',
      entityId: operation.tenantId,
      actorId: operatorId,
      organizationId: targetOrgId,
      requestId,
      metadata: {
        operationId: operation.id,
        tenantId: operation.tenantId,
        slug: body.slug,
        plugins: body.plugins,
        operatorId,
      },
    });
  } catch {}

  // Return 202 Accepted with single-return raw API key
  return NextResponse.json(
    {
      tenantId: operation.tenantId,
      operationId: operation.id,
      status: operation.status,
      apiKey: operation.rawApiKey ? {
        id: operation.rawApiKey.id,
        prefix: operation.rawApiKey.prefix,
        secret: operation.rawApiKey.secret,
      } : undefined,
    },
    {
      status: 202,
      headers: {
        Location: `/api/v1/operations/${operation.id}`,
      },
    }
  );
}
