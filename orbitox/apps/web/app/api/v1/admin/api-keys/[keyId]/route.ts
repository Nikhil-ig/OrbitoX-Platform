import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const key = PlatformApiState.findApiKey(keyId);
  if (!key) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: key });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const revoked = PlatformApiState.revokeApiKey(keyId);
  if (!revoked) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: 'SECURITY',
    message: `Cryptographically REVOKED API key [${revoked.name}] (${keyId}).`,
  });

  return NextResponse.json({
    success: true,
    data: revoked,
    message: `API Key ${revoked.name} has been revoked.`,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;
  const toggled = PlatformApiState.toggleApiKey(keyId);
  if (!toggled) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `API Key ${keyId} not found.` } },
      { status: 404 }
    );
  }

  PlatformApiState.recordTelemetry({
    facade: 'SecurityFacade',
    level: toggled.status === 'blocked' ? 'WARN' : 'INFO',
    message: `API Key [${toggled.name}] set to ${toggled.status.toUpperCase()}.`,
  });

  return NextResponse.json({
    success: true,
    data: toggled,
    message: `API Key ${toggled.name} is now ${toggled.status}.`,
  });
}
