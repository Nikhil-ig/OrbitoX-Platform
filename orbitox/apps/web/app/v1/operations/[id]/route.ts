import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const op = await operationStore.getOperation(id);

  if (!op) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: `Operation ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(sanitizeOperation(op));
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const url = new URL(req.url);
  let action = url.searchParams.get('action');

  try {
    const body = await req.json();
    if (body.action) action = body.action;
  } catch {}

  if (action === 'retry') {
    const retried = await provisioningSaga.retryOperation(id);
    if (!retried) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Operation ${id} not found for retry` },
        { status: 404 }
      );
    }
    return NextResponse.json(sanitizeOperation(retried));
  } else if (action === 'cancel') {
    const cancelled = await provisioningSaga.cancelOperation(id);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Operation ${id} could not be cancelled` },
        { status: 400 }
      );
    }
    const op = await operationStore.getOperation(id);
    return NextResponse.json(op ? sanitizeOperation(op) : { ok: true, status: 'CANCELLED' });
  }

  return NextResponse.json(
    { error: 'BAD_REQUEST', message: 'Action required in query param or body ("retry" or "cancel")' },
    { status: 400 }
  );
}
