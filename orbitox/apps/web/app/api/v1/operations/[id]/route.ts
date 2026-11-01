import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { operationStore } from '@/lib/tenant-provisioning/operation-store';
import { provisioningSaga } from '@/lib/tenant-provisioning/provisioning-saga';
import { PlatformOperationRecord } from '@/lib/tenant-provisioning/types';

function sanitizeOperation(op: PlatformOperationRecord) {
  let sanitizedResult: any = null;
  if (op.result) {
    sanitizedResult = { ...op.result };
    if (sanitizedResult.apiKey) {
      sanitizedResult.apiKey = {
        masked: sanitizedResult.apiKey.masked || 'orb_live_••••••••',
      };
    }
  }

  let sanitizedRequest: any = null;
  if (op.request) {
    sanitizedRequest = { ...op.request };
    // Strip any raw secrets that might have been passed in config
    if (sanitizedRequest.config && typeof sanitizedRequest.config === 'object') {
      const scrubbedConfig: Record<string, any> = {};
      for (const [k, v] of Object.entries(sanitizedRequest.config)) {
        if (/secret|token|password|key/i.test(k)) {
          scrubbedConfig[k] = '••••••••';
        } else {
          scrubbedConfig[k] = v;
        }
      }
      sanitizedRequest.config = scrubbedConfig;
    }
  }

  return {
    id: op.id,
    operationId: op.id,
    type: op.type,
    tenantId: op.tenantId,
    organizationId: op.organizationId,
    idempotencyKey: op.idempotencyKey,
    status: op.status,
    steps: op.steps.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      durationMs: s.durationMs,
      error: s.error,
      retryCount: s.retryCount,
    })),
    request: sanitizedRequest,
    result: sanitizedResult,
    error: op.error,
    operatorId: op.operatorId,
    requestId: op.requestId,
    createdAt: op.createdAt,
    updatedAt: op.updatedAt,
    completedAt: op.completedAt,
  };
}

type AuthResult =
  | { ok: true; authRecord: any }
  | { ok: false; status: number; error: string; message: string };

async function authenticateCustomerRequest(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

  if (!rawKey) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED', message: 'Customer API key required via Authorization or x-api-key header' };
  }

  let authRecord;
  try {
    authRecord = await platformRepository.authorizeApiKey(rawKey);
  } catch (err: any) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED', message: 'Invalid or revoked customer API key' };
  }

  if (!authRecord || !authRecord.key || !authRecord.project) {
    return { ok: false, status: 401, error: 'UNAUTHORIZED', message: 'Invalid customer API key' };
  }

  return { ok: true, authRecord };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  // 1. Authenticate customer API key (self-guarded)
  const auth = await authenticateCustomerRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, message: auth.message }, { status: auth.status });
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
    (auth.authRecord.key.keyType as string) === 'PLATFORM_ROOT' ||
    (auth.authRecord.key.keyType as string) === 'SYSTEM' ||
    auth.authRecord.key.capabilities?.includes('platform:admin') ||
    auth.authRecord.key.capabilities?.includes('*');

  const authOrg = await platformRepository.getOrganization(auth.authRecord.project.organizationId);
  const callerOrgId = authOrg ? authOrg.id : auth.authRecord.project.organizationId;

  if (!isPlatformAdmin && op.organizationId && op.organizationId !== callerOrgId) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        code: 'TENANT_SCOPE_VIOLATION',
        message: 'A customer API key cannot access operations in another organisation',
      },
      { status: 403 }
    );
  }

  return NextResponse.json(sanitizeOperation(op));
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  // 1. Authenticate customer API key (self-guarded)
  const auth = await authenticateCustomerRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, message: auth.message }, { status: auth.status });
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
    (auth.authRecord.key.keyType as string) === 'PLATFORM_ROOT' ||
    (auth.authRecord.key.keyType as string) === 'SYSTEM' ||
    auth.authRecord.key.capabilities?.includes('platform:admin') ||
    auth.authRecord.key.capabilities?.includes('*');

  const authOrg = await platformRepository.getOrganization(auth.authRecord.project.organizationId);
  const callerOrgId = authOrg ? authOrg.id : auth.authRecord.project.organizationId;

  if (!isPlatformAdmin && op.organizationId && op.organizationId !== callerOrgId) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        code: 'TENANT_SCOPE_VIOLATION',
        message: 'A customer API key cannot mutate operations in another organisation',
      },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  let action = url.searchParams.get('action');

  try {
    const body = await req.json();
    if (body.action) action = body.action;
  } catch {}

  const operatorId = auth.authRecord.key.keyId || auth.authRecord.key.name || auth.authRecord.key.id;

  if (action === 'retry') {
    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'TENANT_OPERATION_RETRIED',
        entityType: 'TENANT_OPERATION',
        entityId: id,
        actorId: operatorId,
        organizationId: op.organizationId,
        requestId: req.headers.get('x-request-id') || `req_${Date.now()}`,
        metadata: { operationId: id, operatorId },
      });
    } catch {}

    const retried = await provisioningSaga.retryOperation(id);
    if (!retried) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Operation ${id} not found for retry` },
        { status: 404 }
      );
    }
    return NextResponse.json(sanitizeOperation(retried));
  }

  if (action === 'cancel') {
    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'TENANT_OPERATION_CANCELLED',
        entityType: 'TENANT_OPERATION',
        entityId: id,
        actorId: operatorId,
        organizationId: op.organizationId,
        requestId: req.headers.get('x-request-id') || `req_${Date.now()}`,
        metadata: { operationId: id, operatorId },
      });
    } catch {}

    const cancelled = await provisioningSaga.cancelOperation(id);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Operation ${id} not found for cancellation` },
        { status: 404 }
      );
    }
    const updatedOp = await operationStore.getOperation(id);
    return NextResponse.json(sanitizeOperation(updatedOp || op));
  }

  return NextResponse.json(
    { error: 'BAD_REQUEST', message: `Unknown operation action "${action}". Supported: retry, cancel.` },
    { status: 400 }
  );
}
