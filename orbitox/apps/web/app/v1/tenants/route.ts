import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { provisioningSaga } from '@/lib/tenant-provisioning/provisioning-saga';
import { TenantProvisionRequest } from '@/lib/tenant-provisioning/types';

function normalizeOrgId(org: string): string {
  return org.replace(/^org_/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

export async function POST(req: NextRequest) {
  // 1. Authenticate customer API key
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
    console.error('[POST /v1/tenants] API key authorization failed:', err);
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

  const authorizedOrgId = normalizeOrgId(authRecord.project.organizationId);

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

  const requestedOrg = body.organisation || body.organization || body.organizationId;
  if (!requestedOrg) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Field "organisation" is required' },
      { status: 400 }
    );
  }

  const cleanRequestedOrg = normalizeOrgId(requestedOrg);

  // 3. Authorization check: Customer API key can create tenants within its own organisation only
  let orgMatches = authorizedOrgId === cleanRequestedOrg;
  if (!orgMatches) {
    const org = await platformRepository.getOrganization(authRecord.project.organizationId);
    if (org) {
      if (normalizeOrgId(org.slug) === cleanRequestedOrg || normalizeOrgId(org.id) === cleanRequestedOrg) {
        orgMatches = true;
      }
    }
  }

  if (!orgMatches) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        code: 'TENANT_SCOPE_VIOLATION',
        message: 'A customer API key cannot create a tenant in another organisation',
      },
      { status: 403 }
    );
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

  // 4. Start durable provisioning saga
  const input: TenantProvisionRequest = {
    organizationId: cleanRequestedOrg,
    name: body.name.trim(),
    slug: body.slug.trim().toLowerCase(),
    environment: body.environment || 'production',
    plugins: body.plugins,
    region: body.region || 'ap-south-1',
  };

  const operation = await provisioningSaga.startProvisioning(input, {
    idempotencyKey,
    operatorId,
    requestId,
  });

  // Return 202 Accepted
  return NextResponse.json(
    {
      tenantId: operation.tenantId,
      operationId: operation.id,
      status: operation.status,
    },
    {
      status: 202,
      headers: {
        Location: `/v1/operations/${operation.id}`,
      },
    }
  );
}
