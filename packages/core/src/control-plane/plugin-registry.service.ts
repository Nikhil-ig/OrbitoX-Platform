import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { ResourceRegistry } from './resource-registry.service';
import { PackageManifestContract, UniversalResource } from './types';
import { CommandAuditService } from './command-bus.service';

export interface PluginRegistrationResult {
  success: boolean;
  pluginId: string;
  version: string;
  servicesCount: number;
  apisCount: number;
  capabilitiesCount: number;
  healthChecksCount: number;
  testsCount: number;
  actionsRegistered: string[];
  registeredAt: string;
}

export interface OrphanDetectionReport {
  pluginId: string;
  orphanServices: string[];
  orphanApis: string[];
  orphanCapabilities: string[];
  consumerKeysCount: number;
  blockers: string[];
  isSafeToUninstall: boolean;
}

export interface PluginUninstallResult {
  success: boolean;
  pluginId: string;
  prunedNodesCount: number;
  prunedEdgesCount: number;
  prunedNodes: string[];
  blockers?: string[];
  uninstalledAt: string;
}

export class PluginRegistryService {
  private readonly logger = new Logger(PluginRegistryService.name);
  private readonly installedManifests = new Map<string, PackageManifestContract>();
  private readonly graph: ResourceGraphService;
  private readonly registry: ResourceRegistry;

  constructor(
    arg1: ResourceGraphService | ResourceRegistry,
    arg2: ResourceRegistry | ResourceGraphService,
    private readonly auditService?: CommandAuditService
  ) {
    if (arg1 instanceof ResourceGraphService) {
      this.graph = arg1;
      this.registry = arg2 as ResourceRegistry;
    } else {
      this.registry = arg1 as ResourceRegistry;
      this.graph = arg2 as ResourceGraphService;
    }
  }

  /**
   * Alias for registerPlugin.
   */
  async registerPluginManifest(
    manifest: PackageManifestContract,
    context?: { environmentId?: string; projectId?: string }
  ): Promise<PluginRegistrationResult> {
    return this.registerPlugin(manifest, context);
  }

  /**
   * Installs and auto-registers a plugin declarative manifest into the Control Plane Brain.
   * Auto-prospects and registers resource types, services, APIs, capabilities, health probes, and actions.
   */
  async registerPlugin(
    manifest: PackageManifestContract,
    context?: { environmentId?: string; projectId?: string }
  ): Promise<PluginRegistrationResult> {
    const { id: pluginId, version, dependencies, services, apis, capabilities, healthChecks, tests } = manifest;

    this.logger.log(`Auto-registering plugin [${pluginId}] (v${version}) into Control Plane Brain...`);

    // 1. Register Package Node
    const pkgNode: UniversalResource = {
      resourceId: pluginId,
      resourceType: 'PACKAGE',
      name: manifest.id,
      resourceVersion: 1,
      owner: 'plugin_manifest_engine',
      organizationId: 'platform_core',
      desiredState: {
        version,
        platformCompatibility: manifest.platformCompatibility,
        configuration: manifest.configuration || {},
        status: 'ACTIVE',
      },
      observedState: {
        version,
        status: 'ACTIVE',
        health: 'HEALTHY',
      },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      metadata: {
        dependencies: dependencies || [],
        healthChecks: healthChecks || [],
        tests: tests || [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.graph.registerNode(pkgNode);

    // 2. Link Dependencies
    if (dependencies && dependencies.length > 0) {
      for (const dep of dependencies) {
        const depId = typeof dep === 'string' ? dep : (dep as any).packageId;
        if (this.graph.getNode(depId)) {
          this.graph.addEdge({
            id: `edge_dep_${pluginId.replace(/[^a-z0-9]/g, '_')}_${depId.replace(/[^a-z0-9]/g, '_')}`,
            sourceId: pluginId,
            sourceType: 'PACKAGE',
            targetId: depId,
            targetType: 'PACKAGE',
            edgeType: 'DEPENDS_ON',
            metadata: { reason: `Plugin [${pluginId}] depends on upstream package [${depId}]` },
          });
        }
      }
    }

    // 3. Register Services
    const registeredServices: string[] = [];
    if (services && services.length > 0) {
      for (const svc of services) {
        registeredServices.push(svc.id);
        const svcNode: UniversalResource = {
          resourceId: svc.id,
          resourceType: 'SERVICE',
          name: svc.name || svc.id,
          resourceVersion: 1,
          owner: pluginId,
          organizationId: 'platform_core',
          desiredState: { port: svc.port || 8080, replicas: svc.replicas || 2, status: 'ACTIVE' },
          observedState: { status: 'ACTIVE', replicas: svc.replicas || 2 },
          driftState: 'IN_SYNC',
          lifecycleStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.graph.registerNode(svcNode);

        // Service EXPOSES Package
        this.graph.addEdge({
          id: `edge_svc_pkg_${svc.id}_${pluginId.replace(/[^a-z0-9]/g, '_')}`,
          sourceId: svc.id,
          sourceType: 'SERVICE',
          targetId: pluginId,
          targetType: 'PACKAGE',
          edgeType: 'EXPOSES',
          metadata: { reason: `Service [${svc.name}] exposes runtime logic for [${pluginId}]` },
        });

        // Service RUNS_ON Node if specified
        if (svc.nodeId && this.graph.getNode(svc.nodeId)) {
          this.graph.addEdge({
            id: `edge_svc_node_${svc.id}_${svc.nodeId}`,
            sourceId: svc.id,
            sourceType: 'SERVICE',
            targetId: svc.nodeId,
            targetType: 'SERVER_NODE',
            edgeType: 'RUNS_ON',
            metadata: { reason: `Service scheduled on node [${svc.nodeId}]` },
          });
        }

        // Service EXPOSES APIs if specified
        if (svc.apis && svc.apis.length > 0) {
          for (const apiId of svc.apis) {
            this.graph.addEdge({
              id: `edge_svc_api_${svc.id}_${apiId.replace(/[^a-z0-9]/g, '_')}`,
              sourceId: svc.id,
              sourceType: 'SERVICE',
              targetId: apiId,
              targetType: 'API',
              edgeType: 'EXPOSES',
              metadata: { reason: `Service [${svc.name}] exposes API [${apiId}]` },
            });
          }
        }
      }
    }

    // 4. Register APIs
    const registeredApis: string[] = [];
    if (apis && apis.length > 0) {
      for (const api of apis) {
        const apiId = typeof api === 'string' ? api : api.id;
        const apiName = typeof api === 'string' ? api : (api.name || api.id);
        const apiMethod = typeof api === 'string' ? 'POST' : (api.method || 'POST');
        const apiPath = typeof api === 'string' ? `/api/v1/${apiId}` : (api.path || `/api/v1/${apiId}`);
        registeredApis.push(apiId);
        const apiNode: UniversalResource = {
          resourceId: apiId,
          resourceType: 'API',
          name: apiName,
          resourceVersion: 1,
          owner: pluginId,
          organizationId: 'platform_core',
          desiredState: { method: apiMethod, path: apiPath, status: 'ACTIVE' },
          observedState: { status: 'ACTIVE' },
          driftState: 'IN_SYNC',
          lifecycleStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.graph.registerNode(apiNode);

        // Package EXPOSES API
        this.graph.addEdge({
          id: `edge_pkg_api_${pluginId.replace(/[^a-z0-9]/g, '_')}_${apiId.replace(/[^a-z0-9]/g, '_')}`,
          sourceId: pluginId,
          sourceType: 'PACKAGE',
          targetId: apiId,
          targetType: 'API',
          edgeType: 'EXPOSES',
          metadata: { reason: `Package [${pluginId}] exposes API endpoint [${apiName}]` },
        });
      }
    }

    // 5. Register Capabilities
    const registeredCaps: string[] = [];
    if (capabilities && capabilities.length > 0) {
      for (const cap of capabilities) {
        const capId = typeof cap === 'string' ? cap : cap.id;
        const capName = typeof cap === 'string' ? cap : (cap.name || cap.id);
        const provider = typeof cap === 'string' ? 'default' : (cap.defaultProvider || 'default');
        registeredCaps.push(capId);
        const capNode: UniversalResource = {
          resourceId: capId,
          resourceType: 'API_CAPABILITY',
          name: capName,
          resourceVersion: 1,
          owner: pluginId,
          organizationId: 'platform_core',
          desiredState: { provider, status: 'ACTIVE' },
          observedState: { status: 'ACTIVE' },
          driftState: 'IN_SYNC',
          lifecycleStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.graph.registerNode(capNode);

        // Package PROVIDES API_CAPABILITY
        this.graph.addEdge({
          id: `edge_pkg_cap_${pluginId.replace(/[^a-z0-9]/g, '_')}_${capId.replace(/[^a-z0-9]/g, '_')}`,
          sourceId: pluginId,
          sourceType: 'PACKAGE',
          targetId: capId,
          targetType: 'API_CAPABILITY',
          edgeType: 'PROVIDES',
          metadata: { reason: `Package [${pluginId}] provides capability [${capName}]` },
        });
      }
    }

    // 6. Link into Environment if context given
    if (context?.environmentId && this.graph.getNode(context.environmentId)) {
      this.graph.addEdge({
        id: `edge_inst_${context.environmentId}_${pluginId.replace(/[^a-z0-9]/g, '_')}`,
        sourceId: context.environmentId,
        sourceType: 'ENVIRONMENT',
        targetId: pluginId,
        targetType: 'PACKAGE',
        edgeType: 'INSTALLED_IN',
        metadata: { reason: `Plugin [${pluginId}] mounted in environment [${context.environmentId}]` },
      });
    }

    // 7. Register Operational Actions in ResourceRegistry
    const actionIdInspect = `${pluginId}.inspect`;
    const actionIdTest = `${pluginId}.run_tests`;
    this.registry.registerAction({
      id: actionIdInspect,
      name: `Inspect ${pluginId} State & Manifest`,
      riskLevel: 'LOW',
      safetyLevel: 'SAFE',
      allowed: true,
      requiresApproval: false,
    });
    this.registry.registerAction({
      id: actionIdTest,
      name: `Execute ${pluginId} Test Suite`,
      riskLevel: 'LOW',
      safetyLevel: 'SAFE',
      allowed: true,
      requiresApproval: false,
    });

    // Save manifest in store
    this.installedManifests.set(pluginId, manifest);

    // Audit record
    if (this.auditService) {
      await this.auditService.log({
        userId: 'plugin_manifest_engine',
        userName: 'SYSTEM',
        action: 'plugin.registered',
        resourceType: 'PACKAGE',
        resourceId: pluginId,
        details: {
          version,
          services: registeredServices.length,
          apis: registeredApis.length,
          capabilities: registeredCaps.length,
        },
      });
    }

    return {
      success: true,
      pluginId,
      version,
      servicesCount: registeredServices.length,
      apisCount: registeredApis.length,
      capabilitiesCount: registeredCaps.length,
      healthChecksCount: healthChecks?.length || 0,
      testsCount: tests?.length || 0,
      actionsRegistered: [actionIdInspect, actionIdTest],
      registeredAt: new Date().toISOString(),
    };
  }

  /**
   * Scans the resource graph for orphans or active consumers before uninstalling a plugin.
   */
  detectOrphans(pluginId: string): OrphanDetectionReport {
    const manifest = this.installedManifests.get(pluginId);
    const orphanServices: string[] = manifest?.services?.map((s: any) => (typeof s === 'string' ? s : s.id)) || [];
    const orphanApis: string[] = manifest?.apis?.map((a: any) => (typeof a === 'string' ? a : a.id)) || [];
    const orphanCapabilities: string[] = manifest?.capabilities?.map((c: any) => (typeof c === 'string' ? c : c.id)) || [];
    const blockers: string[] = [];

    // Check if any active API keys are bound to capabilities of this plugin
    let consumerKeysCount = 0;
    const allKeys = this.graph.getAllNodes('API_KEY');
    for (const key of allKeys) {
      const scopes: string[] = (key.desiredState as any)?.capabilities || [];
      const hasOverlap = orphanCapabilities.some((capId) => scopes.includes(capId));
      if (hasOverlap && key.lifecycleStatus === 'ACTIVE') {
        consumerKeysCount++;
        blockers.push(`Active API Key [${key.name}] relies on capability granted by this plugin.`);
      }
    }

    const isSafeToUninstall = blockers.length === 0;

    return {
      pluginId,
      orphanServices,
      orphanApis,
      orphanCapabilities,
      consumerKeysCount,
      blockers,
      isSafeToUninstall,
    };
  }

  /**
   * Safely uninstalls a plugin, removing all dependent child nodes and edges,
   * while enforcing safety invariants against active API key consumers.
   */
  async uninstallPlugin(
    pluginId: string,
    options?: { force?: boolean }
  ): Promise<PluginUninstallResult> {
    const report = this.detectOrphans(pluginId);

    if (!report.isSafeToUninstall && !options?.force) {
      return {
        success: false,
        pluginId,
        prunedNodesCount: 0,
        prunedEdgesCount: 0,
        prunedNodes: [],
        blockers: report.blockers,
        uninstalledAt: new Date().toISOString(),
      };
    }

    const prunedNodes: string[] = [];
    let prunedEdgesCount = 0;

    // 1. Prune APIs
    for (const apiId of report.orphanApis) {
      if (this.graph.removeNode(apiId)) prunedNodes.push(apiId);
    }

    // 2. Prune Capabilities
    for (const capId of report.orphanCapabilities) {
      if (this.graph.removeNode(capId)) prunedNodes.push(capId);
    }

    // 3. Prune Services
    for (const svcId of report.orphanServices) {
      if (this.graph.removeNode(svcId)) prunedNodes.push(svcId);
    }

    // 4. Prune Package Node
    if (this.graph.removeNode(pluginId)) {
      prunedNodes.push(pluginId);
    }

    // 5. Unregister actions
    this.registry.unregisterAction(`${pluginId}.inspect`);
    this.registry.unregisterAction(`${pluginId}.run_tests`);

    this.installedManifests.delete(pluginId);

    // Audit record
    if (this.auditService) {
      await this.auditService.log({
        userId: 'plugin_manifest_engine',
        userName: 'SYSTEM',
        action: 'plugin.uninstalled',
        resourceType: 'PACKAGE',
        resourceId: pluginId,
        details: { prunedNodes: prunedNodes.length },
      });
    }

    return {
      success: true,
      pluginId,
      prunedNodesCount: prunedNodes.length,
      prunedEdgesCount,
      prunedNodes,
      uninstalledAt: new Date().toISOString(),
    };
  }

  getInstalledManifest(pluginId: string): PackageManifestContract | undefined {
    return this.installedManifests.get(pluginId);
  }

  listInstalledPlugins(): PackageManifestContract[] {
    return Array.from(this.installedManifests.values());
  }
}
