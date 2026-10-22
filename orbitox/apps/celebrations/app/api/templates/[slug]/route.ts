import { NextResponse } from 'next/server';
import { TemplateSchemaService } from '@/components/template-studio/services/TemplateSchemaService';
import { TemplateSchema } from '@/components/template-studio/types/TemplateSchema';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const schema = TemplateSchemaService.getSchema(slug);
    return NextResponse.json({ success: true, template: schema });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Failed to retrieve template' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const updated = TemplateSchemaService.saveSchema(body);
    return NextResponse.json({ success: true, template: updated });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Failed to update template' }, { status: 500 });
  }
}
