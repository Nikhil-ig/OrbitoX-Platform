import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';
import { authorizeProjectRequest } from '../../../_lib/project-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const authError = authorizeProjectRequest(req, projectId, 'POST');
    if (authError) return authError;

    const body = await req.json();

    const quote = externalProjectEngine.quoteService.computeQuote({
      projectId,
      planId: body.planId || 'plan_restaurant_growth',
      addons: body.addons,
      items: body.items,
      customDiscountPercent: body.customDiscountPercent,
    });

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
