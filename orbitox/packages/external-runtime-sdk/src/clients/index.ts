/**
 * 🪐 @orbitox/external-runtime-sdk - Typed Client Suite
 * Decoupled client interfaces for external OS products.
 */

import {
  OrbitoxProjectManifest,
  SignedRuntimeConfiguration,
  ConfigurationRevision,
  RuntimeRegistrationPayload,
  RuntimeRegistrationResponse,
  RuntimeHeartbeatReport,
  RuntimeAuditReport,
  ControlCommand,
  ApiRegistrationMeta,
  CentralQuoteRequest,
  CentralQuoteResponse,
} from '../types';

export interface ClientConfig {
  controlPlaneUrl: string;
  projectId: string;
  apiKey?: string;
  sessionToken?: string;
}

export class ProjectClient {
  constructor(private config: ClientConfig) {}

  async getManifest(): Promise<OrbitoxProjectManifest> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/manifest`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch project manifest: ${res.statusText}`);
    const data = await res.json();
    return data.manifest;
  }

  async updateManifest(manifest: Partial<OrbitoxProjectManifest>): Promise<OrbitoxProjectManifest> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/manifest`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(manifest),
    });
    if (!res.ok) throw new Error(`Failed to update project manifest: ${res.statusText}`);
    const data = await res.json();
    return data.manifest;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }
}

export class ConfigurationClient {
  constructor(private config: ClientConfig) {}

  async getSignedConfiguration(sessionId?: string): Promise<SignedRuntimeConfiguration> {
    const url = `${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/bridge${
      sessionId ? `?session=${sessionId}` : ''
    }`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch signed config: ${res.statusText}`);
    return res.json();
  }

  async acknowledgeRevision(revisionNumber: number, runtimeId: string, status: 'SUCCESS' | 'ERROR' = 'SUCCESS', error?: string): Promise<boolean> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/bridge`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        action: 'ACKNOWLEDGE_REVISION',
        payload: {
          projectId: this.config.projectId,
          runtimeId,
          appliedRevision: revisionNumber,
          status,
          error,
          acknowledgedAt: new Date().toISOString(),
        },
      }),
    });
    return res.ok;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }
}

export class FeatureClient {
  private features: Record<string, boolean> = {};

  constructor(private config: ClientConfig) {}

  setFeatures(features: Record<string, boolean>): void {
    this.features = { ...features };
  }

  isEnabled(featureKey: string, defaultValue = false): boolean {
    return this.features[featureKey] !== undefined ? this.features[featureKey] : defaultValue;
  }

  getAllFeatures(): Record<string, boolean> {
    return { ...this.features };
  }

  async fetchFeatures(): Promise<Record<string, boolean>> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/features`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch features: ${res.statusText}`);
    const data = await res.json();
    this.features = data.features || {};
    return this.features;
  }
}

export class EntitlementClient {
  private entitlements: Record<string, { limit: number; used: number; enforced: boolean }> = {};

  constructor(private config: ClientConfig) {}

  setEntitlements(entitlements: Record<string, { limit: number; used: number; enforced: boolean }>): void {
    this.entitlements = { ...entitlements };
  }

  check(key: string, currentUsage: number): { allowed: boolean; remaining: number; enforced: boolean } {
    const def = this.entitlements[key];
    if (!def) return { allowed: true, remaining: Infinity, enforced: false };
    const remaining = Math.max(0, def.limit - currentUsage);
    const allowed = !def.enforced || currentUsage < def.limit;
    return { allowed, remaining, enforced: def.enforced };
  }
}

export class ApiRegistryClient {
  constructor(private config: ClientConfig) {}

  async listApis(): Promise<ApiRegistrationMeta[]> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/apis`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Failed to list APIs: ${res.statusText}`);
    const data = await res.json();
    return data.apis || [];
  }

  async registerApi(api: ApiRegistrationMeta): Promise<boolean> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/apis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({ api }),
    });
    return res.ok;
  }
}

export class RuntimeClient {
  constructor(private config: ClientConfig) {}

  async pollPendingCommands(): Promise<ControlCommand[]> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/commands?status=QUEUED`, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.commands || [];
  }

  async completeCommand(commandId: string, result?: Record<string, any>, error?: string): Promise<boolean> {
    const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        action: 'COMPLETE',
        commandId,
        result,
        error,
      }),
    });
    return res.ok;
  }
}

export class HealthClient {
  constructor(private config: ClientConfig) {}

  async checkControlPlane(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/manifest`);
      return { healthy: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }
}

export class AuditClient {
  constructor(private config: ClientConfig) {}

  async log(action: string, actor: string, status: 'SUCCESS' | 'DENIED' | 'FAILED', details?: Record<string, any>): Promise<void> {
    await fetch(`${this.config.controlPlaneUrl}/api/v1/projects/${this.config.projectId}/bridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        action: 'AUDIT',
        payload: {
          projectId: this.config.projectId,
          action,
          actor,
          status,
          metadata: details,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => {});
  }
}

export class EventClient {
  private handlers: Map<string, Array<(payload: any) => void>> = new Map();

  on(eventName: string, handler: (payload: any) => void): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  emit(eventName: string, payload: any): void {
    const list = this.handlers.get(eventName) || [];
    list.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventClient] Error in handler for ${eventName}:`, err);
      }
    });
  }
}
