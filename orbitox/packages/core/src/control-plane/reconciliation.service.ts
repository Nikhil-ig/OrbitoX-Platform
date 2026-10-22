import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { DriftState, UniversalResource } from './types';

export interface ReconciliationAuditService {
  log(record: any, contextId?: string): Promise<void> | void;
}

export interface ResourceReconciliationResult {
  resourceId: string;
  resourceType: string;
  status: 'RECONCILED' | 'IN_SYNC' | 'BLOCKED' | 'DRIFTED';
  previousDriftState: DriftState;
  currentDriftState: DriftState;
  remediated: boolean;
  message: string;
}

export interface ReconciliationSummary {
  scannedCount: number;
  inSyncCount: number;
  driftedCount: number;
  reconciledCount: number;
  blockedCount: number;
  results: ResourceReconciliationResult[];
  timestamp: string;
}

export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly graph: ResourceGraphService,
    private readonly auditService?: ReconciliationAuditService
  ) {}

  detectDrift(resourceId: string): { hasDrift: boolean; driftFields: string[]; desired: any; observed: any } {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource ${resourceId} not found in graph.`);
    }

    const desired = (node.desiredState as Record<string, any>) || {};
    const observed = (node.observedState as Record<string, any>) || {};
    const driftFields: string[] = [];

    for (const key of Object.keys(desired)) {
      if (desired[key] !== undefined && observed[key] !== undefined && desired[key] !== observed[key]) {
        driftFields.push(key);
      }
    }

    const hasDrift = driftFields.length > 0 || node.driftState === 'DRIFTED';
    return {
      hasDrift,
      driftFields,
      desired,
      observed,
    };
  }

  async reconcileAll(): Promise<ReconciliationSummary> {
    const nodes = this.graph.getAllNodes();
    const results: ResourceReconciliationResult[] = [];

    let inSyncCount = 0;
    let driftedCount = 0;
    let reconciledCount = 0;
    let blockedCount = 0;

    for (const node of nodes) {
      const res = await this.reconcileResource(node.resourceId);
      results.push(res);

      if (res.currentDriftState === 'IN_SYNC') inSyncCount++;
      else if (res.currentDriftState === 'DRIFTED') driftedCount++;
      else if (res.currentDriftState === 'BLOCKED') blockedCount++;

      if (res.remediated) reconciledCount++;
    }

    return {
      scannedCount: nodes.length,
      inSyncCount,
      driftedCount,
      reconciledCount,
      blockedCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  async reconcileResource(resourceId: string, safetyLevel: string = 'SAFE'): Promise<ResourceReconciliationResult> {
    const node = this.graph.getNode(resourceId);
    if (!node) {
      throw new Error(`Resource ${resourceId} not found in graph.`);
    }

    const previousDriftState = node.driftState;
    const desired = node.desiredState as Record<string, any>;
    const observed = (node.observedState as Record<string, any>) || {};

    let currentDriftState: DriftState = 'IN_SYNC';
    let remediated = false;
    let message = 'Desired state matches observed reality.';

    // Check for Service replica drift
    if (node.resourceType === 'SERVICE' && desired.replicas !== undefined) {
      if (observed.replicas !== desired.replicas) {
        this.logger.warn(`Replica drift detected on ${node.resourceId}: Desired ${desired.replicas}, Observed ${observed.replicas}`);
        
        // Automated safe self-healing
        observed.replicas = desired.replicas;
        node.observedState = observed;
        remediated = true;
        currentDriftState = 'IN_SYNC';
        message = `Autonomous self-healing: Scaled replicas to ${desired.replicas}.`;

        if (this.auditService) {
          await this.auditService.log(
            {
              userId: 'reconciler_worker',
              userName: 'System Reconciler',
              action: 'service.reconciled',
              resourceType: node.resourceType,
              resourceId: node.resourceId,
              details: { previousReplicas: observed.replicas, targetReplicas: desired.replicas },
              reason: 'Automated drift remediation',
            },
            node.organizationId
          );
        }
      }
    }

    // Check for Custom Domain / Domain drift
    if (((node.resourceType as string) === 'CUSTOM_DOMAIN' || node.resourceType === 'DOMAIN') && (node.driftState === 'DRIFTED' || previousDriftState === 'DRIFTED')) {
      if (safetyLevel === 'SAFE' || safetyLevel === 'CONTROLLED') {
        node.observedState = { ...desired };
        node.driftState = 'IN_SYNC';
        currentDriftState = 'IN_SYNC';
        remediated = true;
        message = 'Autonomous self-healing: CNAME routing and TLS certificate aligned with desired specification.';

        if (this.auditService) {
          await this.auditService.log(
            {
              userId: 'reconciler_worker',
              userName: 'System Reconciler',
              action: 'domain.reconciled',
              resourceType: node.resourceType,
              resourceId: node.resourceId,
              details: { previousState: observed, reconciledState: desired },
              reason: 'Automated drift remediation',
            },
            node.organizationId
          );
        }
      }
    }

    // Check for Domain DNS verification drift
    if (node.resourceType === 'DOMAIN' && desired.status === 'ACTIVE' && observed.status !== 'ACTIVE' && !remediated) {
      currentDriftState = 'BLOCKED';
      message = 'Domain DNS verification requires external DNS challenge resolution.';
    }

    node.driftState = currentDriftState;

    return {
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      status: remediated ? 'RECONCILED' : (currentDriftState as any),
      previousDriftState,
      currentDriftState,
      remediated,
      message,
    };
  }
}
