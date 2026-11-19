import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  const all = PlatformApiState.getProviders();
  for (const [cat, items] of Object.entries(all)) {
    const match = (items as any[]).find((p) => p.id === providerId);
    if (match) {
      return NextResponse.json({
        success: true,
        data: { ...match, category: cat },
      });
    }
  }

  return NextResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: `Provider ${providerId} not found.` } },
    { status: 404 }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  try {
    const body = await req.json();
    const all = PlatformApiState.getProviders();

    for (const [cat, items] of Object.entries(all)) {
      const match = (items as any[]).find((p) => p.id === providerId);
      if (match) {
        const updated = PlatformApiState.updateProvider(cat, providerId, body);
        if (updated) {
          PlatformApiState.recordTelemetry({
            tenantId: providerId,
            categorySlug: cat,
            facade: 'SecurityFacade',
            level: updated.status === 'blocked' ? 'WARN' : 'INFO',
            message: `Admin modified provider [${match.name}]: status=${updated.status}`,
          });

          return NextResponse.json({
            success: true,
            data: { ...updated, category: cat },
          });
        }
      }
    }

    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Provider ${providerId} not found.` } },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  const all = PlatformApiState.getProviders();

  for (const [cat, items] of Object.entries(all)) {
    const match = (items as any[]).find((p) => p.id === providerId);
    if (match) {
      PlatformApiState.deleteProvider(cat, providerId);
      PlatformApiState.recordTelemetry({
        tenantId: providerId,
        categorySlug: cat,
        facade: 'AuditFacade',
        level: 'AUDIT',
        message: `Deprovisioned tenant [${match.name}] (${providerId}) from category [${cat}].`,
      });

      return NextResponse.json({
        success: true,
        message: `Provider ${providerId} deleted successfully.`,
      });
    }
  }

  return NextResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: `Provider ${providerId} not found.` } },
    { status: 404 }
  );
}
