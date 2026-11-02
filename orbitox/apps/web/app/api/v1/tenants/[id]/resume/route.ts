import { NextRequest, NextResponse } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { pluginLifecycleClient } from '@/lib/tenant-provisioning/plugin-lifecycle-client';

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

export async function POST(
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

  const operatorId = auth.authRecord.key.keyId || auth.authRecord.key.name || auth.authRecord.key.id;
  const requestId = req.headers.get('x-request-id') || `req_${Date.now()}`;
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key') || undefined;

  const installations = await platformRepository.listPluginInstallations(id);
  const effectiveInstallations =
    installations.length > 0 ? installations : await platformRepository.listPluginInstallations(project.id);
  const pluginResults: Record<string, any> = {};

  for (const inst of effectiveInstallations) {
    const targetTenantId = inst.tenantId || id;
    await platformRepository.updatePluginInstallationStatus(targetTenantId, inst.pluginId, 'ACTIVE');
    const lifecycleRes = await pluginLifecycleClient.invokeLifecycle(
      inst.pluginId,
      'resume',
      targetTenantId,
      { reason: 'Admin tenant resumption' },
      { idempotencyKey }
    );
    pluginResults[inst.pluginId] = lifecycleRes;
  }

  try {
    await platformRepository.recordPlatformAdminAudit({
      action: 'TENANT_RESUMED',
      entityType: 'TENANT',
      entityId: project.id,
      actorId: operatorId,
      organizationId: project.organizationId,
      requestId,
      metadata: { tenantId: project.id, operatorId, pluginResults },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    tenantId: project.id,
    status: 'ACTIVE',
    plugins: pluginResults,
  });
}
