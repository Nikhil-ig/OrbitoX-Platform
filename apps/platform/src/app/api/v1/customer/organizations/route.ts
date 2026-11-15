import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders } from '@/server/organizations/customer-dashboard';
import { assertValidGstin } from '@/server/auth/account-security';
import { prisma } from '@/server/db/prisma';
import { platformRepository } from '@/server/db/platform-repository';

export const GET = withCustomerAuth(async (_request, session) => {
  const memberships = await prisma.customerMembership.findMany({
    where: { userId: session.userId },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          businessCategory: true,
          city: true,
          gstin: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    {
      ok: true,
      organizations: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    },
    { headers: noStoreHeaders() },
  );
}, { write: false, allowMfaSetup: true });

export const POST = withCustomerAuth(async (request: NextRequest, session) => {
  if (!session.emailVerified) {
    return NextResponse.json(
      { ok: false, error: 'VERIFIED_EMAIL_REQUIRED', message: 'You must verify your email before creating an organization.' },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  if (rawName.length < 2 || rawName.length > 120) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_NAME', message: 'Organization name must contain between 2 and 120 characters.' },
      { status: 422, headers: noStoreHeaders() },
    );
  }

  const businessCategory = typeof body.businessCategory === 'string' && body.businessCategory.trim()
    ? body.businessCategory.trim()
    : 'RESTAURANTS_CAFES';

  const city = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null;
  const rawGstin = typeof body.gstin === 'string' && body.gstin.trim() ? body.gstin.trim().toUpperCase() : null;

  if (rawGstin) {
    const gstinCheck = assertValidGstin(rawGstin);
    if (!gstinCheck.valid) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_GSTIN', message: gstinCheck.error || 'Invalid Indian GSTIN.' },
        { status: 422, headers: noStoreHeaders() },
      );
    }
  }

  // Idempotency check: if user already created an org with this exact name recently
  const existingOrgMembership = await prisma.customerMembership.findFirst({
    where: {
      userId: session.userId,
      role: 'OWNER',
      organization: {
        name: rawName,
        status: 'ACTIVE',
      },
    },
    include: { organization: true },
  });

  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  if (idempotencyKey && existingOrgMembership) {
    const org = existingOrgMembership.organization;
    return NextResponse.json(
      {
        ok: true,
        replayed: true,
        organization: {
          id: org.id,
          slug: org.slug,
          name: org.name,
          businessCategory: org.businessCategory || businessCategory,
          city: org.city || city,
          gstin: org.gstin || rawGstin,
          role: 'OWNER' as const,
        },
      },
      { status: 200, headers: noStoreHeaders() },
    );
  }

  // Generate unique slug
  const baseSlug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const orgSlug = baseSlug ? `${baseSlug}-${randomSuffix}` : `org-${randomSuffix}`;

  const createdOrg = await prisma.$transaction(async (tx) => {
    const org = await tx.platformOrganization.create({
      data: {
        slug: orgSlug,
        name: rawName,
        billingEmail: session.email,
        businessCategory,
        city,
        gstin: rawGstin,
        status: 'ACTIVE',
      },
    });

    await tx.customerMembership.create({
      data: {
        organizationId: org.id,
        userId: session.userId,
        role: 'OWNER',
      },
    });

    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'ORGANIZATION_CREATED',
        entityType: 'ORGANIZATION',
        entityId: org.id,
        actorId: session.userId,
        organizationId: org.id,
        metadata: {
          orgName: org.name,
          slug: org.slug,
          category: businessCategory,
          city,
          hasGstin: Boolean(rawGstin),
        },
      });
    } catch {}

    return org;
  });

  return NextResponse.json(
    {
      ok: true,
      organization: {
        id: createdOrg.id,
        slug: createdOrg.slug,
        name: createdOrg.name,
        businessCategory: createdOrg.businessCategory,
        city: createdOrg.city,
        gstin: createdOrg.gstin,
        role: 'OWNER' as const,
      },
    },
    { status: 201, headers: noStoreHeaders() },
  );
}, { write: true, allowMfaSetup: true });
