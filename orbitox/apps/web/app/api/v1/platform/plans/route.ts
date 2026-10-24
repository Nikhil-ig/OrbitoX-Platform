import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const plans = externalProjectEngine.quoteService.listPlans();
    const projects = externalProjectEngine.runtimeController.listProjects();

    const planProjectMap: Record<string, Array<{ id: string; name: string; slug: string; status: string }>> = {};
    for (const plan of plans) {
      planProjectMap[plan.id] = [];
    }

    for (const proj of projects) {
      const desired = externalProjectEngine.runtimeController.getDesiredState(proj.id) || {};
      const activePlanId = desired.activePlan || proj.manifest?.planReferences?.[0] || 'plan_restaurant_growth';
      if (!planProjectMap[activePlanId]) {
        planProjectMap[activePlanId] = [];
      }
      planProjectMap[activePlanId]!.push({
        id: proj.id,
        name: proj.name,
        slug: proj.slug,
        status: proj.status,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          plans,
          planProjectMap,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: err.message } },
      { status: 500 }
    );
  }
}
