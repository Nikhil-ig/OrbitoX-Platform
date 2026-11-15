import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import crypto from 'crypto';

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const decodedParam = decodeURIComponent(rawParam).trim();

    // 1. Resolve project by slug, id, or canonical tenantId
    let project = await prisma.platformProject.findFirst({
      where: {
        OR: [{ slug: decodedParam }, { id: decodedParam }],
      },
      include: { environments: true },
    });

    if (!project && decodedParam.includes('project/')) {
      const match = /project\/([^/]+)/.exec(decodedParam);
      if (match && match[1]) {
        project = await prisma.platformProject.findUnique({
          where: { id: match[1] },
          include: { environments: true },
        });
      }
    }

    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    // 2. Authorize customer membership in the owning organization (OWNER or ADMIN only)
    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can generate preview test tokens.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    // 3. Issue cryptographically signed preview capability token
    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const runtimeSecret =
      process.env.RESTAURANTOS_PLATFORM_TOKEN ||
      process.env.ORBITOX_RUNTIME_TOKEN ||
      '';

    if (!runtimeSecret) {
      return NextResponse.json(
        { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'Runtime authentication secret is not configured.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    // Derive HKDF per-tenant secret matching restaurant-api
    const derived = crypto.hkdfSync(
      'sha256',
      Buffer.from(runtimeSecret, 'utf8'),
      Buffer.from(canonicalTenantId, 'utf8'),
      Buffer.from('restaurantos-tenant-jwt-signing', 'utf8'),
      32,
    );
    const tenantSecret = Buffer.from(derived).toString('hex');

    const ttlSeconds = 900; // 15 minutes
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      sub: session.userId,
      orgId: project.organizationId,
      tenantId: canonicalTenantId,
      scope: 'preview:test-order',
      exp: now + ttlSeconds,
      jti: `prev_${crypto.randomBytes(8).toString('hex')}`,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', tenantSecret)
      .update(`orb_prev.${payloadBase64}`)
      .digest('base64url');
    const token = `orb_prev.${payloadBase64}.${signature}`;

    return NextResponse.json(
      {
        ok: true,
        token,
        tenantId: canonicalTenantId,
        expiresInSeconds: ttlSeconds,
        expiresAt: new Date((now + ttlSeconds) * 1000).toISOString(),
      },
      { status: 200, headers: noStoreHeaders() },
    );
  },
  { write: true, allowMfaSetup: true },
);
