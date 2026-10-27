import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';
import { ApiResponse } from '../../../_lib/api-types';
import { platformRepository } from '@/lib/platform-repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const key = await platformRepository.getApiKey(keyId);
  if (!key) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  // Ensure zero plaintext secrets are returned
  const { rawKey, authVerifier, ...safe } = key as any;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: safe,
    meta: {
      latencyMs: 1,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const existing = await platformRepository.getApiKey(keyId);
  const revoked = existing ? await platformRepository.setKeyStatus(existing.id, 'REVOKED') : undefined;
  if (!revoked) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: 'SECURITY',
    message: `Cryptographically REVOKED API key [${revoked.name}] (${keyId}).`,
  });
  await platformRepository.recordPlatformAdminAudit({
    action: 'API_KEY_REVOKED',
    entityType: 'PLATFORM_KEY',
    entityId: revoked.id,
    projectId: revoked.projectId,
    environmentId: revoked.environmentId,
    actorId: 'platform-admin',
  });

  const { rawKey, authVerifier, ...safe } = revoked as any;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: safe,
    meta: {
      latencyMs: 1,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const existing = await platformRepository.getApiKey(keyId);
  const toggledRecord = existing
    ? await platformRepository.setKeyStatus(existing.id, existing.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
    : undefined;
  const toggled = toggledRecord ? { ...toggledRecord, status: toggledRecord.status.toLowerCase() } : undefined;
  if (!toggled) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: toggled.status === 'blocked' ? 'WARN' : 'INFO',
    message: `API Key [${toggled.name}] set to ${toggled.status.toUpperCase()}.`,
  });
  await platformRepository.recordPlatformAdminAudit({
    action: 'API_KEY_STATUS_CHANGED',
    entityType: 'PLATFORM_KEY',
    entityId: toggledRecord!.id,
    projectId: toggledRecord!.projectId,
    environmentId: toggledRecord!.environmentId,
    actorId: 'platform-admin',
    metadata: { status: toggledRecord!.status },
  });

  const { rawKey, authVerifier, ...safe } = toggled as any;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: safe,
    meta: {
      latencyMs: 1,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
}
