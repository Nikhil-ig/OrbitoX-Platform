import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../../_lib/api-guard';
import { ApiResponse } from '../../../../_lib/api-types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const rotated = PlatformApiState.rotateApiKey(keyId);
  if (!rotated) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: 'SECURITY',
    message: `Rotated API Key [${rotated.replacementKey.name}]. New masked key: ${rotated.replacementKey.maskedKey}.`,
  });

  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      keyRecord: rotated.replacementKey,
      rawSecret: rotated.rawSecret,
      warning: 'This raw secret will never be shown again. Store it securely in your deployment pipeline or vault.',
    },
    meta: {
      latencyMs: 1,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  });
}
