import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

let leads = [
  {
    id: 'lead-01',
    name: 'Dr. Sarah Connor',
    email: 'sarah@cyberdyne.io',
    company: 'Cyberdyne Healthcare Systems',
    estimatedValue: 4500000,
    stage: 'qualified',
    score: 94,
    source: 'Inbound Enterprise Demo',
    assignedTo: 'Alexander Wright',
    createdAt: '2026-09-07',
  },
  {
    id: 'lead-02',
    name: 'Vikram Mehta',
    email: 'v.mehta@apolloretail.in',
    company: 'Apollo Retail & POS Network',
    estimatedValue: 1200000,
    stage: 'proposal',
    score: 88,
    source: 'Partner Referral',
    assignedTo: 'Elena Rostova',
    createdAt: '2026-09-08',
  },
  {
    id: 'lead-03',
    name: 'Liam Gallagher',
    email: 'liam@manchesterculinary.co.uk',
    company: 'Manchester Culinary & Ghost Kitchens',
    estimatedValue: 350000,
    stage: 'contacted',
    score: 72,
    source: 'Webinar Signup',
    assignedTo: 'Marcus Vance',
    createdAt: '2026-09-08',
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'crm',
    serviceName: 'CRM & Sales Pipeline',
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search')?.toLowerCase();

    let list = leads;
    if (stage && stage !== 'all') {
      list = list.filter((l) => l.stage === stage);
    }
    if (search) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          l.company.toLowerCase().includes(search) ||
          l.email.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: list,
      meta: {
        total: list.length,
        totalPipelineValue: list.reduce((acc, l) => acc + l.estimatedValue, 0),
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'crm',
    serviceName: 'CRM & Sales Pipeline',
    requiredScopes: ['crm:write'],
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      if (!body.name || !body.email) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "name" and "email" are required.' } },
          { status: 400 }
        );
      }

      const newLead = {
        id: `lead-${Date.now()}`,
        name: body.name,
        email: body.email,
        company: body.company || 'Independent Organization',
        estimatedValue: Number(body.estimatedValue) || 50000,
        stage: body.stage || 'new',
        score: Number(body.score) || 60,
        source: body.source || 'REST API Lead Ingestion',
        assignedTo: body.assignedTo || 'Unassigned Queue',
        createdAt: new Date().toISOString().slice(0, 10),
      };

      leads = [newLead, ...leads];

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Ingested new CRM Lead [${newLead.name}] from [${newLead.company}] ($${newLead.estimatedValue.toLocaleString()}).`,
      });

      return NextResponse.json({
        success: true,
        data: newLead,
        message: `Lead ${newLead.name} ingested successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);

export const PATCH = withApiGuard(
  {
    serviceId: 'crm',
    serviceName: 'CRM & Sales Pipeline',
    requiredScopes: ['crm:write'],
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const { id, stage, notes } = body;

      if (!id || !stage) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "id" and "stage" are required.' } },
          { status: 400 }
        );
      }

      const idx = leads.findIndex((l) => l.id === id);
      const lead = leads[idx];
      if (idx === -1 || !lead) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Lead ${id} not found.` } },
          { status: 404 }
        );
      }

      const prevStage = lead.stage;
      lead.stage = stage;

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Lead [${lead.name}] transitioned: ${prevStage} -> ${stage}.`,
      });

      return NextResponse.json({
        success: true,
        data: lead,
        message: `Lead ${lead.name} transitioned to ${stage}.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
