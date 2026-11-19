/**
 * 🪐 Universal Resource Registry (ResourceRegistry)
 * Enables platform modules, plugins, and services to self-register resource types,
 * schemas, permitted lifecycle transitions, and health/state resolvers.
 */

import { Logger } from './logger';
import {
  ResourceType,
  UniversalResourceRegistryContract,
  ResourceActionDeclaration,
} from './types';

export class ResourceRegistry {
  private readonly logger = new Logger(ResourceRegistry.name);
  private readonly registry = new Map<ResourceType, UniversalResourceRegistryContract>();
  private readonly actionRegistry = new Map<string, ResourceActionDeclaration>();

  constructor() {
    this.registerStandardResourceTypes();
  }

  /**
   * Register a platform resource type definition
   */
  registerResourceType(contract: UniversalResourceRegistryContract): void {
    this.registry.set(contract.type, contract);
    this.logger.debug(`Registered platform resource type [${contract.type}] with ${contract.relationships?.length || 0} relationships`);
  }

  /**
   * Get registration contract for a given resource type
   */
  getResourceType(type: ResourceType): UniversalResourceRegistryContract | undefined {
    return this.registry.get(type);
  }

  /**
   * List all registered resource types
   */
  listRegisteredTypes(): UniversalResourceRegistryContract[] {
    return Array.from(this.registry.values());
  }

  unregisterResourceType(type: ResourceType): boolean {
    const deleted = this.registry.delete(type);
    if (deleted) this.logger.debug(`Unregistered resource type [${type}]`);
    return deleted;
  }

  /**
   * Register a permitted operational action with risk and safety classifications
   */
  registerAction(action: ResourceActionDeclaration): void {
    this.actionRegistry.set(action.id, action);
  }

  unregisterAction(actionId: string): boolean {
    return this.actionRegistry.delete(actionId);
  }

  /**
   * Get permitted actions for a given resource
   */
  getActionsForResource(resourceType: ResourceType, state?: string): ResourceActionDeclaration[] {
    const typeDef = this.registry.get(resourceType);
    if (!typeDef || !typeDef.actions) return [];

    return typeDef.actions
      .map((actionId) => this.actionRegistry.get(actionId))
      .filter((a): a is ResourceActionDeclaration => !!a)
      .map((action) => {
        // Enforce state machine rules
        if (state === 'ARCHIVED' || state === 'DECOMMISSIONED') {
          return {
            ...action,
            allowed: false,
            reason: `Resource is in terminal state [${state}]`,
          };
        }
        return action;
      });
  }

  private registerStandardResourceTypes(): void {
    // 1. Organization & Tenancy Hierarchy
    this.registerResourceType({
      type: 'ORGANIZATION',
      relationships: ['OWNS'],
      actions: ['org.inspect', 'org.suspend', 'org.update_compliance'],
      permissions: ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN'],
      lifecycle: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'PROJECT',
      relationships: ['OWNS', 'CONTAINS', 'ENTITLED_BY'],
      actions: ['project.inspect', 'project.assign_plan', 'project.suspend', 'project.archive'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'],
    });

    this.registerResourceType({
      type: 'ENVIRONMENT',
      relationships: ['CONTAINS', 'INSTALLED_IN', 'ROUTES_TO', 'LIMITED_BY'],
      actions: ['environment.inspect', 'environment.freeze', 'environment.deploy', 'environment.scale'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN', 'INFRA_LEAD'],
      lifecycle: ['PROVISIONING', 'ACTIVE', 'DEGRADED', 'SUSPENDED'],
    });

    this.registerResourceType({
      type: 'TENANT',
      relationships: ['CONTAINS', 'OWNS', 'ENTITLED_BY'],
      actions: ['tenant.inspect', 'tenant.suspend', 'tenant.migrate'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'COMPANY',
      relationships: ['OWNS', 'CONTAINS'],
      actions: ['company.inspect', 'company.update'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['ACTIVE', 'SUSPENDED'],
    });

    this.registerResourceType({
      type: 'BRANCH',
      relationships: ['CONTAINS', 'HOSTS'],
      actions: ['branch.inspect', 'branch.update'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['ACTIVE', 'SUSPENDED'],
    });

    // 2. Billing & Monetization
    this.registerResourceType({
      type: 'PLAN',
      relationships: ['ENTITLED_BY', 'CONTAINS'],
      actions: ['plan.inspect', 'plan.publish', 'plan.downgrade', 'plan.assign'],
      permissions: ['PLATFORM_SUPERADMIN', 'BILLING_ADMIN'],
      lifecycle: ['ACTIVE', 'DEPRECATED', 'ARCHIVED'],
    });

    this.registerResourceType({
      type: 'SUBSCRIPTION',
      relationships: ['SUBSCRIBED_TO', 'ENTITLED_BY'],
      actions: ['subscription.inspect', 'subscription.cancel'],
      permissions: ['PLATFORM_SUPERADMIN', 'BILLING_ADMIN'],
      lifecycle: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'FEATURE_FLAG',
      relationships: ['FLAGS', 'GOVERNS'],
      actions: ['feature_flag.inspect', 'feature_flag.toggle', 'feature_flag.set'],
      permissions: ['PLATFORM_SUPERADMIN', 'RELEASE_MANAGER'],
      lifecycle: ['ACTIVE', 'DECOMMISSIONED'],
    });

    // 3. Supply Chain & Plugins
    this.registerResourceType({
      type: 'PACKAGE',
      relationships: ['DEPENDS_ON', 'INSTALLED_IN', 'EXPOSES', 'REQUIRES'],
      actions: ['package.inspect', 'package.verify_signature', 'package.install', 'package.upgrade', 'package.rollback', 'package.disable'],
      permissions: ['PLATFORM_SUPERADMIN', 'RELEASE_MANAGER'],
      lifecycle: ['ACTIVE', 'DEGRADED', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'PLUGIN',
      relationships: ['INSTALLS', 'EXPOSES'],
      actions: ['plugin.inspect', 'plugin.activate', 'plugin.deactivate'],
      permissions: ['PLATFORM_SUPERADMIN', 'RELEASE_MANAGER'],
      lifecycle: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    // 4. Services & APIs
    this.registerResourceType({
      type: 'SERVICE',
      relationships: ['EXPOSES', 'RUNS_ON', 'CONSUMES'],
      actions: ['service.inspect', 'service.deploy', 'service.scale', 'service.drain', 'service.restart'],
      permissions: ['PLATFORM_SUPERADMIN', 'SRE'],
      lifecycle: ['ACTIVE', 'DEGRADED', 'SUSPENDED'],
    });

    this.registerResourceType({
      type: 'API',
      relationships: ['EXPOSES', 'REQUIRES', 'GOVERNS'],
      actions: ['api.inspect', 'api.publish', 'api.deprecate', 'api.retire'],
      permissions: ['PLATFORM_SUPERADMIN', 'RELEASE_MANAGER'],
      lifecycle: ['ACTIVE', 'DEPRECATED', 'RETIRED'],
    });

    this.registerResourceType({
      type: 'API_CAPABILITY',
      relationships: ['PROVIDES', 'USES'],
      actions: ['capability.inspect'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['ACTIVE'],
    });

    // 5. Security & Credentials
    this.registerResourceType({
      type: 'API_KEY',
      relationships: ['AUTHORIZES', 'BOUND_TO', 'LIMITED_BY'],
      actions: ['key.inspect', 'key.explain_auth', 'key.rotate', 'key.suspend', 'key.revoke'],
      permissions: ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN'],
      lifecycle: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'CREDENTIAL',
      relationships: ['PROTECTED_BY', 'CONSUMES'],
      actions: ['credential.inspect', 'credential.rotate', 'credential.revoke', 'credential.verify_health'],
      permissions: ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN'],
      lifecycle: ['ACTIVE', 'DEGRADED', 'DECOMMISSIONED'],
    });

    // 6. Network & Edge
    this.registerResourceType({
      type: 'DOMAIN',
      relationships: ['ROUTES_TO'],
      actions: ['domain.inspect', 'domain.verify_dns', 'domain.renew_tls', 'domain.retire'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['PROVISIONING', 'ACTIVE', 'DEGRADED', 'RETIRED'],
    });

    // 7. Compute & Infrastructure
    this.registerResourceType({
      type: 'SERVER_NODE',
      relationships: ['RUNS_ON', 'HOSTS'],
      actions: ['node.inspect', 'node.cordon', 'node.drain', 'node.unseal', 'node.retire'],
      permissions: ['PLATFORM_SUPERADMIN', 'SRE'],
      lifecycle: ['ACTIVE', 'DRAINING', 'DRAINED', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'SERVICE_DEPLOYMENT',
      relationships: ['DEPLOYS_TO', 'RUNS_ON'],
      actions: ['deployment.inspect', 'deployment.rollback'],
      permissions: ['PLATFORM_SUPERADMIN', 'SRE'],
      lifecycle: ['ACTIVE', 'DEGRADED'],
    });

    // 8. AI & MCP
    this.registerResourceType({
      type: 'AI_MODEL',
      relationships: ['INVOKES'],
      actions: ['ai_model.inspect', 'ai_model.deploy'],
      permissions: ['PLATFORM_SUPERADMIN', 'AI_ADMIN'],
      lifecycle: ['ACTIVE', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'MCP_SERVER',
      relationships: ['HOSTS', 'EXPOSES'],
      actions: ['mcp_server.inspect', 'mcp_server.restart'],
      permissions: ['PLATFORM_SUPERADMIN', 'AI_ADMIN'],
      lifecycle: ['ACTIVE', 'DEGRADED'],
    });

    this.registerResourceType({
      type: 'MCP_TOOL',
      relationships: ['INVOKES', 'PROVIDES'],
      actions: ['mcp_tool.inspect', 'mcp_tool.invoke'],
      permissions: ['PLATFORM_SUPERADMIN', 'AI_ADMIN'],
      lifecycle: ['ACTIVE'],
    });

    // 9. Governance & Workflows
    this.registerResourceType({
      type: 'APPROVAL',
      relationships: ['REQUIRES_APPROVAL', 'GOVERNS'],
      actions: ['approval.inspect', 'approval.approve', 'approval.reject'],
      permissions: ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN'],
      lifecycle: ['ACTIVE', 'DECOMMISSIONED'],
    });

    this.registerResourceType({
      type: 'WORKFLOW',
      relationships: ['TRIGGERS', 'AFFECTS'],
      actions: ['workflow.inspect', 'workflow.trigger'],
      permissions: ['PLATFORM_SUPERADMIN', 'PLATFORM_ADMIN'],
      lifecycle: ['ACTIVE', 'DECOMMISSIONED'],
    });

    // Standard Actions Catalogue
    const actions: ResourceActionDeclaration[] = [
      // Supply chain
      { id: 'package.upgrade', name: 'Upgrade Package Version', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'package.rollback', name: 'Rollback Package Artifact', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'package.install', name: 'Install Package into Environment', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'package.verify_signature', name: 'Verify Ed25519 Package Signature', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'package.disable', name: 'Disable Package', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },

      // Tenancy & Projects
      { id: 'tenant.create', name: 'Provision Multi-Tenant Context', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'tenant.suspend', name: 'Suspend Tenant Traffic', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'tenant.migrate', name: 'Migrate Tenant Domain', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'project.assign_plan', name: 'Assign Subscription Plan Tier', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },

      // Billing & Features
      { id: 'plan.publish', name: 'Publish Plan Specification', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'plan.downgrade', name: 'Downgrade Project Plan Tier', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'subscription.cancel', name: 'Cancel Billing Subscription', riskLevel: 'HIGH', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'feature_flag.toggle', name: 'Toggle Feature Flag Status', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'feature_flag.set', name: 'Set Feature Flag Override', riskLevel: 'MEDIUM', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },

      // Security
      { id: 'key.create', name: 'Issue Machine API Key', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'key.rotate', name: 'Staged Key Rotation', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'key.revoke', name: 'Emergency Key Revocation', riskLevel: 'CRITICAL', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },
      { id: 'key.explain_auth', name: 'Explain Effective Authorization', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'credential.rotate', name: 'Staged Secret Rotation (Zero-Downtime)', riskLevel: 'HIGH', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'credential.revoke', name: 'Purge Vault Credential', riskLevel: 'CRITICAL', safetyLevel: 'MANUAL_ONLY', allowed: true, requiresApproval: true },

      // Compute & Services
      { id: 'node.drain', name: 'Drain Compute Workloads', riskLevel: 'HIGH', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'node.cordon', name: 'Cordon Node from Scheduling', riskLevel: 'MEDIUM', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'service.deploy', name: 'Deploy Service Workload', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'service.scale', name: 'Adjust Desired Replicas', riskLevel: 'MEDIUM', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'service.drain', name: 'Drain Service Traffic', riskLevel: 'HIGH', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },

      // Edge & Domains
      { id: 'domain.verify_dns', name: 'Probe DNS Propagation & TLS', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'domain.renew_tls', name: 'Renew TLS Edge Certificate', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },
      { id: 'environment.freeze', name: 'Emergency Traffic Freeze', riskLevel: 'CRITICAL', safetyLevel: 'APPROVAL_REQUIRED', allowed: true, requiresApproval: true },

      // AI & MCP
      { id: 'mcp_tool.invoke', name: 'Invoke MCP Tool via Command Bus', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'ai_policy.enforce', name: 'Enforce AI Guardrail Policy', riskLevel: 'LOW', safetyLevel: 'SAFE', allowed: true, requiresApproval: false },

      // Governance
      { id: 'approval.approve', name: 'Approve Stage Quorum', riskLevel: 'HIGH', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'approval.reject', name: 'Reject Approval Request', riskLevel: 'HIGH', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
      { id: 'workflow.trigger', name: 'Trigger Orchestrated Workflow', riskLevel: 'MEDIUM', safetyLevel: 'CONTROLLED', allowed: true, requiresApproval: false },
    ];

    actions.forEach((a) => this.registerAction(a));
  }
}
