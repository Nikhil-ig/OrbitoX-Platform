import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { ProjectBlueprint, UniversalResource } from './types';
import { CommandBusService } from './command-bus.service';

export interface EnvironmentComparisonReport {
  env1Id: string;
  env2Id: string;
  packagesDiff: {
    matching: string[];
    onlyInEnv1: string[];
    onlyInEnv2: string[];
  };
  featuresDiff: {
    matching: string[];
    onlyInEnv1: string[];
    onlyInEnv2: string[];
  };
  servicesDiff: {
    matching: string[];
    onlyInEnv1: string[];
    onlyInEnv2: string[];
  };
  isIdentical: boolean;
  comparedAt: string;
}

export interface ConfigurationPromotionResult {
  success: boolean;
  sourceEnvId: string;
  targetEnvId: string;
  packagesPromoted: string[];
  promotedAt: string;
  reconciliationRequired: boolean;
}

export class BlueprintService {
  private readonly logger = new Logger(BlueprintService.name);
  private readonly blueprints = new Map<string, ProjectBlueprint>();

  constructor(
    private readonly graph: ResourceGraphService,
    private readonly commandBus?: CommandBusService
  ) {
    this.seedPlatformTemplates();
  }

  registerBlueprint(blueprint: ProjectBlueprint): void {
    this.blueprints.set(blueprint.id, blueprint);
    this.logger.log(`Registered platform blueprint [${blueprint.id}] (${blueprint.name})`);
  }

  getBlueprint(id: string): ProjectBlueprint | undefined {
    return this.blueprints.get(id);
  }

  listBlueprints(): ProjectBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  /**
   * Clones a project configuration into another project, strictly sanitizing
   * machine keys, envelope secrets, and production-only custom domains.
   */
  cloneBlueprint(
    sourceProjectId: string,
    targetProjectInput: { id: string; name: string; organizationId: string }
  ): ProjectBlueprint {
    const sourceNode = this.graph.getNode(sourceProjectId);
    if (!sourceNode) {
      throw new Error(`Source project [${sourceProjectId}] does not exist.`);
    }

    const envs = this.graph.getAllNodes('ENVIRONMENT').filter(
      (e) => e.projectId === sourceProjectId || e.resourceId.includes(sourceProjectId)
    );

    const packages = new Set<string>();
    envs.forEach((env) => {
      this.graph.getDependencies(env.resourceId)
        .filter((d) => d.resourceType === 'PACKAGE')
        .forEach((pkg) => packages.add(pkg.resourceId));
    });

    const sanitizedBlueprint: ProjectBlueprint = {
      id: targetProjectInput.id,
      name: targetProjectInput.name,
      organizationId: targetProjectInput.organizationId,
      planTier: (sourceNode.desiredState as any)?.planTier || 'growth',
      environments: envs.map((e) => ({
        slug: (e.desiredState as any)?.isProduction ? 'staging' : 'development',
        isProduction: false, // Never auto-provision as production
        requireMtls: (e.desiredState as any)?.requireMtls || false,
      })),
      packages: Array.from(packages),
      features: ['standard_api'],
      services: [],
      // SANITIZED: Zero API keys, credentials, or production domains cloned
      domains: [],
      quotas: { monthlyApiQuota: 100000, rateLimitRpm: 500 },
      metadata: { clonedFrom: sourceProjectId, sanitized: true },
    };

    this.registerBlueprint(sanitizedBlueprint);
    return sanitizedBlueprint;
  }

  /**
   * Compares two environments (e.g. Development vs Staging or Staging vs Production)
   */
  compareEnvironments(env1Id: string, env2Id: string): EnvironmentComparisonReport {
    const env1Deps = this.graph.getDependencies(env1Id);
    const env2Deps = this.graph.getDependencies(env2Id);

    const env1Pkgs = env1Deps.filter((d) => d.resourceType === 'PACKAGE').map((p) => p.resourceId);
    const env2Pkgs = env2Deps.filter((d) => d.resourceType === 'PACKAGE').map((p) => p.resourceId);

    const matchingPkgs = env1Pkgs.filter((p) => env2Pkgs.includes(p));
    const onlyInEnv1 = env1Pkgs.filter((p) => !env2Pkgs.includes(p));
    const onlyInEnv2 = env2Pkgs.filter((p) => !env1Pkgs.includes(p));

    const isIdentical = onlyInEnv1.length === 0 && onlyInEnv2.length === 0;

    return {
      env1Id,
      env2Id,
      packagesDiff: { matching: matchingPkgs, onlyInEnv1, onlyInEnv2 },
      featuresDiff: { matching: [], onlyInEnv1: [], onlyInEnv2: [] },
      servicesDiff: { matching: [], onlyInEnv1: [], onlyInEnv2: [] },
      isIdentical,
      comparedAt: new Date().toISOString(),
    };
  }

  /**
   * Promotes configuration from a lower environment to a higher environment
   */
  async promoteConfiguration(
    sourceEnvId: string,
    targetEnvId: string
  ): Promise<ConfigurationPromotionResult> {
    const diff = this.compareEnvironments(sourceEnvId, targetEnvId);

    const packagesToPromote = diff.packagesDiff.onlyInEnv1;
    for (const pkgId of packagesToPromote) {
      if (this.graph.getNode(pkgId) && this.graph.getNode(targetEnvId)) {
        this.graph.addEdge({
          id: `edge_prom_${targetEnvId}_${pkgId.replace(/[^a-z0-9]/g, '_')}`,
          sourceId: targetEnvId,
          sourceType: 'ENVIRONMENT',
          targetId: pkgId,
          targetType: 'PACKAGE',
          edgeType: 'INSTALLED_IN',
          metadata: { reason: `Configuration promoted from [${sourceEnvId}]` },
        });
      }
    }

    return {
      success: true,
      sourceEnvId,
      targetEnvId,
      packagesPromoted: packagesToPromote,
      promotedAt: new Date().toISOString(),
      reconciliationRequired: packagesToPromote.length > 0,
    };
  }

  private seedPlatformTemplates(): void {
    const templates: ProjectBlueprint[] = [
      {
        id: 'template_hospitality',
        name: 'Restaurant & Hospitality OS Template',
        organizationId: 'platform_core',
        planTier: 'growth',
        environments: [
          { slug: 'production', isProduction: true },
          { slug: 'staging', isProduction: false },
        ],
        packages: ['@orbitox/restaurant', '@orbitox/pos', '@orbitox/commerce'],
        features: ['kds_display', 'qr_trust', 'pos_offline'],
        services: ['svc_ordering', 'svc_kds'],
        quotas: { monthlyApiQuota: 500000, rateLimitRpm: 1200 },
      },
      {
        id: 'template_healthcare',
        name: 'Regional Hospital & Clinical Care Template',
        organizationId: 'platform_core',
        planTier: 'enterprise',
        environments: [
          { slug: 'production', isProduction: true, requireMtls: true },
          { slug: 'staging', isProduction: false },
        ],
        packages: ['@orbitox/hms', '@orbitox/inventory', '@orbitox/finance'],
        features: ['hipaa_audit', 'telehealth', 'ehr_vault'],
        services: ['svc_ehr', 'svc_clinical_audit'],
        quotas: { monthlyApiQuota: 2000000, rateLimitRpm: 5000 },
      },
      {
        id: 'template_retail_omnichannel',
        name: 'Retail & Multi-Store Commerce Template',
        organizationId: 'platform_core',
        planTier: 'pro',
        environments: [
          { slug: 'production', isProduction: true },
          { slug: 'staging', isProduction: false },
        ],
        packages: ['@orbitox/commerce', '@orbitox/pos', '@orbitox/inventory', '@orbitox/crm'],
        features: ['omnichannel_sync', 'realtime_stock'],
        services: ['svc_store_engine', 'svc_pos_hub'],
        quotas: { monthlyApiQuota: 1000000, rateLimitRpm: 2500 },
      },
    ];

    templates.forEach((t) => this.registerBlueprint(t));
  }
}
