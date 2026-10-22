import { NextResponse } from 'next/server';
import { StudioStorageService } from '@/services/StudioStorageService';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    let customDomain: string | undefined = undefined;
    try {
      const body = await req.json();
      customDomain = body?.customDomain;
    } catch (_) {}

    const result = StudioStorageService.publishProject(params.id, customDomain);
    if (!result) {
      return NextResponse.json({ error: 'Project not found for publishing' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      publishedVersion: result.version,
      publishedAt: result.project.publishing.publishedAt,
      customDomain: result.project.publishing.customDomain,
      url: `/e/${result.project.slug}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to publish project' }, { status: 500 });
  }
}
