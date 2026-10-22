import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../../_lib/api-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const rotated = PlatformApiState.rotateApiKey(keyId);
  if (!rotated) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: 'SECURITY',
    message: `Rotated API Key [${rotated.name}]. New masked key: ${rotated.maskedKey}.`,
  });

  return NextResponse.json({
    success: true,
    data: rotated,
    message: `API Key ${rotated.name} rotated successfully.`,
  });
}
