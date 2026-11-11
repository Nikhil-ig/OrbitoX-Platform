import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';

async function authenticateCustomerOrAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

  if (!rawKey) {
    return { ok: false as const, status: 401, error: 'UNAUTHORIZED', message: 'API key required' };
  }

  let authRecord;
  try {
    authRecord = await platformRepository.authorizeApiKey(rawKey);
  } catch {
    return { ok: false as const, status: 401, error: 'UNAUTHORIZED', message: 'Invalid API key' };
  }

  if (!authRecord || !authRecord.key || !authRecord.project) {
    return { ok: false as const, status: 401, error: 'UNAUTHORIZED', message: 'Invalid API key' };
  }

  return { ok: true as const, authRecord: authRecord as { key: any; project: any } };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cleanId = id.includes('/project/') ? id.split('/project/')[1]?.split('/')[0] || id : id;
  const auth = await authenticateCustomerOrAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, message: auth.message }, { status: auth.status });
  }

  const project = await platformRepository.getProject(cleanId);
  if (!project) {
    return NextResponse.json({ error: 'NOT_FOUND', message: `Tenant ${id} not found` }, { status: 404 });
  }

  const isPlatformAdmin =
    (auth.authRecord.key.keyType as string) === 'PLATFORM_ROOT' ||
    (auth.authRecord.key.keyType as string) === 'SYSTEM' ||
    auth.authRecord.key.capabilities?.includes('platform:admin') ||
    auth.authRecord.key.capabilities?.includes('*');

  if (!isPlatformAdmin && project.organizationId !== auth.authRecord.project.organizationId) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Tenant belongs to another organisation' },
      { status: 403 }
    );
  }

  const installations = await platformRepository.listPluginInstallations(project.id);

  return NextResponse.json({
    id: project.id,
    name: project.name,
    slug: project.slug,
    organizationId: project.organizationId,
    status: project.status,
    environment: (project as any).environment || 'production',
    plugins: installations.map((i) => ({
      pluginId: i.pluginId,
      status: i.status,
      plan: i.planId,
      version: (i as any).version || (i as any).revision || '1.0.0',
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
