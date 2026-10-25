import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import {
  externalProjectEngine,
  generateProjectKey,
  hashProjectKey,
  ExternalProjectRecord,
} from '@orbitox/external-project-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug: rawSlug,
      template = 'restaurant',
      plan,
      defaultPort,
      controlPlaneUrl,
    } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Application name is required' },
        { status: 400 }
      );
    }

    const slug = (rawSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-|-$/g, '') || 'my-app';

    const randSuffix = crypto.randomBytes(3).toString('hex');
    const projectId = `proj_${slug.replace(/-/g, '_')}_${randSuffix}`;
    const port = defaultPort ? Number(defaultPort) : template === 'crm' ? 4051 : 4050;

    // 1. Generate one-time scoped project API key
    const scopedKey = generateProjectKey();
    const keyHash = hashProjectKey(scopedKey);

    // 2. Resolve template plugins and features
    let enabledPlugins = ['@orbitox/pos'];
    let enabledFeatures = ['pos.orders', 'pos.kitchen', 'pos.quotes', 'pos.sessions'];
    let planReference = plan || 'plan_restaurant_growth';

    if (template === 'crm') {
      enabledPlugins = ['@orbitox/crm'];
      enabledFeatures = ['crm.leads', 'crm.pipelines', 'crm.scoring'];
      planReference = plan || 'plan_crm_growth';
    } else if (template === 'blank' || template === 'custom') {
      enabledPlugins = ['@orbitox/core'];
      enabledFeatures = ['core.tenancy'];
      planReference = plan || 'plan_custom_starter';
    }

    const resolvedControlPlaneUrl =
      controlPlaneUrl ||
      process.env.ORBITOX_CONTROL_PLANE_URL ||
      process.env.ORBITOX_BACKEND_URL ||
      'http://localhost:3005';

    // 3. Register project record in external project controller
    const projectRecord: ExternalProjectRecord = {
      id: projectId,
      slug,
      name,
      status: 'ACTIVE',
      projectKeyHash: keyHash,
      localPath: `projects/external-os/${slug}`,
      activeRevisionNumber: 1,
      desiredRevisionNumber: 1,
      syncStatus: 'IN_SYNC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifest: {
        projectId,
        slug,
        name,
        type: (template === 'crm' ? 'crm-os' : template === 'restaurant' ? 'restaurant-os' : 'custom-os') as any,
        version: '1.0.0',
        runtime: {
          type: 'standalone',
          entrypoint: 'src/main.ts',
          defaultPort: port,
          healthEndpoint: '/health',
        },
        enabledPlugins,
        enabledFeatures,
        apis: [],
        planReferences: [planReference],
        environmentMetadata: {
          defaultEnvironment: 'development',
          supportedEnvironments: ['development', 'staging', 'production'],
        },
        platformController: {
          controlPlaneUrl: resolvedControlPlaneUrl,
          syncIntervalSeconds: 10,
          requireSignedConfig: false,
        },
        capabilities: ['CONTROL_BRIDGE_V1', 'REALTIME_TELEMETRY_V1'],
      },
    };

    externalProjectEngine.runtimeController.registerProject(projectRecord);

    // Initialize desired state revision
    externalProjectEngine.runtimeController.updateDesiredState(projectId, {
      features: enabledFeatures.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
      entitlements: {
        monthly_limit: template === 'crm' ? 5000 : 10000,
      },
      plugins: enabledPlugins,
      plan: planReference,
    });

    // 4. Construct CLI command & env block (scoped key shown ONLY this once)
    const cliCommand = `npx @orbitox/cli create ${slug} --template=${template}`;
    const envBlock = `ORBITOX_PROJECT_ID=${projectId}
ORBITOX_API_KEY=${scopedKey}
ORBITOX_CONTROL_PLANE_URL=${resolvedControlPlaneUrl}
PORT=${port}
`;

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        slug,
        name,
        template,
        plan: planReference,
        plugins: enabledPlugins,
        features: enabledFeatures,
        cliCommand,
        envBlock,
        scopedKey, // Returned only on initial creation
        controlPlaneUrl: resolvedControlPlaneUrl,
        port,
        message: 'Project created from template. Save the scopedKey securely; secrets are never shown twice.',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to provision project from template' },
      { status: 500 }
    );
  }
}
