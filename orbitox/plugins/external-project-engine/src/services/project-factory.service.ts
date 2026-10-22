import * as fs from 'fs';
import * as path from 'path';
import {
  OrbitoxProjectManifest,
  ProjectTemplate,
  ExternalProjectRecord,
  ApiRegistrationMeta,
} from '../types';
import { ApiRegistryService } from './api-registry.service';
import { RuntimeControllerService } from './runtime-controller.service';

export interface CreateProjectInput {
  slug: string;
  name: string;
  type: OrbitoxProjectManifest['type'];
  templateId?: string;
  businessModel?: string;
  defaultPort?: number;
  enabledPlugins?: string[];
  enabledFeatures?: string[];
  apis?: ApiRegistrationMeta[];
  planReferences?: string[];
  controlPlaneUrl?: string;
  workspaceRoot?: string;
}

export class ProjectFactoryService {
  private apiRegistry: ApiRegistryService;
  private runtimeController: RuntimeControllerService;

  constructor(
    apiRegistry = new ApiRegistryService(),
    runtimeController = new RuntimeControllerService()
  ) {
    this.apiRegistry = apiRegistry;
    this.runtimeController = runtimeController;
  }

  public listTemplates(): ProjectTemplate[] {
    return [
      {
        id: 'template_restaurant_os',
        name: 'RestaurantOS (Kitchen & Dine OS)',
        description: 'Complete culinary runtime featuring mobile QR ordering, multi-station KDS, preparation DAG scheduling, and table matrix.',
        type: 'restaurant-os',
        defaultPort: 4010,
        businessModel: 'O2O2B2B2C',
        defaultPlugins: ['@orbitox/pos', '@orbitox/realtime', '@orbitox/billing'],
        defaultFeatures: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds', 'mcp_copilot'],
        defaultPlans: ['plan_restaurant_growth'],
        icon: '🍽️',
        defaultApis: [
          { name: 'restaurant.quote', route: '/api/restaurant/quote', method: 'POST', version: 'v1.0.0', requiresAuth: false, scopes: ['pos.quote'], rateLimitPerMin: 300, description: 'Deterministic pricing quote' },
          { name: 'restaurant.orders', route: '/api/restaurant/orders', method: 'POST', version: 'v1.0.0', requiresAuth: true, scopes: ['pos.orders.write'], rateLimitPerMin: 120, description: 'Idempotent order submission' },
          { name: 'restaurant.kds', route: '/api/restaurant/kds', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['kitchen.read'], rateLimitPerMin: 600, description: 'Kitchen station queue stream' },
          { name: 'restaurant.menu', route: '/api/restaurant/menu', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.public'], rateLimitPerMin: 1000, description: 'Public menu catalog' },
          { name: 'restaurant.sessions', route: '/api/restaurant/sessions/join', method: 'POST', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.join'], rateLimitPerMin: 200, description: 'Diner session join' },
          { name: 'restaurant.tables', route: '/api/restaurant/qr/:locator', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.public'], rateLimitPerMin: 1200, description: 'Table discovery' },
        ],
      },
      {
        id: 'template_celebrations_os',
        name: 'CelebrationsOS (Creative Studio OS)',
        description: 'Interactive canvas experience engine with timeline animation, video generation, and spatial card composition.',
        type: 'celebrations-os',
        defaultPort: 4020,
        businessModel: 'D2C',
        defaultPlugins: ['@orbitox/celebrations', '@orbitox/realtime'],
        defaultFeatures: ['motion_timeline', 'canvas_inspector', '3d_particles', 'audio_sync'],
        defaultPlans: ['plan_celebrations_pro'],
        icon: '🎉',
        defaultApis: [
          { name: 'celebrations.projects', route: '/api/studio/projects', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['studio.read'], description: 'Studio projects list' },
          { name: 'celebrations.render', route: '/api/studio/render', method: 'POST', version: 'v1.0.0', requiresAuth: true, scopes: ['studio.render'], description: 'Server-side media rendering' },
        ],
      },
      {
        id: 'template_hospital_os',
        name: 'HospitalOS (Clinical Telemetry OS)',
        description: 'Hospital network management with emergency triage, bed telemetry, ICU reservations, and doctor consult mesh.',
        type: 'hospital-os',
        defaultPort: 4030,
        businessModel: 'HEALTHCARE_NETWORK',
        defaultPlugins: ['@orbitox/hms', '@orbitox/telemetry'],
        defaultFeatures: ['triage_scoring', 'icu_telemetry', 'consultation_mesh'],
        defaultPlans: ['plan_hospital_enterprise'],
        icon: '🏥',
        defaultApis: [
          { name: 'hospital.patients', route: '/api/hospital/patients', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['ehr.read'], description: 'Patient EHR queries' },
          { name: 'hospital.beds', route: '/api/hospital/beds', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['ward.read'], description: 'Bed occupancy status' },
        ],
      },
      {
        id: 'template_commerce_os',
        name: 'CommerceOS (Omnichannel Retail OS)',
        description: 'High-concurrency e-commerce storefront with multi-warehouse inventory, cart engine, and split payouts.',
        type: 'commerce-os',
        defaultPort: 4040,
        businessModel: 'B2B_SAAS',
        defaultPlugins: ['@orbitox/commerce', '@orbitox/inventory', '@orbitox/billing'],
        defaultFeatures: ['zero_trust_checkout', 'multi_warehouse', 'dynamic_tax'],
        defaultPlans: ['plan_commerce_scale'],
        icon: '🛍️',
        defaultApis: [
          { name: 'commerce.catalog', route: '/api/commerce/products', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['store.read'], description: 'Storefront products' },
          { name: 'commerce.cart', route: '/api/commerce/cart', method: 'POST', version: 'v1.0.0', requiresAuth: false, scopes: ['store.cart'], description: 'Server-side cart calculations' },
        ],
      },
      {
        id: 'template_crm_os',
        name: 'CRM OS (B2B Pipeline & Deals OS)',
        description: 'Predictive lead scoring, Kanban stages, multi-seat governance, and contact interaction timelines.',
        type: 'crm-os',
        defaultPort: 4050,
        businessModel: 'B2B_SAAS',
        defaultPlugins: ['@orbitox/crm', '@orbitox/billing'],
        defaultFeatures: ['pipeline_stages', 'lead_scoring', 'activity_stream', 'email_sync'],
        defaultPlans: ['plan_crm_growth'],
        icon: '💼',
        defaultApis: [
          { name: 'crm.leads', route: '/api/crm/leads', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['crm.read'], description: 'Lead query and filtering' },
          { name: 'crm.deals', route: '/api/crm/deals', method: 'POST', version: 'v1.0.0', requiresAuth: true, scopes: ['crm.write'], description: 'Deal state transitions' },
        ],
      },
      {
        id: 'template_blank_os',
        name: 'Blank External OS (Decoupled Foundation)',
        description: 'Minimal zero-dependency external OS scaffold preconfigured with @orbitox/external-runtime-sdk and Control Bridge.',
        type: 'custom-os',
        defaultPort: 4060,
        businessModel: 'CUSTOM',
        defaultPlugins: ['@orbitox/core'],
        defaultFeatures: ['runtime_bridge', 'health_probes'],
        defaultPlans: ['plan_custom_starter'],
        icon: '📦',
        defaultApis: [
          { name: 'custom.health', route: '/api/health', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['system.read'], description: 'Runtime health endpoint' },
        ],
      },
    ];
  }

  /**
   * Generates a strongly typed Project Manifest
   */
  public generateManifest(input: CreateProjectInput): OrbitoxProjectManifest {
    const template = this.listTemplates().find((t) => t.id === input.templateId);
    const projectId = `project_${input.slug.replace(/[^a-z0-9]/g, '_')}`;
    const defaultPort = input.defaultPort || template?.defaultPort || 4010;

    return {
      projectId,
      slug: input.slug,
      name: input.name,
      type: input.type,
      version: '1.0.0',
      runtime: {
        type: 'standalone',
        entrypoint: 'src/server.ts',
        defaultPort,
        healthEndpoint: '/health',
      },
      enabledPlugins: input.enabledPlugins || template?.defaultPlugins || ['@orbitox/pos'],
      enabledFeatures: input.enabledFeatures || template?.defaultFeatures || ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds'],
      apis: input.apis || template?.defaultApis || [],
      planReferences: input.planReferences || template?.defaultPlans || ['plan_restaurant_growth'],
      environmentMetadata: {
        defaultEnvironment: 'production',
        supportedEnvironments: ['development', 'staging', 'production'],
      },
      platformController: {
        controlPlaneUrl: input.controlPlaneUrl || 'http://localhost:3005',
        syncIntervalSeconds: 10,
        requireSignedConfig: true,
      },
      capabilities: ['CONTROL_BRIDGE_V1', 'SIGNED_CONFIG_V1', 'CENTRAL_QUOTES_V1', 'REALTIME_TELEMETRY_V1'],
      customMetadata: {
        businessModel: input.businessModel || template?.businessModel || 'O2O2B2B2C',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Scaffolds and writes an external project to disk under `projects/external-os/<slug>`
   */
  public createProject(input: CreateProjectInput): ExternalProjectRecord {
    // Locate projects root directory
    let rootDir = input.workspaceRoot;
    if (!rootDir) {
      const candidates = [
        path.resolve(process.cwd()),
        path.resolve(process.cwd(), '..'),
        path.resolve(process.cwd(), '../..'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(path.join(cand, 'projects')) || cand.endsWith('OrbitoX Platform')) {
          rootDir = cand;
          break;
        }
      }
    }
    rootDir = rootDir || process.cwd();

    const projectDir = path.join(rootDir, 'projects', 'external-os', input.slug);

    // 1. Generate Manifest
    const manifest = this.generateManifest(input);

    // 2. Scaffold decoupled project structure
    const subdirs = [
      'apps/web',
      'apps/api',
      'packages/domain',
      'packages/runtime',
      'packages/ui',
      'packages/config',
      'packages/integrations',
      'prisma',
      'docs',
      'scripts',
      '.orbitox',
      'src/bridge',
    ];

    for (const sub of subdirs) {
      fs.mkdirSync(path.join(projectDir, sub), { recursive: true });
    }

    // 3. Write orbitox.project.json in root and .orbitox
    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.join(projectDir, 'orbitox.project.json'), manifestJson, 'utf8');
    fs.writeFileSync(path.join(projectDir, '.orbitox', 'orbitox.project.json'), manifestJson, 'utf8');

    // 4. Write pnpm-workspace.yaml
    fs.writeFileSync(
      path.join(projectDir, 'pnpm-workspace.yaml'),
      `packages:\n  - 'apps/*'\n  - 'packages/*'\n`,
      'utf8'
    );

    // 5. Write package.json
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: `@orbitox-os/${input.slug}`,
          version: '1.0.0',
          private: true,
          description: `Independent runtime product for ${input.name}`,
          scripts: {
            dev: 'tsx src/server.ts',
            start: 'node dist/server.js',
            build: 'tsc',
          },
          dependencies: {
            '@orbitox/external-runtime-sdk': 'workspace:*',
          },
        },
        null,
        2
      ),
      'utf8'
    );

    // 6. Write tsconfig.json
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'CommonJS',
            moduleResolution: 'node',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            lib: ['ES2022', 'DOM'],
            types: ['node'],
          },
        },
        null,
        2
      ),
      'utf8'
    );

    // 7. Register declared APIs in central registry
    for (const api of manifest.apis) {
      const primaryPlugin = manifest.enabledPlugins[0] || '@orbitox/core';
      this.apiRegistry.registerApi(manifest.projectId, primaryPlugin, api);
    }

    // 8. Register project in Runtime Controller
    const record: ExternalProjectRecord = {
      id: manifest.projectId,
      slug: manifest.slug,
      name: manifest.name,
      manifest,
      status: 'ACTIVE',
      localPath: projectDir,
      activeRevisionNumber: 1,
      desiredRevisionNumber: 1,
      syncStatus: 'IN_SYNC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.runtimeController.registerProject(record);

    return record;
  }
}
