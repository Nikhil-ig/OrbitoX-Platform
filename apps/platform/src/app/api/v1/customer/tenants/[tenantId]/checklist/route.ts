import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import {
  getChecklist,
  updateChecklistItem,
  type ChecklistItemId,
  type ChecklistItemStatus,
} from '@/server/onboarding/checklist-service';

type RouteContext = { params: Promise<{ tenantId: string }> };

async function resolveProject(rawParam: string) {
  const decodedParam = decodeURIComponent(rawParam).trim();
  let project = await prisma.platformProject.findFirst({
    where: {
      OR: [
        { slug: decodedParam },
        { id: decodedParam },
        { slug: decodedParam.replace(/^tenant_/, '') },
      ],
    },
    include: { environments: true },
  });

  if (!project && decodedParam.includes('project/')) {
    const match = /project\/([^/]+)/.exec(decodedParam);
    if (match && match[1]) {
      project = await prisma.platformProject.findFirst({
        where: {
          OR: [
            { id: match[1] },
            { slug: match[1] },
          ],
        },
        include: { environments: true },
      });
    }
  }

  return project;
}

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Access denied to this restaurant project.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const checklist = await getChecklist(canonicalTenantId);
    return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
  },
  { write: false, allowMfaSetup: true },
);

const VALID_ITEM_IDS: ChecklistItemId[] = ['qr', 'kds', 'staff', 'payment', 'printer'];
const VALID_STATUSES: ChecklistItemStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'ACTION_REQUIRED',
  'PENDING_VERIFICATION',
  'COMPLETED',
  'FAILED',
  'UNAVAILABLE',
];

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can update onboarding checklist items.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const body = await request.json().catch(() => ({}));
    const itemId = body.itemId as ChecklistItemId;
    const status = body.status as ChecklistItemStatus;

    if (!itemId || !VALID_ITEM_IDS.includes(itemId)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_ITEM_ID', message: `Item ID must be one of: ${VALID_ITEM_IDS.join(', ')}` },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_STATUS', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const checklist = await updateChecklistItem(canonicalTenantId, {
      itemId,
      status,
      statusNote: typeof body.statusNote === 'string' ? body.statusNote : undefined,
      evidence: body.evidence && typeof body.evidence === 'object' ? body.evidence : undefined,
      actorId: session.userId,
    });

    return NextResponse.json({ ok: true, checklist }, { headers: noStoreHeaders() });
  },
  { write: true, allowMfaSetup: true },
);
