import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { ImpactAssessment, ResourceSummary, RiskLevel } from './types';

export class ImpactAnalysisService {
  private readonly logger = new Logger(ImpactAnalysisService.name);

  constructor(private readonly graph: ResourceGraphService) {}

  async calculateImpact(
    action: string,
    targetResourceId: string,
    proposedPayload?: Record<string, unknown>
  ): Promise<ImpactAssessment> {
    const targetNode = this.graph.getNode(targetResourceId);

    if (!targetNode) {
      return {
        action,
        targetResourceId,
        targetResourceType: 'PROJECT',
        riskScore: 0,
        riskLevel: 'LOW',
        verdict: 'PERMITTED',
        affectedProjectsCount: 0,
        affectedEnvironmentsCount: 0,
        affectedTenantsCount: 0,
        affectedApisCount: 0,
        affectedKeysCount: 0,
        affectedNodesCount: 0,
        directImpacts: [],
        transitiveImpacts: [],
        suggestedMitigations: [],
      };
    }

    // 1. Traverse Graph for Direct and Transitive Dependents
    const directNodes = this.graph.getDependents(targetResourceId);
    const transitiveNodes = this.graph.getTransitiveDependents(targetResourceId);

    const directImpacts: ResourceSummary[] = directNodes.map((n) => ({
      resourceId: n.resourceId,
      resourceType: n.resourceType,
      name: n.name,
      status: n.lifecycleStatus,
      projectId: n.projectId,
      environmentId: n.environmentId,
    }));

    const transitiveImpacts: ResourceSummary[] = transitiveNodes.map((n) => ({
      resourceId: n.resourceId,
      resourceType: n.resourceType,
      name: n.name,
      status: n.lifecycleStatus,
      projectId: n.projectId,
      environmentId: n.environmentId,
    }));

    // 2. Count distinct affected entity classes
    const affectedProjects = new Set<string>();
    const affectedEnvironments = new Set<string>();
    let affectedTenantsCount = 0;
    let affectedApisCount = 0;
    let affectedKeysCount = 0;
    let affectedNodesCount = 0;
    let productionAffected = false;

    const allEvaluated = [targetNode, ...directNodes, ...transitiveNodes];
    allEvaluated.forEach((n) => {
      if (n.resourceType === 'PROJECT') affectedProjects.add(n.resourceId);
      if (n.resourceType === 'ENVIRONMENT') {
        affectedEnvironments.add(n.resourceId);
        if (
          (n.desiredState as any)?.isProduction ||
          (n.observedState as any)?.isProduction ||
          n.resourceId.includes('production') ||
          n.resourceId.includes('prod')
        ) {
          productionAffected = true;
        }
      }
      if (n.resourceType === 'TENANT') affectedTenantsCount++;
      if (n.resourceType === 'API') affectedApisCount++;
      if (n.resourceType === 'API_KEY') affectedKeysCount++;
      if (n.resourceType === 'SERVER_NODE') affectedNodesCount++;
    });

    // 3. Compute Risk Score (0 - 100)
    let riskScore = 15; // Baseline operational score

    if (action.includes('delete') || action.includes('deprovision')) riskScore += 45;
    else if (action.includes('disable') || action.includes('suspend') || action.includes('cancel')) riskScore += 35;
    else if (action.includes('drain') || action.includes('rollback')) riskScore += 30;
    else if (action.includes('upgrade') || action.includes('deploy')) riskScore += 20;
    else if (action.includes('rotate')) riskScore += 15;

    if (productionAffected) riskScore += 30;
    if (affectedProjects.size > 5) riskScore += 15;
    if (affectedKeysCount > 10) riskScore += 10;

    riskScore = Math.min(100, Math.max(0, riskScore));

    // 4. Derive Risk Level
    let riskLevel: RiskLevel = 'LOW';
    if (riskScore >= 80) riskLevel = 'CRITICAL';
    else if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 35) riskLevel = 'MEDIUM';

    // 5. Check for Hard Blockers (e.g. Downgrades violating current quota)
    let verdict: 'PERMITTED' | 'REQUIRES_APPROVAL' | 'BLOCKED' = 'PERMITTED';
    let blockerReason: string | undefined;

    if (action === 'plan.downgrade' && proposedPayload) {
      const targetStorageLimit = (proposedPayload.storageQuotaGb as number) || 50;
      const currentStorageUsed = 68.4; // Simulated live check
      if (currentStorageUsed > targetStorageLimit) {
        verdict = 'BLOCKED';
        blockerReason = `Current storage usage (${currentStorageUsed} GB) exceeds target plan allocation (${targetStorageLimit} GB). Archive storage before downgrading.`;
      }
    }

    if (verdict !== 'BLOCKED') {
      if (riskScore >= 80 || productionAffected) {
        verdict = 'REQUIRES_APPROVAL';
      }
    }

    // 6. Mitigations
    const suggestedMitigations: string[] = [];
    if (productionAffected) {
      suggestedMitigations.push('Schedule execution during an approved low-traffic maintenance window.');
      suggestedMitigations.push('Require Four-Eyes Quorum authorization from a Secondary Platform Admin.');
    }
    if (action.includes('drain')) {
      suggestedMitigations.push('Verify standby nodes in region have >= 40% spare CPU/RAM capacity.');
    }
    if (action.includes('upgrade')) {
      suggestedMitigations.push('Verify package cryptographic signature & run staging canary suite.');
    }

    return {
      action,
      targetResourceId,
      targetResourceType: targetNode.resourceType,
      riskScore,
      riskLevel,
      verdict,
      blockerReason,
      affectedProjectsCount: affectedProjects.size,
      affectedEnvironmentsCount: affectedEnvironments.size,
      affectedTenantsCount,
      affectedApisCount,
      affectedKeysCount,
      affectedNodesCount,
      directImpacts,
      transitiveImpacts,
      suggestedMitigations,
    };
  }
}
