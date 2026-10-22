import { NextResponse } from 'next/server';
import { BUILTIN_SCHEMAS, CELESTIAL_ODYSSEY_SCHEMA } from '@/components/template-studio/schema/builtin-schemas';
import { TemplateSchema } from '@/components/template-studio/types/TemplateSchema';
import { TemplateSchemaService } from '@/components/template-studio/services/TemplateSchemaService';

// In-memory cache for API runtime
const TEMPLATES_STORE: Map<string, TemplateSchema> = new Map();
Object.entries(BUILTIN_SCHEMAS).forEach(([slug, schema]) => {
  TEMPLATES_STORE.set(slug, schema);
});

export async function GET() {
  try {
    const list = Array.from(TEMPLATES_STORE.values()).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      badge: t.badge,
      description: t.description,
      status: t.status,
      activeVersion: t.activeVersion,
      category: t.category,
      visualPersonality: t.visualPersonality,
      tier: t.tier,
      healthScore: t.healthReport?.score ?? 100,
      isPublishable: t.healthReport?.isPublishable ?? true,
      scenesCount: t.scenes.length,
      fieldsCount: t.contentSchema.length,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({ success: true, templates: list });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Failed to list templates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, sourceSlug, newSlug, newName, schema } = body;

    if (action === 'duplicate' && sourceSlug && newSlug && newName) {
      const duplicated = TemplateSchemaService.duplicateSchema(sourceSlug, newSlug, newName);
      TEMPLATES_STORE.set(duplicated.slug, duplicated);
      return NextResponse.json({ success: true, template: duplicated });
    }

    if (schema && schema.slug && schema.name) {
      const validatedReport = TemplateSchemaService.validateTemplateSchema(schema);
      const saved: TemplateSchema = {
        ...schema,
        healthReport: validatedReport,
        updatedAt: new Date().toISOString(),
      };
      TEMPLATES_STORE.set(saved.slug, saved);
      return NextResponse.json({ success: true, template: saved });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Failed to create template' }, { status: 500 });
  }
}
