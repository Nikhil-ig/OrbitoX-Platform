import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState, isDatabaseError, classifyDatabaseError } from '../../../../_lib/api-guard';
import { ApiResponse } from '../../../../_lib/api-types';
import { platformRepository } from '@/lib/platform-repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await params;
    const body = await req.json().catch(() => ({}));
    const graceWindowDays = body.graceWindowDays !== undefined ? Number(body.graceWindowDays) : undefined;
    const rotated = await platformRepository.rotateApiKey(keyId, {
      graceWindowDays,
      operatorEmail: body.operatorEmail || 'platform-admin',
    });
    if (!rotated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
        { status: 404 }
      );
    }

    PlatformApiState.recordTelemetry({
      facade: 'SecurityFacade',
      level: 'SECURITY',
      message: `Rotated API Key [${rotated.replacementKey.name}]. New masked key: ${rotated.replacementKey.maskedDisplay}.`,
    });
    await platformRepository.recordPlatformAdminAudit({
      action: 'API_KEY_ROTATED',
      entityType: 'PLATFORM_KEY',
      entityId: rotated.replacementKey.id,
      projectId: rotated.replacementKey.projectId,
      environmentId: rotated.replacementKey.environmentId,
      actorId: 'platform-admin',
      metadata: { keyId: rotated.replacementKey.keyId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        keyRecord: rotated.replacementKey,
        rawSecret: rotated.replacementRawSecret,
        warning: 'This raw secret will never be shown again. Store it securely in your deployment pipeline or vault.',
      },
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (err: any) {
    if (isDatabaseError(err)) {
      const classified = classifyDatabaseError(err);
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: classified.code, message: classified.message } },
        { status: 503, headers: { 'Retry-After': '1', 'x-orbitox-error-code': classified.code } }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: 'ROTATION_FAILED', message: err.message || 'Key rotation failed' } },
      { status: 500 }
    );
  }
}
