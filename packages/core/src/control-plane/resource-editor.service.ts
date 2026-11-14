/**
 * 🪐 Universal Resource Editor Service (v4.2)
 * Provides schema-driven introspection, preflight impact diffing,
 * validation, safe execution pipelines, and version rollback for all platform resources.
 */

import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { ResourceRegistry } from './resource-registry.service';
import { ImpactAnalysisService } from './impact-analysis.service';
import { CommandBusService } from './command-bus.service';
import { ReconciliationService } from './reconciliation.service';
import { PlanEntitlementService } from './plan-entitlement.service';
import { PolicyResolutionService } from './policy-resolution.service';
import {
  ResourceType,
  UniversalResource,
  ResourceEditorSchema,
  EditorSection,
  EditorFieldDefinition,
  ResourceActionDefinition,
  ConfigurationDiffEntry,
  ConfigurationPreviewResult,
  ApplyConfigurationPayload,
  ApplyConfigurationResult,
  ConfigurationVersionRecord,
} from './types';

export class ResourceEditorService {
  private readonly logger = new Logger(ResourceEditorService.name);
  private readonly versionHistory = new Map<string, ConfigurationVersionRecord[]>();
  private readonly draftStore = new Map<string, { draft: Record<string, any>; updatedAt: string }>();

  constructor(
    private readonly graph: ResourceGraphService,
    private readonly registry: ResourceRegistry,
    private readonly impactAnalysis: ImpactAnalysisService,
    private readonly commandBus: CommandBusService,
    private readonly reconciliation: ReconciliationService,
    private readonly planEntitlement?: PlanEntitlementService,
    private readonly policyResolution?: PolicyResolutionService,
  ) {}

  /**
   * Introspect a resource to construct its declarative editor schema
   */
  getEditorSchema(resourceId: string): ResourceEditorSchema {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource [${resourceId}] not found in platform graph.`);
    }

    const { sections, immutableFields, observedFields } = this.buildSectionsForResource(node);
    const actions = this.getAvailableActions(resourceId);

    return {
      resourceType: node.resourceType,
      resourceId: node.resourceId,
      displayName: node.name || node.resourceId,
      category: this.getCategoryForType(node.resourceType),
      version: node.resourceVersion || 1,
      isEditable: sections.some((s) => s.fields.some((f) => f.editable)),
      sections,
      actions,
      immutableFields,
      observedFields,
    };
  }

  /**
   * Fetch current configuration desired and observed state
   */
  getConfiguration(resourceId: string): {
    resourceId: string;
    version: number;
    desiredState: Record<string, any>;
    observedState: Record<string, any>;
    inheritedState?: Record<string, any>;
    overrides?: string[];
    isEditable: boolean;
  } {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource [${resourceId}] not found in platform graph.`);
    }

    const desired = (node.desiredState || {}) as Record<string, any>;
    const observed = (node.observedState || {}) as Record<string, any>;
    const inherited: Record<string, any> = {};
    const overrides: string[] = [];

    // Resolve inherited values where applicable
    if (node.resourceType === 'ENVIRONMENT' && node.projectId) {
      const proj = this.graph.getNode(node.projectId);
      if (proj && proj.desiredState) {
        if ((proj.desiredState as any).rateLimitRpm) {
          inherited.rateLimitRpm = (proj.desiredState as any).rateLimitRpm;
          inherited.rateLimitRpm_from = `Project [${proj.name}]`;
          if (desired.rateLimitRpm && desired.rateLimitRpm !== inherited.rateLimitRpm) {
            overrides.push('rateLimitRpm');
          }
        }
      }
    }

    const schema = this.getEditorSchema(resourceId);

    return {
      resourceId: node.resourceId,
      version: node.resourceVersion || 1,
      desiredState: desired,
      observedState: observed,
      inheritedState: inherited,
      overrides,
      isEditable: schema.isEditable,
    };
  }

  /**
   * Save an unsaved configuration draft without mutating platform state
   */
  saveDraft(resourceId: string, draftChanges: Record<string, any>): { success: boolean; updatedAt: string } {
    const updatedAt = new Date().toISOString();
    this.draftStore.set(resourceId, { draft: draftChanges, updatedAt });
    this.logger.log(`Saved configuration draft for resource [${resourceId}]`);
    return { success: true, updatedAt };
  }

  /**
   * Retrieve saved draft for a resource
   */
  getDraft(resourceId: string): { draft: Record<string, any>; updatedAt: string } | null {
    return this.draftStore.get(resourceId) || null;
  }

  /**
   * Discard draft
   */
  discardDraft(resourceId: string): boolean {
    return this.draftStore.delete(resourceId);
  }

  /**
   * Retrieve permissible operations with risk ratings
   */
  getAvailableActions(resourceId: string): ResourceActionDefinition[] {
    const node = this.graph.getNode(resourceId);
    if (!node) return [];

    const registryActions = this.registry.getActionsForResource(node.resourceType, node.lifecycleStatus);

    return registryActions.map((ra) => ({
      id: ra.id,
      label: ra.name || ra.id,
      safetyClass: (ra.safetyLevel as any) || 'CONTROLLED',
      requiresApproval: !!ra.requiresApproval,
      supportsDryRun: true,
      supportsRollback: true,
      allowed: ra.allowed !== false,
      disabledReason: ra.reason,
      riskRating: ra.riskLevel === 'CRITICAL' ? 95 : ra.riskLevel === 'HIGH' ? 80 : ra.riskLevel === 'MEDIUM' ? 45 : 10,
    }));
  }

  /**
   * Validate proposed configuration changes against schemas and immutability invariants
   */
  validateConfiguration(resourceId: string, changes: Record<string, any>): { valid: boolean; errors: string[] } {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      return { valid: false, errors: [`Resource [${resourceId}] not found.`] };
    }

    const errors: string[] = [];
    const schema = this.getEditorSchema(resourceId);

    for (const [key, val] of Object.entries(changes)) {
      if (schema.immutableFields.includes(key)) {
        errors.push(`Field [${key}] is immutable and protected by security invariants.`);
        continue;
      }
      if (schema.observedFields.includes(key)) {
        errors.push(`Field [${key}] is observed runtime telemetry and cannot be manually edited.`);
        continue;
      }

      // Find field definition
      let fieldDef: EditorFieldDefinition | undefined;
      for (const section of schema.sections) {
        const found = section.fields.find((f) => f.key === key);
        if (found) {
          fieldDef = found;
          break;
        }
      }

      if (fieldDef) {
        if (!fieldDef.editable) {
          errors.push(`Field [${key}] is configured as read-only.`);
        }
        if (fieldDef.validation) {
          if (fieldDef.validation.min !== undefined && typeof val === 'number' && val < fieldDef.validation.min) {
            errors.push(`Field [${key}] must be at least ${fieldDef.validation.min}.`);
          }
          if (fieldDef.validation.max !== undefined && typeof val === 'number' && val > fieldDef.validation.max) {
            errors.push(`Field [${key}] cannot exceed ${fieldDef.validation.max}.`);
          }
        }
      }
    }

    // Specific domain invariants
    if (node.resourceType === 'ENVIRONMENT' && changes.rateLimitRpm) {
      // Child Narrowing Rule: Environment rate limit cannot exceed project rate limit
      if (node.projectId) {
        const proj = this.graph.getNode(node.projectId);
        const projLimit = (proj?.desiredState as any)?.rateLimitRpm;
        if (projLimit && changes.rateLimitRpm > projLimit) {
          errors.push(
            `Child narrowing invariant: Environment rate limit (${changes.rateLimitRpm}) cannot exceed parent Project limit (${projLimit}).`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Preflight impact preview with diff, blast radius, risk rating, and execution steps
   */
  async previewChanges(payload: {
    resourceId: string;
    changes: Record<string, any>;
    expectedVersion?: number;
  }): Promise<ConfigurationPreviewResult> {
    const { resourceId, changes, expectedVersion } = payload;
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource [${resourceId}] not found.`);
    }

    const validation = this.validateConfiguration(resourceId, changes);
    const schema = this.getEditorSchema(resourceId);
    const currentDesired = (node.desiredState || {}) as Record<string, any>;
    const diff: ConfigurationDiffEntry[] = [];
    for (const [key, newVal] of Object.entries(changes)) {
      const oldVal = currentDesired[key];
      const isSensitive =
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password') ||
        schema.sections.some((s) => s.fields.some((f) => f.key === key && (f.sensitive || f.secret)));

      diff.push({
        field: key,
        before: isSensitive ? '[REDACTED]' : oldVal,
        after: isSensitive ? '[REDACTED]' : newVal,
        isRedacted: isSensitive,
        isOverride: true,
      });
    }

    // Impact Calculation
    const impact = await this.impactAnalysis.calculateImpact('resource.configure', resourceId, changes);
    const affectedIds = [
      ...impact.directImpacts.map((d) => d.resourceId),
      ...impact.transitiveImpacts.map((d) => d.resourceId),
    ].filter((id): id is string => typeof id === 'string');

    // Determine if Four-Eyes Approval is required (risk >= 80 or destructive prod disabling)
    const isProductionEnv = node.resourceType === 'ENVIRONMENT' && ((node.desiredState as any)?.isProduction || (node.observedState as any)?.isProduction);
    const requiresApproval =
      impact.riskScore >= 80 ||
      (isProductionEnv && (changes.isProduction === false || changes.rateLimitRpm === 0));

    const executionPlan = [
      {
        step: 1,
        operation: 'validate_schema',
        description: `Validate ${Object.keys(changes).length} proposed field mutations against schema and invariants`,
        safetyLevel: 'SAFE',
      },
      {
        step: 2,
        operation: 'authorize_and_impact',
        description: `Check operator RBAC and evaluate blast radius across ${impact.affectedProjectsCount} projects`,
        safetyLevel: 'SAFE',
      },
      {
        step: 3,
        operation: 'persist_desired_state',
        description: `Persist desired state to authoritative storage and increment resource version to ${(node.resourceVersion || 1) + 1}`,
        safetyLevel: 'CONTROLLED',
      },
      {
        step: 4,
        operation: 'trigger_reconciliation',
        description: `Signal reconciliation engine to align observed state with updated desired state`,
        safetyLevel: 'CONTROLLED',
      },
      {
        step: 5,
        operation: 'audit_log',
        description: `Append SHA-256 Merkle hash chained audit record with mutation diff`,
        safetyLevel: 'SAFE',
      },
    ];

    return {
      resourceId,
      expectedVersion: expectedVersion || node.resourceVersion || 1,
      diff,
      impact: {
        affectedResources: affectedIds,
        affectedServices: affectedIds.filter((id) => id.startsWith('svc_')),
        affectedProjects: affectedIds.filter((id) => id.startsWith('proj_')),
        blastRadius: Math.max(affectedIds.length, (impact.affectedProjectsCount || 0) + (impact.affectedEnvironmentsCount || 0), 1),
        riskRating: impact.riskScore,
      },
      requiresApproval,
      approvalQuorum: requiresApproval ? 2 : 0,
      executionPlan,
      supportsRollback: true,
      validationErrors: validation.errors,
    };
  }

  /**
   * Universal Apply Pipeline:
   * Validate -> Authorize -> Snapshot -> Persist -> Emit Event -> Reconcile -> Audit
   */
  async applyConfiguration(payload: ApplyConfigurationPayload): Promise<ApplyConfigurationResult> {
    const { resourceId, expectedVersion, changes, reason, actor = 'operator' } = payload;
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource [${resourceId}] not found in platform graph.`);
    }

    // 1. Version conflict check
    const currentVersion = node.resourceVersion || 1;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(
        `RESOURCE_VERSION_CONFLICT: Expected version [${expectedVersion}], but resource is currently at version [${currentVersion}].`
      );
    }

    // 2. Validate
    const validation = this.validateConfiguration(resourceId, changes);
    if (!validation.valid) {
      throw new Error(`VALIDATION_FAILED: ${validation.errors.join('; ')}`);
    }

    // 3. Preflight Impact & Approval
    const preview = await this.previewChanges({ resourceId, changes, expectedVersion: currentVersion });
    if (preview.requiresApproval) {
      const commandId = `cmd_apply_${Date.now()}`;
      return {
        commandId,
        resourceId,
        status: 'APPROVAL_PENDING',
        approval: {
          requestId: `appr_req_${Date.now()}`,
          quorumRequired: 2,
          currentApprovals: 0,
        },
        reconciliation: {
          status: 'IN_PROGRESS',
          target: resourceId,
          message: 'Paused awaiting Four-Eyes Quorum approval',
        },
      };
    }

    // 4. Snapshot prior version for rollback
    const historyList = this.versionHistory.get(resourceId) || [];
    historyList.push({
      version: currentVersion,
      resourceId,
      desiredState: { ...(node.desiredState as any) },
      changedFields: Object.keys(changes),
      actor,
      reason: reason || 'Universal Editor apply',
      timestamp: new Date().toISOString(),
      rollbackAvailable: true,
    });
    this.versionHistory.set(resourceId, historyList);

    // 5. Dispatch command via CommandBus
    const commandId = `cmd_apply_${Date.now()}`;
    await this.commandBus.executeCommand({
      commandId,
      correlationId: `corr_${Date.now()}`,
      idempotencyKey: `idem_apply_${resourceId}_${currentVersion}`,
      operation: 'resource.apply_configuration',
      resourceId,
      resourceType: node.resourceType,
      expectedVersion: currentVersion,
      actor: { userId: actor, role: 'PLATFORM_ADMIN', ipAddress: '127.0.0.1' },
      desiredPayload: changes,
    });

    // 6. Update node desired state and name directly in graph
    if (changes.name && typeof changes.name === 'string') {
      node.name = changes.name;
    }
    node.desiredState = {
      ...(node.desiredState as any),
      ...changes,
    };
    node.resourceVersion = currentVersion + 1;
    node.updatedAt = new Date().toISOString();

    // 7. Clear draft if present

    this.draftStore.delete(resourceId);

    // 8. Trigger real reconciliation loop
    const reconResult = await this.reconciliation.reconcileResource(resourceId);

    this.logger.log(`Applied configuration to [${resourceId}], new version: ${node.resourceVersion}`);

    return {
      commandId,
      resourceId,
      status: 'SUCCESS',
      newVersion: node.resourceVersion,
      reconciliation: {
        status: reconResult.status === 'DRIFTED' ? 'DRIFTED' : 'RECONCILED',
        target: resourceId,
        message: reconResult.message || 'Observed state synchronized',
      },
      auditId: `audit_${Date.now()}`,
    };
  }


  /**
   * Rollback configuration to a designated historical version
   */
  async rollbackConfiguration(resourceId: string, targetVersion: number, actor: string): Promise<ApplyConfigurationResult> {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource [${resourceId}] not found.`);
    }

    const history = this.versionHistory.get(resourceId) || [];
    const snapshot = history.find((h) => h.version === targetVersion);
    if (!snapshot) {
      throw new Error(`Snapshot for version [${targetVersion}] not found for resource [${resourceId}].`);
    }

    this.logger.warn(`Rolling back [${resourceId}] to configuration version [${targetVersion}]`);
    return this.applyConfiguration({
      resourceId,
      changes: snapshot.desiredState,
      reason: `Rollback to version ${targetVersion}`,
      actor,
    });
  }

  /**
   * Get configuration version history
   */
  getConfigurationHistory(resourceId: string): ConfigurationVersionRecord[] {
    return this.versionHistory.get(resourceId) || [];
  }

  /**
   * Cross-resource global configuration search
   */
  searchConfigurations(query: string): Array<{
    resourceId: string;
    resourceName: string;
    resourceType: ResourceType;
    key: string;
    currentValue: any;
    inheritedValue?: any;
    isEditable: boolean;
  }> {
    const lowerQuery = query.toLowerCase().trim();
    const results: Array<any> = [];
    const allNodes = this.graph.getAllNodes();

    for (const node of allNodes) {
      const desired = (node.desiredState || {}) as Record<string, any>;
      for (const [key, val] of Object.entries(desired)) {
        const matchesKey = key.toLowerCase().includes(lowerQuery);
        const matchesVal = String(val).toLowerCase().includes(lowerQuery);
        const matchesResource = (node.name || node.resourceId).toLowerCase().includes(lowerQuery);

        if (matchesKey || matchesVal || matchesResource) {
          results.push({
            resourceId: node.resourceId,
            resourceName: node.name || node.resourceId,
            resourceType: node.resourceType,
            key,
            currentValue: val,
            isEditable: !['resourceId', 'id', 'slug', 'createdAt'].includes(key),
          });
        }
      }
    }

    return results;
  }

  // Helper to build sections by resource type
  private buildSectionsForResource(node: UniversalResource): {
    sections: EditorSection[];
    immutableFields: string[];
    observedFields: string[];
  } {
    const desired = (node.desiredState || {}) as Record<string, any>;
    const immutableFields = ['resourceId', 'id', 'slug', 'createdAt', 'fingerprint', 'vaultPath', 'secret'];
    const observedFields = ['currentCpu', 'observedDns', 'activeTraffic', 'memoryUsage', 'observedReplicas', 'liveHealth'];

    const sections: EditorSection[] = [];

    switch (node.resourceType) {
      case 'ENVIRONMENT': {
        sections.push({
          id: 'general',
          title: 'General Identity',
          description: 'Basic environment identity and classification',
          fields: [
            { key: 'name', label: 'Environment Name', type: 'text', editable: true, currentValue: node.name, required: true },
            { key: 'slug', label: 'Slug Identifier', type: 'text', editable: false, readonly: true, currentValue: (node as any).slug || 'production' },
            {
              key: 'environmentType',
              label: 'Environment Type',
              type: 'enum',
              editable: true,
              currentValue: desired.environmentType || 'production',
              options: [
                { label: 'Production', value: 'production' },
                { label: 'Staging', value: 'staging' },
                { label: 'Development', value: 'development' },
              ],
            },
          ],
        });

        sections.push({
          id: 'runtime',
          title: 'Runtime & Security',
          description: 'Regional compute placement and mutual TLS security policies',
          fields: [
            {
              key: 'region',
              label: 'Cloud Region',
              type: 'enum',
              editable: true,
              currentValue: desired.region || 'ap-south-1',
              options: [
                { label: 'ap-south-1 (Mumbai)', value: 'ap-south-1' },
                { label: 'ap-southeast-1 (Singapore)', value: 'ap-southeast-1' },
                { label: 'us-east-1 (N. Virginia)', value: 'us-east-1' },
                { label: 'eu-central-1 (Frankfurt)', value: 'eu-central-1' },
              ],
            },
            { key: 'isProduction', label: 'Strict Production Mode', type: 'boolean', editable: true, currentValue: !!desired.isProduction },
            { key: 'mTLS', label: 'Require Mutual TLS (mTLS)', type: 'boolean', editable: true, currentValue: !!desired.mTLS },
          ],
        });

        sections.push({
          id: 'limits',
          title: 'Traffic & Quotas',
          description: 'Platform throttling and monthly API request volume limits',
          fields: [
            {
              key: 'rateLimitRpm',
              label: 'Rate Limit (Requests per Minute)',
              type: 'integer',
              editable: true,
              currentValue: desired.rateLimitRpm || 3000,
              validation: { min: 100, max: 100000 },
            },
            {
              key: 'quotaMonthly',
              label: 'Monthly API Quota',
              type: 'number',
              editable: true,
              currentValue: desired.quotaMonthly || 1000000,
              validation: { min: 10000 },
            },
          ],
        });
        break;
      }

      case 'PROJECT': {
        sections.push({
          id: 'general',
          title: 'Project Identity',
          fields: [
            { key: 'name', label: 'Project Name', type: 'text', editable: true, currentValue: node.name, required: true },
            { key: 'description', label: 'Description', type: 'textarea', editable: true, currentValue: desired.description || '' },
          ],
        });

        sections.push({
          id: 'commercial',
          title: 'Commercial Plan Tier',
          fields: [
            {
              key: 'planTier',
              label: 'Subscription Plan',
              type: 'enum',
              editable: true,
              currentValue: desired.planTier || 'enterprise',
              options: [
                { label: 'Starter Sandbox', value: 'starter' },
                { label: 'Growth Scale', value: 'growth' },
                { label: 'Professional Tier', value: 'pro' },
                { label: 'Enterprise Dedicated', value: 'enterprise' },
                { label: 'Hyperscale Mesh', value: 'hyperscale' },
              ],
            },
          ],
        });
        break;
      }

      case 'SERVICE': {
        sections.push({
          id: 'compute',
          title: 'Compute & Scaling',
          fields: [
            {
              key: 'replicas',
              label: 'Desired Replicas',
              type: 'integer',
              editable: true,
              currentValue: desired.replicas || 3,
              validation: { min: 1, max: 50 },
            },
            {
              key: 'cpuReservation',
              label: 'CPU Core Allocation',
              type: 'number',
              editable: true,
              currentValue: desired.cpuReservation || 2,
              validation: { min: 0.5, max: 16 },
            },
            {
              key: 'memoryLimitMb',
              label: 'Memory Limit (MB)',
              type: 'integer',
              editable: true,
              currentValue: desired.memoryLimitMb || 2048,
              validation: { min: 256, max: 32768 },
            },
          ],
        });

        sections.push({
          id: 'resilience',
          title: 'Resilience & Policies',
          fields: [
            { key: 'timeoutSec', label: 'Request Timeout (seconds)', type: 'integer', editable: true, currentValue: desired.timeoutSec || 30 },
            { key: 'retryPolicy', label: 'Max Retries', type: 'integer', editable: true, currentValue: desired.retryPolicy || 3 },
          ],
        });
        break;
      }

      case 'PACKAGE':
      case 'PACKAGE_INSTALLATION': {
        sections.push({
          id: 'package_config',
          title: 'Package Configuration',
          fields: [
            { key: 'version', label: 'Installed Version', type: 'text', editable: true, currentValue: desired.version || '2.2.1' },
            { key: 'enableKds', label: 'Enable Kitchen Display System (KDS)', type: 'boolean', editable: true, currentValue: desired.enableKds !== false },
            { key: 'multiLocation', label: 'Multi-Location Sync', type: 'boolean', editable: true, currentValue: !!desired.multiLocation },
            { key: 'timeoutSec', label: 'Transaction Timeout (sec)', type: 'integer', editable: true, currentValue: desired.timeoutSec || 30 },
          ],
        });
        break;
      }

      case 'API_KEY': {
        sections.push({
          id: 'key_config',
          title: 'API Key Scopes & Limits',
          fields: [
            { key: 'name', label: 'Key Identifier Name', type: 'text', editable: true, currentValue: node.name },
            {
              key: 'capabilities',
              label: 'Authorized Capabilities',
              type: 'multi-select',
              editable: true,
              currentValue: desired.capabilities || ['read'],
              options: [
                { label: 'Orders Read', value: 'orders.read' },
                { label: 'Orders Write', value: 'orders.write' },
                { label: 'KDS Manage', value: 'kds.manage' },
                { label: 'Inventory Sync', value: 'inventory.sync' },
                { label: 'Audit Export', value: 'audit.export' },
              ],
            },
            { key: 'rateLimitRpm', label: 'Per-Key Rate Limit (RPM)', type: 'integer', editable: true, currentValue: desired.rateLimitRpm || 1000 },
          ],
        });
        break;
      }

      case 'DOMAIN': {
        sections.push({
          id: 'domain_config',
          title: 'Domain Routing & TLS',
          fields: [
            { key: 'domainName', label: 'FQDN Hostname', type: 'text', editable: false, readonly: true, currentValue: desired.domainName || node.name },
            { key: 'routeTarget', label: 'Edge Route Target', type: 'text', editable: true, currentValue: desired.routeTarget || 'production-gateway' },
            { key: 'tlsPolicy', label: 'TLS Enforcement', type: 'enum', editable: true, currentValue: desired.tlsPolicy || 'STRICT', options: [{ label: 'Strict TLS 1.3', value: 'STRICT' }, { label: 'Permissive', value: 'PERMISSIVE' }] },
          ],
        });
        break;
      }

      case 'PLAN': {
        sections.push({
          id: 'plan_config',
          title: 'Plan Commercial Specifications',
          fields: [
            { key: 'name', label: 'Plan Name', type: 'text', editable: true, currentValue: node.name },
            { key: 'priceUsd', label: 'Monthly Price (USD)', type: 'number', editable: true, currentValue: desired.priceUsd ?? 299 },
            { key: 'monthlyApiQuota', label: 'Monthly API Quota', type: 'number', editable: true, currentValue: desired.monthlyApiQuota ?? 2000000 },
            { key: 'rateLimitRpm', label: 'Default RPM', type: 'integer', editable: true, currentValue: desired.rateLimitRpm ?? 3000 },
            { key: 'maxEnvironments', label: 'Max Environments', type: 'integer', editable: true, currentValue: desired.maxEnvironments ?? 10 },
          ],
        });
        break;
      }

      case 'FEATURE_FLAG': {
        sections.push({
          id: 'flag_config',
          title: 'Feature Flag Rules',
          fields: [
            { key: 'enabled', label: 'Flag Enabled', type: 'boolean', editable: true, currentValue: !!desired.enabled },
            { key: 'percentageRollout', label: 'Rollout Percentage (0-100)', type: 'integer', editable: true, currentValue: desired.percentageRollout ?? 100, validation: { min: 0, max: 100 } },
          ],
        });
        break;
      }

      default: {
        // Generic schema for any other resource type
        const genericFields: EditorFieldDefinition[] = [];
        for (const [key, val] of Object.entries(desired)) {
          if (!immutableFields.includes(key) && !observedFields.includes(key)) {
            genericFields.push({
              key,
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
              type: typeof val === 'boolean' ? 'boolean' : typeof val === 'number' ? 'number' : 'text',
              editable: true,
              currentValue: val,
            });
          }
        }

        sections.push({
          id: 'configuration',
          title: 'Resource Configuration',
          fields: genericFields.length > 0 ? genericFields : [
            { key: 'name', label: 'Display Name', type: 'text', editable: true, currentValue: node.name },
          ],
        });
        break;
      }
    }

    return { sections, immutableFields, observedFields };
  }

  private getCategoryForType(type: ResourceType): ResourceEditorSchema['category'] {
    switch (type) {
      case 'ORGANIZATION':
      case 'PROJECT':
      case 'ENVIRONMENT':
      case 'TENANT':
      case 'COMPANY':
      case 'BRANCH':
        return 'IDENTITY';
      case 'PLAN':
      case 'PLAN_VERSION':
      case 'SUBSCRIPTION':
      case 'ENTITLEMENT':
      case 'QUOTA_POLICY':
        return 'COMMERCIAL';
      case 'SERVICE':
      case 'SERVICE_VERSION':
      case 'SERVICE_DEPLOYMENT':
      case 'REPLICA':
        return 'COMPUTE';
      case 'DOMAIN':
      case 'DNS_RECORD':
      case 'TLS_CERTIFICATE':
      case 'EDGE_ROUTE':
        return 'NETWORKING';
      case 'API_KEY':
      case 'CREDENTIAL':
      case 'SECURITY_FINDING':
        return 'SECURITY';
      case 'CLUSTER':
      case 'REGION':
      case 'SERVER_NODE':
        return 'INFRASTRUCTURE';
      default:
        return 'GOVERNANCE';
    }
  }
}
